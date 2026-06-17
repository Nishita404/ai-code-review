"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { signIn } from "@/lib/auth-client";

function getAuthErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Authentication request failed.";
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill email from query parameters if present
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        throw result.error;
      }

      const next = searchParams.get("next");
      const destination =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : "/review";
      router.push(destination);
      router.refresh();
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md bg-[#050505] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.55)] border-white/10">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <CardHeader className="p-0 space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Sign in
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="text-sm leading-6 text-slate-400">
            Sign in to access your review workspace.
          </p>
        </CardHeader>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <CardContent className="p-0 grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="alex@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
        </CardContent>

        <div className="space-y-3 pt-1">
          <Button
            className="h-12 w-full px-6"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Sign in
          </Button>
          <div className="text-sm text-slate-400">
            Need an account?{" "}
            <Link
              href={`/auth/sign-up?${new URLSearchParams(email ? { email } : {}).toString()}`}
              className="font-medium text-slate-300 transition hover:text-white underline underline-offset-4"
            >
              Create one
            </Link>
          </div>
        </div>
      </form>
    </Card>
  );
}

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12 text-white">
      {/* Background decorations for premium dark mode */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.04),transparent_45%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent"
          >
            AI Code Review
          </Link>
        </div>
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center rounded-3xl border border-white/10 bg-[#050505]">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          }
        >
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
