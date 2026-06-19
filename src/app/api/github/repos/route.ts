import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { githubAccounts, githubRepositories } from "@/db/schema";

export async function GET() {
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
      return NextResponse.json({ repos: [] });
    }

    // Get all repositories for this account
    const repos = await db
      .select()
      .from(githubRepositories)
      .where(eq(githubRepositories.githubAccountId, account.id));

    return NextResponse.json({ repos });
  } catch (error) {
    console.error("Failed to list repositories:", error);
    return NextResponse.json(
      { error: "Unable to retrieve repositories" },
      { status: 500 }
    );
  }
}
