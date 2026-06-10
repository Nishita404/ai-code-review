const languageMatchers = [
  { language: "TypeScript", patterns: [/\binterface\b/, /:\s*(string|number|boolean|Promise<)/, /\btype\b/] },
  { language: "JavaScript", patterns: [/\bconst\b/, /\blet\b/, /\bfunction\b/] },
  { language: "Python", patterns: [/\bdef\b/, /\bimport\b/, /:\s*$/m] },
  { language: "Java", patterns: [/\bpublic\s+class\b/, /\bvoid\b/, /\bString\b/] },
  { language: "Go", patterns: [/\bfunc\b/, /\bpackage\b/, /fmt\./] },
  { language: "Rust", patterns: [/\bfn\b/, /\blet\b/, /println!\(/] },
  { language: "C#", patterns: [/\bnamespace\b/, /\busing\b/, /\bclass\b/] },
  { language: "SQL", patterns: [/\bSELECT\b/i, /\bFROM\b/i, /\bWHERE\b/i] },
] as const;

export function detectLanguage(code: string) {
  const normalizedCode = code.trim();

  if (!normalizedCode) {
    return "Plain Text";
  }

  for (const { language, patterns } of languageMatchers) {
    if (patterns.every((pattern) => pattern.test(normalizedCode))) {
      return language;
    }
  }

  return "Plain Text";
}