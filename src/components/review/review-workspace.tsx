"use client";

import type { ChangeEvent } from "react";
import { useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { FileUp, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { detectLanguage, toMonacoLanguage, type LanguageName } from "@/lib/detect-language";

const languageOptions: LanguageName[] = [
  "Plain Text",
  "TypeScript",
  "JavaScript",
  "Python",
  "Java",
  "C",
  "C++",
  "Go",
  "Rust",
  "HTML",
  "CSS",
  "SQL",
  "Bash",
  "JSON",
];

const starterCode = `const getUserDisplayName = (user) => {
  if (!user) return "Guest";

  return user.profile?.name?.trim() || user.email;
};

export default getUserDisplayName;`;

const summaryCards = [
  { label: "Overall Score", value: "87/100", tone: "text-emerald-300" },
  { label: "Bugs", value: "2 findings", tone: "text-sky-300" },
  { label: "Security", value: "1 finding", tone: "text-amber-300" },
  { label: "Performance", value: "3 notes", tone: "text-cyan-300" },
  { label: "Code Quality", value: "4 suggestions", tone: "text-fuchsia-300" },
];

export function ReviewWorkspace() {
  const [code, setCode] = useState(starterCode);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageName>(() => detectLanguage(starterCode));
  const [isManualLanguage, setIsManualLanguage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const lineCount = useMemo(() => code.split("\n").length, [code]);
  const detectedLanguage = useMemo(() => detectLanguage(code), [code]);

  function updateCode(nextCode: string) {
    const nextDetectedLanguage = detectLanguage(nextCode);

    setCode(nextCode);

    if (!isManualLanguage) {
      setSelectedLanguage(nextDetectedLanguage);
    }
  }

  function handleAutoDetect() {
    const nextDetectedLanguage = detectLanguage(code);

    setIsManualLanguage(false);
    setSelectedLanguage(nextDetectedLanguage);
  }

  function handleClear() {
    updateCode("");
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      updateCode(String(reader.result ?? ""));
    };

    reader.readAsText(file);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative isolate overflow-hidden bg-black py-24 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.03),transparent_22%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <Badge className="border-white/10 bg-white/5 text-slate-200">Review workspace</Badge>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">AI Code Review Platform</p>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Paste code, review fast, stay focused.</h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-300">
                  A clean workspace for Monaco editing, language selection, file import, and structured review results.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-sm text-slate-400">
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{lineCount} lines</span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">Mock analysis</span>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:p-5">
              <CardHeader className="px-0 pt-0 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-500">Editor</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Source review input</h2>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-300">
                    Monaco Editor
                  </span>
                </div>
              </CardHeader>

              <CardContent className="px-0 pb-0 pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-1">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="language">Language</Label>
                      <Button variant="ghost" type="button" className="h-8 px-3 text-xs" onClick={handleAutoDetect}>
                        Auto detect
                      </Button>
                    </div>
                    <Select
                      id="language"
                      value={selectedLanguage}
                      onChange={(event) => {
                        setSelectedLanguage(event.target.value as LanguageName);
                        setIsManualLanguage(true);
                      }}
                    >
                      {languageOptions.map((option) => (
                        <option key={option} value={option} className="bg-black text-white">
                          {option}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex items-end gap-3 sm:justify-end">
                    <input ref={fileInputRef} type="file" accept=".ts,.tsx,.js,.jsx,.py,.java,.go,.rs,.cs,.sql,.txt" className="hidden" onChange={handleFileSelect} />
                    <Button variant="secondary" type="button" className="h-12 px-4" onClick={() => fileInputRef.current?.click()}>
                      <FileUp className="mr-2 h-4 w-4" />
                      Upload file
                    </Button>
                    <Button variant="ghost" type="button" className="h-12 px-4" onClick={handleClear}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-[#030303] p-1 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                  <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-300">
                      Detected: {detectedLanguage}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-300">
                      Editor: {selectedLanguage}
                    </span>
                    {isManualLanguage ? (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
                        Manual override
                      </span>
                    ) : null}
                  </div>
                  <Editor
                    height="520px"
                    defaultLanguage="typescript"
                    language={toMonacoLanguage(selectedLanguage)}
                    value={code}
                    onChange={(value) => updateCode(value ?? "")}
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

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-400">Use the editor to prepare code for a future review request.</p>
                  <Button className="h-12 px-6">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Review code
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:p-5">
                <CardHeader className="px-0 pt-0 pb-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-500">Results</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">Review results</h2>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 px-0 pb-0 pt-0 sm:grid-cols-2">
                  {summaryCards.map((card) => (
                    <div key={card.label} className="rounded-3xl border border-white/10 bg-black/30 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{card.label}</p>
                      <p className={`mt-3 text-2xl font-semibold tracking-tight ${card.tone}`}>{card.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:p-5">
                <CardHeader className="px-0 pt-0 pb-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-500">Summary</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">AI review summary</h2>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 px-0 pb-0 pt-0">
                  <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm font-medium text-white">Score</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">87/100 with a strong baseline and a few cleanup opportunities.</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm font-medium text-white">Bugs</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">2 likely issues around null handling and fallback logic.</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm font-medium text-white">Security</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">1 item to inspect for safer data access patterns.</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm font-medium text-white">Performance</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">3 opportunities to simplify work and reduce repeated lookups.</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
                    <p className="text-sm font-medium text-white">Code Quality</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">4 suggestions to improve consistency and readability.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}