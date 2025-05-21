import { BaseEmbeddingProvider } from '../interfaces/base-embedding-provider.js';
import {
  LiteLLMEmbeddingConfig,
  EmbeddingResponse,
} from '../types/embedding.types';

/**
 * Implementation of the LiteLLM embedding provider
 *
 * This provider uses LiteLLM to generate embeddings through various supported models.
 */
export class LiteLLMEmbeddingProvider extends BaseEmbeddingProvider {
  private baseUrl: string;

  constructor(config: LiteLLMEmbeddingConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:4000';
  }

  /**
   * Validates the LiteLLM-specific configuration
   */
  public override validateConfig(): Promise<boolean> {
    if (!this.config.model) {
      throw new Error('Model is required for LiteLLM embedding provider');
    }
    return super.validateConfig();
  }

  /**
   * Processes the text and returns the embedding response
   */
  protected async processText(text: string): Promise<EmbeddingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as {
        data: Array<{
          embedding: number[];
        }>;
      };

      if (!data.data?.[0]?.embedding) {
        throw new Error('Invalid response format from LiteLLM');
      }

      return {
        embedding: data.data[0].embedding,
        metadata: {
          model: this.config.model,
          provider: 'litellm',
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to generate embedding: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
