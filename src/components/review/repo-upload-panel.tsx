"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { FolderArchive, UploadCloud, Loader2, Sparkles, AlertTriangle, RefreshCw, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { RepoAnalysisPanel } from "./repo-analysis-panel";
import type { RepositoryAnalysis } from "@/lib/repo-analysis-schema";

type UploadStatus = "idle" | "dragging" | "uploading" | "processing" | "success" | "error";

export function RepoUploadPanel() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [analysisResult, setAnalysisResult] = useState<RepositoryAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Drag and Drop Handlers ────────────────────────────────────────────────
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === "idle" || status === "dragging") {
      setStatus("dragging");
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === "idle" || status === "dragging") {
      setStatus("dragging");
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (status === "dragging") {
      setStatus("idle");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "idle" && status !== "dragging") return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    } else {
      setStatus("idle");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    setErrorCode(null);

    const filename = file.name.toLowerCase();
    const isZip = filename.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed";

    if (!isZip) {
      setError("Only .zip files are supported.");
      setStatus("error");
      return;
    }

    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 25 MB.`);
      setStatus("error");
      return;
    }

    setSelectedFile(file);
    const projName = file.name.replace(/\.zip$/i, "");
    setProjectName(projName);
    uploadAndAnalyze(file, projName);
  };

  const uploadAndAnalyze = (file: File, projName: string) => {
    setStatus("uploading");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectName", projName);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
        if (percent >= 100) {
          setStatus("processing");
        }
      }
    });

    xhr.addEventListener("load", () => {
      let responseData: any = {};
      try {
        responseData = JSON.parse(xhr.responseText);
      } catch {
        responseData = { error: "Failed to parse server response." };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        setAnalysisResult(responseData);
        setStatus("success");
      } else {
        setError(responseData.error || "An error occurred during repository analysis.");
        setErrorCode(responseData.code || null);
        setStatus("error");
      }
    });

    xhr.addEventListener("error", () => {
      setError("Network error occurred during upload.");
      setStatus("error");
    });

    xhr.addEventListener("abort", () => {
      setError("Upload aborted.");
      setStatus("idle");
    });

    xhr.open("POST", "/api/repo-analysis");
    xhr.send(formData);
  };

  const handleRetry = () => {
    if (selectedFile) {
      uploadAndAnalyze(selectedFile, projectName);
    } else {
      setStatus("idle");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setUploadProgress(0);
    setProjectName("");
    setAnalysisResult(null);
    setError(null);
    setErrorCode(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (status === "success" && analysisResult) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            type="button"
            className="h-9 px-3 text-xs text-slate-400 hover:text-slate-200"
            onClick={handleReset}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Analyze another repository
          </Button>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Analysis complete
          </div>
        </div>
        <RepoAnalysisPanel result={analysisResult} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-6">
      <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <CardHeader className="px-6 pb-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-slate-500">
                Repository scan
              </p>
              <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-white">
                Upload Repository ZIP
              </h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-400">
              REPO AUDIT
            </span>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          {status === "error" && error && (
            <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-400/[0.08] px-4 py-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-rose-300">
                    {errorCode === "RATE_LIMITED"
                      ? "Rate limit reached"
                      : errorCode === "SERVICE_UNAVAILABLE"
                      ? "Service unavailable"
                      : "Scan failed"}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-rose-300/70">
                    {error}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-400/20 hover:text-rose-200"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:border-white/20 hover:text-slate-200"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === "idle" || status === "dragging" ? (
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "group relative flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center transition-all cursor-pointer",
                status === "dragging"
                  ? "border-emerald-400/50 bg-emerald-400/[0.04] scale-[0.99] shadow-[0_0_20px_rgba(52,211,153,0.05)]"
                  : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.01]"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileChange}
              />
              
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-400 transition-colors group-hover:border-white/20 group-hover:text-slate-200 group-hover:bg-white/[0.06] mb-4">
                <FolderArchive className="h-6 w-6" />
              </div>

              <h3 className="text-sm font-medium text-slate-200">
                Drag & drop your repository ZIP here
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 max-w-[280px]">
                Or click to browse. Runs full architectural, security, and performance scanners on your codebase.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-12 text-center">
              {status === "uploading" && (
                <div className="w-full max-w-[320px] space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-400 mx-auto animate-pulse">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-200">Uploading Codebase</h3>
                    <p className="mt-1 text-xs text-slate-500 font-mono truncate">{selectedFile?.name}</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold font-mono text-slate-500">
                      <span>{uploadProgress}%</span>
                      <span>
                        {selectedFile && `${((selectedFile.size * (uploadProgress / 100)) / 1024 / 1024).toFixed(1)} / ${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {status === "processing" && (
                <div className="w-full max-w-[320px] space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-400 mx-auto">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-200">Auditing Repository</h3>
                    <p className="mt-1 text-xs text-slate-500 font-mono">
                      Running AST scans and Gemini 2.5 Flash...
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-400/5 px-3 py-1 text-[10px] font-medium text-emerald-300/80 animate-pulse mx-auto">
                    <Sparkles className="h-3 w-3" />
                    Deep review may take 30–60 seconds
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
