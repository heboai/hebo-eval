import { jest } from '@jest/globals';
import { EvaluationService } from '../core/evaluation/evaluation-service';
import { EvaluationConfig } from '../core/types/evaluation';

describe('EvaluationService', () => {
  let evaluationService: EvaluationService;
  const defaultConfig: EvaluationConfig = {
    threshold: 0.7,
    useSemanticScoring: false,
    outputFormat: 'markdown',
  };

  const testCases = [
    {
      id: 'test-1',
      input: 'What is 2+2?',
      expected: '4',
    },
    {
      id: 'test-2',
      input: 'What is 3+3?',
      expected: '6',
    },
  ];

  beforeEach(() => {
    evaluationService = new EvaluationService(defaultConfig, undefined);
  });

  describe('evaluate', () => {
    it('should generate a report for all test cases', async () => {
      const report = await evaluationService.evaluate(testCases);

      expect(report).toContain('# Evaluation Report');
      expect(report).toContain('Total Tests: 2');
      expect(report).toContain('test-1');
      expect(report).toContain('test-2');
      expect(report).toContain('What is 2+2?');
      expect(report).toContain('What is 3+3?');
      expect(report).toContain('Expected Output');
      expect(report).toContain('Observed Output');
      expect(report).toContain('Pass Rate:');
    });

    it('should include duration in the report', async () => {
      const report = await evaluationService.evaluate(testCases);
      expect(report).toMatch(/Duration: \d+\.\d+s/);
    });

    it('should handle test execution errors gracefully', async () => {
      // Mock the private executeTest method
      const mockExecuteTest = jest
        .spyOn(
          EvaluationService.prototype as unknown as {
            executeTest(input: string): Promise<string>;
          },
          'executeTest',
        )
        .mockRejectedValue(new Error('Test execution failed'));

      const report = await evaluationService.evaluate(testCases);

      expect(report).toContain('Test execution failed');
      expect(report).toContain('❌ Failed');
      mockExecuteTest.mockRestore();
    });

    it('should calculate correct pass/fail statistics', async () => {
      // Mock the private executeTest method
      const mockExecuteTest = jest
        .spyOn(
          EvaluationService.prototype as unknown as {
            executeTest(input: string): Promise<string>;
          },
          'executeTest',
        )
        .mockResolvedValueOnce('4') // Correct answer
        .mockResolvedValueOnce('5'); // Wrong answer

      const report = await evaluationService.evaluate(testCases);

      expect(report).toContain('Passed: 1');
      mockExecuteTest.mockRestore();
    });
  });
});
