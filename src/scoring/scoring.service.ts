import { IEmbeddingProvider } from '../embeddings/interfaces/embedding-provider.interface.js';
import { calculateCosineSimilarity } from './utils/cosine-similarity.js';

/**
 * Service for calculating similarity scores between strings using embeddings
 */
export class ScoringService {
  /**
   * Creates a new instance of the ScoringService
   * @param embeddingProvider - The embedding provider to use for generating embeddings
   */
  constructor(private readonly embeddingProvider: IEmbeddingProvider) {}

  /**
   * Calculates the similarity score between two strings using their embeddings
   *
   * @param stringA - First string to compare
   * @param stringB - Second string to compare
   * @returns Promise that resolves to a similarity score between -1 and 1
   * @throws Error if embedding generation fails or vectors are invalid
   */
  async scoreStrings(stringA: string, stringB: string): Promise<number> {
    try {
      // Generate embeddings for both strings
      const [embeddingA, embeddingB] = await Promise.all([
        this.embeddingProvider.generateEmbedding(stringA),
        this.embeddingProvider.generateEmbedding(stringB),
      ]);

      // Calculate cosine similarity between the embeddings
      return calculateCosineSimilarity(
        embeddingA.embedding,
        embeddingB.embedding,
      );
    } catch (error) {
      throw new Error(
        `Failed to calculate similarity score: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
