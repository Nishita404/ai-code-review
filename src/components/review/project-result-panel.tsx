"use client";

import { useState } from "react";
import { FileCode2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ProjectReviewResponse, ProjectFileResult } from "@/lib/project-review-schema";
import type { ReviewIssue } from "@/lib/review-schema";

// ─── Helpers (mirror review-workspace) ───────────────────────────────────────

function scoreAccent(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-rose-400";
}

function scoreBg(score: number) {
  if (score >= 80) return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (score >= 60) return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  return "border-rose-400/20 bg-rose-400/10 text-rose-300";
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
          <span className={cn("h-1.5 w-1.5 rounded-full", severityDot(item.severity))} />
          {item.severity}
        </span>
      </div>
      {item.explanation && (
        <p className="mt-2 text-xs leading-5 text-slate-400">{item.explanation}</p>
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

function IssueSection({ label, items }: { label: string; items: ReviewIssue[] }) {
  const count = items.length;
  if (count === 0) return null;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
          {label}
        </p>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-400">
          {count}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <IssueCard key={`${label}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── File explorer sidebar ────────────────────────────────────────────────────

function FileExplorer({
  files,
  selectedPath,
  onSelect,
}: {
  files: ProjectFileResult[];
  selectedPath: string;
  onSelect: (path: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {files.map((file) => {
        const parts = file.filePath.split("/");
        const name = parts[parts.length - 1];
        const dir = parts.slice(0, -1).join("/");
        const isActive = file.filePath === selectedPath;

        return (
          <button
            key={file.filePath}
            type="button"
            onClick={() => onSelect(file.filePath)}
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all",
              isActive
                ? "bg-white/[0.07] ring-1 ring-white/10"
                : "hover:bg-white/[0.04]",
            )}
          >
            <FileCode2
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                isActive ? "text-emerald-400" : "text-slate-600 group-hover:text-slate-400",
              )}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-xs font-medium",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200",
                )}
              >
                {name}
              </p>
              {dir && (
                <p className="truncate text-[10px] text-slate-700">{dir}</p>
              )}
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                scoreBg(file.score),
              )}
            >
              {file.score}
            </span>
            {isActive && (
              <ChevronRight className="h-3 w-3 shrink-0 text-slate-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Language breakdown pills ─────────────────────────────────────────────────

function LanguageBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  const entries = Object.entries(breakdown).sort(([, a], [, b]) => b - a);
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(([lang, count]) => (
        <span
          key={lang}
          className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300"
        >
          {lang}
          <span className="ml-1.5 text-slate-500">{count}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type ProjectResultPanelProps = {
  result: ProjectReviewResponse;
  projectName: string;
};

export function ProjectResultPanel({ result, projectName }: ProjectResultPanelProps) {
  const [selectedPath, setSelectedPath] = useState(result.files[0]?.filePath ?? "");

  const selectedFile = result.files.find((f) => f.filePath === selectedPath);
  const totalIssues = result.files.reduce(
    (sum, f) => sum + f.bugs.length + f.security.length + f.performance.length + f.quality.length,
    0,
  );

  return (
    <div className="space-y-4">
      {/* ── Overview card ── */}
      <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <CardHeader className="px-5 pb-3 pt-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">
            Project Overview
          </p>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
            {/* Score */}
            <div className="flex shrink-0 flex-col items-center gap-1">
              <span className={cn("text-6xl font-bold tabular-nums", scoreAccent(result.overallScore))}>
                {result.overallScore}
              </span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>

            {/* Meta */}
            <div className="flex-1 space-y-3">
              <p className="text-sm leading-6 text-slate-300">{result.summary}</p>
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <span>
                  <span className="font-semibold text-slate-300">{result.files.length}</span> files reviewed
                </span>
                <span>
                  <span className="font-semibold text-slate-300">{totalIssues}</span> total issues
                </span>
                <span className="font-mono text-slate-600">{projectName}</span>
              </div>
              <LanguageBreakdown breakdown={result.languageBreakdown} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── File explorer + findings ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
          <CardHeader className="px-4 pb-3 pt-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">
              Files
            </p>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="max-h-[520px] overflow-y-auto [scrollbar-color:rgba(255,255,255,0.08)_transparent] [scrollbar-width:thin]">
              <FileExplorer
                files={result.files}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
              />
            </div>
          </CardContent>
        </Card>

        {/* Findings detail */}
        {selectedFile ? (
          <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <CardHeader className="px-5 pb-3 pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">
                    File Review
                  </p>
                  <p className="mt-1 font-mono text-sm text-white">
                    {selectedFile.filePath.split("/").pop()}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-slate-600">
                    {selectedFile.filePath}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={cn("text-3xl font-bold tabular-nums", scoreAccent(selectedFile.score))}>
                    {selectedFile.score}
                  </span>
                  <span className="text-[10px] text-slate-600">/ 100</span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">{selectedFile.summary}</p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="max-h-[440px] space-y-6 overflow-y-auto pr-1 [scrollbar-color:rgba(255,255,255,0.08)_transparent] [scrollbar-width:thin]">
                <IssueSection label="Bugs" items={selectedFile.bugs} />
                <IssueSection label="Security" items={selectedFile.security} />
                <IssueSection label="Performance" items={selectedFile.performance} />
                <IssueSection label="Code Quality" items={selectedFile.quality} />

                {selectedFile.suggestions.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
                      Suggestions
                    </p>
                    <div className="space-y-2">
                      {selectedFile.suggestions.map((s, i) => (
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

                {selectedFile.bugs.length === 0 &&
                  selectedFile.security.length === 0 &&
                  selectedFile.performance.length === 0 &&
                  selectedFile.quality.length === 0 &&
                  selectedFile.suggestions.length === 0 && (
                    <p className="text-sm text-slate-600">No issues found in this file.</p>
                  )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center border-white/10 bg-white/[0.03] py-20 backdrop-blur-xl">
            <p className="text-sm text-slate-600">Select a file to see its review.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
