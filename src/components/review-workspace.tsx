"use client";

import Editor from "@monaco-editor/react";
import { ArrowRight, CheckCircle2, Code2, ShieldAlert, Zap } from "lucide-react";
import { detectLanguage } from "@/lib/detect-language";
import { useState } from "react";

const starterCode = `function greet(name: string) {
  if (!name) {
    return "Hello, world";
  }

  return \`Hello, \${name}\`;
}`;

function getMonacoLanguage(language: string) {
  switch (language) {
    case "TypeScript":
      return "typescript";
    case "JavaScript":
      return "javascript";
    case "Python":
      return "python";
    case "Java":
      return "java";
    case "Go":
      return "go";
    case "Rust":
      return "rust";
    case "C#":
      return "csharp";
    case "SQL":
      return "sql";
    default:
      return "plaintext";
  }
}

export function ReviewWorkspace() {
  const [code, setCode] = useState(starterCode);
  const detectedLanguage = detectLanguage(code);

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-4 text-slate-50 shadow-[0_28px_80px_rgba(15,23,42,0.22)] sm:p-5">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-1 pb-4">
        <div>
          <p className="text-sm font-medium text-slate-300">Paste code review workspace</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Review-ready editor</h2>
        </div>
        <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300">
          Detected: {detectedLanguage}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111827]">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
            <Code2 className="h-4 w-4" />
            Paste code
          </div>
          <div className="h-[32rem] bg-[#0b1020] p-1">
            <Editor
              height="32rem"
              defaultLanguage="typescript"
              language={getMonacoLanguage(detectedLanguage)}
              value={code}
              onChange={(value) => setCode(value ?? "")}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                smoothScrolling: true,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Zap className="h-4 w-4 text-amber-300" />
              Review status
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              The UI is ready for the backend route. When the API is connected, this panel will show the structured AI review response.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Review code later
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3">
            {[
              ["Score", "Waiting for AI review", "check"],
              ["Bugs", "No results yet", "alert"],
              ["Security", "No results yet", "alert"],
              ["Performance", "No results yet", "zap"],
              ["Code quality", "No results yet", "check"],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  {icon === "zap" ? (
                    <Zap className="h-4 w-4 text-amber-300" />
                  ) : icon === "alert" ? (
                    <ShieldAlert className="h-4 w-4 text-rose-300" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  )}
                  {label}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}