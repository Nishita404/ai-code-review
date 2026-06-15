import { z } from "zod";

export const reviewRequestSchema = z.object({
  code: z.string().trim().min(1, "Code is required"),
  language: z.string().trim().min(1, "Language is required"),
});

export const issueSchema = z.object({
  title: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  explanation: z.string(),
  fix: z.string(),
});

export const reviewResponseSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  bugs: z.array(issueSchema),
  security: z.array(issueSchema),
  performance: z.array(issueSchema),
  quality: z.array(issueSchema),
  suggestions: z.array(z.string()),
});

export type ReviewIssue = z.infer<typeof issueSchema>;
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;
