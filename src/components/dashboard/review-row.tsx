"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

type ReviewRowProps = {
  id: string;
  language: string;
  score: number;
  summary: string;
  createdAt: string;
  scoreColor: string;
  isLast: boolean;
};

function scoreBorder(score: number) {
  if (score >= 80) return "border-emerald-400/20 bg-emerald-400/10";
  if (score >= 60) return "border-amber-400/20 bg-amber-400/10";
  return "border-rose-400/20 bg-rose-400/10";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReviewRow({
  id,
  language,
  score,
  summary,
  createdAt,
  scoreColor,
  isLast,
}: ReviewRowProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 px-5 py-4 transition-colors duration-150 hover:bg-white/[0.025]",
        !isLast && "border-b border-white/[0.07]",
      )}
    >
      {/* Language pill */}
      <span className="mt-0.5 shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-slate-200">
        {language}
      </span>

      {/* Score pill */}
      <span
        className={cn(
          "mt-0.5 shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
          scoreBorder(score),
          scoreColor,
        )}
      >
        {score}/100
      </span>

      {/* Summary */}
      <p className="min-w-0 flex-1 truncate text-sm leading-6 text-slate-400">
        {summary}
      </p>

      {/* Date */}
      <p className="hidden shrink-0 text-xs text-slate-600 sm:block">
        {formatDate(createdAt)}
      </p>

      {/* View button */}
      <Link
        href={`/dashboard/${id}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-white/20 hover:text-slate-200"
      >
        <ExternalLink className="h-3 w-3" />
        View
      </Link>
    </div>
  );
}
