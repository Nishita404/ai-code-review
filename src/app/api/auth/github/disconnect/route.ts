import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { githubAccounts } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Sign in to disconnect GitHub." },
        { status: 401 }
      );
    }

    const db = getDb();
    
    // Delete the connection (cascades to repositories)
    const result = await db
      .delete(githubAccounts)
      .where(eq(githubAccounts.userId, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disconnect GitHub account:", error);
    return NextResponse.json(
      { error: "Internal server error disconnecting GitHub account." },
      { status: 500 }
    );
  }
}
