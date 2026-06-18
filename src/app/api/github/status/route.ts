import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, count } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { githubAccounts, githubRepositories } from "@/db/schema";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json({ connected: false });
    }

    const db = getDb();
    const accounts = await db
      .select()
      .from(githubAccounts)
      .where(eq(githubAccounts.userId, session.user.id))
      .limit(1);

    const account = accounts[0];
    if (!account) {
      return NextResponse.json({ connected: false });
    }

    // Count synced repositories
    const repoCountResult = await db
      .select({ val: count() })
      .from(githubRepositories)
      .where(eq(githubRepositories.githubAccountId, account.id));

    const repoCount = repoCountResult[0]?.val ?? 0;

    return NextResponse.json({
      connected: true,
      username: account.username,
      avatar: account.avatar,
      repoCount,
    });
  } catch (error) {
    console.error("Failed to fetch GitHub status:", error);
    return NextResponse.json({ connected: false });
  }
}
