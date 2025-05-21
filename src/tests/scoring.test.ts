import { jest } from '@jest/globals';
import { ScoringService } from '../scoring/scoring.service.js';
import { IEmbeddingProvider } from '../embeddings/interfaces/embedding-provider.interface.js';
import { EmbeddingResponse } from '../embeddings/types/embedding.types.js';
import { calculateCosineSimilarity } from '../scoring/utils/cosine-similarity.js';

describe('Cosine Similarity', () => {
  it('should calculate correct cosine similarity for identical vectors', () => {
    const vector = [1, 2, 3];
    expect(calculateCosineSimilarity(vector, vector)).toBe(1);
  });

  it('should calculate correct cosine similarity for orthogonal vectors', () => {
    const vectorA = [1, 0, 0];
    const vectorB = [0, 1, 0];
    expect(calculateCosineSimilarity(vectorA, vectorB)).toBe(0);
  });

  it('should calculate correct cosine similarity for opposite vectors', () => {
    const vectorA = [1, 2, 3];
    const vectorB = [-1, -2, -3];
    expect(calculateCosineSimilarity(vectorA, vectorB)).toBe(-1);
  });

  it('should throw error for empty vectors', () => {
    expect(() => calculateCosineSimilarity([], [1, 2, 3])).toThrow(
      'Vectors cannot be empty',
    );
  });

  it('should throw error for vectors with different dimensions', () => {
    expect(() => calculateCosineSimilarity([1, 2], [1, 2, 3])).toThrow(
      'Vectors must have the same dimensions',
    );
  });

  it('should throw error for zero magnitude vectors', () => {
    expect(() => calculateCosineSimilarity([0, 0, 0], [1, 2, 3])).toThrow(
      'Vectors cannot have zero magnitude',
    );
  });
});

describe('ScoringService', () => {
  let mockEmbeddingProvider: jest.Mocked<IEmbeddingProvider>;
  let scoringService: ScoringService;

  beforeEach(() => {
    mockEmbeddingProvider = {
      getConfig: jest.fn(),
      initialize: jest.fn(),
      generateEmbedding: jest.fn(),
      validateConfig: jest.fn(),
      cleanup: jest.fn(),
    } as jest.Mocked<IEmbeddingProvider>;

    scoringService = new ScoringService(mockEmbeddingProvider);
  });

  it('should calculate similarity score between two strings', async () => {
    const mockEmbeddingA: EmbeddingResponse = {
      embedding: [1, 2, 3],
      metadata: {
        model: 'test-model',
        provider: 'test-provider',
      },
    };

    const mockEmbeddingB: EmbeddingResponse = {
      embedding: [1, 2, 3],
      metadata: {
        model: 'test-model',
        provider: 'test-provider',
      },
    };

    mockEmbeddingProvider.generateEmbedding
      .mockImplementationOnce(() => Promise.resolve(mockEmbeddingA))
      .mockImplementationOnce(() => Promise.resolve(mockEmbeddingB));

    const score = await scoringService.scoreStrings('hello', 'hello');
    expect(score).toBe(1); // Identical vectors should have similarity of 1
    expect(mockEmbeddingProvider.generateEmbedding.mock.calls.length).toBe(2);
  });

  it('should handle embedding generation errors', async () => {
    mockEmbeddingProvider.generateEmbedding.mockImplementationOnce(() =>
      Promise.reject(new Error('Embedding generation failed')),
    );

    await expect(scoringService.scoreStrings('hello', 'world')).rejects.toThrow(
      'Failed to calculate similarity score: Embedding generation failed',
    );
  });

  it('should handle invalid embedding responses', async () => {
    const mockEmbeddingA: EmbeddingResponse = {
      embedding: [1, 2, 3],
      metadata: {
        model: 'test-model',
        provider: 'test-provider',
      },
    };

    const mockEmbeddingB: EmbeddingResponse = {
      embedding: [1, 2], // Different dimension
      metadata: {
        model: 'test-model',
        provider: 'test-provider',
      },
    };

    mockEmbeddingProvider.generateEmbedding
      .mockImplementationOnce(() => Promise.resolve(mockEmbeddingA))
      .mockImplementationOnce(() => Promise.resolve(mockEmbeddingB));

    await expect(scoringService.scoreStrings('hello', 'world')).rejects.toThrow(
      'Failed to calculate similarity score: Vectors must have the same dimensions',
    );
  });
});
