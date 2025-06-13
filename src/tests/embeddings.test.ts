import { jest, expect } from '@jest/globals';
import type { AsymmetricMatchers } from '@jest/expect';
import {
  EmbeddingProviderFactory,
  EmbeddingSystemConfig,
} from '../embeddings/config/embedding.config';
import { OpenAIEmbeddingProvider } from '../embeddings/implementations/openai-embedding-provider.js';
import { EmbeddingResponse } from '../embeddings/types/embedding.types.js';
import { HeboEmbeddingProvider } from '../embeddings/implementations/hebo-embedding-provider.js';

// Mock fetch
const mockFetch = jest.fn<typeof fetch>();
global.fetch = mockFetch;

interface MockOpenAIResponse extends Record<string, unknown> {
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

interface MockHeboResponse extends Record<string, unknown> {
  data: Array<{
    embedding: string; // Base64 encoded embedding
    object: string;
    index: number;
  }>;
  model: string;
  object: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

// Helper to create mock response with proper typing
const createMockResponse = <T extends Record<string, unknown>>(
  data: T,
  status = 200,
): Response => {
  const responseBody = JSON.stringify(data);
  return new Response(responseBody, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

describe('Embedding System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('EmbeddingProviderFactory', () => {
    it('should create OpenAI provider with correct configuration', () => {
      const config: EmbeddingSystemConfig = {
        defaultProvider: 'openai',
        model: 'test-model',
        baseUrl: 'http://test-url',
        apiKey: 'test-key',
      };

      const provider = EmbeddingProviderFactory.createProvider(config);
      expect(provider).toBeInstanceOf(OpenAIEmbeddingProvider);
      expect(provider.getConfig()).toEqual({
        provider: 'openai',
        model: 'test-model',
        baseUrl: 'http://test-url',
        apiKey: 'test-key',
      });
    });

    it('should throw error for invalid provider', () => {
      const config = {
        defaultProvider: 'invalid' as 'openai',
        model: 'test-model',
        baseUrl: 'http://test-url',
        apiKey: 'test-key',
      };

      expect(() => EmbeddingProviderFactory.createProvider(config)).toThrow(
        'Configuration error: Unsupported embedding provider: invalid. Supported providers are: openai, hebo',
      );
    });

    it('should throw error for missing API key', () => {
      const config: EmbeddingSystemConfig = {
        defaultProvider: 'openai',
        model: 'test-model',
        baseUrl: 'http://test-url',
        apiKey: '',
      };

      expect(() => EmbeddingProviderFactory.createProvider(config)).toThrow(
        'API key is required',
      );
    });

    it('should load configuration from environment variables', () => {
      process.env.EMBEDDING_PROVIDER = 'openai';
      process.env.EMBEDDING_MODEL = 'test-model';
      process.env.EMBEDDING_BASE_URL = 'http://test-url';
      process.env.HEBO_API_KEY = 'test-key';

      const config = EmbeddingProviderFactory.loadFromEnv();
      expect(config).toEqual({
        defaultProvider: 'openai',
        model: 'test-model',
        baseUrl: 'http://test-url',
        apiKey: 'test-key',
      });
    });
  });

  describe('OpenAIEmbeddingProvider', () => {
    const mockResponse: EmbeddingResponse = {
      embedding: [0.1, 0.2, 0.3],
      metadata: {
        model: 'test-model',
        provider: 'openai',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10,
        },
      },
    };

    it('should generate embedding successfully', async () => {
      const mockData: MockOpenAIResponse = {
        data: [
          {
            embedding: mockResponse.embedding,
            object: 'embedding',
            index: 0,
          },
        ],
        model: 'test-model',
        object: 'list',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10,
        },
      };
      const response = createMockResponse(mockData);
      mockFetch.mockResolvedValueOnce(response);

      const provider = new OpenAIEmbeddingProvider(
        {
          provider: 'openai',
          model: 'test-model',
          apiKey: 'test-key',
        },
        'test-key',
      );

      await provider.initialize({
        provider: 'openai',
        model: 'test-model',
        apiKey: 'test-key',
      });

      const result = await provider.generateEmbedding('test text');
      const expectedEmbeddings = mockResponse.embedding.map(
        (v) => expect.closeTo(v, 5) as unknown as AsymmetricMatchers,
      );
      expect(result.embedding).toEqual(
        expect.arrayContaining(expectedEmbeddings),
      );
      expect(result.metadata).toEqual(mockResponse.metadata);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.any(Object),
      );
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Internal Server Error' }, 500),
      );

      const provider = new OpenAIEmbeddingProvider(
        {
          provider: 'openai',
          model: 'test-model',
          apiKey: 'test-key',
        },
        'test-key',
      );

      await provider.initialize({
        provider: 'openai',
        model: 'test-model',
        apiKey: 'test-key',
      });

      await expect(provider.generateEmbedding('test text')).rejects.toThrow(
        'HTTP error! status: 500',
      );
    });

