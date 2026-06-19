import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { GoogleGenAI, ApiError } from "@google/genai";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { githubAccounts, githubRepositories, prReviews } from "@/db/schema";
import { decrypt } from "@/lib/encryption";
import { isIgnored, getReviewableLanguage } from "@/lib/extract-zip";
import { withGeminiRetry } from "@/lib/gemini-retry";
import { reviewResponseSchema, reviewResponseJsonSchema } from "@/lib/review-schema";

const reviewModel = "gemini-2.5-flash";

function buildPrReviewPrompt(
  prTitle: string,
  files: { path: string; content: string; language: string }[]
) {
  const fileList = files.map((f) => `- ${f.path}`).join("\n");
  const fileBlocks = files
    .map(
      (f) =>
        `### File: ${f.path} (${f.language})\n\`\`\`\n${f.content}\n\`\`\``
    )
    .join("\n\n");

  return `You are an expert Pull Request code reviewer.
Review the following changed files in the Pull Request titled "${prTitle}".

Changed files in this PR:
${fileList}

Analyze the changes and generate a structured review:
- bugs: logic errors, edge cases, null/undefined risks, incorrect behavior in the changed code
- security: injection, auth, secrets, unsafe input handling, data exposure in the changed code
- performance: unnecessary work, memory leaks, inefficient algorithms in the changed code
- quality: readability, naming, structure, maintainability, type safety in the changed code
- suggestions: concise actionable improvements not already covered above

Scoring:
- score: integer from 0 to 100 reflecting overall health of the code changes
- summary: one or two sentences summarizing the pull request review

For EVERY issue in bugs, security, performance, and quality you MUST provide:
- title: concise issue title
- severity: one of "low", "medium", "high", or "critical"
- explanation: description of the problem with enough context to understand it
- fix: a concrete, actionable fix
- filePath: the EXACT filename from the changed files list above where the issue occurs (e.g. "src/lib/auth.ts")
- lineNumber: your best estimate of the line number in that file where the issue occurs (integer). If uncertain, use the approximate line.

Return only valid JSON. Do not include markdown, code fences, or extra text.

Files:
${fileBlocks}`;
}

