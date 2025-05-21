import {
  EmbeddingConfig,
  EmbeddingResponse,
} from '../types/embedding.types.js';

/**
 * Interface for embedding providers
 *
 * This interface defines the contract that all embedding provider implementations must follow,
 * providing a consistent way to generate embeddings from text.
 */
export interface IEmbeddingProvider {
  /**
   * Gets the configuration of the embedding provider
   * @returns The provider's configuration
   */
  getConfig(): EmbeddingConfig;

  /**
   * Initializes the embedding provider with the provided configuration
   * @param config The embedding configuration
   * @returns Promise that resolves when initialization is complete
   */
  initialize(config: EmbeddingConfig): Promise<void>;

  /**
   * Generates an embedding for the given text
   * @param text The text to generate an embedding for
   * @returns Promise that resolves with the embedding response
   * @throws Error if the provider is not initialized or if the request fails
   */
  generateEmbedding(text: string): Promise<EmbeddingResponse>;

  /**
   * Validates the provider's configuration
   * @returns Promise that resolves with true if the configuration is valid
   * @throws Error if the configuration is invalid
   */
  validateConfig(): Promise<boolean>;

  /**
   * Cleans up any resources used by the provider
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void>;
}
