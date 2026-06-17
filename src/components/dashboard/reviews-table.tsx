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
  Star,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewSummary = {
  id: string;
  language: string;
  score: number;
  summary: string;
  starred: boolean;
  tags: string[];
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
      className="inline-flex items-center gap-1 text-slate-500 transition hover:text-slate-300"
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
  const [tagFilter, setTagFilter] = useState("all");
  const [starredOnly, setStarredOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Unique languages and tags
  const languages = useMemo(
    () => [
      "all",
      ...Array.from(new Set(reviews.map((r) => r.language))).sort(),
    ],
    [reviews],
  );
  const allTags = useMemo(
    () => [
      "all",
      ...Array.from(new Set(reviews.flatMap((r) => r.tags))).sort(),
    ],
    [reviews],
  );

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...reviews];

    if (starredOnly) list = list.filter((r) => r.starred);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.summary.toLowerCase().includes(q) ||
          r.language.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (langFilter !== "all")
      list = list.filter((r) => r.language === langFilter);
    if (tagFilter !== "all")
      list = list.filter((r) => r.tags.includes(tagFilter));

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
  }, [
    reviews,
    search,
    langFilter,
    scoreFilter,
    tagFilter,
    starredOnly,
    sortField,
    sortDir,
  ]);

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  // ── Optimistic star toggle ───────────────────────────────────────────────
  function handleStar(id: string, current: boolean) {
    setActionError(null);
    // Optimistic update
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, starred: !current } : r)),
    );
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reviews/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ starred: !current }),
        });
        if (!res.ok) throw new Error("Failed to update");
      } catch {
        // Roll back
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, starred: current } : r)),
        );
        setActionError("Failed to update star — please try again.");
      }
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    setDeletingId(id);
    setActionError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Failed to delete");
        }
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to delete review",
        );
      } finally {
        setDeletingId(null);
      }
    });
  }

  const hasFilters =
    search ||
    langFilter !== "all" ||
    scoreFilter !== "all" ||
    tagFilter !== "all" ||
    starredOnly;

  function clearFilters() {
    setSearch("");
    setLangFilter("all");
    setScoreFilter("all");
    setTagFilter("all");
    setStarredOnly(false);
  }

  const filterSelectCls =
    "h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-300 outline-none transition focus:border-white/20 focus:bg-white/[0.05] cursor-pointer";

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3">
        {/* Row 1: search + starred toggle */}
        <div className="flex items-center gap-3">
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
          <button
            type="button"
            onClick={() => setStarredOnly((v) => !v)}
            title={starredOnly ? "Show all reviews" : "Show starred only"}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition",
              starredOnly
                ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                : "border-white/10 bg-white/[0.03] text-slate-500 hover:border-white/20 hover:text-slate-300",
            )}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                starredOnly && "fill-amber-400 text-amber-400",
              )}
            />
            Starred
          </button>
        </div>

        {/* Row 2: filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className={filterSelectCls}
          >
            {languages.map((l) => (
              <option key={l} value={l} className="bg-[#0a0a0a]">
                {l === "all" ? "All languages" : l}
              </option>
            ))}
          </select>

          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className={filterSelectCls}
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

          {allTags.length > 1 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className={filterSelectCls}
            >
              {allTags.map((t) => (
                <option key={t} value={t} className="bg-[#0a0a0a]">
                  {t === "all" ? "All tags" : t}
                </option>
              ))}
            </select>
          )}

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

      {/* Error banner */}
      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-2.5">
          <p className="text-sm text-rose-300">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-2xl border border-white/10">
        {/* Column headers — desktop only */}
        <div className="hidden grid-cols-[28px_minmax(80px,100px)_76px_1fr_100px_96px] items-center gap-3 border-b border-white/[0.07] px-4 py-2.5 sm:grid">
          {/* star col — no label */}
          <span />
          <ColLabel
            field="language"
            current={sortField}
            dir={sortDir}
            onSort={handleSort}
          >
            Language
          </ColLabel>
          <ColLabel
            field="score"
            current={sortField}
            dir={sortDir}
            onSort={handleSort}
          >
            Score
          </ColLabel>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Summary
          </span>
          <ColLabel
            field="createdAt"
            current={sortField}
            dir={sortDir}
            onSort={handleSort}
          >
            Date
          </ColLabel>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            Actions
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <p className="text-sm font-medium text-slate-400">
              {reviews.length === 0
                ? "No reviews yet."
                : "No reviews match your filters."}
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
              <ReviewRow
                key={r.id}
                review={r}
                isDeleting={deletingId === r.id}
                isPending={isPending}
                onStar={handleStar}
                onDelete={handleDelete}
              />
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

// ─── Column label helper ──────────────────────────────────────────────────────

function ColLabel({
  children,
  field,
  current,
  dir,
  onSort,
}: {
  children: React.ReactNode;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
        {children}
      </span>
      <SortButton field={field} current={current} dir={dir} onSort={onSort} />
    </div>
  );
}

// ─── Single row ───────────────────────────────────────────────────────────────

function ReviewRow({
  review: r,
  isDeleting,
  isPending,
  onStar,
  onDelete,
}: {
  review: ReviewSummary;
  isDeleting: boolean;
  isPending: boolean;
  onStar: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-y-2 px-4 py-3.5 transition-colors duration-100",
        "sm:grid-cols-[28px_minmax(80px,100px)_76px_1fr_100px_96px] sm:items-start sm:gap-3",
        isDeleting && "opacity-40 pointer-events-none",
      )}
    >
      {/* ── Star ── */}
      <button
        type="button"
        onClick={() => onStar(r.id, r.starred)}
        disabled={isPending}
        title={r.starred ? "Unstar" : "Star this review"}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition",
          r.starred
            ? "text-amber-400 hover:text-amber-300"
            : "text-slate-700 hover:text-slate-400",
        )}
      >
        <Star className={cn("h-3.5 w-3.5", r.starred && "fill-amber-400")} />
      </button>

      {/* ── Language ── */}
      <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-slate-200">
        {r.language}
      </span>

      {/* ── Score ── */}
      <span
        className={cn(
          "inline-flex w-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold",
          scoreBadge(r.score),
        )}
      >
        {r.score}/100
      </span>

      {/* ── Summary + tags ── */}
      <div className="min-w-0">
        <p className="truncate text-sm text-slate-400">{r.summary}</p>
        {r.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {r.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-500"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Date ── */}
      <p className="text-xs text-slate-600 sm:pt-0.5 sm:text-right">
        {formatDate(r.createdAt)}
      </p>

      {/* ── Actions ── */}
      <div className="flex items-center gap-1.5 sm:justify-end">
        <Link
          href={`/reviews/${r.id}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition hover:border-white/20 hover:text-slate-200"
          title="View details"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => onDelete(r.id)}
          disabled={isDeleting || isPending}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-400 disabled:opacity-40"
          title="Delete review"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
