"use client";

import { CodePreviewCard } from "@/components/landing/code-preview-card";
import { HeroActions } from "@/components/landing/hero-actions";
import { Typewriter } from "@/components/landing/typewriter";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";

const phrases = [
  "Review code before it breaks.",
  "Find bugs before users do.",
  "Ship cleaner code with AI.",
  "Detect security risks instantly.",
];

export function Hero() {
  const [soundEnabled, setSoundEnabled] = useState(false);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)]" />
      <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-6 lg:right-8 lg:top-8">
        <Button
          type="button"
          variant="ghost"
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? "Sound on" : "Sound off"}
          title={soundEnabled ? "Sound on" : "Sound off"}
          onClick={() => setSoundEnabled((current) => !current)}
          className="h-10 w-10 rounded-full border border-white/15 bg-white/[0.09] p-0 text-white shadow-[0_10px_24px_rgba(0,0,0,0.28)] ring-1 ring-white/5 backdrop-blur-md hover:border-white/25 hover:bg-white/[0.14] hover:text-white hover:ring-white/10"
        >
          {soundEnabled ? <Volume2 className="h-[15px] w-[15px]" /> : <VolumeX className="h-[15px] w-[15px]" />}
        </Button>
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              AI-powered code review for teams and builders
            </div>

            <div className="space-y-5">
              <p id="learn-more" className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                AI Code Review Platform
              </p>
              <div className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                <div className="mb-3 text-sm font-medium uppercase tracking-[0.32em] text-slate-500">
                  AI review engine
                </div>
                <Typewriter phrases={phrases} soundEnabled={soundEnabled} />
              </div>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Paste code, detect the language, and prepare a structured AI review flow that highlights bugs, security concerns, performance issues, and code quality feedback.
              </p>
            </div>

            <div id="get-started" className="space-y-4">
              <HeroActions />
              <p className="text-sm leading-6 text-slate-400">
                Built for a focused code review experience with a clean path from paste to insight.
              </p>
            </div>
          </div>

          <div className="lg:justify-self-end">
            <CodePreviewCard />
          </div>
        </div>
      </div>
    </section>
  );
}