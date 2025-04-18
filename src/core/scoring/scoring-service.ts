import { Embeddings } from 'langchain/embeddings/base';
import { EvaluationConfig } from '../types/evaluation';

/**
 * Service for scoring the similarity between observed and expected outputs
 */
export class ScoringService {
  private embeddings?: Embeddings;

  constructor(
    private config: EvaluationConfig,
    embeddings?: Embeddings,
  ) {
    this.embeddings = embeddings;
  }

  /**
   * Calculates the similarity score between observed and expected outputs
   */
  async score(observed: string, expected: string): Promise<number> {
    if (this.config.useSemanticScoring && this.embeddings) {
      return this.semanticScore(observed, expected);
    }
    return this.stringMatchScore(observed, expected);
  }

  /**
   * Determines if a score passes based on the configured threshold
   */
  isPassing(score: number): boolean {
    return score >= this.config.threshold;
  }

  /**
   * Calculates similarity score using string matching
   */
  private stringMatchScore(observed: string, expected: string): number {
    const observedWords = new Set(observed.toLowerCase().split(/\s+/));
    const expectedWords = new Set(expected.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...observedWords].filter((x) => expectedWords.has(x)),
    );
    const union = new Set([...observedWords, ...expectedWords]);

    return intersection.size / union.size;
  }

  /**
   * Calculates similarity score using semantic embeddings
   */
  private async semanticScore(
    observed: string,
    expected: string,
  ): Promise<number> {
    if (!this.embeddings) {
      throw new Error('Embeddings not configured for semantic scoring');
    }

    const [observedEmbedding, expectedEmbedding] = await Promise.all([
      this.embeddings.embedQuery(observed),
      this.embeddings.embedQuery(expected),
    ]);

    return this.cosineSimilarity(observedEmbedding, expectedEmbedding);
  }

  /**
   * Calculates cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    return dotProduct / (magnitudeA * magnitudeB);
  }
}
