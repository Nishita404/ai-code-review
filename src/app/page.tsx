import { ReviewWorkspace } from "@/components/review-workspace";

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="grid gap-12 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-10">
            <div className="flex flex-col justify-between gap-10">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  MVP: paste code, review fast
                </div>

                <div className="space-y-5">
                  <p className="max-w-max rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
                    AI code review platform
                  </p>
                  <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                    Turn pasted code into a structured review in one clean flow.
                  </h1>
                  <p className="max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                    Start with a simple paste-and-review experience: detect the language, send code to the backend, and show AI feedback for bugs, security, performance, and code quality.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ["1", "Paste code into the editor"],
                    ["2", "Detect the language locally"],
                    ["3", "Route review requests to AI"],
                  ].map(([step, label]) => (
                    <div
                      key={step}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                    >
                      <p className="font-mono text-sm font-semibold text-amber-600">0{step}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Structured output", "Score, bugs, security, performance, quality"],
                  ["Beginner-friendly", "Simple flow with clear loading and empty states"],
                  ["Extensible", "Ready for API routes, auth, and GitHub later"],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <p className="text-sm font-semibold text-slate-950">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <ReviewWorkspace />
          </div>
        </div>
      </section>
    </main>
  );
}