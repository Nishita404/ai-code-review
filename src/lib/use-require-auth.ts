"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

/**
 * Redirects unauthenticated users to /auth/sign-in, passing the current path
 * as ?next= so the sign-in page can return them after login.
 *
 * Returns the session loading state so the caller can render a spinner while
 * the session is being resolved.
 */
export function useRequireAuth() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      const next = window.location.pathname;
      router.replace(`/auth/sign-in?next=${encodeURIComponent(next)}`);
    }
  }, [isPending, session, router]);

  return { isPending, session };
}
