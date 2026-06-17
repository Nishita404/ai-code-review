"use client";

import Link from "next/link";
import { Clock, Code2, LogIn, X } from "lucide-react";
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
  isOpen: boolean;
  selectedId: string | null;
  onClose: () => void;
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
  isOpen,
  selectedId,
  onClose,
  onSelect,
}: ReviewHistoryPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-white/10 bg-[#080808] shadow-2xl transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="Review history"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3.5">
          <Clock className="h-3.5 w-3.5 text-slate-500" />
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-500">
            History
          </p>
          {isSignedIn && reviews.length > 0 && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">
              {reviews.length}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-1 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-300"
            aria-label="Close history"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgba(255,255,255,0.08)_transparent] [scrollbar-width:thin]">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400" />
            </div>
          ) : !isSignedIn ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                <LogIn className="h-5 w-5 text-slate-600" />
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Sign in to save and browse review history
              </p>
              <a
                href="/auth/sign-in"
                className="text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
              >
                Sign in →
              </a>
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
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
                  onClick={() => {
                    onSelect(r);
                    onClose();
                  }}
                  className={cn(
                    "w-full px-4 py-3.5 text-left transition-colors duration-150 hover:bg-white/[0.04]",
                    selectedId === r.id
                      ? "border-l-2 border-emerald-400 bg-white/[0.05] pl-[14px]"
                      : "border-l-2 border-transparent",
                  )}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
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
                  <p className="line-clamp-2 text-xs leading-[1.55] text-slate-400">
                    {r.summary}
                  </p>
                  <p className="mt-1.5 text-[10px] text-slate-600">
                    {formatDate(r.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer — link to full dashboard */}
        {isSignedIn && (
          <div className="shrink-0 border-t border-white/10 px-4 py-3">
            <Link
              href="/dashboard"
              className="block w-full rounded-xl border border-white/10 bg-white/[0.03] py-2 text-center text-xs font-medium text-slate-400 transition hover:border-white/20 hover:text-slate-200"
            >
              View full dashboard →
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
