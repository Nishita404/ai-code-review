import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { review } from "@/db/schema";
import type { ReviewResponse, ReviewIssue } from "@/lib/review-schema";
import { cn } from "@/lib/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-rose-400";
}

function scoreBorder(score: number) {
  if (score >= 80) return "border-emerald-400/20 bg-emerald-400/10";
  if (score >= 60) return "border-amber-400/20 bg-amber-400/10";
  return "border-rose-400/20 bg-rose-400/10";
}

function severityColor(severity: ReviewIssue["severity"]) {
  switch (severity) {
    case "critical":
    case "high":
      return "text-rose-300";
    case "medium":
      return "text-amber-300";
    default:
      return "text-sky-300";
  }
}

function severityBorder(severity: ReviewIssue["severity"]) {
  switch (severity) {
    case "critical":
    case "high":
      return "border-rose-400/15";
    case "medium":
      return "border-amber-400/15";
    default:
      return "border-sky-400/15";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
      {children}
    </p>
  );
}

function IssueCard({ item }: { item: ReviewIssue }) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white/[0.02] p-4",
        severityBorder(item.severity),
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-white">{item.title}</p>
        <span
          className={cn(
            "shrink-0 text-[10px] font-medium uppercase tracking-[0.2em]",
            severityColor(item.severity),
          )}
        >
          {item.severity}
        </span>
      </div>
      {item.explanation && (
        <p className="text-xs leading-5 text-slate-400">{item.explanation}</p>
      )}
      {item.fix && (
        <p className="mt-2 text-xs leading-5 text-emerald-300/80">
          <span className="font-medium text-emerald-400">Fix:</span> {item.fix}
        </p>
      )}
    </div>
  );
}

function IssueSection({
  label,
  items,
}: {
  label: string;
  items: ReviewIssue[];
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-slate-600">
          No findings.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <IssueCard key={i} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // ── Auth check ──
  const reqHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: reqHeaders }).catch(() => null);

  if (!session?.user?.id) {
    redirect("/auth/sign-in");
  }

  // ── Fetch review (must belong to signed-in user) ──
  const db = getDb();
  const rows = await db
    .select()
    .from(review)
    .where(and(eq(review.id, id), eq(review.userId, session.user.id)))
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  const rj = row.reviewJson as ReviewResponse;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.03),transparent_40%)]" />

      <div className="relative mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">

        {/* ── Back link ── */}
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* ── Hero row ── */}
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-medium text-slate-200">
              {row.language}
            </span>
            <span
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-bold",
                scoreBorder(row.score),
                scoreColor(row.score),
              )}
            >
              {row.score}/100
            </span>
          </div>
          <p className="text-sm text-slate-600">{formatDate(row.createdAt)}</p>
        </div>

        {/* ── Summary ── */}
        <div className="mb-10 rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-5">
          <SectionLabel>Summary</SectionLabel>
          <p className="text-base leading-7 text-slate-200">{rj.summary}</p>
        </div>

        {/* ── Score ring + stats strip ── */}
        <div className="mb-10 grid gap-4 sm:grid-cols-4">
          {[
            { label: "Bugs", count: rj.bugs.length },
            { label: "Security", count: rj.security.length },
            { label: "Performance", count: rj.performance.length },
            { label: "Quality", count: rj.quality.length },
          ].map(({ label, count }) => (
            <div
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center"
            >
              <p className="text-2xl font-semibold text-white">{count}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Issue sections ── */}
        <div className="mb-10 grid gap-8 sm:grid-cols-2">
          <IssueSection label="Bugs" items={rj.bugs} />
          <IssueSection label="Security" items={rj.security} />
          <IssueSection label="Performance" items={rj.performance} />
          <IssueSection label="Code Quality" items={rj.quality} />
        </div>

        {/* ── Suggestions ── */}
        {rj.suggestions.length > 0 && (
          <div className="mb-10">
            <SectionLabel>Suggestions</SectionLabel>
            <div className="space-y-2">
              {rj.suggestions.map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm leading-6 text-slate-300"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Code block ── */}
        <div>
          <SectionLabel>Reviewed code</SectionLabel>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/60">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <span className="font-mono text-xs text-slate-500">{row.language}</span>
              <span className="text-[10px] text-slate-700">
                {row.code.split("\n").length} lines
              </span>
            </div>
            <pre className="overflow-auto px-5 py-4 font-mono text-xs leading-6 text-slate-300 [scrollbar-color:rgba(255,255,255,0.1)_transparent] [scrollbar-width:thin]">
              {row.code}
            </pre>
          </div>
        </div>

      </div>
    </main>
  );
}
