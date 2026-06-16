"use client";

import { Clock, Code2, LogIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { ReviewResponse } from "@/lib/review-schema";

export type SavedReview = {
  id: string;
  code: string;
  language: string;
  score: number;
  summary: string;
  reviewJson: ReviewResponse;
  createdAt: string;
};

type ReviewHistoryPanelProps = {
  reviews: SavedReview[];
  isLoading: boolean;
  isSignedIn: boolean;
  selectedId: string | null;
  onSelect: (review: SavedReview) => void;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
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

export function ReviewHistoryPanel({
  reviews,
  isLoading,
  isSignedIn,
  selectedId,
  onSelect,
}: ReviewHistoryPanelProps) {
  return (
    <Card className="flex flex-col border-white/10 bg-white/[0.03] overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 shrink-0">
        <Clock className="h-3.5 w-3.5 text-slate-500" />
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-500">
          History
        </p>
        {isSignedIn && reviews.length > 0 && (
          <span className="ml-auto rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">
            {reviews.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
          </div>
        ) : !isSignedIn ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <LogIn className="h-5 w-5 text-slate-600" />
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Sign in to save review history
            </p>
            <a
              href="/auth/sign-in"
              className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
            >
              Sign in →
            </a>
          </div>
        ) : reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Code2 className="h-5 w-5 text-slate-600" />
            </div>
            <p className="text-xs leading-5 text-slate-500">
              No saved reviews yet.
              <br />
              Run your first review!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {reviews.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelect(r)}
                className={cn(
                  "w-full px-4 py-3 text-left transition-all duration-150 hover:bg-white/[0.04]",
                  selectedId === r.id
                    ? "border-l-2 border-emerald-400 bg-white/[0.05] pl-3.5"
                    : "border-l-2 border-transparent",
                )}
              >
                {/* Language + score row */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-300">
                    {r.language}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      scoreBg(r.score),
                      scoreColor(r.score),
                    )}
                  >
                    {r.score}/100
                  </span>
                </div>

                {/* Summary */}
                <p className="line-clamp-2 text-xs leading-[1.55] text-slate-400">
                  {r.summary}
                </p>

                {/* Date */}
                <p className="mt-1.5 text-[10px] text-slate-600">
                  {formatDate(r.createdAt)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
