import { CodePreviewCard } from "@/components/landing/code-preview-card";
import { HeroActions } from "@/components/landing/hero-actions";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#070b14] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%)]" />
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
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Review code faster with a clean, AI-first workflow.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Paste code, detect the language, and prepare a structured AI review flow that highlights bugs, security concerns, performance issues, and code quality feedback.
              </p>
            </div>

            <div id="get-started" className="space-y-4">
              <HeroActions />
              <p className="text-sm leading-6 text-slate-400">
                No auth, no backend, no distractions yet. This is the first polished landing page for the MVP.
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