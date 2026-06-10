import { Code2, Shield, Sparkles, Zap } from "lucide-react";

const reviewSignals = [
  { label: "Bugs", value: "2 potential issues", icon: Shield },
  { label: "Security", value: "1 risky pattern", icon: Shield },
  { label: "Performance", value: "3 optimization notes", icon: Zap },
  { label: "Quality", value: "4 style suggestions", icon: Sparkles },
];

const sampleCode = `const getUserDisplayName = (user) => {
  if (!user) return "Guest";

  return user.profile?.name?.trim() || user.email;
};

export default getUserDisplayName;`;

export function CodePreviewCard() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_30%)]" />
      <div className="relative flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">Preview</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Review snapshot</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          AI ready
        </div>
      </div>

      <div className="relative mt-4 grid gap-4">
        <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-4">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
            <Code2 className="h-4 w-4 text-sky-400" />
            Code
          </div>
          <pre className="overflow-x-auto rounded-2xl bg-black/30 p-4 text-sm leading-7 text-slate-300">
            <code>{sampleCode}</code>
          </pre>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {reviewSignals.map((signal) => {
            const Icon = signal.icon;

            return (
              <div key={signal.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Icon className="h-4 w-4 text-sky-400" />
                  {signal.label}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{signal.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}