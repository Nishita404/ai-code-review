import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft, Code2, TrendingUp, Plus } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { review } from "@/db/schema";
import { ReviewsTable } from "@/components/dashboard/reviews-table";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const reqHeaders = await headers();
  const session = await getAuth()
    .api.getSession({ headers: reqHeaders })
    .catch(() => null);

  if (!session?.user?.id) {
    redirect("/auth/sign-in?next=/dashboard");
  }

  const db = getDb();
  const reviews = await db
    .select({
      id: review.id,
      language: review.language,
      score: review.score,
      summary: review.summary,
      createdAt: review.createdAt,
    })
    .from(review)
    .where(eq(review.userId, session.user.id))
    .orderBy(desc(review.createdAt))
    .limit(200);

  // ── Stats ──
  const total = reviews.length;
  const avgScore =
    total > 0
      ? Math.round(reviews.reduce((s, r) => s + r.score, 0) / total)
      : null;

  const topLanguage = (() => {
    if (total === 0) return null;
    const counts: Record<string, number> = {};
    for (const r of reviews) counts[r.language] = (counts[r.language] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();

  // Serialise dates to ISO strings for the client component
  const serialised = reviews.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.03),transparent_40%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* ── Header ── */}
        <div className="mb-10">
          <Link
            href="/review"
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
                Review management
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Dashboard
              </h1>
            </div>
            <Link
              href="/review"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              New review
            </Link>
          </div>
        </div>

        {total === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.02] py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Code2 className="h-7 w-7 text-slate-600" />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-medium text-white">No reviews yet</p>
              <p className="text-sm text-slate-500">
                Head to the workspace and run your first review.
              </p>
            </div>
            <Link
              href="/review"
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-black transition hover:bg-slate-200"
            >
              <TrendingUp className="h-4 w-4" />
              Start reviewing
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ── Stats ── */}
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Total reviews"
                value={String(total)}
                sub="saved to your account"
              />
              <StatCard
                label="Average score"
                value={avgScore !== null ? `${avgScore}/100` : "—"}
                sub="across all reviews"
              />
              <StatCard
                label="Top language"
                value={topLanguage ?? "—"}
                sub="most reviewed"
              />
            </div>

            {/* ── Review table ── */}
            <div>
              <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
                All reviews
              </p>
              <ReviewsTable initialReviews={serialised} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
