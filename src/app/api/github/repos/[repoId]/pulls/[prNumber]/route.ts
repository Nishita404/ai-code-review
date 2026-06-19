import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { githubAccounts, githubRepositories, prReviews } from "@/db/schema";
import { decrypt } from "@/lib/encryption";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repoId: string; prNumber: string }> }
) {
  try {
    const { repoId, prNumber } = await params;
    const numPrNumber = parseInt(prNumber, 10);
    if (isNaN(numPrNumber)) {
      return NextResponse.json({ error: "Invalid PR number" }, { status: 400 });
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

    // 4. Query GitHub API for the Pull Request details (to get head ref, author, title)
    const prDetailsResponse = await fetch(
      `https://api.github.com/repos/${repo.fullName}/pulls/${numPrNumber}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "ai-code-review",
        },
      }
    );

    if (!prDetailsResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch pull request details from GitHub" },
        { status: prDetailsResponse.status }
      );
    }

    const prDetails = (await prDetailsResponse.json()) as {
      title: string;
      user: { login: string; avatar_url?: string };
      head: { ref: string; sha: string };
      created_at: string;
      html_url: string;
    };

    // 5. Query GitHub API for the changed files
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

    let changedFiles: { filename: string; status: string; additions: number; deletions: number }[] = [];
    if (filesResponse.ok) {
      const filesData = (await filesResponse.json()) as {
        filename: string;
        status: string;
        additions: number;
        deletions: number;
      }[];
      changedFiles = filesData.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
      }));
    }

    // 6. Query local database for existing review
    const prReviewRecord = await db
      .select()
      .from(prReviews)
      .where(
        and(
          eq(prReviews.repoId, repoId),
          eq(prReviews.prNumber, numPrNumber),
          eq(prReviews.userId, session.user.id)
        )
      )
      .limit(1);

    const existingReview = prReviewRecord[0] ?? null;

    return NextResponse.json({
      pr: {
        number: numPrNumber,
        title: prDetails.title,
        author: prDetails.user.login,
        avatarUrl: prDetails.user.avatar_url,
        branch: prDetails.head.ref,
        createdAt: prDetails.created_at,
        htmlUrl: prDetails.html_url,
        changedFiles,
      },
      review: existingReview,
    });
  } catch (error) {
    console.error("Failed to fetch PR detail:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch PR details" },
      { status: 500 }
    );
  }
}
