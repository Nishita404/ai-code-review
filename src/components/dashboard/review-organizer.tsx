"use client";

import { useState, useTransition } from "react";
import { Star, Tag, X, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Props = {
  reviewId: string;
  initialStarred: boolean;
  initialTags: string[];
};

export function ReviewOrganizer({ reviewId, initialStarred, initialTags }: Props) {
  const [starred, setStarred] = useState(initialStarred);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Patch helper ─────────────────────────────────────────────────────────
  async function patch(body: { starred?: boolean; tags?: string[] }) {
    const res = await fetch(`/api/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to update");
    }
    return (await res.json()) as { starred: boolean; tags: string[] };
  }

  // ── Star toggle ───────────────────────────────────────────────────────────
  function handleStar() {
    const next = !starred;
    setStarred(next); // optimistic
    setError(null);
    startTransition(async () => {
      try {
        await patch({ starred: next });
      } catch {
        setStarred(!next); // roll back
        setError("Failed to update star.");
      }
    });
  }

  // ── Add tag ───────────────────────────────────────────────────────────────
  function handleAddTag() {
    const raw = tagInput.trim();
    if (!raw) return;

    const tag = raw.toLowerCase().replace(/\s+/g, "-").slice(0, 32);
    if (tags.includes(tag)) {
      setTagInput("");
      return;
    }
    if (tags.length >= 20) {
      setError("Maximum 20 tags.");
      return;
    }

    const next = [...tags, tag];
    setTags(next);   // optimistic
    setTagInput("");
    setError(null);
    startTransition(async () => {
      try {
        await patch({ tags: next });
      } catch {
        setTags(tags); // roll back
        setError("Failed to add tag.");
      }
    });
  }

  // ── Remove tag ────────────────────────────────────────────────────────────
  function handleRemoveTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);   // optimistic
    setError(null);
    startTransition(async () => {
      try {
        await patch({ tags: next });
      } catch {
        setTags(tags); // roll back
        setError("Failed to remove tag.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Star button ── */}
      <button
        type="button"
        onClick={handleStar}
        disabled={isPending}
        className={cn(
          "inline-flex items-center gap-2 self-start rounded-xl border px-3.5 py-2 text-sm font-medium transition disabled:opacity-60",
          starred
            ? "border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15"
            : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200",
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Star className={cn("h-4 w-4", starred && "fill-amber-400 text-amber-400")} />
        )}
        {starred ? "Starred" : "Star this review"}
      </button>

      {/* ── Tags ── */}
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
          Tags
        </p>

        {/* Existing tags */}
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {tags.length === 0 && (
            <span className="text-xs text-slate-700">No tags yet.</span>
          )}
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] pl-2 pr-1 py-0.5 text-xs text-slate-400"
            >
              <Tag className="h-2.5 w-2.5 shrink-0 text-slate-600" />
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                disabled={isPending}
                className="ml-0.5 rounded p-0.5 text-slate-600 transition hover:text-rose-400 disabled:opacity-40"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>

        {/* Add tag input */}
        {tags.length < 20 && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Add a tag…"
              maxLength={32}
              className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-white placeholder:text-slate-700 outline-none transition focus:border-white/20 focus:bg-white/[0.05] sm:max-w-[200px]"
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={isPending || !tagInput.trim()}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-400 transition hover:border-white/20 hover:text-slate-200 disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-rose-400">{error}</p>
      )}
    </div>
  );
}
