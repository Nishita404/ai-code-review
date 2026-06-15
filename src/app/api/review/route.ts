import { NextResponse } from "next/server";
import { z } from "zod";

const reviewRequestSchema = z.object({
  code: z.string().min(1, "Code is required"),
  language: z.string().min(1, "Language is required"),
});

const mockReviewResponse = {
  score: 87,
  summary: "The code is generally clean but contains some potential issues.",
  bugs: [
    {
      title: "Possible null access",
      severity: "medium",
    },
  ],
  security: [
    {
      title: "No immediate security issues found",
      severity: "low",
    },
  ],
  performance: [
    {
      title: "Function can be memoized",
      severity: "low",
    },
  ],
  quality: [
    {
      title: "Naming can be improved",
      severity: "low",
    },
  ],
  suggestions: ["Add stronger type safety", "Improve function naming"],
};

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

    return NextResponse.json(mockReviewResponse);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }
}
