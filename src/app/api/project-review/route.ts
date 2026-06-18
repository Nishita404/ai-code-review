import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { GoogleGenAI, ApiError } from "@google/genai";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { reviewProject, reviewProjectFile } from "@/db/schema";
import { extractZip, ZipValidationError } from "@/lib/extract-zip";
import { withGeminiRetry } from "@/lib/gemini-retry";
import {
  projectReviewResponseSchema,
  projectReviewResponseJsonSchema,
} from "@/lib/project-review-schema";
import type { ExtractedFile } from "@/lib/extract-zip";

// Allow up to 60 s for multi-file review (default is 15 s)
export const maxDuration = 60;

const reviewModel = "gemini-2.5-flash";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildProjectPrompt(files: ExtractedFile[]): string {
  const fileBlocks = files
    .map(
      (f) =>
        `### File: ${f.path} (${f.language})\n\`\`\`\n${f.content}\n\`\`\``,
    )
    .join("\n\n");

  return `You are an expert code reviewer. Review the following project containing ${files.length} source file(s).

For each file, produce:
- score: integer 0-100 reflecting code health
- summary: 1-2 sentence summary of the file
- bugs, security, performance, quality: arrays of issues, each with title, severity (low/medium/high/critical), explanation, fix
- suggestions: flat array of short actionable strings

Then produce an aggregate:
- overallScore: integer 0-100 (weighted average across all files)
- summary: 2-3 sentence overall project summary
- languageBreakdown: object mapping each language name to the count of files in that language

Return only valid JSON. Do not include markdown, code fences, or extra text.

${fileBlocks}`;
}

// ─── POST /api/project-review ─────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── Parse multipart form data ───────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid multipart form data." },
        { status: 400 },
      );
    }

    const fileField = formData.get("file");
    if (!(fileField instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded. Send a .zip file in the 'file' field." },
        { status: 400 },
      );
    }

    // ── Validate file type & size ───────────────────────────────────────────
    const filename = fileField.name ?? "project.zip";
    const isZip =
      filename.toLowerCase().endsWith(".zip") ||
      fileField.type === "application/zip" ||
      fileField.type === "application/x-zip-compressed";

    if (!isZip) {
      return NextResponse.json(
        { error: "Only .zip files are supported." },
        { status: 400 },
      );
    }

    if (fileField.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File is too large (${(fileField.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 25 MB.`,
        },
        { status: 400 },
      );
    }

    const projectName =
      (formData.get("projectName") as string | null)?.trim() ||
      filename.replace(/\.zip$/i, "");

    // ── Extract ZIP ─────────────────────────────────────────────────────────
    const buffer = await fileField.arrayBuffer();
    let files: ExtractedFile[];
    try {
      files = extractZip(buffer);
    } catch (err) {
      if (err instanceof ZipValidationError) {
        return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
      }
      throw err;
    }

    // ── Gemini API key ──────────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Add GEMINI_API_KEY to .env.local." },
        { status: 500 },
      );
    }

    // ── Generate review ─────────────────────────────────────────────────────
    const ai = new GoogleGenAI({ apiKey });

    const geminiResponse = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: reviewModel,
        contents: buildProjectPrompt(files),
        config: {
          temperature: 0.2,
          systemInstruction:
            "You are an expert code reviewer. Respond with only valid JSON matching the required schema. Do not include markdown, code fences, or extra text.",
          responseMimeType: "application/json",
          responseJsonSchema: projectReviewResponseJsonSchema,
        },
      }),
    );

    const text = geminiResponse.text;
    if (!text) {
      return NextResponse.json(
        { error: "AI returned no output." },
        { status: 502 },
      );
    }

    // Strip accidental fences
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON." },
        { status: 502 },
      );
    }

    const validated = projectReviewResponseSchema.safeParse(parsed);
    if (!validated.success) {
      return NextResponse.json(
        { error: "AI response did not match expected schema." },
        { status: 502 },
      );
    }

    const result = validated.data;

    // ── Persist (best-effort, signed-in users only) ─────────────────────────
    try {
      const reqHeaders = await headers();
      const session = await getAuth().api.getSession({ headers: reqHeaders });

      if (session?.user?.id) {
        const db = getDb();
        const projectId = crypto.randomUUID();

        const { files: fileResults, ...aggregate } = result;

        await db.insert(reviewProject).values({
          id: projectId,
          userId: session.user.id,
          projectName,
          fileCount: files.length,
          languageStats: result.languageBreakdown,
          overallScore: result.overallScore,
          summary: result.summary,
          reviewJson: aggregate,
        });

        await db.insert(reviewProjectFile).values(
          fileResults.map((fr) => ({
            id: crypto.randomUUID(),
            projectId,
            filePath: fr.filePath,
            language: fr.language,
            score: fr.score,
            reviewJson: fr,
          })),
        );
      }
    } catch {
      // Non-blocking — never fail the response if persistence fails
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    if (error instanceof ApiError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit reached. Please wait before generating another review.", code: "RATE_LIMITED" },
          { status: 429 },
        );
      }
      if (error.status === 503) {
        return NextResponse.json(
          { error: "Gemini is currently experiencing high demand. Please try again in a few moments.", code: "SERVICE_UNAVAILABLE" },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Gemini request failed. Please try again.", code: "GEMINI_ERROR" },
        { status: error.status ?? 502 },
      );
    }
    return NextResponse.json(
      { error: "Unable to generate project review." },
      { status: 500 },
    );
  }
}
