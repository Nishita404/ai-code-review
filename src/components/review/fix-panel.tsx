"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import {
  Wand2,
  Loader2,
  Copy,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CircleCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReviewResponse } from "@/lib/review-schema";
import type { FixResponse } from "@/lib/fix-schema";
import { toMonacoLanguage, type LanguageName } from "@/lib/detect-language";

// ─── Types ────────────────────────────────────────────────────────────────────

type FixPanelProps = {
  code: string;
  language: LanguageName;
  review: ReviewResponse;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EDITOR_OPTIONS = {
  readOnly: true,
  fontSize: 12,
  lineHeight: 20,
  minimap: { enabled: false },
  padding: { top: 12, bottom: 12 },
  scrollBeyondLastLine: false,
  wordWrap: "on" as const,
  automaticLayout: true,
  renderLineHighlight: "none" as const,
  scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5 },
  contextmenu: false,
  folding: false,
  lineNumbers: "on" as const,
  glyphMargin: false,
  overviewRulerBorder: false,
  hideCursorInOverviewRuler: true,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in non-secure contexts — silently ignore
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium transition-all",
        copied
          ? "border-emerald-400/30 text-emerald-400"
          : "text-slate-400 hover:border-white/20 hover:text-slate-200",
        className,
      )}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function DownloadButton({
  text,
  language,
  className,
}: {
  text: string;
  language: LanguageName;
  className?: string;
}) {
  function extFor(lang: LanguageName): string {
    const map: Partial<Record<LanguageName, string>> = {
      TypeScript: "ts",
      JavaScript: "js",
      Python: "py",
      Java: "java",
      C: "c",
      "C++": "cpp",
      Go: "go",
      Rust: "rs",
      HTML: "html",
      CSS: "css",
      SQL: "sql",
      Bash: "sh",
      JSON: "json",
    };
    return map[lang] ?? "txt";
  }

  function handleDownload() {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fixed.${extFor(language)}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-400 transition-all hover:border-white/20 hover:text-slate-200",
        className,
      )}
      title="Download fixed code"
    >
      <Download className="h-3 w-3" />
      Download
    </button>
  );
}

function CodePane({
  label,
  badge,
  code,
  language,
  badgeClass,
  actions,
}: {
  label: string;
  badge?: string;
  code: string;
  language: LanguageName;
  badgeClass?: string;
  actions?: React.ReactNode;
}) {
  const lineCount = code.split("\n").length;
  const monacoLang = toMonacoLanguage(language);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#030303]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">
            {label}
          </span>
          {badge && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                badgeClass ?? "border-white/10 bg-white/[0.04] text-slate-400",
              )}
            >
              {badge}
            </span>
          )}
          <span className="text-[10px] text-slate-700">{lineCount} lines</span>
        </div>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
      {/* Editor */}
      <Editor
        height="360px"
        language={monacoLang}
        value={code}
        theme="vs-dark"
        options={EDITOR_OPTIONS}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FixPanel({ code, language, review }: FixPanelProps) {
  const [fixResult, setFixResult] = useState<FixResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const hasFindings =
    review.bugs.length > 0 ||
    review.security.length > 0 ||
    review.performance.length > 0 ||
    review.quality.length > 0 ||
    review.suggestions.length > 0;

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    setErrorCode(null);
    setFixResult(null);

    try {
      const res = await fetch("/api/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          language,
          findings: {
            bugs: review.bugs,
            security: review.security,
            performance: review.performance,
            quality: review.quality,
            suggestions: review.suggestions,
          },
        }),
      });

      const data = (await res.json()) as FixResponse & { error?: string; code?: string };

      if (!res.ok) {
        setErrorCode(data.code ?? null);
        throw new Error(data.error ?? "Failed to generate fix");
      }

      setFixResult(data);
      setIsExpanded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate fix");
    } finally {
      setIsGenerating(false);
    }
  }

  const totalFindings =
    review.bugs.length +
    review.security.length +
    review.performance.length +
    review.quality.length;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
      {/* ── Panel header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
            <Wand2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
              AI Fix Generator
            </p>
            <p className="mt-0.5 text-sm font-medium text-white">
              Auto-apply review findings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Expand/collapse toggle — only shown after a result */}
          {fixResult && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-500 transition hover:border-white/20 hover:text-slate-300"
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {isExpanded ? "Collapse" : "Expand"}
            </button>
          )}

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !hasFindings}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
              fixResult
                ? "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                : "bg-white text-black hover:bg-slate-200",
            )}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : fixResult ? (
              <Wand2 className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating
              ? "Generating…"
              : fixResult
              ? "Regenerate"
              : "Generate Fix"}
          </button>
        </div>
      </div>

      {/* ── No findings notice ── */}
      {!hasFindings && !isGenerating && !fixResult && (
        <div className="px-6 py-5">
          <p className="text-sm text-slate-500">
            No findings to fix. Run a review that surfaces issues first.
          </p>
        </div>
      )}

      {/* ── Loading state ── */}
      {isGenerating && (
        <div className="flex flex-col items-center gap-3 px-6 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400/60" />
          <p className="text-sm text-slate-500">
            Analysing{" "}
            {totalFindings} finding{totalFindings === 1 ? "" : "s"} and generating fixes…
          </p>
        </div>
      )}

      {/* ── Error state ── */}
      {error && !isGenerating && (
        <div className="px-6 py-4">
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] px-4 py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-rose-300">
                  {errorCode === "RATE_LIMITED"
                    ? "Rate limit reached"
                    : errorCode === "SERVICE_UNAVAILABLE"
                    ? "Service unavailable"
                    : "Fix generation failed"}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-rose-300/70">{error}</p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !hasFindings}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-400/20 hover:text-rose-200 disabled:pointer-events-none disabled:opacity-50"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {fixResult && !isGenerating && isExpanded && (
        <div className="space-y-6 p-6">
          {/* Finding count badge */}
          <div className="flex items-center gap-2">
            <CircleCheck className="h-4 w-4 text-emerald-400" />
            <p className="text-sm text-slate-300">
              <span className="font-medium text-white">
                {fixResult.improvements.length} improvement
                {fixResult.improvements.length === 1 ? "" : "s"}
              </span>{" "}
              applied to your code
            </p>
          </div>

          {/* ── Code panes ── */}
          <div className="grid gap-4 xl:grid-cols-2">
            <CodePane
              label="Original"
              badge={language}
              code={code}
              language={language}
            />
            <CodePane
              label="Fixed"
              badge={language}
              badgeClass="border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
              code={fixResult.fixedCode}
              language={language}
              actions={
                <>
                  <CopyButton text={fixResult.fixedCode} />
                  <DownloadButton text={fixResult.fixedCode} language={language} />
                </>
              }
            />
          </div>

          {/* ── Explanation ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
              Explanation
            </p>
            <p className="text-sm leading-6 text-slate-300">
              {fixResult.explanation}
            </p>
          </div>

          {/* ── Improvements list ── */}
          {fixResult.improvements.length > 0 && (
            <div>
              <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
                Improvements applied
              </p>
              <ul className="space-y-2">
                {fixResult.improvements.map((imp, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                  >
                    <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span className="text-sm leading-5 text-slate-300">{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
