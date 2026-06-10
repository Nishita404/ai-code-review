import { Cormorant_Garamond } from "next/font/google";
import { ArrowRight, BrainCircuit, Code2, ShieldCheck, Sparkles, Target, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Typewriter } from "@/components/landing/typewriter";
import { CodePreviewCard } from "@/components/landing/code-preview-card";

const serifDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant-garamond",
});

const phrases = [
  "Review code before it breaks.",
  "Find bugs before users do.",
  "Ship cleaner code with AI.",
  "Detect security risks instantly.",
];

const featureItems = [
  { icon: Target, title: "Bug detection" },
  { icon: ShieldCheck, title: "Security review" },
  { icon: Sparkles, title: "Performance review" },
  { icon: Wand2, title: "Refactoring suggestions" },
  { icon: BrainCircuit, title: "AI test generation" },
  { icon: Code2, title: "Multi-language support" },
];

export function LandingSections() {
  return (
    <main className="bg-[#000000] text-white">
      <section className="relative min-h-screen overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.03),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_18%)]" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid w-full gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="max-w-2xl space-y-8">
              <Badge className="border-white/10 bg-white/5 text-slate-200">
                AI-powered code review for teams and builders
              </Badge>

              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                  AI Code Review Platform
                </p>
                <div className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                  <div className="mb-3 text-sm font-medium uppercase tracking-[0.32em] text-slate-500">
                    AI review engine
                  </div>
                  <Typewriter phrases={phrases} />
                </div>
                <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                  Paste code, detect the language, and prepare a structured AI review flow that highlights bugs, security concerns, performance issues, and code quality feedback.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="#get-started" className="h-12 px-6">
                  Start reviewing
                </ButtonLink>
                <ButtonLink href="#features" variant="secondary" className="h-12 px-6">
                  See workflow
                </ButtonLink>
              </div>
            </div>

            <div className="lg:justify-self-end">
              <CodePreviewCard />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-[#050505]">
        <div className="mx-auto grid min-h-[80vh] w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="order-2 lg:order-1">
            <CodePreviewCard />
          </div>

          <div className="order-1 max-w-2xl space-y-8 lg:order-2 lg:justify-self-end">
            <Badge className="border-white/10 bg-white/[0.04] text-slate-300">
              Faster signal, less noise
            </Badge>

            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                Review workflow
              </p>
              <div className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                <div className="mb-3 text-sm font-medium uppercase tracking-[0.32em] text-slate-500">
                  Second pass, different focus
                </div>
                <Typewriter phrases={phrases} />
              </div>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Use the same smooth motion, but flip the layout so the review preview leads on the left and the message on the right.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "AI analysis tuned for concise feedback",
                "Clean issue summaries for quick decisions",
                "Supports multiple language patterns",
                "Reusable section components for expansion",
              ].map((item) => (
                <Card key={item} className="bg-white/[0.03]">
                  <CardContent className="px-4 py-4 text-sm leading-6 text-slate-300">
                    {item}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-white/5 bg-[#030303] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <div className="max-w-2xl space-y-4">
            <Badge className="border-white/10 bg-white/[0.04] text-slate-300">Core features</Badge>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Minimal review surface, built for the MVP.
            </h2>
            <p className="text-base leading-7 text-slate-400 sm:text-lg">
              The platform stays focused on the signals that matter most for a first-pass AI code review.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureItems.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.title} className="border-white/10 bg-white/[0.03]">
                  <CardHeader className="pb-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <h3 className="text-base font-medium text-white">{item.title}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#000000] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="space-y-4">
            <Badge className="border-white/10 bg-white/[0.04] text-slate-200">Early access</Badge>
            <h2 className={`text-4xl font-semibold tracking-tight text-white sm:text-5xl ${serifDisplay.className}`}>
              Join the waitlist for a cleaner AI review workflow.
            </h2>
            <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              No login yet. No real authentication yet. Just a polished waiting area for the next step of the product.
            </p>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-[#050505] p-5">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Join the waitlist</p>
              <p className="text-sm leading-6 text-slate-400">
                A minimal login-style CTA now, with the actual auth flow coming later.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
                email@company.com
              </div>
              <ButtonLink href="#" className="h-12 px-6">
                Request access
                <ArrowRight className="ml-2 h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}