import { unzipSync, strFromU8 } from "fflate";
import { detectLanguageFromFilename } from "./detect-language";
import type { LanguageName } from "./detect-language";

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_ZIP_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Directories whose contents are always skipped.
 * Matched as path segment prefixes so e.g. "node_modules/x/y" is caught.
 */
const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
  ".git",
  ".svn",
  "__pycache__",
  ".venv",
  "venv",
  ".mypy_cache",
  "target",    // Rust / Maven
  "out",
  ".gradle",
]);

/** Reviewable source-file extensions (maps to a LanguageName). */
const REVIEWABLE_EXTENSIONS: Record<string, LanguageName> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  pyw: "Python",
  java: "Java",
  go: "Go",
  rs: "Rust",
  php: "Plain Text",   // reviewed as plain text — no Monaco highlighter needed
  cs: "Plain Text",    // C#
  cpp: "C++",
  cxx: "C++",
  cc: "C++",
  "c++": "C++",
  hpp: "C++",
  hxx: "C++",
  c: "C",
  h: "C",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExtractedFile = {
  path: string;
  content: string;
  language: LanguageName;
  sizeBytes: number;
};

// ─── Custom error types ───────────────────────────────────────────────────────

export class ZipValidationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "TOO_LARGE"
      | "INVALID_ZIP"
      | "EMPTY_ZIP"
      | "NO_SOURCE_FILES",
  ) {
    super(message);
    this.name = "ZipValidationError";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isIgnored(filePath: string): boolean {
  // Normalise separators
  const parts = filePath.replace(/\\/g, "/").split("/");
  // Check every path segment against the ignore list
  return parts.some((seg) => IGNORED_DIRS.has(seg));
}

function getExtension(filename: string): string {
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return "";
  return filename.slice(dotIdx + 1).toLowerCase();
}

function getReviewableLanguage(filename: string): LanguageName | null {
  const ext = getExtension(filename);
  if (!ext) return null;

  // Try the extension map first
  if (ext in REVIEWABLE_EXTENSIONS) {
    return REVIEWABLE_EXTENSIONS[ext as keyof typeof REVIEWABLE_EXTENSIONS];
  }

  // Fall back to the existing filename detector for any extras
  return detectLanguageFromFilename(filename);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Extract source files from a ZIP buffer.
 *
 * - Skips ignored directories and non-source files
 * - Decodes contents as UTF-8
 * - Trims total source to ≤ 800 KB to stay within Gemini's context window
 *   (drops the largest files first when over the limit)
 *
 * @throws {ZipValidationError} on validation failures
 */
export function extractZip(buffer: ArrayBuffer): ExtractedFile[] {
  if (buffer.byteLength > MAX_ZIP_BYTES) {
    throw new ZipValidationError(
      `ZIP file is too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 25 MB.`,
      "TOO_LARGE",
    );
  }

  let unzipped: ReturnType<typeof unzipSync>;

  try {
    unzipped = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new ZipValidationError(
      "The uploaded file is not a valid ZIP archive.",
      "INVALID_ZIP",
    );
  }

  const entries = Object.keys(unzipped);

  if (entries.length === 0) {
    throw new ZipValidationError("The ZIP archive is empty.", "EMPTY_ZIP");
  }

  // ── Filter to reviewable source files ────────────────────────────────────
  const candidates: ExtractedFile[] = [];

  for (const entryPath of entries) {
    // Skip directories (fflate represents them as zero-length entries ending in /)
    if (entryPath.endsWith("/")) continue;

    // Skip ignored directories
    if (isIgnored(entryPath)) continue;

    const filename = entryPath.split("/").pop() ?? "";
    const language = getReviewableLanguage(filename);
    if (!language) continue;

    const rawBytes = unzipped[entryPath];

    // Skip binary-looking files (null bytes in first 1KB)
    const probe = rawBytes.slice(0, 1024);
    if (probe.includes(0)) continue;

    let content: string;
    try {
      content = strFromU8(rawBytes);
    } catch {
      continue; // skip files that can't be decoded as UTF-8
    }

    // Skip empty files
    if (!content.trim()) continue;

    candidates.push({
      path: entryPath,
      content,
      language,
      sizeBytes: rawBytes.byteLength,
    });
  }

  if (candidates.length === 0) {
    throw new ZipValidationError(
      "No reviewable source files were found in the ZIP. Supported languages: TypeScript, JavaScript, Python, Java, Go, Rust, C/C++, PHP, C#.",
      "NO_SOURCE_FILES",
    );
  }

  // ── Trim to 800 KB of total source content ────────────────────────────────
  // (≈ 200K tokens, safely within Gemini 2.5 Flash's 1M context window)
  const SOURCE_CAP = 800 * 1024; // 800 KB
  let totalBytes = candidates.reduce((s, f) => s + f.sizeBytes, 0);

  if (totalBytes > SOURCE_CAP) {
    // Sort descending by size so we drop the largest files first
    candidates.sort((a, b) => b.sizeBytes - a.sizeBytes);
    while (totalBytes > SOURCE_CAP && candidates.length > 1) {
      const dropped = candidates.shift()!;
      totalBytes -= dropped.sizeBytes;
    }
    // Re-sort by path for a predictable order in the prompt
    candidates.sort((a, b) => a.path.localeCompare(b.path));
  }

  return candidates;
}
