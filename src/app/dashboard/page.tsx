"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Code2,
  ExternalLink,
  Loader2,
  LogIn,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { ReviewIssue, ReviewResponse } from "@/lib/review-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardReview = {
  id: string;
  code: string;
  language: string;
  score: number;
  summary: string;
  reviewJson: ReviewResponse;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function IssueList({ items }: { items: ReviewIssue[] }) {
  if (items.length === 0)
    return <p className="text-xs text-slate-500">No findings.</p>;
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-medium text-white">{item.title}</p>
            <span className={cn("text-[10px] uppercase tracking-[0.2em]", severityColor(item.severity))}>
              {item.severity}
            </span>
          </div>
          {item.explanation && (
            <p className="mt-1.5 text-xs leading-5 text-slate-400">{item.explanation}</p>
          )}
          {item.fix && (
            <p className="mt-1.5 text-xs leading-5 text-emerald-300/80">Fix: {item.fix}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: DashboardReview }) {
  const [expanded, setExpanded] = useState(false);
  const rj = review.reviewJson;

  return (
    <Card
      className={cn(
        "border-white/10 bg-white/[0.03] transition-all duration-300 ease-out",
        "hover:border-white/20 hover:shadow-[0_16px_40px_rgba(0,0,0,0.4)]",
        expanded && "border-white/15",
      )}
    >
      {/* ── Card summary row ── */}
      <CardHeader className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-slate-200">
              {review.language}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold",
                scoreBorder(review.score),
                scoreColor(review.score),
              )}
            >
              {review.score}/100
            </span>
          </div>
          <p className="shrink-0 text-xs text-slate-600">{formatDate(review.createdAt)}</p>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">{review.summary}</p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
              expanded
                ? "border-white/20 bg-white/[0.07] text-white"
                : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200",
            )}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                View details
              </>
            )}
          </button>

          <Link
            href="/review"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-white/20 hover:text-slate-200"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in workspace
          </Link>
        </div>
      </CardHeader>

      {/* ── Expanded detail ── */}
      {expanded && (
        <CardContent className="border-t border-white/[0.07] px-5 pb-5 pt-4">
          <div className="space-y-5">

            {/* Code block */}
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">Code</p>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                <div className="border-b border-white/10 px-4 py-2">
                  <span className="text-[10px] font-medium text-slate-500">{review.language}</span>
                </div>
                <pre className="max-h-56 overflow-auto px-4 py-3 font-mono text-xs leading-6 text-slate-300 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">
                  {review.code}
                </pre>
              </div>
            </div>

            {/* Review sections */}
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Bugs", items: rj.bugs },
                { label: "Security", items: rj.security },
                { label: "Performance", items: rj.performance },
                { label: "Code Quality", items: rj.quality },
              ].map((section) => (
                <div key={section.label}>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
                    {section.label}
                  </p>
                  <IssueList items={section.items} />
                </div>
              ))}
            </div>

            {/* Suggestions */}
            {rj.suggestions.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
                  Suggestions
                </p>
                <div className="space-y-2">
                  {rj.suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-slate-300"
                    >
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [reviews, setReviews] = useState<DashboardReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((data: { reviews: DashboardReview[]; signedIn: boolean }) => {
        setIsSignedIn(data.signedIn);
        setReviews(data.reviews ?? []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // ── Derived stats ──
  const avgScore =
    reviews.length > 0
      ? Math.round(reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length)
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
              <Badge className="border-white/10 bg-white/5 text-slate-200">Review history</Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Dashboard
              </h1>
              <p className="text-base leading-7 text-slate-400">
                Your saved code reviews, scores, and findings in one place.
              </p>
            </div>

            <ButtonLink href="/review" className="h-11 self-start px-5 sm:self-auto">
              New review
            </ButtonLink>
          </div>
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          </div>
        )}

        {/* ── Not signed in ── */}
        {!isLoading && !isSignedIn && (
          <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <LogIn className="h-7 w-7 text-slate-500" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-white">Sign in to view your dashboard</p>
              <p className="text-sm text-slate-400">Your review history is saved per account.</p>
            </div>
            <div className="flex gap-3">
              <ButtonLink href="/auth/sign-in" className="h-10 px-5 text-sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/auth/sign-up" variant="secondary" className="h-10 px-5 text-sm">
                Create account
              </ButtonLink>
            </div>
          </div>
        )}

        {/* ── Signed in ── */}
        {!isLoading && isSignedIn && (
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
                  <p className="text-lg font-medium text-white">No reviews yet</p>
                  <p className="text-sm text-slate-400">
                    Head to the workspace, paste some code, and run your first review.
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
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
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
