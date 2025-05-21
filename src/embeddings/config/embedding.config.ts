import {
  EmbeddingConfig,
  LiteLLMEmbeddingConfig,
  OpenAIEmbeddingConfig,
  HeboEmbeddingConfig,
} from '../types/embedding.types.js';
import { LiteLLMEmbeddingProvider } from '../implementations/litellm-embedding-provider.js';
import { OpenAIEmbeddingProvider } from '../implementations/openai-embedding-provider.js';
import { HeboEmbeddingProvider } from '../implementations/hebo-embedding-provider.js';
import { IEmbeddingProvider } from '../interfaces/embedding-provider.interface.js';

/**
 * Configuration options for the embedding system
 */
export interface EmbeddingSystemConfig {
  /**
   * The default embedding provider to use
   */
  defaultProvider: 'litellm' | 'openai' | 'hebo';

  /**
   * The model to use for embeddings
   */
  model: string;

  /**
   * Base URL for the embedding API
   */
  baseUrl?: string;

  /**
   * API key for the embedding provider
   */
  apiKey: string;
}

/**
 * Factory class for creating embedding providers
 */
export class EmbeddingProviderFactory {
  /**
   * Creates an embedding provider based on the configuration
   * @param config The embedding system configuration
   * @returns The created embedding provider
   * @throws Error if the configuration is invalid
   */
  static createProvider(config: EmbeddingSystemConfig): IEmbeddingProvider {
    const providerConfig = this.getProviderConfig(config);

    switch (providerConfig.provider) {
      case 'litellm':
        return new LiteLLMEmbeddingProvider(
          providerConfig as LiteLLMEmbeddingConfig,
        );
      case 'openai':
        if (!config.apiKey) {
          throw new Error('API key is required');
        }
        return new OpenAIEmbeddingProvider(
          providerConfig as OpenAIEmbeddingConfig,
          config.apiKey,
        );
      case 'hebo':
        if (!config.apiKey) {
          throw new Error('API key is required');
        }
        return new HeboEmbeddingProvider(
          providerConfig as HeboEmbeddingConfig,
          config.apiKey,
        );
      default:
        throw new Error(
          `Unsupported provider: ${providerConfig.provider as string}`,
        );
    }
  }

  /**
   * Gets the provider configuration based on the system configuration
   * @param config The embedding system configuration
   * @returns The provider configuration
   * @throws Error if the configuration is invalid
   */
  private static getProviderConfig(
    config: EmbeddingSystemConfig,
  ): EmbeddingConfig {
    const provider = config.defaultProvider;

    if (!config.model) {
      throw new Error('Embedding model is required');
    }

    return {
      provider,
      model: config.model,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    };
  }

  /**
   * Loads the configuration from environment variables
   * @returns The embedding system configuration
   */
  static loadFromEnv(): EmbeddingSystemConfig {
    const defaultProvider =
      (process.env.EMBEDDING_PROVIDER as 'litellm' | 'openai' | 'hebo') ||
      'hebo';

    return {
      defaultProvider,
      model: process.env.EMBEDDING_MODEL || 'hebo-embeddings',
      baseUrl: process.env.EMBEDDING_BASE_URL || 'https://api.hebo.ai/v1',
      apiKey: process.env.EMBEDDING_API_KEY || process.env.HEBO_API_KEY || '',
    };
  }
}
