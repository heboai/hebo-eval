import { ReportGenerator } from '../core/report/report-generator';
import { EvaluationConfig, EvaluationReport } from '../core/types/evaluation';

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  const defaultConfig: EvaluationConfig = {
    threshold: 0.7,
    useSemanticScoring: false,
    outputFormat: 'markdown',
  };

  const sampleReport: EvaluationReport = {
    totalTests: 2,
    passedTests: 1,
    failedTests: 1,
    passRate: 0.5,
    results: [
      {
        testCase: {
          id: 'test-1',
          input: 'What is 2+2?',
          expected: '4',
        },
        observed: '4',
        score: 1.0,
        passed: true,
        timestamp: new Date(),
      },
      {
        testCase: {
          id: 'test-2',
          input: 'What is 3+3?',
          expected: '6',
        },
        observed: '5',
        score: 0.0,
        passed: false,
        timestamp: new Date(),
      },
    ],
    timestamp: new Date(),
    duration: 1.5,
  };

  beforeEach(() => {
    reportGenerator = new ReportGenerator(defaultConfig);
  });

  describe('generateReport', () => {
    it('should generate markdown report by default', () => {
      const report: string = reportGenerator.generateReport(sampleReport); // Specify the type explicitly
      expect(report).toContain('# Evaluation Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Detailed Results');
      expect(report).toContain('✅ Passed');
      expect(report).toContain('❌ Failed');
    });

    it('should generate JSON report when configured', () => {
      const jsonConfig: EvaluationConfig = {
        ...defaultConfig,
        outputFormat: 'json',
      };
      const jsonGenerator = new ReportGenerator(jsonConfig);
      const report = jsonGenerator.generateReport(sampleReport);

      expect(() => {
        JSON.parse(report); // now not returning anything explicitly
      }).not.toThrow();
      const parsed = JSON.parse(report) as unknown as Partial<EvaluationReport>;
      expect(parsed).toMatchObject({
        totalTests: 2,
        passedTests: 1,
        failedTests: 1,
      } satisfies Partial<EvaluationReport>);
    });

    it('should generate text report when configured', () => {
      const textConfig: EvaluationConfig = {
        ...defaultConfig,
        outputFormat: 'text',
      };
      const textGenerator = new ReportGenerator(textConfig);
      const report = textGenerator.generateReport(sampleReport);

      expect(report).toContain('Evaluation Report');
      expect(report).toContain('Summary');
      expect(report).toContain('Detailed Results');
      expect(report).toContain('Passed');
      expect(report).toContain('Failed');
    });

    it('should throw error for unsupported format', () => {
      const invalidConfig: EvaluationConfig = {
        ...defaultConfig,
        outputFormat: 'invalid' as 'json' | 'markdown' | 'text',
      };
      const invalidGenerator = new ReportGenerator(invalidConfig);

      expect(() => invalidGenerator.generateReport(sampleReport)).toThrow(
        'Unsupported output format',
      );
    });
  });

  describe('report content', () => {
    it('should include all test cases in the report', () => {
      const report: string = reportGenerator.generateReport(sampleReport);
      expect(report).toContain('test-1');
      expect(report).toContain('test-2');
    });

    it('should include error messages when present', () => {
      const errorReport: EvaluationReport = {
        ...sampleReport,
        results: [
          ...sampleReport.results,
          {
            testCase: {
              id: 'test-3',
              input: 'What is 4+4?',
              expected: '8',
            },
            observed: '',
            score: 0.0,
            passed: false,
            error: 'Test execution failed',
            timestamp: new Date(),
          },
        ],
      };

      const report = reportGenerator.generateReport(errorReport);
      expect(report).toContain('Test execution failed');
    });
  });
});
