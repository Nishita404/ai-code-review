import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { githubAccounts, githubRepositories, prReviews } from "@/db/schema";
import { decrypt } from "@/lib/encryption";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repoId: string }> }
) {
  try {
    const { repoId } = await params;
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

    // 3. Decrypt the access token
    const accessToken = decrypt(account.encryptedAccessToken);

    // 4. Query GitHub API for open Pull Requests
    const response = await fetch(
      `https://api.github.com/repos/${repo.fullName}/pulls?state=open&per_page=50&sort=updated`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "ai-code-review",
        },
      }
    );

    if (!response.ok) {
      console.error(`GitHub API pulls error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: "Failed to fetch pull requests from GitHub" },
        { status: response.status }
      );
    }

    const pullsData = (await response.json()) as {
      id: number;
      number: number;
      title: string;
      user: { login: string; avatar_url?: string };
      head: { ref: string; sha: string };
      created_at: string;
      html_url: string;
    }[];

    // 5. Query local database for existing reviews of these PRs
    const existingReviews = await db
      .select({
        prNumber: prReviews.prNumber,
        score: prReviews.score,
        updatedAt: prReviews.updatedAt,
      })
      .from(prReviews)
      .where(eq(prReviews.repoId, repoId));

    const reviewsMap = new Map(existingReviews.map((r) => [r.prNumber, r]));

    const formattedPulls = pullsData.map((pr) => {
      const dbReview = reviewsMap.get(pr.number);
      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        avatarUrl: pr.user.avatar_url,
        branch: pr.head.ref,
        createdAt: pr.created_at,
        htmlUrl: pr.html_url,
        reviewed: !!dbReview,
        score: dbReview?.score ?? null,
        lastReviewedAt: dbReview?.updatedAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ pulls: formattedPulls });
  } catch (error) {
    console.error("Failed to list pull requests:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to list pull requests" },
      { status: 500 }
    );
  }
}
