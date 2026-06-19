"use client";

import { useEffect, useState } from "react";
import {
  GitPullRequest,
  GitBranch,
  User,
  Loader2,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Star,
  ShieldAlert,
  Zap,
  Bug,
  FileCode,
  Link2,
  ExternalLink,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import type { ReviewIssue, ReviewResponse } from "@/lib/review-schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type Repo = {
  id: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  stars: number;
};

type PullRequest = {
  id: number;
  number: number;
  title: string;
  author: string;
  avatarUrl?: string;
  branch: string;
  createdAt: string;
  htmlUrl: string;
  reviewed: boolean;
  score: number | null;
  lastReviewedAt: string | null;
};

type PRDetail = {
  number: number;
  title: string;
  author: string;
  avatarUrl?: string;
  branch: string;
  createdAt: string;
  htmlUrl: string;
  changedFiles: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }[];
};

type DBReview = {
  id: string;
  score: number;
  summary: string;
  reviewJson: ReviewResponse;
  createdAt: string;
  updatedAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityColor(severity: string) {
  switch (severity?.toLowerCase()) {
    case "critical":
    case "high":
      return "text-rose-300";
    case "medium":
      return "text-amber-300";
    default:
      return "text-sky-300";
  }
}

function severityDot(severity: string) {
  switch (severity?.toLowerCase()) {
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

function scoreBg(score: number) {
  if (score >= 80) return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (score >= 60) return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  return "border-rose-400/20 bg-rose-400/10 text-rose-300";
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
            severityColor(item.severity)
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", severityDot(item.severity))} />
          {item.severity}
        </span>
      </div>
      {item.explanation && <p className="mt-2 text-xs leading-5 text-slate-400">{item.explanation}</p>}
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
  isLoading,
  icon: Icon,
  accentColor,
}: {
  label: string;
  items: ReviewIssue[];
  isLoading: boolean;
  icon: any;
  accentColor: string;
}) {
  const count = items?.length ?? 0;
  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader className="px-5 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Icon className={cn("h-4 w-4", accentColor)} />
            {label}
          </h3>
          {count > 0 && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs tabular-nums text-slate-300">
              {count}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {count === 0 ? (
          <p className="text-xs text-slate-500">
            {isLoading ? "Analyzing..." : "No issues found in this category."}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <IssueCard key={`${label}-${i}`} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PrReviewPanel() {
  // Connection states
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
  const [prDetail, setPrDetail] = useState<PRDetail | null>(null);
  const [prReview, setPrReview] = useState<DBReview | null>(null);

  // Loading & Error states
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isReposSyncing, setIsReposSyncing] = useState(false);
  const [isPullsLoading, setIsPullsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Active repo object helper
  const selectedRepo = repos.find((r) => r.id === selectedRepoId);

  // 1. Initial status and repos fetch
  const fetchInitialData = async () => {
    setIsPageLoading(true);
    try {
      const statusRes = await fetch("/api/github/status");
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setIsConnected(statusData.connected);

        if (statusData.connected) {
          const reposRes = await fetch("/api/github/repos");
          if (reposRes.ok) {
            const reposData = await reposRes.json();
            setRepos(reposData.repos ?? []);
            if (reposData.repos && reposData.repos.length > 0) {
              setSelectedRepoId(reposData.repos[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load initial GitHub status or repos:", err);
      toast.error("Failed to load GitHub integration details.");
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // 2. Fetch Pull Requests when repo selection changes
  const fetchPullRequests = async (repoId: string) => {
    if (!repoId) return;
    setIsPullsLoading(true);
    try {
      const res = await fetch(`/api/github/repos/${repoId}/pulls`);
      if (res.ok) {
        const data = await res.json();
        setPulls(data.pulls ?? []);
      } else {
        toast.error("Failed to fetch pull requests.");
      }
    } catch (err) {
      console.error("Fetch pulls error:", err);
      toast.error("Error fetching pull requests.");
    } finally {
      setIsPullsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRepoId) {
      fetchPullRequests(selectedRepoId);
      setSelectedPR(null);
      setPrDetail(null);
      setPrReview(null);
    }
  }, [selectedRepoId]);

  // 3. Sync GitHub Repositories on demand
  const handleReposSync = async () => {
    if (isReposSyncing) return;
    setIsReposSyncing(true);
    try {
      const res = await fetch("/api/github/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos ?? []);
        toast.success("GitHub repositories synced successfully!");
        if (data.repos && data.repos.length > 0) {
          // Keep current selection or default
          const exists = data.repos.some((r: Repo) => r.id === selectedRepoId);
          if (!exists) {
            setSelectedRepoId(data.repos[0].id);
          } else {
            // Refetch pulls for selection
            fetchPullRequests(selectedRepoId);
          }
        }
      } else {
        toast.error("Failed to sync repositories.");
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("An error occurred during synchronization.");
    } finally {
      setIsReposSyncing(false);
    }
  };

  // 4. Fetch PR Detail & review status
  const handleSelectPR = async (pr: PullRequest) => {
    setSelectedPR(pr);
    setIsDetailLoading(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/github/repos/${selectedRepoId}/pulls/${pr.number}`);
      if (res.ok) {
        const data = await res.json();
        setPrDetail(data.pr);
        setPrReview(data.review);
      } else {
        toast.error("Failed to load Pull Request details.");
      }
    } catch (err) {
      console.error("Load PR detail error:", err);
      toast.error("An error occurred loading Pull Request details.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  // 5. Run AI Review on the selected Pull Request
  const handleRunReview = async () => {
    if (!selectedPR || isReviewing) return;
    setIsReviewing(true);
    setReviewError(null);
    try {
      const res = await fetch("/api/repo-analysis/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId: selectedRepoId,
          prNumber: selectedPR.number,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Pull Request review completed!");
        // Refresh details
        handleSelectPR(selectedPR);
        // Refresh pulls list to show score
        fetchPullRequests(selectedRepoId);
      } else {
        setReviewError(data.error || "An error occurred during review.");
        toast.error(data.error || "Failed to analyze Pull Request.");
      }
    } catch (err) {
      console.error("Review run error:", err);
      setReviewError("Network error occurred while analyzing the Pull Request.");
      toast.error("Network error during Pull Request analysis.");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/auth/github/connect?action=connect";
  };

  // ── Rendering states ────────────────────────────────────────────────────────

  if (isPageLoading) {
    return (
      <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  // Not Connected
  if (isConnected === false) {
    return (
      <div className="mx-auto w-full max-w-[600px] py-10">
        <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden text-center">
          <div className="absolute -right-4 -bottom-4 text-white/[0.01] pointer-events-none">
            <GitPullRequest className="h-32 w-32" />
          </div>
          <CardHeader className="px-6 pb-2 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-400 mx-auto mb-3">
              <GitPullRequest className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Link GitHub Profile</h2>
            <p className="mt-1.5 text-xs text-slate-400 max-w-[400px] mx-auto leading-5">
              Connect your account to access and review your pull requests. Fetch branch diffs, inspect changed files, and run code reviews.
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-4">
            <Button variant="secondary" onClick={handleConnect} className="h-10 text-xs gap-1.5 px-6 mx-auto">
              <Link2 className="h-4 w-4" />
              Connect GitHub Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PR Detail View
  if (selectedPR) {
    const isReady = prDetail && !isDetailLoading;
    const reviewResult = prReview?.reviewJson;

    return (
      <div className="space-y-6">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            type="button"
            className="h-9 px-3 text-xs text-slate-400 hover:text-slate-200"
            onClick={() => {
              setSelectedPR(null);
              setPrDetail(null);
              setPrReview(null);
            }}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Pull Requests
          </Button>

          {isReady && (
            <a
              href={prDetail.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View on GitHub
            </a>
          )}
        </div>

        {isDetailLoading && (
          <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </CardContent>
          </Card>
        )}

        {isReady && prDetail && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr_2fr]">
            {/* PR Main Info & Review Results */}
            <div className="space-y-6">
              {/* Info Card */}
              <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
                <CardHeader className="px-5 pb-3 pt-5 border-b border-white/5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                        Pull Request #{prDetail.number}
                      </p>
                      <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">
                        {prDetail.title}
                      </h2>
                      <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          {prDetail.author}
                        </span>
                        <span className="flex items-center gap-1.5 font-mono text-[11px] rounded bg-white/5 border border-white/10 px-1.5 py-0.5">
                          <GitBranch className="h-3.5 w-3.5 text-slate-500" />
                          {prDetail.branch}
                        </span>
                      </div>
                    </div>

                    {reviewResult && (
                      <div className="flex flex-col items-end">
                        <span
                          className={cn(
                            "rounded-full border px-3 py-1 text-sm font-bold tabular-nums",
                            scoreBg(reviewResult.score)
                          )}
                        >
                          Score: {reviewResult.score}/100
                        </span>
                        <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-1.5">
                          Audit Completed
                        </p>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="px-5 py-5 space-y-5">
                  {/* Analysis details / summary */}
                  {reviewResult ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500 mb-1.5">
                          Summary & Feedback
                        </p>
                        <p className="text-sm leading-6 text-slate-300">
                          {reviewResult.summary}
                        </p>
                      </div>

                      {/* Suggestions list */}
                      {reviewResult.suggestions && reviewResult.suggestions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
                            Suggestions
                          </p>
                          <div className="space-y-1.5">
                            {reviewResult.suggestions.map((s, idx) => (
                              <div
                                key={idx}
                                className="rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2.5 text-xs leading-5 text-slate-300"
                              >
                                {s}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <GitPullRequest className="h-10 w-10 text-slate-600 mb-3" />
                      <p className="text-sm font-medium text-slate-300">No Review Run Yet</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                        Run the AI audit engine to scan the changed files and generate report cards.
                      </p>
                    </div>
                  )}

                  {/* Review Button & Loading State */}
                  {isReviewing ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-6 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mb-2" />
                      <h4 className="text-xs font-semibold text-emerald-300">Auditing Changed Files</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 animate-pulse">
                        Scanning PR diff and checking with Gemini 2.5 Flash...
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 pt-2">
                      <Button
                        onClick={handleRunReview}
                        disabled={isReviewing}
                        className="h-10 text-xs px-5 gap-1.5"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {reviewResult ? "Re-run Review" : "Run AI Review"}
                      </Button>
                    </div>
                  )}

                  {/* Errors */}
                  {reviewError && (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] px-4 py-3 flex items-start gap-2.5 text-rose-300">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="text-xs leading-5">
                        <p className="font-semibold">Review generation failed</p>
                        <p className="text-[11px] text-rose-300/70 mt-0.5">{reviewError}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Categorized Findings Cards */}
              {reviewResult && (
                <div className="space-y-4">
                  <IssueSection
                    label="Bugs"
                    items={reviewResult.bugs}
                    isLoading={isReviewing}
                    icon={Bug}
                    accentColor="text-rose-400"
                  />
                  <IssueSection
                    label="Security findings"
                    items={reviewResult.security}
                    isLoading={isReviewing}
                    icon={ShieldAlert}
                    accentColor="text-orange-400"
                  />
                  <IssueSection
                    label="Performance findings"
                    items={reviewResult.performance}
                    isLoading={isReviewing}
                    icon={Zap}
                    accentColor="text-blue-400"
                  />
                  <IssueSection
                    label="Code quality findings"
                    items={reviewResult.quality}
                    isLoading={isReviewing}
                    icon={FileCode}
                    accentColor="text-violet-400"
                  />
                </div>
              )}
            </div>

            {/* Changed Files Sidecard */}
            <div className="space-y-4">
              <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
                <CardHeader className="px-5 pb-2 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                    Pull Request Details
                  </p>
                  <h3 className="text-xs font-semibold text-slate-300 mt-1">
                    Changed Files ({prDetail.changedFiles.length})
                  </h3>
                </CardHeader>

                <CardContent className="px-5 pb-5 pt-3">
                  <div className="max-h-[500px] overflow-y-auto pr-1 space-y-2 [scrollbar-width:thin]">
                    {prDetail.changedFiles.map((file, idx) => {
                      const ext = file.filename.split(".").pop() || "";
                      return (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-[11px] text-slate-300 truncate" title={file.filename}>
                              {file.filename}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.2",
                                  file.status === "added"
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : file.status === "removed"
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                )}
                              >
                                {file.status}
                              </span>
                              <span>{ext}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 tabular-nums shrink-0">
                            {file.additions > 0 && <span className="text-emerald-400">+{file.additions}</span>}
                            {file.deletions > 0 && <span className="text-rose-400">-{file.deletions}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  }

  // PR List view
  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-6">
      <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <CardContent className="px-6 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5">
          <div className="space-y-2 flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">
              Select Repository
            </label>
            <div className="flex gap-2">
              <Select
                value={selectedRepoId}
                onChange={(e) => setSelectedRepoId(e.target.value)}
                className="max-w-[400px] h-10 border-white/10 bg-black text-white"
              >
                {repos.length === 0 ? (
                  <option value="" className="bg-black text-slate-500">
                    No repositories found
                  </option>
                ) : (
                  repos.map((repo) => (
                    <option key={repo.id} value={repo.id} className="bg-black text-white">
                      {repo.fullName}
                    </option>
                  ))
                )}
              </Select>

              <Button
                variant="ghost"
                type="button"
                onClick={handleReposSync}
                disabled={isReposSyncing}
                className="h-10 px-3 border border-white/10 text-slate-400 hover:text-slate-200"
              >
                <RefreshCw className={cn("h-4 w-4", isReposSyncing && "animate-spin")} />
              </Button>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-mono">{pulls.length} pull requests found</span>
          </div>
        </CardContent>

        <CardContent className="px-6 py-4">
          {isPullsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : pulls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GitPullRequest className="h-12 w-12 text-slate-700 mb-3" />
              <p className="text-sm font-medium text-slate-400">No Open Pull Requests</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                There are no open pull requests in {selectedRepo ? selectedRepo.fullName : "this repository"}.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {pulls.map((pr) => (
                <div
                  key={pr.id}
                  onClick={() => handleSelectPR(pr)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 cursor-pointer hover:bg-white/[0.01] px-3 -mx-3 rounded-xl transition-all"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 font-semibold shrink-0">#{pr.number}</span>
                      <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                        {pr.title}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {pr.author}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[11px] px-1 bg-white/5 border border-white/10 rounded">
                        <GitBranch className="h-3 w-3" />
                        {pr.branch}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {pr.reviewed ? (
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
                            scoreBg(pr.score ?? 0)
                          )}
                        >
                          Score: {pr.score}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectPR(pr);
                        }}
                        className="h-8 text-[11px] gap-1 px-3"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
