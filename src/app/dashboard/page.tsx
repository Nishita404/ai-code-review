import { headers } from "next/headers";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft, Code2, LogIn, TrendingUp } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { review } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ReviewRow } from "@/components/dashboard/review-row";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-rose-400";
}

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
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  // ── Auth check (server-side) ──
  const reqHeaders = await headers();
  const session = await getAuth()
    .api.getSession({ headers: reqHeaders })
    .catch(() => null);

  const isSignedIn = !!session?.user?.id;

  // ── Fetch reviews from DB ──
  let reviews: {
    id: string;
    language: string;
    score: number;
    summary: string;
    createdAt: Date;
  }[] = [];

  if (isSignedIn) {
    const db = getDb();
    reviews = await db
      .select({
        id: review.id,
        language: review.language,
        score: review.score,
        summary: review.summary,
        createdAt: review.createdAt,
      })
      .from(review)
      .where(eq(review.userId, session!.user.id))
      .orderBy(desc(review.createdAt))
      .limit(50);
  }

  // ── Derived stats ──
  const avgScore =
    reviews.length > 0
      ? Math.round(
          reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length,
        )
      : null;

  const topLanguage = (() => {
    if (reviews.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const r of reviews) counts[r.language] = (counts[r.language] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  })();

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.03),transparent_40%)]" />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        {/* ── Header ── */}
        <div className="mb-12">
          <Link
            href="/review"
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <Badge className="border-white/10 bg-white/5 text-slate-200">
                Review history
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Dashboard
              </h1>
              <p className="text-base leading-7 text-slate-400">
                Your saved code reviews, scores, and findings in one place.
              </p>
            </div>

            <ButtonLink
              href="/review"
              className="h-11 self-start px-5 sm:self-auto"
            >
              New review
            </ButtonLink>
          </div>
        </div>

        {/* ── Not signed in ── */}
        {!isSignedIn && (
          <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <LogIn className="h-7 w-7 text-slate-500" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-white">
                Sign in to view your dashboard
              </p>
              <p className="text-sm text-slate-400">
                Your review history is saved per account.
              </p>
            </div>
            <div className="flex gap-3">
              <ButtonLink href="/auth/sign-in" className="h-10 px-5 text-sm">
                Sign in
              </ButtonLink>
              <ButtonLink
                href="/auth/sign-up"
                variant="secondary"
                className="h-10 px-5 text-sm"
              >
                Create account
              </ButtonLink>
            </div>
          </div>
        )}

        {/* ── Signed in ── */}
        {isSignedIn && (
          <div className="space-y-8">
            {/* Stats row */}
            {reviews.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Total reviews"
                  value={String(reviews.length)}
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
            )}

            {/* Empty state */}
            {reviews.length === 0 && (
              <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <Code2 className="h-7 w-7 text-slate-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-white">
                    No reviews yet
                  </p>
                  <p className="text-sm text-slate-400">
                    Head to the workspace, paste some code, and run your first
                    review.
                  </p>
                </div>
                <ButtonLink href="/review" className="h-10 px-5 text-sm">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Start reviewing
                </ButtonLink>
              </div>
            )}

            {/* Review list */}
            {reviews.length > 0 && (
              <div>
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-slate-500">
                  Recent reviews — {reviews.length} saved
                </p>
                <div className="overflow-hidden rounded-3xl border border-white/10">
                  {reviews.map((r, i) => (
                    <ReviewRow
                      key={r.id}
                      id={r.id}
                      language={r.language}
                      score={r.score}
                      summary={r.summary}
                      createdAt={r.createdAt.toISOString()}
                      scoreColor={scoreColor(r.score)}
                      isLast={i === reviews.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
