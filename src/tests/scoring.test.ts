import { ScoringService } from '../core/scoring/scoring-service';
import { EvaluationConfig } from '../core/types/evaluation';

describe('ScoringService', () => {
  let scoringService: ScoringService;
  const defaultConfig: EvaluationConfig = {
    threshold: 0.7,
    useSemanticScoring: false,
    outputFormat: 'markdown',
  };

  beforeEach(() => {
    scoringService = new ScoringService(defaultConfig);
  });

  describe('stringMatchScore', () => {
    it('should return 1.0 for identical strings', async () => {
      const score = await scoringService.score('hello world', 'hello world');
      expect(score).toBe(1.0);
    });

    it('should return 0.0 for completely different strings', async () => {
      const score = await scoringService.score('hello', 'world');
      expect(score).toBe(0.0);
    });

    it('should return partial score for partially matching strings', async () => {
      const score = await scoringService.score('hello world', 'hello there');
      expect(score).toBeGreaterThan(0.0);
      expect(score).toBeLessThan(1.0);
    });

    it('should be case insensitive', async () => {
      const score1 = await scoringService.score('Hello World', 'hello world');
      const score2 = await scoringService.score('hello world', 'hello world');
      expect(score1).toBe(score2);
    });
  });

  describe('isPassing', () => {
    it('should return true for scores above threshold', () => {
      expect(scoringService.isPassing(0.8)).toBe(true);
    });

    it('should return false for scores below threshold', () => {
      expect(scoringService.isPassing(0.6)).toBe(false);
    });

    it('should return true for scores equal to threshold', () => {
      expect(scoringService.isPassing(0.7)).toBe(true);
    });
  });

  describe('with custom threshold', () => {
    it('should use custom threshold for pass/fail determination', () => {
      const customConfig: EvaluationConfig = {
        ...defaultConfig,
        threshold: 0.9,
      };
      const customScoringService = new ScoringService(customConfig);

      expect(customScoringService.isPassing(0.8)).toBe(false);
      expect(customScoringService.isPassing(0.95)).toBe(true);
    });
  });
});
