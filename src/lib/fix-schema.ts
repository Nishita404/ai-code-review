import { z } from "zod";

export const fixRequestSchema = z.object({
  code: z.string().trim().min(1),
  language: z.string().trim().min(1),
  findings: z.object({
    bugs: z.array(
      z.object({
        title: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        explanation: z.string(),
        fix: z.string(),
      }),
    ),
    security: z.array(
      z.object({
        title: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        explanation: z.string(),
        fix: z.string(),
      }),
    ),
    performance: z.array(
      z.object({
        title: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        explanation: z.string(),
        fix: z.string(),
      }),
    ),
    quality: z.array(
      z.object({
        title: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        explanation: z.string(),
        fix: z.string(),
      }),
    ),
    suggestions: z.array(z.string()),
  }),
});

export const fixResponseSchema = z.object({
  fixedCode: z.string(),
  explanation: z.string(),
  improvements: z.array(z.string()),
});

export type FixRequest = z.infer<typeof fixRequestSchema>;
export type FixResponse = z.infer<typeof fixResponseSchema>;

export const fixResponseJsonSchema = z.toJSONSchema(fixResponseSchema);
