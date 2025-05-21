/**
 * Base configuration for embedding providers
 */
export interface EmbeddingConfig {
  /**
   * The model to use for embeddings
   * @example "text-embedding-3-small", "text-embedding-3-large"
   */
  model: string;

  /**
   * The provider to use for embeddings
   * @example "litellm", "openai", "hebo"
   */
  provider: 'litellm' | 'openai' | 'hebo';

  /**
   * Base URL for the embedding API
   * @default "https://api.openai.com/v1" for OpenAI, "https://api.hebo.ai/v1" for LiteLLM, "https://api.hebo.ai/v1" for Hebo
   */
  baseUrl?: string;

  /**
   * API key for the embedding provider
   */
  apiKey: string;
}

/**
 * Configuration specific to LiteLLM embedding provider
 */
export interface LiteLLMEmbeddingConfig extends EmbeddingConfig {
  provider: 'litellm';
  /**
   * The model to use through LiteLLM
   * @example "azure/azure-embedding-model", "anthropic/claude-embedding"
   */
  model: string;
}

/**
 * Configuration specific to OpenAI embedding provider
 */
export interface OpenAIEmbeddingConfig extends EmbeddingConfig {
  provider: 'openai';
  /**
   * The OpenAI model to use
   * @example "text-embedding-3-small", "text-embedding-3-large"
   */
  model: string;
}

/**
 * Configuration specific to Hebo embedding provider
 */
export interface HeboEmbeddingConfig extends EmbeddingConfig {
  provider: 'hebo';
  /**
   * The Hebo model to use
   * @example "text-embedding-3-small", "text-embedding-3-large"
   */
  model: string;
}

/**
 * Response from embedding provider
 */
export interface EmbeddingResponse {
  /**
   * The embedding vector
   */
  embedding: number[];

  /**
   * Optional metadata about the embedding
   */
  metadata?: {
    model: string;
    provider: string;
    [key: string]: unknown;
  };
}

/**
 * Error response from embedding provider
 */
export interface EmbeddingError {
  message: string;
  code?: string;
  details?: unknown;
}
