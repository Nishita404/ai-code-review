import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ApiError, GoogleGenAI } from "@google/genai";
import { reviewRequestSchema, reviewResponseJsonSchema, reviewResponseSchema } from "@/lib/review-schema";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { review } from "@/db/schema";

const reviewModel = "gemini-2.5-flash";

function buildReviewPrompt(code: string, language: string) {
  return `Review the following ${language} code.

Analyze:
- bugs: logic errors, edge cases, null/undefined risks, incorrect behavior
- security: injection, auth, secrets, unsafe input handling, data exposure
- performance: unnecessary work, memory leaks, inefficient algorithms
- quality: readability, naming, structure, maintainability, type safety
- suggestions: concise actionable improvements not already covered above

Scoring:
- score: integer from 0 to 100 reflecting overall code health
- summary: one or two sentences summarizing the review

For each issue include a clear title, severity (low, medium, high, or critical), explanation, and a concrete fix.

Return only valid JSON. Do not include markdown, code fences, or extra text.

Code:
${code}`;
}

function parseReviewResponse(text: string) {
  const withoutFences = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;

  try {
    parsed = JSON.parse(withoutFences);
  } catch {
    return { success: false as const, error: "AI returned invalid review data" };
  }

  const validated = reviewResponseSchema.safeParse(parsed);

  if (!validated.success) {
    return { success: false as const, error: "AI returned invalid review data" };
  }

  return { success: true as const, data: validated.data };
}

/** Generate a simple random ID (no external dep needed) */
function generateId() {
  return crypto.randomUUID();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedBody = reviewRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Add GEMINI_API_KEY to .env.local." },
        { status: 500 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const { code, language } = parsedBody.data;

    const response = await ai.models.generateContent({
      model: reviewModel,
      contents: buildReviewPrompt(code, language),
      config: {
        temperature: 0.2,
        systemInstruction:
          "You are an expert code reviewer. Respond with only valid JSON matching the required schema. Do not include markdown, code fences, or extra text.",
        responseMimeType: "application/json",
        responseJsonSchema: reviewResponseJsonSchema,
      },
    });

    const text = response.text;

    if (!text) {
      return NextResponse.json({ error: "AI returned invalid review data" }, { status: 502 });
    }

    const reviewResult = parseReviewResponse(text);

    if (!reviewResult.success) {
      return NextResponse.json({ error: reviewResult.error }, { status: 502 });
    }

    // ─── Persist review for signed-in users (best-effort, non-blocking) ───
    try {
      const reqHeaders = await headers();
      const session = await getAuth().api.getSession({ headers: reqHeaders });

      if (session?.user?.id) {
        const db = getDb();
        await db.insert(review).values({
          id: generateId(),
          userId: session.user.id,
          code,
          language,
          score: reviewResult.data.score,
          summary: reviewResult.data.summary,
          reviewJson: reviewResult.data,
        });
      }
    } catch {
      // Never fail the response if persistence fails — just skip saving.
    }

    return NextResponse.json(reviewResult.data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
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

    return NextResponse.json({ error: "Unable to generate review" }, { status: 500 });
  }
}
