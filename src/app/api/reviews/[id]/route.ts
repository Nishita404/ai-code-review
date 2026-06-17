import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { review } from "@/db/schema";

const patchSchema = z.object({
  starred: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(20).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { starred, tags } = parsed.data;
    if (starred === undefined && tags === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const db = getDb();
    const updates: Record<string, unknown> = {};
    if (starred !== undefined) updates.starred = starred;
    if (tags !== undefined) updates.tags = tags;

    const result = await db
      .update(review)
      .set(updates)
      .where(and(eq(review.id, id), eq(review.userId, session.user.id)))
      .returning({ id: review.id, starred: review.starred, tags: review.tags });

    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch {
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const reqHeaders = await headers();
    const session = await getAuth().api.getSession({ headers: reqHeaders });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    // Only delete if the review belongs to the signed-in user
    const result = await db
      .delete(review)
      .where(and(eq(review.id, id), eq(review.userId, session.user.id)))
      .returning({ id: review.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id: result[0]!.id });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 },
    );
  }
}
