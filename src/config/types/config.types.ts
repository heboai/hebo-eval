import { z } from 'zod';

/**
 * Provider types
 */
export const ProviderType = {
  OPENAI: 'openai',
  HEBO: 'hebo',
  ANTHROPIC: 'anthropic',
} as const;

export type ProviderType = (typeof ProviderType)[keyof typeof ProviderType];

/**
 * Schema for provider configuration
 */
export const ProviderConfigSchema = z
  .object({
    provider: z.enum([ProviderType.OPENAI, ProviderType.HEBO]),
    baseUrl: z.string().url().optional(),
    apiKey: z.string().optional(),
    authHeader: z
      .object({
        name: z.string(),
        format: z.string(),
      })
      .optional(),
  })
  .passthrough();

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Schema for embedding configuration
 */
export const EmbeddingConfigSchema = z
  .object({
    provider: z.enum([ProviderType.OPENAI, ProviderType.HEBO]),
    model: z.string(),
    baseUrl: z.string().url().optional(),
    apiKey: z.string().optional(),
  })
  .passthrough();

export type EmbeddingConfig = z.infer<typeof EmbeddingConfigSchema>;

/**
 * Schema for the main configuration
 */
export const HeboEvalsConfigSchema = z
  .object({
    providers: z.record(z.string(), ProviderConfigSchema).optional(),
    defaultProvider: z.string().optional(),
    embedding: EmbeddingConfigSchema.optional(),
  })
  .passthrough();

export type HeboEvalsConfig = z.infer<typeof HeboEvalsConfigSchema>;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<HeboEvalsConfig> = {
  providers: {
    [ProviderType.OPENAI]: {
      provider: ProviderType.OPENAI,
      baseUrl: 'https://api.openai.com/v1',
    },
    [ProviderType.HEBO]: {
      provider: ProviderType.HEBO,
      baseUrl: 'https://app.hebo.ai',
    },
  },
  embedding: {
    provider: ProviderType.HEBO,
    model: 'hebo-embeddings',
    baseUrl: 'https://api.hebo.ai/v1',
  },
};
