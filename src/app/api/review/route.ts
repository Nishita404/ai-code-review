import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { reviewRequestSchema, reviewResponseSchema } from "@/lib/review-schema";

const reviewModel = process.env.OPENAI_REVIEW_MODEL ?? "gpt-4o-mini";

function buildReviewPrompt(code: string, language: string) {
  return `Review the following ${language} code. Return ONLY valid JSON matching the required schema.

Analyze:
- bugs: logic errors, edge cases, null/undefined risks, incorrect behavior
- security: injection, auth, secrets, unsafe input handling, data exposure
- performance: unnecessary work, memory leaks, inefficient algorithms
- quality: readability, naming, structure, maintainability, type safety
- suggestions: concise actionable improvements not already covered above

Scoring:
- score: integer from 0 to 100 reflecting overall code health
- summary: one or two sentences summarizing the review

For each issue include a clear title, severity, explanation, and a concrete fix.

Code:
\`\`\`${language}
${code}
\`\`\``;
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

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local." },
        { status: 500 },
      );
    }

    const openai = new OpenAI({ apiKey });
    const { code, language } = parsedBody.data;

    const completion = await openai.chat.completions.parse({
      model: reviewModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an expert code reviewer. Respond with ONLY valid JSON that matches the provided schema. Do not include markdown fences or extra text.",
        },
        {
          role: "user",
          content: buildReviewPrompt(code, language),
        },
      ],
      response_format: zodResponseFormat(reviewResponseSchema, "code_review"),
    });

    const review = completion.choices[0]?.message?.parsed;

    if (!review) {
      return NextResponse.json({ error: "AI returned invalid review data" }, { status: 502 });
    }

    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: error.message || "OpenAI request failed" },
        { status: error.status ?? 502 },
      );
    }

    return NextResponse.json({ error: "Unable to generate review" }, { status: 500 });
  }
}
