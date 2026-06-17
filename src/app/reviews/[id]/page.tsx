import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { ArrowLeft, Calendar, Code2 } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { getDb } from "@/db";
import { review } from "@/db/schema";
import type { ReviewResponse, ReviewIssue } from "@/lib/review-schema";
import { cn } from "@/lib/cn";
import { ReviewOrganizer } from "@/components/dashboard/review-organizer";

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

function scoreBg(score: number) {
  if (score >= 80) return "border-emerald-400/20 bg-emerald-400/10";
  if (score >= 60) return "border-amber-400/20 bg-amber-400/10";
  return "border-rose-400/20 bg-rose-400/10";
}

function severityColor(s: ReviewIssue["severity"]) {
  if (s === "critical" || s === "high") return "text-rose-400";
  if (s === "medium") return "text-amber-400";
  return "text-sky-400";
}

function severityBorder(s: ReviewIssue["severity"]) {
  if (s === "critical" || s === "high") return "border-rose-400/15";
  if (s === "medium") return "border-amber-400/15";
  return "border-sky-400/15";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
      {children}
    </h2>
  );
}

function IssueCard({ item }: { item: ReviewIssue }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        severityBorder(item.severity),
        "bg-white/[0.02]",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-5 text-white">{item.title}</p>
        <span
          className={cn(
            "mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em]",
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
        <p className="mt-2 text-xs leading-5">
          <span className="font-semibold text-emerald-400">Fix: </span>
          <span className="text-emerald-300/80">{item.fix}</span>
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
      <SectionHeading>{label}</SectionHeading>
      {items.length === 0 ? (
        <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-slate-600">
          No findings.
        </p>
      ) : (
        <div className="space-y-2.5">
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

  const reqHeaders = await headers();
  const session = await getAuth()
    .api.getSession({ headers: reqHeaders })
    .catch(() => null);

  if (!session?.user?.id) {
    redirect(`/auth/sign-in?next=/reviews/${id}`);
  }

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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.03),transparent_40%)]" />

      <div className="relative mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        {/* Back */}
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        {/* ── Hero ── */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm font-medium text-slate-200">
              {row.language}
            </span>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-bold",
                scoreBg(row.score),
                scoreColor(row.score),
              )}
            >
              {row.score}/100
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(row.createdAt)}
          </div>
        </div>

        {/* ── Organizer (star + tags) ── */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5">
          <ReviewOrganizer
            reviewId={row.id}
            initialStarred={row.starred}
            initialTags={row.tags ?? []}
          />
        </div>

        {/* ── Summary ── */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-5">
          <SectionHeading>Summary</SectionHeading>
          <p className="text-sm leading-7 text-slate-300">{rj.summary}</p>
        </div>

        {/* ── Finding counts ── */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Bugs", count: rj.bugs.length },
            { label: "Security", count: rj.security.length },
            { label: "Performance", count: rj.performance.length },
            { label: "Quality", count: rj.quality.length },
          ].map(({ label, count }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-center"
            >
              <p className="text-2xl font-semibold text-white">{count}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Findings ── */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <IssueSection label="Bugs" items={rj.bugs} />
          <IssueSection label="Security" items={rj.security} />
          <IssueSection label="Performance" items={rj.performance} />
          <IssueSection label="Code Quality" items={rj.quality} />
        </div>

        {/* ── Suggestions ── */}
        {rj.suggestions.length > 0 && (
          <div className="mb-8">
            <SectionHeading>Suggestions</SectionHeading>
            <div className="space-y-2">
              {rj.suggestions.map((s, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-sm leading-6 text-slate-300"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Code ── */}
        <div>
          <SectionHeading>Reviewed code</SectionHeading>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-2.5">
              <div className="flex items-center gap-2">
                <Code2 className="h-3.5 w-3.5 text-slate-600" />
                <span className="font-mono text-xs text-slate-500">
                  {row.language}
                </span>
              </div>
              <span className="text-[10px] text-slate-700">
                {row.code.split("\n").length} lines
              </span>
            </div>
            <pre className="overflow-auto px-5 py-4 font-mono text-xs leading-6 text-slate-300 [scrollbar-color:rgba(255,255,255,0.08)_transparent] [scrollbar-width:thin]">
              {row.code}
            </pre>
          </div>
        </div>
      </div>
    </main>
  );
}
