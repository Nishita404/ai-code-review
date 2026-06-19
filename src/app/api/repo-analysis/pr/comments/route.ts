import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import {
  githubAccounts,
  githubRepositories,
  prReviews,
  prCommentHistory,
} from "@/db/schema";
import { decrypt } from "@/lib/encryption";

// ── Types ──────────────────────────────────────────────────────────────────

type CommentRequest = {
  repoId: string;
  prNumber: number;
  prReviewId: string;
  /** The commit SHA to anchor comments to (head SHA of the PR) */
  commitSha: string;
  comments: {
    filePath: string;
    lineNumber: number | null;
    body: string;
  }[];
};

type PostResult = {
  filePath: string;
  lineNumber: number | null;
  body: string;
  status: "success" | "failed";
  githubCommentId: string | null;
  error: string | null;
};

// ── Route ──────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CommentRequest;
    const { repoId, prNumber, prReviewId, commitSha, comments } = body;

    if (
      !repoId ||
      !prNumber ||
      !prReviewId ||
      !commitSha ||
      !Array.isArray(comments) ||
      comments.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields: repoId, prNumber, prReviewId, commitSha, comments" },
        { status: 400 }
      );
    }

    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // 1. Load repo record
    const repos = await db
      .select()
      .from(githubRepositories)
      .where(eq(githubRepositories.id, repoId))
      .limit(1);

    const repo = repos[0];
    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // 2. Load GitHub account to get access token
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
      return NextResponse.json(
        { error: "GitHub account connection not found" },
        { status: 404 }
      );
    }

    // 3. Validate that the prReview record exists and belongs to this user
    const reviews = await db
      .select()
      .from(prReviews)
      .where(
        and(
          eq(prReviews.id, prReviewId),
          eq(prReviews.userId, session.user.id)
        )
      )
      .limit(1);

    if (!reviews[0]) {
      return NextResponse.json({ error: "PR review record not found" }, { status: 404 });
    }

    const accessToken = decrypt(account.encryptedAccessToken);
    const ghBaseUrl = `https://api.github.com/repos/${repo.fullName}/pulls/${prNumber}`;

    const results: PostResult[] = [];

    // 4. Post each comment to GitHub one by one
    for (const comment of comments) {
      let githubCommentId: string | null = null;
      let error: string | null = null;
      let status: "success" | "failed" = "failed";

      try {
        // Build the GitHub review comment body
        // GitHub PR review comments require: body, commit_id, path, line
        // If no line number, fall back to a general PR comment (issues comment on the PR thread)
        let ghResponse: Response;

        if (comment.lineNumber && comment.lineNumber > 0) {
          // File-level review comment anchored to a line
          ghResponse = await fetch(
            `${ghBaseUrl}/comments`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "User-Agent": "ai-code-review",
              },
              body: JSON.stringify({
                body: comment.body,
                commit_id: commitSha,
                path: comment.filePath,
                line: comment.lineNumber,
                side: "RIGHT",
              }),
            }
          );
        } else {
          // General issue comment on the PR when no specific line is available
          ghResponse = await fetch(
            `https://api.github.com/repos/${repo.fullName}/issues/${prNumber}/comments`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "User-Agent": "ai-code-review",
              },
              body: JSON.stringify({
                body: `**[AI Review — \`${comment.filePath}\`]**\n\n${comment.body}`,
              }),
            }
          );
        }

        if (ghResponse.ok) {
          const ghData = (await ghResponse.json()) as { id: number };
          githubCommentId = String(ghData.id);
          status = "success";
        } else {
          const errData = await ghResponse.json().catch(() => ({}));
          error =
            (errData as { message?: string }).message ||
            `GitHub API returned ${ghResponse.status}`;
          status = "failed";
        }
      } catch (err) {
        error = err instanceof Error ? err.message : "Unknown network error";
        status = "failed";
      }

      // 5. Persist comment result to history
      await db.insert(prCommentHistory).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        prReviewId,
        githubCommentId,
        filePath: comment.filePath,
        lineNumber: comment.lineNumber ?? null,
        body: comment.body,
        status,
        error,
      });

      results.push({
        filePath: comment.filePath,
        lineNumber: comment.lineNumber,
        body: comment.body,
        status,
        githubCommentId,
        error,
      });
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const failCount = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
      },
    });
  } catch (error) {
    console.error("Failed to post PR comments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to post comments" },
      { status: 500 }
    );
  }
}

// ── GET: Fetch comment history for a PR review ────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const prReviewId = searchParams.get("prReviewId");

    if (!prReviewId) {
      return NextResponse.json({ error: "prReviewId is required" }, { status: 400 });
    }

    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    const history = await db
      .select()
      .from(prCommentHistory)
      .where(
        and(
          eq(prCommentHistory.prReviewId, prReviewId),
          eq(prCommentHistory.userId, session.user.id)
        )
      );

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Failed to fetch comment history:", error);
    return NextResponse.json(
      { error: "Unable to fetch comment history" },
      { status: 500 }
    );
  }
}
