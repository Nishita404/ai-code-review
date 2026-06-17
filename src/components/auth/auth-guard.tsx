"use client";

import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/lib/use-require-auth";

/**
 * Wraps a protected page's client content.
 * Shows a full-screen spinner while the session is resolving,
 * then either renders children (authenticated) or stays blank
 * while the router redirect fires (unauthenticated).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isPending, session } = useRequireAuth();

  if (isPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black">
        <Loader2 className="h-7 w-7 animate-spin text-slate-600" />
        <p className="mt-4 text-xs tracking-[0.2em] text-slate-600 uppercase">
          Checking session…
        </p>
      </div>
    );
  }

  if (!session?.user) {
    // Redirect is already in-flight via useRequireAuth — render nothing
    return null;
  }

  return <>{children}</>;
}
