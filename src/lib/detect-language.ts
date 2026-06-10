type LanguageName =
  | "JavaScript"
  | "TypeScript"
  | "Python"
  | "Java"
  | "C"
  | "C++"
  | "Go"
  | "Rust"
  | "HTML"
  | "CSS"
  | "SQL"
  | "Bash"
  | "JSON"
  | "Plain Text";

const languageMatchers: Array<{
  language: Exclude<LanguageName, "Plain Text">;
  match: (code: string) => boolean;
}> = [
  {
    language: "JSON",
    match: (code) => {
      if (!/^\s*[\[{]/.test(code)) {
        return false;
      }

      try {
        JSON.parse(code);
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    language: "HTML",
    match: (code) => /<!doctype html>|<html\b|<head\b|<body\b|<div\b|<section\b|<main\b|<p\b/i.test(code),
  },
  {
    language: "CSS",
    match: (code) => /@media\b|\.[\w-]+\s*\{|#[\w-]+\s*\{|\b(display|margin|padding|color|background)\s*:/i.test(code),
  },
  {
    language: "Bash",
    match: (code) => /^\s*#!\/.*\b(?:ba)?sh\b/m.test(code) || /\b(echo|cd|export|grep|chmod|mkdir|touch|fi|then|elif|case|esac)\b/.test(code),
  },
  {
    language: "C++",
    match: (code) => /#include\s*<iostream>|\bstd::|\bcout\s*<<|\bcin\s*>>|using\s+namespace\s+std/.test(code),
  },
  {
    language: "C",
    match: (code) => /#include\s*<stdio\.h>|#include\s*<stdlib\.h>|\bprintf\s*\(|\bscanf\s*\(|\bint\s+main\s*\(/.test(code),
  },
  {
    language: "TypeScript",
    match: (code) => /\binterface\b|\btype\b\s+\w+\s*=|:\s*(string|number|boolean|Promise<|Array<)|\benum\b|\bas\s+const\b/.test(code),
  },
  {
    language: "JavaScript",
    match: (code) => /\bconst\b|\blet\b|\bfunction\b|=>|\bimport\b|\bexport\b/.test(code),
  },
  {
    language: "Python",
    match: (code) => /\bdef\b|\bimport\b|\bfrom\s+\w+\s+import\b|\bprint\s*\(|\bif\s+__name__\s*==\s*['"]__main__['"]/.test(code),
  },
  {
    language: "Java",
    match: (code) => /\bpublic\s+class\b|\bstatic\s+void\s+main\b|\bSystem\.out\.println\b|\bpackage\b|\bimport\s+java\./.test(code),
  },
  {
    language: "Go",
    match: (code) => /\bpackage\s+main\b|\bfunc\s+main\b|\bfmt\.Print(ln)?\b|\bgo\s+func\b/.test(code),
  },
  {
    language: "Rust",
    match: (code) => /\bfn\s+main\b|\blet\s+mut\b|\bprintln!\s*\(|\buse\s+crate::\b|\bResult<.*>/.test(code),
  },
  {
    language: "SQL",
    match: (code) => /\bSELECT\b.*\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\b.*\bSET\b|\bCREATE\s+TABLE\b|\bDELETE\s+FROM\b/i.test(code),
  },
];

export function detectLanguage(code: string): LanguageName {
  const normalizedCode = code.trim();

  if (!normalizedCode) {
    return "Plain Text";
  }

  for (const { language, match } of languageMatchers) {
    if (match(normalizedCode)) {
      return language;
    }
  }

  return "Plain Text";
}

export function toMonacoLanguage(language: LanguageName) {
  switch (language) {
    case "TypeScript":
      return "typescript";
    case "JavaScript":
      return "javascript";
    case "Python":
      return "python";
    case "Java":
      return "java";
    case "C":
      return "c";
    case "C++":
      return "cpp";
    case "Go":
      return "go";
    case "Rust":
      return "rust";
    case "HTML":
      return "html";
    case "CSS":
      return "css";
    case "SQL":
      return "sql";
    case "Bash":
      return "shell";
    case "JSON":
      return "json";
    default:
      return "plaintext";
  }
}

export type { LanguageName };