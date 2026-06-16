"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { signUp } from "@/lib/auth-client";

function getAuthErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Registration failed.";
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill fields from query parameters if present
  useEffect(() => {
    const nameParam = searchParams.get("name");
    const emailParam = searchParams.get("email");

    if (nameParam) setName(nameParam);
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Validate password match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        throw result.error;
      }

      router.push("/review");
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
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Sign up</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Create account</h1>
          <p className="text-sm leading-6 text-slate-400">
            Get started by entering your details to access the workspace.
          </p>
        </CardHeader>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <CardContent className="p-0 grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Alex Morgan"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

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
              placeholder="Create a password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
        </CardContent>

        <div className="space-y-3 pt-1">
          <Button className="h-12 w-full px-6" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create account
          </Button>
          <div className="text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              href={`/auth/sign-in?${new URLSearchParams(email ? { email } : {}).toString()}`}
              className="font-medium text-slate-300 transition hover:text-white underline underline-offset-4"
            >
              Sign in
            </Link>
          </div>
        </div>
      </form>
    </Card>
  );
}

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black px-4 py-12 text-white">
      {/* Background decorations for premium dark mode */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.04),transparent_45%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            AI Code Review
          </Link>
        </div>
        <Suspense fallback={
          <div className="flex h-64 items-center justify-center rounded-3xl border border-white/10 bg-[#050505]">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        }>
          <SignUpForm />
        </Suspense>
      </div>
    </main>
  );
}
