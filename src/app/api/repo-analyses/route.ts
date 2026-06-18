import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { repoAnalysis } from "@/db/schema";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json({ analyses: [], signedIn: false });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(repoAnalysis)
      .where(eq(repoAnalysis.userId, session.user.id))
      .orderBy(desc(repoAnalysis.createdAt))
      .limit(20);

    return NextResponse.json({ analyses: rows, signedIn: true });
  } catch {
    return NextResponse.json({ analyses: [], signedIn: false });
  }
}
