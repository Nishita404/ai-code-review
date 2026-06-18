import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { reviewProject } from "@/db/schema";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json({ projects: [], signedIn: false });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(reviewProject)
      .where(eq(reviewProject.userId, session.user.id))
      .orderBy(desc(reviewProject.createdAt))
      .limit(20);

    return NextResponse.json({ projects: rows, signedIn: true });
  } catch {
    return NextResponse.json({ projects: [], signedIn: false });
  }
}
