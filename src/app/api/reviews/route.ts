import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { review } from "@/db/schema";

export async function GET() {
  try {
    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json({ reviews: [], signedIn: false });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(review)
      .where(eq(review.userId, session.user.id))
      .orderBy(desc(review.createdAt))
      .limit(20);

    return NextResponse.json({ reviews: rows, signedIn: true });
  } catch {
    return NextResponse.json({ reviews: [], signedIn: false });
  }
}
