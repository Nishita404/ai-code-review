"use client";

import { useState } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ReviewWorkspace } from "@/components/review/review-workspace";
import { ZipUploadPanel } from "@/components/review/zip-upload-panel";
import { RepoUploadPanel } from "@/components/review/repo-upload-panel";
import { PrReviewPanel } from "@/components/review/pr-review-panel";
import { cn } from "@/lib/cn";
import { Code2, FolderArchive, ArrowLeft, BarChart3, GitPullRequest } from "lucide-react";
import Link from "next/link";

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState<"single" | "zip" | "repo" | "pr">("single");

  return (
    <AuthGuard>
      <main className="min-h-screen bg-black text-white relative flex flex-col">
        {/* Subtle radial background */}
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.03),transparent_35%)]" />

        {/* Tab switcher wrapper */}
        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pt-8 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400 hover:border-white/20 hover:text-slate-200 transition-all duration-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to dashboard
            </Link>

            {/* Premium segmented control for tabs */}
            <div className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("single")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-all uppercase",
                  activeTab === "single"
                    ? "bg-white text-black shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Code2 className="h-3.5 w-3.5" />
                Single File
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("zip")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-all uppercase",
                  activeTab === "zip"
                    ? "bg-white text-black shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <FolderArchive className="h-3.5 w-3.5" />
                ZIP Project
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("repo")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-all uppercase",
                  activeTab === "repo"
                    ? "bg-white text-black shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Repo Audit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pr")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-all uppercase",
                  activeTab === "pr"
                    ? "bg-white text-black shadow-lg"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <GitPullRequest className="h-3.5 w-3.5" />
                PR Review
              </button>
            </div>
          </div>
        </div>

        {/* Workspace views */}
        <div className="flex-grow relative z-10">
          {activeTab === "single" ? (
            <ReviewWorkspace />
          ) : activeTab === "zip" ? (
            <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
              <ZipUploadPanel />
            </div>
          ) : activeTab === "repo" ? (
            <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
              <RepoUploadPanel />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
              <PrReviewPanel />
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
