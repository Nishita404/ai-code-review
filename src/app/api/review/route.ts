import { NextResponse } from "next/server";
import { ApiError, GoogleGenAI } from "@google/genai";
import { reviewRequestSchema, reviewResponseJsonSchema, reviewResponseSchema } from "@/lib/review-schema";

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

    const review = parseReviewResponse(text);

    if (!review.success) {
      return NextResponse.json({ error: review.error }, { status: 502 });
    }

    return NextResponse.json(review.data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || "Gemini request failed" },
        { status: error.status ?? 502 },
      );
    }

    return NextResponse.json({ error: "Unable to generate review" }, { status: 500 });
  }
}
