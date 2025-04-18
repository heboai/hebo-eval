import {
  EvaluationReport,
  EvaluationConfig,
  EvaluationResult,
} from '../types/evaluation';

/**
 * Service for generating evaluation reports in various formats
 */
export class ReportGenerator {
  constructor(private config: EvaluationConfig) {}

  /**
   * Generates a report from evaluation results
   */
  generateReport(results: EvaluationReport): string {
    switch (this.config.outputFormat) {
      case 'json':
        return this.generateJsonReport(results);
      case 'markdown':
        return this.generateMarkdownReport(results);
      case 'text':
        return this.generateTextReport(results);
      default: {
        const format = this.config.outputFormat as string;
        throw new Error(`Unsupported output format: ${format}`);
      }
    }
  }

  /**
   * Generates a JSON report
   */
  private generateJsonReport(results: EvaluationReport): string {
    return JSON.stringify(results, null, 2);
  }

  /**
   * Generates a markdown report
   */
  private generateMarkdownReport(results: EvaluationReport): string {
    const lines: string[] = [
      '# Evaluation Report',
      '',
      `## Summary`,
      `- Total Tests: ${results.totalTests}`,
      `- Passed: ${results.passedTests}`,
      `- Failed: ${results.failedTests}`,
      `- Pass Rate: ${(results.passRate * 100).toFixed(2)}%`,
      `- Duration: ${results.duration.toFixed(2)}s`,
      '',
      `## Detailed Results`,
      '',
    ];

    results.results.forEach((result: EvaluationResult, index: number) => {
      lines.push(
        `### Test Case ${index + 1}`,
        '',
        `- **ID**: ${result.testCase.id}`,
        `- **Status**: ${result.passed ? '✅ Passed' : '❌ Failed'}`,
        `- **Score**: ${(result.score * 100).toFixed(2)}%`,
        '',
        `#### Input`,
        '```',
        result.testCase.input,
        '```',
        '',
        `#### Expected Output`,
        '```',
        result.testCase.expected,
        '```',
        '',
        `#### Observed Output`,
        '```',
        result.observed,
        '```',
        '',
        result.error ? `#### Error\n${result.error}\n` : '',
        '---',
        '',
      );
    });

    return lines.join('\n');
  }

  /**
   * Generates a plain text report
   */
  private generateTextReport(results: EvaluationReport): string {
    const lines: string[] = [
      'Evaluation Report',
      '===============',
      '',
      'Summary',
      '-------',
      `Total Tests: ${results.totalTests}`,
      `Passed: ${results.passedTests}`,
      `Failed: ${results.failedTests}`,
      `Pass Rate: ${(results.passRate * 100).toFixed(2)}%`,
      `Duration: ${results.duration.toFixed(2)}s`,
      '',
      'Detailed Results',
      '---------------',
      '',
    ];

    results.results.forEach((result: EvaluationResult, index: number) => {
      lines.push(
        `Test Case ${index + 1}`,
        `ID: ${result.testCase.id}`,
        `Status: ${result.passed ? 'Passed' : 'Failed'}`,
        `Score: ${(result.score * 100).toFixed(2)}%`,
        '',
        'Input:',
        result.testCase.input,
        '',
        'Expected Output:',
        result.testCase.expected,
        '',
        'Observed Output:',
        result.observed,
        '',
        result.error ? `Error:\n${result.error}\n` : '',
        '---',
        '',
      );
    });

    return lines.join('\n');
  }
}
