import { NextResponse } from "next/server";
import { ApiError, GoogleGenAI } from "@google/genai";
import { fixRequestSchema, fixResponseJsonSchema, fixResponseSchema } from "@/lib/fix-schema";
import { withGeminiRetry } from "@/lib/gemini-retry";

const fixModel = "gemini-2.5-flash";

function buildFixPrompt(
  code: string,
  language: string,
  findings: {
    bugs: { title: string; severity: string; explanation: string; fix: string }[];
    security: { title: string; severity: string; explanation: string; fix: string }[];
    performance: { title: string; severity: string; explanation: string; fix: string }[];
    quality: { title: string; severity: string; explanation: string; fix: string }[];
    suggestions: string[];
  },
): string {
  const findingLines: string[] = [];

  const sections = [
    { label: "Bugs", items: findings.bugs },
    { label: "Security", items: findings.security },
    { label: "Performance", items: findings.performance },
    { label: "Code Quality", items: findings.quality },
  ] as const;

  for (const { label, items } of sections) {
    if (items.length > 0) {
      findingLines.push(`${label}:`);
      for (const item of items) {
        findingLines.push(`  [${item.severity}] ${item.title}`);
        if (item.explanation) findingLines.push(`    Issue: ${item.explanation}`);
        if (item.fix) findingLines.push(`    Fix: ${item.fix}`);
      }
    }
  }

  if (findings.suggestions.length > 0) {
    findingLines.push("Suggestions:");
    for (const s of findings.suggestions) findingLines.push(`  - ${s}`);
  }

  return `You are an expert ${language} developer. A code review identified the following issues in the code below. Your task is to produce a corrected version that addresses every finding.

Findings:
${findingLines.join("\n")}

Original ${language} code:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Rules:
- Fix every issue listed above. Do not skip any finding.
- Preserve the original structure, naming conventions, and intent of the code.
- Do not add unrelated changes or refactor beyond what is needed.
- fixedCode must be complete, valid, runnable ${language} — no placeholders, no ellipsis.
- explanation: a concise paragraph (2–4 sentences) summarising what changed and why.
- improvements: a flat list of short strings, one per fix applied (e.g. "Added null check for user parameter").

Return only valid JSON. Do not include markdown, code fences, or extra text.`;
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = fixRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured." },
        { status: 500 },
      );
    }

    const { code, language, findings } = parsed.data;
    const ai = new GoogleGenAI({ apiKey });

    const response = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: fixModel,
        contents: buildFixPrompt(code, language, findings),
        config: {
          temperature: 0.15,
          systemInstruction:
            "You are an expert code fixer. Given a code review and the original source, produce a corrected version. Respond with only valid JSON matching the required schema. Do not include markdown, code fences, or extra text.",
          responseMimeType: "application/json",
          responseJsonSchema: fixResponseJsonSchema,
        },
      })
    );

    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: "AI returned no output" }, { status: 502 });
    }

    // Strip accidental code fences
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed2: unknown;
    try {
      parsed2 = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
    }

    const validated = fixResponseSchema.safeParse(parsed2);
    if (!validated.success) {
      return NextResponse.json({ error: "AI response did not match expected schema" }, { status: 502 });
    }

    return NextResponse.json(validated.data);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    if (error instanceof ApiError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit reached. Please wait before generating another fix.", code: "RATE_LIMITED" },
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
    return NextResponse.json({ error: "Unable to generate fix" }, { status: 500 });
  }
}
