"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Trash2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewSummary = {
  id: string;
  language: string;
  score: number;
  summary: string;
  createdAt: string; // ISO string
};

type SortField = "score" | "createdAt" | "language";
type SortDir = "asc" | "desc";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreBadge(score: number) {
  if (score >= 80)
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-400";
  if (score >= 60) return "border-amber-400/20 bg-amber-400/10 text-amber-400";
  return "border-rose-400/20 bg-rose-400/10 text-rose-400";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SortButton({
  field,
  current,
  dir,
  onSort,
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-300"
    >
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewsTable({
  initialReviews,
}: {
  initialReviews: ReviewSummary[];
}) {
  const [reviews, setReviews] = useState<ReviewSummary[]>(initialReviews);
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Unique languages from the full list
  const languages = useMemo(
    () => [
      "all",
      ...Array.from(new Set(reviews.map((r) => r.language))).sort(),
    ],
    [reviews],
  );

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...reviews];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.summary.toLowerCase().includes(q) ||
          r.language.toLowerCase().includes(q),
      );
    }

    if (langFilter !== "all") {
      list = list.filter((r) => r.language === langFilter);
    }

    if (scoreFilter === "high") list = list.filter((r) => r.score >= 80);
    else if (scoreFilter === "mid")
      list = list.filter((r) => r.score >= 60 && r.score < 80);
    else if (scoreFilter === "low") list = list.filter((r) => r.score < 60);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "score") cmp = a.score - b.score;
      else if (sortField === "language")
        cmp = a.language.localeCompare(b.language);
      else
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [reviews, search, langFilter, scoreFilter, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Failed to delete");
        }
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        setDeleteError(
          err instanceof Error ? err.message : "Failed to delete review",
        );
      } finally {
        setDeletingId(null);
      }
    });
  }

  const hasFilters = search || langFilter !== "all" || scoreFilter !== "all";

  function clearFilters() {
    setSearch("");
    setLangFilter("all");
    setScoreFilter("all");
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-600" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reviews…"
            className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-8 pr-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-white/20 focus:bg-white/[0.05]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language filter */}
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-300 outline-none transition focus:border-white/20 focus:bg-white/[0.05]"
          >
            {languages.map((l) => (
              <option key={l} value={l} className="bg-[#0a0a0a]">
                {l === "all" ? "All languages" : l}
              </option>
            ))}
          </select>

          {/* Score filter */}
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-300 outline-none transition focus:border-white/20 focus:bg-white/[0.05]"
          >
            <option value="all" className="bg-[#0a0a0a]">
              All scores
            </option>
            <option value="high" className="bg-[#0a0a0a]">
              High (80–100)
            </option>
            <option value="mid" className="bg-[#0a0a0a]">
              Medium (60–79)
            </option>
            <option value="low" className="bg-[#0a0a0a]">
              Low (&lt;60)
            </option>
          </select>

          {/* Clear */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-400 transition hover:border-white/20 hover:text-slate-200"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2.5 text-sm text-rose-300">
          {deleteError}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        {/* Header */}
        <div className="hidden grid-cols-[minmax(80px,100px)_80px_1fr_120px_80px] items-center gap-4 border-b border-white/[0.07] px-5 py-2.5 sm:grid">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Language
            </span>
            <SortButton
              field="language"
              current={sortField}
              dir={sortDir}
              onSort={handleSort}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Score
            </span>
            <SortButton
              field="score"
              current={sortField}
              dir={sortDir}
              onSort={handleSort}
            />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Summary
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
              Date
            </span>
            <SortButton
              field="createdAt"
              current={sortField}
              dir={sortDir}
              onSort={handleSort}
            />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Actions
          </span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <p className="text-sm font-medium text-slate-400">
              No reviews match your filters
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-slate-600 transition hover:text-slate-400"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "grid grid-cols-1 gap-2 px-5 py-4 transition-colors duration-100 sm:grid-cols-[minmax(80px,100px)_80px_1fr_120px_80px] sm:items-center sm:gap-4",
                  deletingId === r.id && "opacity-40",
                )}
              >
                {/* Language */}
                <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-slate-200">
                  {r.language}
                </span>

                {/* Score */}
                <span
                  className={cn(
                    "inline-flex w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    scoreBadge(r.score),
                  )}
                >
                  {r.score}/100
                </span>

                {/* Summary */}
                <p className="min-w-0 truncate text-sm text-slate-400">
                  {r.summary}
                </p>

                {/* Date */}
                <p className="text-xs text-slate-600 sm:text-right">
                  {formatDate(r.createdAt)}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:justify-end">
                  <Link
                    href={`/reviews/${r.id}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition hover:border-white/20 hover:text-slate-200"
                    title="View details"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id || isPending}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-400 disabled:opacity-40"
                    title="Delete review"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Count */}
      {reviews.length > 0 && (
        <p className="text-right text-xs text-slate-600">
          {filtered.length === reviews.length
            ? `${reviews.length} review${reviews.length === 1 ? "" : "s"}`
            : `${filtered.length} of ${reviews.length} reviews`}
        </p>
      )}
    </div>
  );
}
