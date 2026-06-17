"use client";

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { FileUp, History, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import {
  detectLanguage,
  detectLanguageFromFilename,
  toMonacoLanguage,
  type LanguageName,
} from "@/lib/detect-language";
import type { ReviewIssue, ReviewResponse } from "@/lib/review-schema";
import { ReviewHistoryPanel, type SavedReview } from "./review-history-panel";
import { FixPanel } from "./fix-panel";

// ─── Constants ────────────────────────────────────────────────────────────────

const languageOptions: LanguageName[] = [
  "Plain Text",
  "TypeScript",
  "JavaScript",
  "Python",
  "Java",
  "C",
  "C++",
  "Go",
  "Rust",
  "HTML",
  "CSS",
  "SQL",
  "Bash",
  "JSON",
];

const starterCode = `const getUserDisplayName = (user) => {
  if (!user) return "Guest";

  return user.profile?.name?.trim() || user.email;
};

export default getUserDisplayName;`;

const emptyReviewState: ReviewResponse = {
  score: 0,
  summary: "Run a review to see structured feedback here.",
  bugs: [],
  security: [],
  performance: [],
  quality: [],
  suggestions: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function severityDot(severity: ReviewIssue["severity"]) {
  switch (severity) {
    case "critical":
    case "high":
      return "bg-rose-400";
    case "medium":
      return "bg-amber-400";
    default:
      return "bg-sky-400";
  }
}

function scoreAccent(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-rose-400";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IssueCard({ item }: { item: ReviewIssue }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-5 text-white">{item.title}</p>
        <span
          className={cn(
            "mt-0.5 flex shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.2em]",
            severityColor(item.severity),
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              severityDot(item.severity),
            )}
          />
          {item.severity}
        </span>
      </div>
      {item.explanation && (
        <p className="mt-2 text-xs leading-5 text-slate-400">
          {item.explanation}
        </p>
      )}
      {item.fix && (
        <p className="mt-2 text-xs leading-5 text-emerald-300/80">
          <span className="font-semibold text-emerald-400">Fix: </span>
          {item.fix}
        </p>
      )}
    </div>
  );
}

function IssueSection({
  label,
  items,
  isReviewing,
}: {
  label: string;
  items: ReviewIssue[];
  isReviewing: boolean;
}) {
  const count = items.length;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
          {label}
        </p>
        {count > 0 && (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-400">
            {count}
          </span>
        )}
      </div>
      {count === 0 ? (
        <p className="text-xs text-slate-600">
          {isReviewing ? "Analysing…" : "No findings."}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <IssueCard key={`${label}-${i}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReviewWorkspace() {
  // ── Editor state ──────────────────────────────────────────────────────────
  const [code, setCode] = useState(starterCode);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageName>(() =>
    detectLanguage(starterCode),
  );
  const [isManualLanguage, setIsManualLanguage] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);

  // ── History state ──────────────────────────────────────────────────────────
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [savedReviews, setSavedReviews] = useState<SavedReview[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const lineCount = useMemo(() => code.split("\n").length, [code]);
  const detectedLanguage = useMemo(() => detectLanguage(code), [code]);

  // ── History fetch ─────────────────────────────────────────────────────────
  async function fetchHistory() {
    try {
      const res = await fetch("/api/reviews");
      if (!res.ok) return;
      const data = (await res.json()) as {
        reviews: SavedReview[];
        signedIn: boolean;
      };
      setIsSignedIn(data.signedIn);
      setSavedReviews(data.reviews ?? []);
    } catch {
      // non-critical — silently ignore
    } finally {
      setIsHistoryLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function updateCode(nextCode: string) {
    setCode(nextCode);
    if (!isManualLanguage) setSelectedLanguage(detectLanguage(nextCode));
  }

  function handleAutoDetect() {
    setIsManualLanguage(false);
    setSelectedLanguage(detectLanguage(code));
  }

  function handleClear() {
    updateCode("");
    setUploadedFile(null);
    // Reset the input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset value immediately so re-selecting the same file triggers onChange again
    event.target.value = "";

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      setCode(content);

      // Filename extension is the primary signal; fall back to content heuristics
      const fromFilename = detectLanguageFromFilename(file.name);
      const lang = fromFilename ?? detectLanguage(content);
      setSelectedLanguage(lang);
      setIsManualLanguage(true);

      setUploadedFile({ name: file.name, size: file.size });
      setReviewError(null);
    };
    reader.readAsText(file);
  }

  async function handleReview() {
    if (!code.trim()) {
      setReviewError("Code is required");
      return;
    }
    setIsReviewing(true);
    setReviewError(null);
    setSelectedReviewId(null);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: selectedLanguage }),
      });
      const data = (await response.json()) as ReviewResponse & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Review request failed");
      setReviewResult(data);
      fetchHistory();
    } catch (error) {
      setReviewResult(null);
      setReviewError(
        error instanceof Error ? error.message : "Unable to run review",
      );
    } finally {
      setIsReviewing(false);
    }
  }

  function handleRestoreReview(saved: SavedReview) {
    setCode(saved.code);
    setSelectedLanguage(saved.language as LanguageName);
    setIsManualLanguage(true);
    setReviewResult(saved.reviewJson);
    setReviewError(null);
    setSelectedReviewId(saved.id);
  }

  const activeReview = reviewResult ?? emptyReviewState;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Subtle radial background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.03),transparent_35%)]" />

      {/* History drawer (overlay — does not affect layout) */}
      <ReviewHistoryPanel
        reviews={savedReviews}
        isLoading={isHistoryLoading}
        isSignedIn={isSignedIn}
        isOpen={isHistoryOpen}
        selectedId={selectedReviewId}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={handleRestoreReview}
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-10">
        {/* ── Page header ── */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Badge className="border-white/10 bg-white/5 text-slate-200">
              Review workspace
            </Badge>
            <span className="hidden rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-500 sm:inline">
              {lineCount} lines
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* History button */}
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                isHistoryOpen
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200",
              )}
            >
              <History className="h-3.5 w-3.5" />
              History
              {isSignedIn && savedReviews.length > 0 && (
                <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  {savedReviews.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Two-column grid: editor (wider) | results ── */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_2fr]">
          {/* ── Editor panel ── */}
          <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <CardHeader className="px-5 pb-4 pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">
                    Editor
                  </p>
                  <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">
                    Source input
                  </h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-400">
                  Monaco
                </span>
              </div>
            </CardHeader>

            <CardContent className="px-5 pb-5">
              {/* Controls row */}
              <div className="flex flex-wrap items-end gap-3">
                {/* Language selector */}
                <div
                  className="flex min-w-0 flex-1 flex-col gap-1.5"
                  style={{ minWidth: "160px" }}
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="language">Language</Label>
                    <button
                      type="button"
                      onClick={handleAutoDetect}
                      className="text-[11px] text-slate-500 transition hover:text-slate-300"
                    >
                      Auto detect
                    </button>
                  </div>
                  <Select
                    id="language"
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value as LanguageName);
                      setIsManualLanguage(true);
                    }}
                  >
                    {languageOptions.map((opt) => (
                      <option
                        key={opt}
                        value={opt}
                        className="bg-black text-white"
                      >
                        {opt}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Action buttons */}
                <div className="flex shrink-0 items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ts,.tsx,.mts,.cts,.js,.jsx,.mjs,.cjs,.py,.pyw,.pyi,.java,.c,.h,.cpp,.cxx,.cc,.hpp,.hxx,.go,.rs,.html,.htm,.css,.scss,.sass,.less,.sql,.sh,.bash,.zsh,.json,.jsonc,.txt,.md"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="secondary"
                    type="button"
                    className="h-10 px-3 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <FileUp className="mr-1.5 h-3.5 w-3.5" />
                    Upload file
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    className="h-10 px-3 text-xs"
                    onClick={handleClear}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Clear
                  </Button>
                </div>
              </div>

              {/* Uploaded file badge */}
              {uploadedFile && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2">
                  <FileUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-emerald-300">
                    {uploadedFile.name}
                  </span>
                  <span className="shrink-0 text-[10px] text-emerald-500">
                    {uploadedFile.size < 1024
                      ? `${uploadedFile.size} B`
                      : `${(uploadedFile.size / 1024).toFixed(1)} KB`}
                  </span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="ml-1 shrink-0 rounded p-0.5 text-emerald-500 transition hover:text-emerald-200"
                    aria-label="Remove uploaded file"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* Monaco wrapper */}
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#030303]">
                {/* Editor status bar */}
                <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.07] px-4 py-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">
                    {detectedLanguage}
                  </span>
                  {isManualLanguage && !uploadedFile && (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-300">
                      Manual
                    </span>
                  )}
                  {selectedReviewId && (
                    <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] text-sky-300">
                      From history
                    </span>
                  )}
                </div>
                <Editor
                  height="560px"
                  defaultLanguage="typescript"
                  language={toMonacoLanguage(selectedLanguage)}
                  value={code}
                  onChange={(value) => updateCode(value ?? "")}
                  theme="vs-dark"
                  options={{
                    fontSize: 13,
                    lineHeight: 22,
                    minimap: { enabled: false },
                    padding: { top: 14, bottom: 14 },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    automaticLayout: true,
                    smoothScrolling: true,
                    renderLineHighlight: "gutter",
                    scrollbar: {
                      verticalScrollbarSize: 6,
                      horizontalScrollbarSize: 6,
                    },
                  }}
                />
              </div>

              {/* Submit row */}
              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Submit code to receive structured AI feedback.
                </p>
                <Button
                  className="h-10 shrink-0 px-5 text-sm"
                  onClick={handleReview}
                  disabled={isReviewing || !code.trim()}
                >
                  {isReviewing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {isReviewing ? "Reviewing…" : "Review"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Results panel ── */}
          <div className="flex flex-col gap-4">
            {/* Score + summary card */}
            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
              <CardHeader className="px-5 pb-3 pt-5">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">
                  Results
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {/* Error banner */}
                {reviewError && (
                  <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                    {reviewError}
                  </div>
                )}

                {/* Score */}
                <div className="mb-4 flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-5xl font-bold tabular-nums tracking-tight",
                      reviewResult
                        ? scoreAccent(reviewResult.score)
                        : "text-slate-700",
                    )}
                  >
                    {isReviewing ? (
                      <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                    ) : reviewResult ? (
                      reviewResult.score
                    ) : (
                      "—"
                    )}
                  </span>
                  {reviewResult && !isReviewing && (
                    <span className="text-sm text-slate-500">/ 100</span>
                  )}
                </div>

                {/* Summary */}
                <p className="text-sm leading-6 text-slate-400">
                  {activeReview.summary}
                </p>
              </CardContent>
            </Card>

            {/* Findings card — scrollable */}
            <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
              <CardHeader className="px-5 pb-3 pt-5">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">
                  Findings
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="max-h-[560px] space-y-6 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.08)_transparent] [scrollbar-width:thin]">
                  <IssueSection
                    label="Bugs"
                    items={activeReview.bugs}
                    isReviewing={isReviewing}
                  />
                  <IssueSection
                    label="Security"
                    items={activeReview.security}
                    isReviewing={isReviewing}
                  />
                  <IssueSection
                    label="Performance"
                    items={activeReview.performance}
                    isReviewing={isReviewing}
                  />
                  <IssueSection
                    label="Code Quality"
                    items={activeReview.quality}
                    isReviewing={isReviewing}
                  />

                  {/* Suggestions */}
                  {activeReview.suggestions.length > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
                        Suggestions
                      </p>
                      <div className="space-y-2">
                        {activeReview.suggestions.map((s, i) => (
                          <div
                            key={i}
                            className="rounded-2xl border border-white/[0.08] bg-black/30 px-4 py-3 text-xs leading-5 text-slate-300"
                          >
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          {/* end results column */}
        </div>
        {/* end two-column grid */}

        {/* ── Fix Generator ── */}
        {reviewResult && (
          <div className="mt-6">
            <FixPanel
              code={code}
              language={selectedLanguage}
              review={reviewResult}
            />
          </div>
        )}
      </div>
    </main>
  );
}
