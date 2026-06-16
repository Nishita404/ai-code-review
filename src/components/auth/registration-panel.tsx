"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegistrationPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-up" | "sign-in">("sign-up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    if (email) params.set("email", email);
    
    if (mode === "sign-up") {
      if (name) params.set("name", name);
      router.push(`/auth/sign-up?${params.toString()}`);
    } else {
      router.push(`/auth/sign-in?${params.toString()}`);
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[#050505] p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-emerald-400/20 hover:shadow-[0_18px_48px_rgba(0,0,0,0.45),0_0_0_1px_rgba(52,211,153,0.08),0_0_24px_rgba(52,211,153,0.08)]">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">{mode === "sign-up" ? "Create account" : "Sign in"}</p>
          <p className="text-sm leading-6 text-slate-400">
            {mode === "sign-up"
              ? "Keep it simple. Enter your details and continue into the review workspace."
              : "Welcome back. Sign in to continue into the review workspace."}
          </p>
        </div>

        <div className="grid gap-4">
          {mode === "sign-up" ? (
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
          ) : null}

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
              placeholder={mode === "sign-up" ? "Create a password" : "Enter your password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <Button className="h-12 w-full px-6" type="submit">
            {mode === "sign-up" ? "Create account" : "Sign in"}
          </Button>
          <button
            type="button"
            className="text-sm font-medium text-slate-400 transition hover:text-white"
            onClick={() => {
              const params = new URLSearchParams();
              if (email) params.set("email", email);
              if (mode === "sign-up") {
                router.push(`/auth/sign-in?${params.toString()}`);
              } else {
                if (name) params.set("name", name);
                router.push(`/auth/sign-up?${params.toString()}`);
              }
            }}
          >
            {mode === "sign-up" ? "Already have an account? Sign in" : "Need an account? Create one"}
          </button>
        </div>
      </form>
    </div>
  );
}
