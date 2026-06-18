"use client";

import { useState } from "react";
import { Shield, Hammer, Zap, Network, Files, FileCode, Copy, BarChart2, AlertCircle, Eye, ShieldAlert, Bug } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { RepositoryAnalysis } from "@/lib/repo-analysis-schema";

type TabId = "overview" | "architecture" | "security" | "performance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Score Card Sub-component ───────────────────────────────────────────────

function ScoreWidget({
  title,
  score,
  icon: Icon,
  desc,
}: {
  title: string;
  score: number;
  icon: any;
  desc: string;
}) {
  return (
    <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-3 text-slate-700/50 group-hover:text-slate-600 transition-colors">
        <Icon className="h-12 w-12 stroke-[1]" />
      </div>
      <CardHeader className="px-5 pb-2 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          {title}
        </p>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-4xl font-bold tracking-tight tabular-nums", scoreAccent(score))}>
            {score}
          </span>
          <span className="text-xs text-slate-500">/ 100</span>
        </div>
        <p className="mt-1 text-[11px] leading-4 text-slate-400">{desc}</p>
      </CardContent>
    </Card>
  );
}

// ─── Main Panel Component ───────────────────────────────────────────────────

export function RepoAnalysisPanel({ result }: { result: RepositoryAnalysis }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const totalIssuesCount =
    result.architecture.circularDependencies.length +
    result.architecture.deepImportChains.length +
    result.architecture.largeFiles.length +
    result.architecture.largeFunctions.length +
    result.architecture.deadCodeCandidates.length +
    result.security.hardcodedSecrets.length +
    result.security.apiKeys.length +
    result.security.tokens.length +
    result.security.unsafeEval.length +
    result.security.dangerousShellCommands.length +
    result.performance.nestedLoops.length +
    result.performance.nPlusOnePatterns.length +
    result.performance.memoryHeavyStructures.length;

  return (
    <div className="space-y-6">
      {/* ── Scores Dashboard Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreWidget
          title="Security Score"
          score={result.securityScore}
          icon={Shield}
          desc="Vulnerabilities, keys, tokens and unsafe code structures."
        />
        <ScoreWidget
          title="Maintainability"
          score={result.maintainabilityScore}
          icon={Hammer}
          desc="Code complexity, dead exports, and function sizes."
        />
        <ScoreWidget
          title="Performance"
          score={result.performanceScore}
          icon={Zap}
          desc="Nested loop depth, in-memory sizes, and N+1 patterns."
        />
        <ScoreWidget
          title="Architecture"
          score={result.architectureScore}
          icon={Network}
          desc="Import chain depths and circular dependency cycles."
        />
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto [scrollbar-width:none]">
        {(["overview", "architecture", "security", "performance"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 -mb-[2px] transition-all whitespace-nowrap",
              activeTab === tab
                ? "border-emerald-400 text-white bg-white/[0.02]"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="space-y-4">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Metrics Cards */}
            <div className="space-y-4 lg:col-span-1">
              <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader className="px-5 pb-2 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Repository Metrics
                  </h3>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/10 bg-white/[0.01] p-3 text-center">
                      <p className="text-xl font-bold text-white tabular-nums">
                        {result.metrics.totalFiles}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Files</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.01] p-3 text-center">
                      <p className="text-xl font-bold text-white tabular-nums">
                        {result.metrics.totalLoc.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Total LOC</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Code Duplication Rate</span>
                      <span className="font-semibold text-white">{result.metrics.duplicateCodeEstimate}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          result.metrics.duplicateCodeEstimate > 20
                            ? "bg-rose-400"
                            : result.metrics.duplicateCodeEstimate > 10
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        )}
                        style={{ width: `${result.metrics.duplicateCodeEstimate}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-4">
                      Estimate based on repeated line-level blocks across the source tree.
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.01] p-4 text-center">
                    <p className="text-2xl font-bold text-white tabular-nums">
                      {totalIssuesCount}
                    </p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Total Scan Findings</p>
                  </div>
                </CardContent>
              </Card>

              {/* Language Distribution */}
              <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader className="px-5 pb-2 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Language Distribution (LOC)
                  </h3>
                </CardHeader>
                <CardContent className="px-5 pb-5 space-y-3">
                  {Object.entries(result.metrics.languageDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([lang, loc]) => {
                      const pct = ((loc / result.metrics.totalLoc) * 100).toFixed(1);
                      return (
                        <div key={lang} className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <FileCode className="h-3.5 w-3.5 text-slate-500" />
                              {lang}
                            </span>
                            <span className="tabular-nums">
                              {loc.toLocaleString()} ({pct}%)
                            </span>
                          </div>
                          <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400/80 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </div>

            {/* Largest Files Table */}
            <div className="lg:col-span-2">
              <Card className="border-white/10 bg-white/[0.03] h-full">
                <CardHeader className="px-5 pb-2 pt-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Largest Files in Codebase
                  </h3>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-500 font-semibold uppercase">
                          <th className="py-2.5">File Path</th>
                          <th className="py-2.5 text-right">Lines</th>
                          <th className="py-2.5 text-right">Size</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] text-slate-300">
                        {result.metrics.largestFiles.map((file, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            <td className="py-3 font-mono text-[11px] truncate max-w-[280px]">
                              {file.filePath}
                            </td>
                            <td className="py-3 text-right tabular-nums font-semibold">{file.loc}</td>
                            <td className="py-3 text-right tabular-nums text-slate-500">
                              {formatBytes(file.sizeBytes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ARCHITECTURE SCAN TAB */}
        {activeTab === "architecture" && (
          <div className="space-y-6">
            {/* Circular Dependencies */}
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader className="px-5 pb-2 pt-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Network className="h-4 w-4 text-rose-400" />
                  Circular Dependency Cycles
                </h3>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-3">
                {result.architecture.circularDependencies.length === 0 ? (
                  <p className="text-xs text-slate-500">No circular dependencies detected.</p>
                ) : (
                  result.architecture.circularDependencies.map((dep, idx) => (
                    <div key={idx} className="rounded-xl border border-white/[0.08] bg-black/20 p-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-400">
                        {dep.chain.map((step, i) => (
                          <span key={i} className="flex items-center gap-1.5">
                            <span className={cn(i === 0 || i === dep.chain.length - 1 ? "text-rose-400 font-bold" : "text-white")}>
                              {step}
                            </span>
                            {i < dep.chain.length - 1 && <span>➔</span>}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs leading-5 text-slate-400">{dep.explanation}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Deep Import Chains */}
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader className="px-5 pb-2 pt-4">
                <h3 className="text-sm font-semibold text-white">Deep Import Chains</h3>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-3">
                {result.architecture.deepImportChains.length === 0 ? (
                  <p className="text-xs text-slate-500">No deeply nested import chains detected.</p>
                ) : (
                  result.architecture.deepImportChains.map((chain, idx) => (
                    <div key={idx} className="rounded-xl border border-white/[0.08] bg-black/20 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-emerald-400 font-semibold">{chain.filePath}</span>
                        <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          Depth: {chain.depth}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 leading-4">
                        {chain.chain.join(" ➔ ")}
                      </div>
                      <p className="text-xs leading-5 text-slate-400">{chain.explanation}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Dead Code Candidates */}
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader className="px-5 pb-2 pt-4">
                <h3 className="text-sm font-semibold text-white">Unused Export Candidates (Dead Code)</h3>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-3">
                {result.architecture.deadCodeCandidates.length === 0 ? (
                  <p className="text-xs text-slate-500">No dead code candidates detected.</p>
                ) : (
                  result.architecture.deadCodeCandidates.map((candidate, idx) => (
                    <div key={idx} className="rounded-xl border border-white/[0.08] bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-xs text-white font-semibold">{candidate.symbolName}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{candidate.filePath}</p>
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Unused</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-400">{candidate.explanation}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Large Files and Functions */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader className="px-5 pb-2 pt-4">
                  <h3 className="text-sm font-semibold text-white">Complex / Large Files</h3>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  {result.architecture.largeFiles.length === 0 ? (
                    <p className="text-xs text-slate-500">No excessively large files flagged.</p>
                  ) : (
                    result.architecture.largeFiles.map((file, idx) => (
                      <div key={idx} className="rounded-xl border border-white/[0.08] bg-black/20 p-3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-mono text-white font-semibold truncate max-w-[200px]">{file.filePath.split("/").pop()}</span>
                          <span className="font-mono text-slate-500">{file.loc} lines</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-4">{file.explanation}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader className="px-5 pb-2 pt-4">
                  <h3 className="text-sm font-semibold text-white">Complex / Large Functions</h3>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  {result.architecture.largeFunctions.length === 0 ? (
                    <p className="text-xs text-slate-500">No complex functions flagged.</p>
                  ) : (
                    result.architecture.largeFunctions.map((fn, idx) => (
                      <div key={idx} className="rounded-xl border border-white/[0.08] bg-black/20 p-3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <div>
                            <span className="font-mono text-white font-semibold">{fn.functionName}()</span>
                            <p className="text-[9px] text-slate-500 font-mono">{fn.filePath.split("/").pop()}</p>
                          </div>
                          <span className="font-mono text-slate-500 shrink-0">{fn.loc} lines</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-4">{fn.explanation}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* SECURITY SCAN TAB */}
        {activeTab === "security" && (
          <div className="space-y-4">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader className="px-5 pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                    Security Auditor Findings
                  </h3>
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums", scoreBg(result.securityScore))}>
                    Score: {result.securityScore}/100
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-6">
                {/* Secrets / Keys / Tokens */}
                {[
                  { label: "Credentials & Hardcoded Secrets", items: result.security.hardcodedSecrets },
                  { label: "API Keys & Config Vulnerabilities", items: result.security.apiKeys },
                  { label: "Session Tokens & Encryption Keys", items: result.security.tokens },
                  { label: "Unsafe Execution (eval)", items: result.security.unsafeEval },
                  { label: "Dangerous Commands & Executions", items: result.security.dangerousShellCommands },
                ].map(({ label, items }, sectionIdx) => (
                  <div key={sectionIdx} className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500 border-b border-white/5 pb-1">
                      {label} ({items.length})
                    </p>
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-600 pl-1">No vulnerabilities flagged.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {items.map((item, idx) => (
                          <div key={idx} className="rounded-xl border border-white/[0.08] bg-black/20 p-4 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <span className="font-mono text-xs text-rose-300 font-semibold truncate max-w-[300px]">
                                {item.filePath}
                              </span>
                              {item.line && (
                                <span className="font-mono text-[10px] text-slate-500">Line: {item.line}</span>
                              )}
                            </div>
                            {item.snippet && (
                              <pre className="rounded-lg bg-black/40 border border-white/5 px-3 py-2 font-mono text-[10px] leading-5 text-rose-300/80 overflow-x-auto [scrollbar-width:thin]">
                                {item.snippet}
                              </pre>
                            )}
                            <p className="text-xs leading-5 text-slate-400">{item.explanation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* PERFORMANCE SCAN TAB */}
        {activeTab === "performance" && (
          <div className="space-y-4">
            <Card className="border-white/10 bg-white/[0.03]">
              <CardHeader className="px-5 pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Performance & Resource Scan
                  </h3>
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums", scoreBg(result.performanceScore))}>
                    Score: {result.performanceScore}/100
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-6">
                {[
                  { label: "Deep / Nested Loops", items: result.performance.nestedLoops },
                  { label: "API / DB Queries in Loops (N+1)", items: result.performance.nPlusOnePatterns },
                  { label: "Memory-Heavy Buffers & Structures", items: result.performance.memoryHeavyStructures },
                ].map(({ label, items }, sectionIdx) => (
                  <div key={sectionIdx} className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500 border-b border-white/5 pb-1">
                      {label} ({items.length})
                    </p>
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-600 pl-1">No performance issues flagged.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {items.map((item, idx) => (
                          <div key={idx} className="rounded-xl border border-white/[0.08] bg-black/20 p-4 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <span className="font-mono text-xs text-amber-300 font-semibold truncate max-w-[300px]">
                                {item.filePath}
                              </span>
                              {item.line && (
                                <span className="font-mono text-[10px] text-slate-500">Line: {item.line}</span>
                              )}
                            </div>
                            {item.snippet && (
                              <pre className="rounded-lg bg-black/40 border border-white/5 px-3 py-2 font-mono text-[10px] leading-5 text-amber-300/80 overflow-x-auto [scrollbar-width:thin]">
                                {item.snippet}
                              </pre>
                            )}
                            <p className="text-xs leading-5 text-slate-400">{item.explanation}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
