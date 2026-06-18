import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import {
  ArrowLeft,
  Code2,
  TrendingUp,
  Plus,
  Star,
  ShieldAlert,
  Zap,
  Bug,
  Layers,
} from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { review } from "@/db/schema";
import type { ReviewResponse } from "@/lib/review-schema";
import { ReviewsTable } from "@/components/dashboard/reviews-table";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { GithubConnectCard } from "@/components/review/github-connect-card";
import type { TrendPoint } from "@/components/dashboard/trend-chart";
import { LanguageChart } from "@/components/dashboard/language-chart";
import type { LanguagePoint } from "@/components/dashboard/language-chart";
import { ScoreDistChart } from "@/components/dashboard/score-dist-chart";
import type { ScoreBucket } from "@/components/dashboard/score-dist-chart";
import { FindingsChart } from "@/components/dashboard/findings-chart";
import type { FindingPoint } from "@/components/dashboard/findings-chart";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
      {children}
    </p>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
          {label}
        </p>
        <span className="text-slate-600">{icon}</span>
      </div>
      <p
        className={`text-3xl font-semibold tracking-tight ${accent ?? "text-white"}`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-600">{sub}</p>}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}

// ─── Analytics computation (pure, server-side) ────────────────────────────────

type RawReview = {
  id: string;
  language: string;
  score: number;
  summary: string;
  starred: boolean;
  tags: string[];
  reviewJson: unknown;
  createdAt: Date;
};

function computeAnalytics(reviews: RawReview[]) {
  const total = reviews.length;

  // ── Basic stats ──
  const avgScore =
    total > 0
      ? Math.round(reviews.reduce((s, r) => s + r.score, 0) / total)
      : null;

  const starredCount = reviews.filter((r) => r.starred).length;

  // ── Language distribution ──
  const langCounts: Record<string, number> = {};
  for (const r of reviews)
    langCounts[r.language] = (langCounts[r.language] ?? 0) + 1;

  const languageData: LanguagePoint[] = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([language, count]) => ({ language, count }));

  const topLanguage = languageData[0]?.language ?? null;

  // ── Findings totals (from stored reviewJson) ──
  let totalBugs = 0;
  let totalSecurity = 0;
  let totalPerformance = 0;
  let totalQuality = 0;

  for (const r of reviews) {
    const rj = r.reviewJson as ReviewResponse | null;
    if (!rj) continue;
    totalBugs += rj.bugs?.length ?? 0;
    totalSecurity += rj.security?.length ?? 0;
    totalPerformance += rj.performance?.length ?? 0;
    totalQuality += rj.quality?.length ?? 0;
  }

  const findingsData: FindingPoint[] = [
    { category: "Bugs", count: totalBugs, color: "#fb7185" },
    { category: "Security", count: totalSecurity, color: "#f97316" },
    { category: "Performance", count: totalPerformance, color: "#60a5fa" },
    { category: "Quality", count: totalQuality, color: "#a78bfa" },
  ];

  // ── Score distribution ──
  const scoreDistData: ScoreBucket[] = [
    {
      label: "< 40",
      count: reviews.filter((r) => r.score < 40).length,
      color: "#fb7185",
    },
    {
      label: "40–59",
      count: reviews.filter((r) => r.score >= 40 && r.score < 60).length,
      color: "#f97316",
    },
    {
      label: "60–79",
      count: reviews.filter((r) => r.score >= 60 && r.score < 80).length,
      color: "#f59e0b",
    },
    {
      label: "80–100",
      count: reviews.filter((r) => r.score >= 80).length,
      color: "#34d399",
    },
  ];

  // ── Daily trend (last 30 days) ──
  const now = new Date();
  const dayMs = 86_400_000;
  const days = 30;

  // Build a map day → { count, scoreSum }
  const dayMap: Record<string, { count: number; scoreSum: number }> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * dayMs);
    const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    dayMap[key] = { count: 0, scoreSum: 0 };
  }

  for (const r of reviews) {
    const key = r.createdAt.toISOString().slice(0, 10);
    if (dayMap[key]) {
      dayMap[key]!.count += 1;
      dayMap[key]!.scoreSum += r.score;
    }
  }

  const trendData: TrendPoint[] = Object.entries(dayMap).map(([key, v]) => {
    const date = new Date(key + "T12:00:00Z");
    const label = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return {
      date: label,
      reviews: v.count,
      avgScore: v.count > 0 ? Math.round(v.scoreSum / v.count) : null,
    };
  });

  // Show only days with activity, or thin the series if all 30 are empty
  const hasActivity = trendData.some((d) => d.reviews > 0);
  const displayTrend = hasActivity
    ? trendData.filter((_, i) => {
        // Always include first, last, and every-other for readability
        return (
          i === 0 ||
          i === trendData.length - 1 ||
          trendData[i]!.reviews > 0 ||
          i % 3 === 0
        );
      })
    : trendData.filter((_, i) => i % 5 === 0);

  return {
    total,
    avgScore,
    topLanguage,
    starredCount,
    totalSecurity,
    totalPerformance,
    languageData,
    findingsData,
    scoreDistData,
    trendData: displayTrend,
  };
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
      starred: review.starred,
      tags: review.tags,
      reviewJson: review.reviewJson,
      createdAt: review.createdAt,
    })
    .from(review)
    .where(eq(review.userId, session.user.id))
    .orderBy(desc(review.createdAt))
    .limit(500);

  const analytics = computeAnalytics(reviews);

  // Serialise for client table (strip reviewJson — not needed in table)
  const tableRows = reviews.map((r) => ({
    id: r.id,
    language: r.language,
    score: r.score,
    summary: r.summary,
    starred: r.starred,
    tags: r.tags,
    createdAt: r.createdAt.toISOString(),
  }));

  if (analytics.total === 0) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.03),transparent_40%)]" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <PageHeader />
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
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.03),transparent_40%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <PageHeader />

        <div className="space-y-10">
          {/* ── KPI row ── */}
          <section>
            <SectionLabel>Overview</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total reviews"
                value={String(analytics.total)}
                sub="saved to your account"
                icon={<Layers className="h-4 w-4" />}
              />
              <StatCard
                label="Average score"
                value={
                  analytics.avgScore !== null
                    ? `${analytics.avgScore}/100`
                    : "—"
                }
                sub="across all reviews"
                icon={<TrendingUp className="h-4 w-4" />}
                accent={
                  analytics.avgScore === null
                    ? "text-slate-500"
                    : analytics.avgScore >= 80
                      ? "text-emerald-400"
                      : analytics.avgScore >= 60
                        ? "text-amber-400"
                        : "text-rose-400"
                }
              />
              <StatCard
                label="Starred"
                value={String(analytics.starredCount)}
                sub={`of ${analytics.total} reviews`}
                icon={<Star className="h-4 w-4" />}
                accent="text-amber-400"
              />
              <StatCard
                label="Top language"
                value={analytics.topLanguage ?? "—"}
                sub="most reviewed"
                icon={<Code2 className="h-4 w-4" />}
              />
            </div>
          </section>

          {/* ── Finding KPIs ── */}
          <section>
            <SectionLabel>Findings summary</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Bug findings"
                value={String(
                  analytics.findingsData.find((f) => f.category === "Bugs")
                    ?.count ?? 0,
                )}
                sub="across all reviews"
                icon={<Bug className="h-4 w-4" />}
                accent="text-rose-400"
              />
              <StatCard
                label="Security findings"
                value={String(analytics.totalSecurity)}
                sub="across all reviews"
                icon={<ShieldAlert className="h-4 w-4" />}
                accent="text-orange-400"
              />
              <StatCard
                label="Performance findings"
                value={String(analytics.totalPerformance)}
                sub="across all reviews"
                icon={<Zap className="h-4 w-4" />}
                accent="text-blue-400"
              />
              <StatCard
                label="Quality findings"
                value={String(
                  analytics.findingsData.find((f) => f.category === "Quality")
                    ?.count ?? 0,
                )}
                sub="across all reviews"
                icon={<Layers className="h-4 w-4" />}
                accent="text-violet-400"
              />
            </div>
          </section>

          {/* ── Integrations ── */}
          <section>
            <SectionLabel>Integrations</SectionLabel>
            <GithubConnectCard />
          </section>

          {/* ── Charts row 1: trend + findings ── */}
          <section>
            <SectionLabel>Trends & findings</SectionLabel>
            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <ChartCard title="Reviews per day — last 30 days">
                <TrendChart data={analytics.trendData} />
              </ChartCard>
              <ChartCard title="Findings by category">
                <FindingsChart data={analytics.findingsData} />
              </ChartCard>
            </div>
          </section>

          {/* ── Charts row 2: language distribution + score distribution ── */}
          <section>
            <SectionLabel>Distribution</SectionLabel>
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Language distribution">
                <LanguageChart data={analytics.languageData} />
              </ChartCard>
              <ChartCard title="Score distribution">
                <ScoreDistChart data={analytics.scoreDistData} />
              </ChartCard>
            </div>
          </section>

          {/* ── Review table ── */}
          <section>
            <SectionLabel>All reviews</SectionLabel>
            <ReviewsTable initialReviews={tableRows} />
          </section>
        </div>
      </div>
    </main>
  );
}

function PageHeader() {
  return (
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
  );
}
