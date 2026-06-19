import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { githubAccounts, githubRepositories } from "@/db/schema";
import { decrypt } from "@/lib/encryption";

export async function POST() {
  try {
    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();
    
    // Find linked GitHub account
    const accounts = await db
      .select()
      .from(githubAccounts)
      .where(eq(githubAccounts.userId, session.user.id))
      .limit(1);

    const account = accounts[0];
    if (!account) {
      return NextResponse.json({ error: "GitHub account connection not found" }, { status: 404 });
    }

    // Decrypt access token
    const accessToken = decrypt(account.encryptedAccessToken);

    // Fetch latest repos from GitHub
    const reposResponse = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ai-code-review",
      },
    });

    if (!reposResponse.ok) {
      throw new Error(`GitHub repositories API returned status: ${reposResponse.status}`);
    }

    const reposData = (await reposResponse.json()) as {
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      html_url: string;
      description?: string;
      language?: string;
      stargazers_count?: number;
    }[];

    // Transaction/Batch: Delete existing repository sync logs and insert new ones
    await db.delete(githubRepositories).where(eq(githubRepositories.githubAccountId, account.id));

    let insertedRepos: any[] = [];
    if (reposData.length > 0) {
      const records = reposData.map((repo) => ({
        id: crypto.randomUUID(),
        githubAccountId: account.id,
        repoId: String(repo.id),
        name: repo.name,
        fullName: repo.full_name,
        isPrivate: repo.private,
        htmlUrl: repo.html_url,
        description: repo.description || null,
        language: repo.language || null,
        stars: repo.stargazers_count ?? 0,
      }));

      await db.insert(githubRepositories).values(records);
      
      // Select the inserted records back to return them
      insertedRepos = await db
        .select()
        .from(githubRepositories)
        .where(eq(githubRepositories.githubAccountId, account.id));
    }

    return NextResponse.json({ success: true, repos: insertedRepos });
  } catch (error) {
    console.error("Failed to sync GitHub repositories:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync repositories" },
      { status: 500 }
    );
  }
}
