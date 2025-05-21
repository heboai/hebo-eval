import { BaseEmbeddingProvider } from '../interfaces/base-embedding-provider.js';
import {
  OpenAIEmbeddingConfig,
  EmbeddingResponse,
} from '../types/embedding.types';

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
    object: string;
    index: number;
  }>;
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Implementation of the OpenAI embedding provider
 *
 * This provider uses the OpenAI API to generate embeddings.
 */
export class OpenAIEmbeddingProvider extends BaseEmbeddingProvider {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: OpenAIEmbeddingConfig, apiKey: string) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.apiKey = apiKey;
  }

  /**
   * Validates the OpenAI-specific configuration
   */
  public override validateConfig(): Promise<boolean> {
    if (!this.config.model) {
      throw new Error('Model is required for OpenAI embedding provider');
    }
    if (!this.apiKey) {
      throw new Error('API key is required for OpenAI embedding provider');
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
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as OpenAIEmbeddingResponse;

      if (!data.data?.[0]?.embedding) {
        throw new Error('Invalid response format from OpenAI');
      }

      return {
        embedding: data.data[0].embedding,
        metadata: {
          model: this.config.model,
          provider: 'openai',
          usage: data.usage,
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
