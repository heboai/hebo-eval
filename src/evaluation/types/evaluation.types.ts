import { z } from 'zod';

/**
 * Configuration for scoring and report generation
 */
export const EvaluationConfigSchema = z.object({
  threshold: z.number().min(0).max(1).default(0.7),
  outputFormat: z.enum(['json', 'markdown', 'text']).default('markdown'),
  maxConcurrency: z.number().min(1).default(2),
});

export type EvaluationConfig = z.infer<typeof EvaluationConfigSchema>;

/**
 * Represents a single evaluation result
 */
export const EvaluationResultSchema = z.object({
  testCase: z.object({
    id: z.string(),
    input: z.string(),
    expected: z.string(),
  }),
  score: z.number().min(0).max(1),
  passed: z.boolean(),
  error: z.string().optional(),
  timestamp: z.date(),
  response: z.string(),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

/**
 * Represents the aggregated report of all evaluations
 */
export const EvaluationReportSchema = z.object({
  totalTests: z.number(),
  passedTests: z.number(),
  failedTests: z.number(),
  passRate: z.number().min(0).max(1),
  results: z.array(
    z.object({
      testCase: z.object({
        id: z.string(),
        input: z.string(),
        expected: z.string(),
      }),
      score: z.number().min(0).max(1),
      passed: z.boolean(),
      error: z.string().optional(),
      timestamp: z.date(),
      response: z.string(),
    }),
  ),
  timestamp: z.date(),
  duration: z.number(),
});

export type EvaluationReport = z.infer<typeof EvaluationReportSchema>;
