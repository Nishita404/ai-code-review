import { z } from "zod";

// ─── Metrics ─────────────────────────────────────────────────────────────────

export const largestFileSchema = z.object({
  filePath: z.string(),
  loc: z.number().int(),
  sizeBytes: z.number().int(),
});

export const repoMetricsSchema = z.object({
  totalFiles: z.number().int(),
  totalLoc: z.number().int(),
  languageDistribution: z.record(z.string(), z.number().int()), // language -> LOC
  largestFiles: z.array(largestFileSchema),
  duplicateCodeEstimate: z.number().min(0).max(100), // percentage of duplicated lines
});

export type RepoMetrics = z.infer<typeof repoMetricsSchema>;

// ─── Architecture ────────────────────────────────────────────────────────────

export const circularDependencySchema = z.object({
  chain: z.array(z.string()), // e.g. ["a.ts", "b.ts", "a.ts"]
  explanation: z.string(),
});

export const deepImportChainSchema = z.object({
  filePath: z.string(),
  depth: z.number().int(),
  chain: z.array(z.string()),
  explanation: z.string(),
});

export const largeFileWarningSchema = z.object({
  filePath: z.string(),
  loc: z.number().int(),
  explanation: z.string(),
});

export const largeFunctionWarningSchema = z.object({
  filePath: z.string(),
  functionName: z.string(),
  loc: z.number().int(),
  explanation: z.string(),
});

export const deadCodeCandidateSchema = z.object({
  filePath: z.string(),
  symbolName: z.string(), // name of unused function, class, etc.
  explanation: z.string(),
});

export const repoArchitectureSchema = z.object({
  circularDependencies: z.array(circularDependencySchema),
  deepImportChains: z.array(deepImportChainSchema),
  largeFiles: z.array(largeFileWarningSchema),
  largeFunctions: z.array(largeFunctionWarningSchema),
  deadCodeCandidates: z.array(deadCodeCandidateSchema),
});

export type RepoArchitecture = z.infer<typeof repoArchitectureSchema>;

// ─── Security ────────────────────────────────────────────────────────────────

export const securityIssueSchema = z.object({
  filePath: z.string(),
  line: z.number().int().optional(),
  snippet: z.string(),
  explanation: z.string(),
});

export const repoSecuritySchema = z.object({
  hardcodedSecrets: z.array(securityIssueSchema),
  apiKeys: z.array(securityIssueSchema),
  tokens: z.array(securityIssueSchema),
  unsafeEval: z.array(securityIssueSchema),
  dangerousShellCommands: z.array(securityIssueSchema),
});

export type RepoSecurity = z.infer<typeof repoSecuritySchema>;

// ─── Performance ─────────────────────────────────────────────────────────────

export const performanceIssueSchema = z.object({
  filePath: z.string(),
  line: z.number().int().optional(),
  snippet: z.string().optional(),
  explanation: z.string(),
});

export const repoPerformanceSchema = z.object({
  nestedLoops: z.array(performanceIssueSchema),
  nPlusOnePatterns: z.array(performanceIssueSchema),
  memoryHeavyStructures: z.array(performanceIssueSchema),
});

export type RepoPerformance = z.infer<typeof repoPerformanceSchema>;

// ─── Aggregate Repository Analysis Schema ────────────────────────────────────

export const repoAnalysisSchema = z.object({
  projectName: z.string(),
  
  // Scores
  securityScore: z.number().int().min(0).max(100),
  maintainabilityScore: z.number().int().min(0).max(100),
  performanceScore: z.number().int().min(0).max(100),
  architectureScore: z.number().int().min(0).max(100),

  // Detailed Scans
  metrics: repoMetricsSchema,
  architecture: repoArchitectureSchema,
  security: repoSecuritySchema,
  performance: repoPerformanceSchema,
});

export type RepositoryAnalysis = z.infer<typeof repoAnalysisSchema>;

// ─── JSON Schema for Gemini structured output ─────────────────────────────────

export const repoAnalysisJsonSchema = z.toJSONSchema(repoAnalysisSchema);