export async function POST(request: Request) {
  try {
    const { repoId, prNumber } = await request.json();
    const numPrNumber = parseInt(prNumber, 10);
    if (!repoId || isNaN(numPrNumber)) {
      return NextResponse.json({ error: "Invalid repository or PR number" }, { status: 400 });
    }

    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // 1. Get the repository record
    const repos = await db
      .select()
      .from(githubRepositories)
      .where(eq(githubRepositories.id, repoId))
      .limit(1);

    const repo = repos[0];
    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // 2. Fetch the linked GitHub account to get the token
    const accounts = await db
      .select()
      .from(githubAccounts)
      .where(
        and(
          eq(githubAccounts.id, repo.githubAccountId),
          eq(githubAccounts.userId, session.user.id)
        )
      )
      .limit(1);

    const account = accounts[0];
    if (!account) {
      return NextResponse.json({ error: "GitHub account connection not found" }, { status: 404 });
    }

    // 3. Decrypt access token
    const accessToken = decrypt(account.encryptedAccessToken);

    // 4. Fetch PR details (to get head SHA, title, etc.)
    const prResponse = await fetch(
      `https://api.github.com/repos/${repo.fullName}/pulls/${numPrNumber}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "ai-code-review",
        },
      }
    );

    if (!prResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Pull Request metadata from GitHub" },
        { status: prResponse.status }
      );
    }

    const prDetails = (await prResponse.json()) as {
      title: string;
      user: { login: string };
      head: { ref: string; sha: string };
    };

    // 5. Fetch PR changed files list
    const filesResponse = await fetch(
      `https://api.github.com/repos/${repo.fullName}/pulls/${numPrNumber}/files?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "ai-code-review",
        },
      }
    );

    if (!filesResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Pull Request changed files list from GitHub" },
        { status: filesResponse.status }
      );
    }

    const filesData = (await filesResponse.json()) as {
      filename: string;
      status: string;
      raw_url: string;
      contents_url: string;
    }[];

    // Filter reviewable files
    const reviewableFileList = filesData.filter((f) => {
      const language = getReviewableLanguage(f.filename);
      const notDeleted = f.status !== "removed";
      const notIgn = !isIgnored(f.filename);
      return language && notDeleted && notIgn;
    });

    if (reviewableFileList.length === 0) {
      return NextResponse.json(
        { error: "No reviewable source files (TypeScript, JavaScript, Python, Java, Go, Rust, C/C++) were changed in this Pull Request." },
        { status: 400 }
      );
    }

    // 6. Fetch contents for each reviewable file
    const reviewableFiles: { path: string; content: string; language: string; sizeBytes: number }[] = [];

    for (const file of reviewableFileList) {
      try {
        const fileContentResponse = await fetch(file.contents_url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3.raw",
            "User-Agent": "ai-code-review",
          },
        });

        if (fileContentResponse.ok) {
          const content = await fileContentResponse.text();
          if (content.trim()) {
            const language = getReviewableLanguage(file.filename)!;
            reviewableFiles.push({
              path: file.filename,
              content,
              language,
              sizeBytes: Buffer.byteLength(content, "utf8"),
            });
          }
        }
      } catch (err) {
        console.error(`Failed to fetch file content for ${file.filename}:`, err);
      }
    }

    if (reviewableFiles.length === 0) {
      return NextResponse.json(
        { error: "Could not fetch content for any changed files in the Pull Request." },
        { status: 400 }
      );
    }

    // 7. Trim files if they exceed context cap (800 KB)
    const SOURCE_CAP = 800 * 1024;
    let totalBytes = reviewableFiles.reduce((s, f) => s + f.sizeBytes, 0);

    if (totalBytes > SOURCE_CAP) {
      reviewableFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);
      while (totalBytes > SOURCE_CAP && reviewableFiles.length > 1) {
        const dropped = reviewableFiles.shift()!;
        totalBytes -= dropped.sizeBytes;
      }
      reviewableFiles.sort((a, b) => a.path.localeCompare(b.path));
    }

    // 8. Call Gemini API for code review
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured. Add GEMINI_API_KEY to .env.local." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const geminiResponse = await withGeminiRetry(() =>
      ai.models.generateContent({
        model: reviewModel,
        contents: buildPrReviewPrompt(prDetails.title, reviewableFiles),
        config: {
          temperature: 0.2,
          systemInstruction:
            "You are a Pull Request code reviewer. Respond with only valid JSON matching the required schema. Do not include markdown, code fences, or extra text.",
          responseMimeType: "application/json",
          responseJsonSchema: reviewResponseJsonSchema,
        },
      })
    );

    const text = geminiResponse.text;
    if (!text) {
      return NextResponse.json({ error: "AI returned empty review output." }, { status: 502 });
    }

    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON review data." }, { status: 502 });
    }

    const validated = reviewResponseSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("Zod Validation Error:", validated.error);
      return NextResponse.json(
        { error: "AI response did not match expected Review Schema." },
        { status: 502 }
      );
    }

    const result = validated.data;

    // 9. Upsert review result in the database
    const existing = await db
      .select()
      .from(prReviews)
      .where(and(eq(prReviews.repoId, repoId), eq(prReviews.prNumber, numPrNumber)))
      .limit(1);

    if (existing[0]) {
      await db
        .update(prReviews)
        .set({
          prTitle: prDetails.title,
          prAuthor: prDetails.user.login,
          prBranch: prDetails.head.ref,
          changedFiles: reviewableFiles.map((f) => f.path),
          score: result.score,
          summary: result.summary,
          reviewJson: result,
          updatedAt: new Date(),
        })
        .where(eq(prReviews.id, existing[0].id));
    } else {
      await db.insert(prReviews).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        repoId,
        prNumber: numPrNumber,
        prTitle: prDetails.title,
        prAuthor: prDetails.user.login,
        prBranch: prDetails.head.ref,
        changedFiles: reviewableFiles.map((f) => f.path),
        score: result.score,
        summary: result.summary,
        reviewJson: result,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to perform PR review:", error);
    if (error instanceof ApiError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit reached. Please wait before generating another review.", code: "RATE_LIMITED" },
          { status: 429 }
        );
      }
      if (error.status === 503) {
        return NextResponse.json(
          { error: "Gemini is currently experiencing high demand. Please try again in a few moments.", code: "SERVICE_UNAVAILABLE" },
          { status: 503 }
        );
      }
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to review Pull Request." },
      { status: 500 }
    );
  }
}
