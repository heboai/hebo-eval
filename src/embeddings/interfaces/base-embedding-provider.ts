import { IEmbeddingProvider } from './embedding-provider.interface.js';
import {
  EmbeddingConfig,
  EmbeddingResponse,
} from '../types/embedding.types.js';

/**
 * Abstract base class for embedding providers
 *
 * This class provides a foundation for implementing the IEmbeddingProvider interface,
 * including common functionality and error handling.
 */
export abstract class BaseEmbeddingProvider implements IEmbeddingProvider {
  protected config: EmbeddingConfig;
  protected isInitialized: boolean = false;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  /**
   * Gets the current configuration of the provider
   * @returns The provider's configuration
   */
  getConfig(): EmbeddingConfig {
    return this.config;
  }

  /**
   * Initializes the provider with the provided configuration
   * @param config The embedding configuration
   * @returns Promise that resolves when initialization is complete
   * @throws Error if the provider is already initialized
   */
  async initialize(config: EmbeddingConfig): Promise<void> {
    if (this.isInitialized) {
      throw new Error(
        'Embedding provider is already initialized. Create a new instance to use different configuration.',
      );
    }
    this.config = config;
    await this.validateConfig();
    this.isInitialized = true;
  }

  /**
   * Validates the provider's configuration
   * @returns Promise that resolves with true if the configuration is valid
   * @throws Error if the configuration is invalid
   */
  validateConfig(): Promise<boolean> {
    if (!this.config.model) {
      throw new Error('Embedding model is required');
    }
    if (!this.config.provider) {
      throw new Error('Embedding provider is required');
    }
    return Promise.resolve(true);
  }

  /**
   * Cleans up any resources used by the provider
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void> {
    this.isInitialized = false;
    return Promise.resolve();
  }

  /**
   * Generates an embedding for the given text
   * @param text The text to generate an embedding for
   * @returns Promise that resolves with the embedding response
   * @throws Error if the provider is not initialized
   */
  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    if (!this.isInitialized) {
      throw new Error(
        'Embedding provider must be initialized before generating embeddings',
      );
    }
    return this.processText(text);
  }

  /**
   * Processes the text and returns the embedding response
   * @param text The text to process
   * @returns Promise that resolves with the embedding response
   */
  protected abstract processText(text: string): Promise<EmbeddingResponse>;
}
