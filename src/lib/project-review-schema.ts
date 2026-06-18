import { z } from "zod";
import { reviewResponseSchema } from "./review-schema";

// ─── Per-file result ──────────────────────────────────────────────────────────

export const projectFileResultSchema = reviewResponseSchema.extend({
  filePath: z.string(),
  language: z.string(),
});

export type ProjectFileResult = z.infer<typeof projectFileResultSchema>;

// ─── Aggregate project result ─────────────────────────────────────────────────

export const projectReviewResponseSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  summary: z.string(),
  languageBreakdown: z.record(z.string(), z.number().int()),
  files: z.array(projectFileResultSchema),
});

export type ProjectReviewResponse = z.infer<typeof projectReviewResponseSchema>;

// ─── JSON Schema for Gemini structured output ─────────────────────────────────

export const projectReviewResponseJsonSchema = z.toJSONSchema(
  projectReviewResponseSchema,
);

// ─── Shape stored in the DB ───────────────────────────────────────────────────

export type StoredProjectReview = Omit<ProjectReviewResponse, "files">;
