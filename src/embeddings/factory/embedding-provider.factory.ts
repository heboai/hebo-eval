import { IEmbeddingProvider } from '../interfaces/embedding-provider.interface.js';
import { OpenAIEmbeddingProvider } from '../implementations/openai-embedding-provider.js';
import { HeboEmbeddingProvider } from '../implementations/hebo-embedding-provider.js';
import { ProviderType } from '../../config/types/config.types.js';
import {
  EmbeddingConfig,
  OpenAIEmbeddingConfig,
  HeboEmbeddingConfig,
} from '../types/embedding.types.js';
import { EmbeddingSystemConfig } from '../config/embedding.config.js';

/**
 * Factory class for creating embedding providers
 */
export class EmbeddingProviderFactory {
  /**
   * Creates an embedding provider based on the configuration
   * @param config The embedding configuration
   * @returns The created embedding provider
   * @throws Error if the configuration is invalid
   */
  static createProvider(
    config: EmbeddingSystemConfig | EmbeddingConfig,
  ): IEmbeddingProvider {
    const providerConfig =
      'defaultProvider' in config
        ? {
            provider: config.defaultProvider,
            model: config.model,
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
          }
        : config;

    // Validate provider
    const provider = providerConfig.provider;
    if (![ProviderType.OPENAI, ProviderType.HEBO].includes(provider)) {
      throw new Error(
        `Configuration error: Unsupported embedding provider: ${String(provider)}. Supported providers are: openai, hebo`,
      );
    }

    // Validate API key
    if (!providerConfig.apiKey) {
      throw new Error(
        `Configuration error: API key is required for ${String(provider)} embedding provider`,
      );
    }

    switch (provider) {
      case ProviderType.OPENAI:
        return new OpenAIEmbeddingProvider(
          providerConfig as OpenAIEmbeddingConfig,
          providerConfig.apiKey,
        );
      case ProviderType.HEBO:
        return new HeboEmbeddingProvider(
          providerConfig as HeboEmbeddingConfig,
          providerConfig.apiKey,
        );
      default:
        throw new Error(
          `Configuration error: Unsupported provider: ${String(provider)}`,
        );
    }
  }
}