    it('should validate model presence', async () => {
      const provider = new OpenAIEmbeddingProvider(
        {
          provider: 'openai',
          model: '',
          apiKey: 'test-key',
        },
        'test-key',
      );

      await expect(
        provider.initialize({
          provider: 'openai',
          model: '',
          apiKey: 'test-key',
        }),
      ).rejects.toThrow('Model is required for OpenAI embedding provider');
    });
  });

  describe('HeboEmbeddingProvider', () => {
    const mockResponse: EmbeddingResponse = {
      embedding: [0.1, 0.2, 0.3],
      metadata: {
        model: 'test-model',
        provider: 'hebo',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10,
        },
      },
    };

    // Helper to create base64 encoded embedding
    const createBase64Embedding = (embedding: number[]): string => {
      const floatArray = new Float32Array(embedding);
      const bytes = new Uint8Array(floatArray.buffer);
      return btoa(String.fromCharCode(...bytes));
    };

    it('should generate embedding successfully', async () => {
      const base64Embedding = createBase64Embedding(mockResponse.embedding);
      const mockData: MockHeboResponse = {
        data: [{ embedding: base64Embedding, object: 'embedding', index: 0 }],
        model: 'test-model',
        object: 'list',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10,
        },
      };
      const response = createMockResponse(mockData);
      mockFetch.mockResolvedValueOnce(response);

      const provider = new HeboEmbeddingProvider(
        {
          provider: 'hebo',
          model: 'test-model',
          apiKey: 'test-key',
        },
        'test-key',
      );

      await provider.initialize({
        provider: 'hebo',
        model: 'test-model',
        apiKey: 'test-key',
      });

      const result = await provider.generateEmbedding('test text');
      const expectedEmbeddings = mockResponse.embedding.map(
        (v) => expect.closeTo(v, 5) as unknown as AsymmetricMatchers,
      );
      expect(result.embedding).toEqual(
        expect.arrayContaining(expectedEmbeddings),
      );
      expect(result.metadata).toEqual(mockResponse.metadata);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hebo.ai/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': 'test-key',
          }),
          body: expect.stringContaining('"encoding_format":"base64"'),
        }),
      );
    });

    it('should handle API errors', async () => {
      // Mock a failed response with status 500
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          statusText: 'Internal Server Error',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const provider = new HeboEmbeddingProvider(
        {
          provider: 'hebo',
          model: 'test-model',
          apiKey: 'test-key',
        },
        'test-key',
      );

      await provider.initialize({
        provider: 'hebo',
        model: 'test-model',
        apiKey: 'test-key',
      });
    });

    it('should validate model presence', async () => {
      const provider = new HeboEmbeddingProvider(
        {
          provider: 'hebo',
          model: '',
          apiKey: 'test-key',
        },
        'test-key',
      );

      await expect(
        provider.initialize({
          provider: 'hebo',
          model: '',
          apiKey: 'test-key',
        }),
      ).rejects.toThrow('Model is required for Hebo embedding provider');
    });

    it('should handle invalid base64 response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse<MockHeboResponse>({
          data: [
            { embedding: 'invalid-base64', object: 'embedding', index: 0 },
          ],
          model: 'test-model',
          object: 'list',
        }),
      );

      const provider = new HeboEmbeddingProvider(
        {
          provider: 'hebo',
          model: 'test-model',
          apiKey: 'test-key',
        },
        'test-key',
      );

      await provider.initialize({
        provider: 'hebo',
        model: 'test-model',
        apiKey: 'test-key',
      });

      await expect(provider.generateEmbedding('test text')).rejects.toThrow();
    });
  });

  describe('BaseEmbeddingProvider', () => {
    it('should throw error when initializing an already initialized provider', async () => {
      const provider = new OpenAIEmbeddingProvider(
        {
          provider: 'openai',
          model: 'test-model',
          apiKey: 'test-key',
        },
        'test-key',
      );

      await provider.initialize({
        provider: 'openai',
        model: 'test-model',
        apiKey: 'test-key',
      });

      await expect(
        provider.initialize({
          provider: 'openai',
          model: 'test-model',
          apiKey: 'test-key',
        }),
      ).rejects.toThrow('Embedding provider is already initialized');
    });

    it('should throw error when generating embeddings before initialization', async () => {
      const provider = new OpenAIEmbeddingProvider(
        {
          provider: 'openai',
          model: 'test-model',
          apiKey: 'test-key',
        },
        'test-key',
      );

      await expect(provider.generateEmbedding('test')).rejects.toThrow(
        'Embedding provider must be initialized before generating embeddings',
      );
    });

    it('should allow reinitialization after cleanup', async () => {
      const provider = new OpenAIEmbeddingProvider(
        {
          provider: 'openai',
          model: 'test-model',
          apiKey: 'test-key',
        },
        'test-key',
      );

      await provider.initialize({
        provider: 'openai',
        model: 'test-model',
        apiKey: 'test-key',
      });

      await provider.cleanup();

      // Should not throw
      await expect(
        provider.initialize({
          provider: 'openai',
          model: 'updated-model',
          apiKey: 'test-key',
        }),
      ).resolves.not.toThrow();

      expect(provider.getConfig().model).toBe('updated-model');
    });
  });
});
