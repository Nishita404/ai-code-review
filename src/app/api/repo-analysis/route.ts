import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { GoogleGenAI, ApiError } from "@google/genai";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { repoAnalysis } from "@/db/schema";
import { extractZip, ZipValidationError } from "@/lib/extract-zip";
import { withGeminiRetry } from "@/lib/gemini-retry";
import {
  repoAnalysisSchema,
  repoAnalysisJsonSchema,
} from "@/lib/repo-analysis-schema";
import type { ExtractedFile } from "@/lib/extract-zip";

export const maxDuration = 90; // Repository analysis can take a bit longer

const reviewModel = "gemini-2.5-flash";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

// ─── Duplicate lines estimator ───────────────────────────────────────────────

function estimateDuplicateLines(files: ExtractedFile[]): number {
  const lineCounts = new Map<string, number>();
  let totalLines = 0;

  for (const file of files) {
    const lines = file.content
      .split("\n")
      .map((l) => l.trim())
      // Check significant lines (length > 15), ignoring comments and trivial brackets
      .filter(
        (l) =>
          l.length > 15 &&
          !l.startsWith("//") &&
          !l.startsWith("/*") &&
          !l.startsWith("*") &&
          !l.startsWith("#") &&
          l !== "{" &&
          l !== "}" &&
          l !== "};" &&
          l !== "];"
      );

    totalLines += lines.length;
    for (const line of lines) {
      lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
    }
  }

  if (totalLines === 0) return 0;

  let duplicateLines = 0;
  for (const count of lineCounts.values()) {
    if (count > 1) {
      // Sum the duplicate line instances
      duplicateLines += count;
    }
  }

  const percentage = (duplicateLines / totalLines) * 100;
  return parseFloat(Math.min(percentage, 100).toFixed(1));
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildAnalysisPrompt(
  projectName: string,
  files: ExtractedFile[],
  totalFilesCount: number,
  totalLoc: number,
  duplicateCode: number,
  largestFiles: any[]
): string {
  const fileBlocks = files
    .map(
      (f) =>
        `### File: ${f.path} (${f.language}, ${f.content.split("\n").length} LOC)\n\`\`\`\n${f.content}\n\`\`\``
    )
    .join("\n\n");

  return `You are a senior repository-level architecture, security, and performance auditor.
Analyze the following project repository named "${projectName}".

Static Metrics calculated on the server:
- Total files: ${totalFilesCount}
- Total LOC (Lines of Code): ${totalLoc}
- Duplication rate estimate: ${duplicateCode}%
- Largest files: ${JSON.stringify(largestFiles)}

Perform a deep analysis of the files provided below and produce:
1. securityScore, maintainabilityScore, performanceScore, architectureScore (each integer 0-100 reflecting the codebase status)
2. architecture analysis:
   - circularDependencies: chains of imports that are circular (e.g. A imports B, B imports A)
   - deepImportChains: import paths that are nested deeply (e.g. depth >= 4)
   - largeFiles: files that are very large (typically > 300 LOC) and need refactoring
   - largeFunctions: individual functions/methods with high complexity/lines (typically > 50 lines)
   - deadCodeCandidates: symbols (functions, exports, classes, variables) that appear to be unused or candidates for deletion
3. security analysis:
   - hardcodedSecrets, apiKeys, tokens: any values that appear to be credentials
   - unsafeEval: usage of eval() or dangerous execution functions
   - dangerousShellCommands: inputs passed directly to child_process or shell executes without sanitisation
4. performance analysis:
   - nestedLoops: loops nested 3+ levels deep
   - nPlusOnePatterns: SQL queries or API queries generated inside loops
   - memoryHeavyStructures: loading whole files in-memory instead of streaming, huge variables/arrays without chunking

Return only valid JSON. Do not include markdown, code fences, or extra text.

Files to analyze:
${fileBlocks}`;
}

// ─── POST /api/repo-analysis ──────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // ── Parse multipart form data ───────────────────────────────────────────
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid multipart form data." },
        { status: 400 }
      );
    }

    const fileField = formData.get("file");
    if (!(fileField instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded. Send a .zip file in the 'file' field." },
        { status: 400 }
      );
    }

    // ── Validate file type & size ───────────────────────────────────────────
    const filename = fileField.name ?? "repo.zip";
    const isZip =
      filename.toLowerCase().endsWith(".zip") ||
      fileField.type === "application/zip" ||
      fileField.type === "application/x-zip-compressed";

    if (!isZip) {
      return NextResponse.json(
        { error: "Only .zip files are supported." },
        { status: 400 }
      );
    }

    if (fileField.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File is too large (${(fileField.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 25 MB.`,
        },
        { status: 400 }
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

    // ── Local Heuristics & Metrics Calculation ──────────────────────────────
    const totalFilesCount = files.length;
    let totalLoc = 0;
    const languageDistribution: Record<string, number> = {};
    const largestFilesList: { filePath: string; loc: number; sizeBytes: number }[] = [];

    for (const f of files) {
      const loc = f.content.split("\n").length;
      totalLoc += loc;
      languageDistribution[f.language] = (languageDistribution[f.language] ?? 0) + loc;
      largestFilesList.push({
        filePath: f.path,
        loc,
        sizeBytes: f.sizeBytes,
      });
    }

    // Sort descending by LOC to find the largest files
    largestFilesList.sort((a, b) => b.loc - a.loc);
    const largestFiles = largestFilesList.slice(0, 5);

    // Estimate duplicate code rate
    const duplicateCodeEstimate = estimateDuplicateLines(files);

    // ── Gemini API key ──────────────────────────────────────────────────────
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Add GEMINI_API_KEY to .env.local." },
        { status: 500 }
      );
    }

    // ── Generate Repository-Level Analysis ──────────────────────────────────
    const ai = new GoogleGenAI({ apiKey });

    const geminiResponse = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: reviewModel,
        contents: buildAnalysisPrompt(
          projectName,
          files,
          totalFilesCount,
          totalLoc,
          duplicateCodeEstimate,
          largestFiles
        ),
        config: {
          temperature: 0.1,
          systemInstruction:
            "You are a repository auditor. Respond with only valid JSON matching the required schema. Do not include markdown, code fences, or extra text.",
          responseMimeType: "application/json",
          responseJsonSchema: repoAnalysisJsonSchema,
        },
      })
    );

    const text = geminiResponse.text;
    if (!text) {
      return NextResponse.json(
        { error: "AI returned no output." },
        { status: 502 }
      );
    }

    // Strip fences
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON." },
        { status: 502 }
      );
    }

    // Inject metrics calculated locally to ensure exact server-side accuracy
    parsed.projectName = projectName;
    parsed.metrics = {
      totalFiles: totalFilesCount,
      totalLoc,
      languageDistribution,
      largestFiles,
      duplicateCodeEstimate,
    };

    const validated = repoAnalysisSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("Zod Validation Error:", validated.error);
      return NextResponse.json(
        { error: "AI response did not match expected Repository Analysis schema." },
        { status: 502 }
      );
    }

    const result = validated.data;

    // ── Persist (best-effort, signed-in users only) ─────────────────────────
    try {
      const reqHeaders = await headers();
      const session = await getAuth().api.getSession({ headers: reqHeaders });

      if (session?.user?.id) {
        const db = getDb();
        const analysisId = crypto.randomUUID();

        await db.insert(repoAnalysis).values({
          id: analysisId,
          userId: session.user.id,
          projectName,
          fileCount: totalFilesCount,
          totalLoc,
          languageStats: languageDistribution,
          securityScore: result.securityScore,
          maintainabilityScore: result.maintainabilityScore,
          performanceScore: result.performanceScore,
          architectureScore: result.architectureScore,
          metricsJson: result.metrics,
          architectureJson: result.architecture,
          securityJson: result.security,
          performanceJson: result.performance,
        });
      }
    } catch (dbErr) {
      console.error("Database persistence failed:", dbErr);
      // Non-blocking
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    if (error instanceof ApiError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit reached. Please wait before generating another analysis.", code: "RATE_LIMITED" },
          { status: 429 }
        );
      }
      if (error.status === 503) {
        return NextResponse.json(
          { error: "Gemini is currently experiencing high demand. Please try again in a few moments.", code: "SERVICE_UNAVAILABLE" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Gemini request failed. Please try again.", code: "GEMINI_ERROR" },
        { status: error.status ?? 502 }
      );
    }
    return NextResponse.json(
      { error: "Unable to generate repository-level analysis." },
      { status: 500 }
    );
  }
}
