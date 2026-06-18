"use client";

import { useEffect, useState } from "react";
import { Loader2, Link2, Link2Off, GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { toast } from "sonner"; // Sonner toast notification utility (standard in the project)

// ─── Custom Github Icon ──────────────────────────────────────────────────────
function Github(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

type GithubStatus = {
  connected: boolean;
  username?: string;
  avatar?: string;
  repoCount?: number;
};

export function GithubConnectCard() {
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/github/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to check GitHub status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    // Redirect to redirect endpoint
    window.location.href = "/api/auth/github/connect?action=connect";
  };

  const handleDisconnect = async () => {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/auth/github/disconnect", {
        method: "POST",
      });
      if (res.ok) {
        toast.success("GitHub account disconnected successfully.");
        await fetchStatus();
      } else {
        toast.error("Failed to disconnect GitHub account.");
      }
    } catch (err) {
      console.error("Disconnect error:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected ?? false;

  return (
    <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -right-4 -bottom-4 text-white/[0.01] pointer-events-none">
        <Github className="h-32 w-32" />
      </div>

      <CardHeader className="px-5 pb-3 pt-5 border-b border-white/5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-white animate-pulse" />
            <h3 className="text-sm font-semibold text-white">GitHub Integration</h3>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
              isConnected
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"
                : "border-slate-800 bg-slate-900 text-slate-500"
            )}
          >
            {isConnected ? "Connected" : "Not Linked"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-5">
        {isConnected ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {status?.avatar ? (
                <img
                  src={status.avatar}
                  alt={status.username}
                  className="h-12 w-12 rounded-full border border-white/15 bg-white/5 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400">
                  <Github className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate font-mono">
                  {status?.username}
                </p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                  <GitFork className="h-3 w-3" />
                  <span>{status?.repoCount ?? 0} repositories synced</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="h-9 shrink-0 text-xs gap-1.5 px-4 text-rose-300 hover:text-rose-200 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20"
            >
              {isDisconnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2Off className="h-3.5 w-3.5" />
              )}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-300 font-medium">Link your GitHub Profile</p>
              <p className="text-[11px] text-slate-500 leading-4">
                Connect your account to access and review your public/private repositories directly.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleConnect}
              className="h-9 shrink-0 text-xs gap-1.5 px-4"
            >
              <Link2 className="h-3.5 w-3.5" />
              Connect GitHub
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
