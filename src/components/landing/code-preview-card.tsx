import { Code2, Shield, Sparkles, Zap } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    <Card className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition duration-300 ease-out hover:-translate-y-1 hover:scale-[1.015] hover:border-white/20 hover:shadow-[0_42px_110px_rgba(0,0,0,0.58)] hover:[box-shadow:0_0_0_1px_rgba(255,255,255,0.12),0_42px_110px_rgba(0,0,0,0.58),0_0_28px_rgba(255,255,255,0.04)] sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.03),transparent_30%)] opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
      <CardHeader className="relative flex items-center justify-between px-0 pt-0 pb-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">Preview</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Review snapshot</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
          <span className="h-2 w-2 rounded-full bg-white/70" />
          AI ready
        </div>
      </CardHeader>

      <CardContent className="relative mt-0 grid gap-4 px-0 pb-0 pt-0">
        <div className="rounded-3xl border border-white/10 bg-[#030303] p-4 transition-colors duration-300 group-hover:border-white/15">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
            <Code2 className="h-4 w-4 text-white/80" />
            Code
          </div>
          <pre className="overflow-x-auto rounded-2xl bg-black/40 p-4 text-sm leading-7 text-slate-300">
            <code>{sampleCode}</code>
          </pre>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {reviewSignals.map((signal) => {
            const Icon = signal.icon;

            return (
              <div key={signal.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Icon className="h-4 w-4 text-white/80" />
                  {signal.label}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{signal.value}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}