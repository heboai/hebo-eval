import { AgentInput } from '../agents/types/agent.types';
import { IAgent } from '../agents/interfaces/agent.interface';
import { Logger } from '../utils/logger';
import { performance } from 'perf_hooks';
import { TestCase } from '../core/types/message.types';
import { TestCaseLoader } from '../parser/loader';
import { ScoringService } from '../scoring/scoring.service';
import { ReportGenerator } from '../report/report-generator';
import { EvaluationConfig, EvaluationReport } from './types/evaluation.types';
import { TestCaseEvaluation } from './types/test-case.types';

/**
 * Service for executing test cases against an agent
 */
export class EvaluationExecutor {
  private logger: Logger;
  private testCaseLoader: TestCaseLoader;
  private scoringService: ScoringService;
  private reportGenerator: ReportGenerator;
  private readonly threshold: number;
  private readonly maxConcurrency: number;

  constructor(scoringService: ScoringService, config: EvaluationConfig) {
    this.logger = Logger.getInstance();
    this.testCaseLoader = new TestCaseLoader();
    this.scoringService = scoringService;
    this.reportGenerator = new ReportGenerator(config);
    this.threshold = config.threshold ?? 0.7;
    this.maxConcurrency = config.maxConcurrency ?? 5;
  }

  /**
   * Loads and executes test cases from a directory and generates a report
   * @param agent The agent to test
   * @param directoryPath The path to the directory containing test case files
   * @param stopOnError Whether to stop processing files after the first error (default: true)
   * @returns Promise that resolves with the evaluation report
   */
  public async evaluateFromDirectory(
    agent: IAgent,
    directoryPath: string,
    stopOnError: boolean = true,
  ): Promise<EvaluationReport> {
    const startTime = performance.now();

    // First load the test cases
    const loadResult = await this.testCaseLoader.loadFromDirectory(
      directoryPath,
      stopOnError,
    );

    // Then execute them in parallel
    const results = await this.executeTestCasesInParallel(
      agent,
      loadResult.testCases,
      this.maxConcurrency,
    );

    const duration = (performance.now() - startTime) / 1000; // Convert to seconds

    const passedTests = results.filter((r) => r.success).length;
    const totalTests = results.length;
    const failedTests = totalTests - passedTests;
    const passRate = totalTests > 0 ? passedTests / totalTests : 0;

    const report: EvaluationReport = {
      totalTests,
      passedTests,
      failedTests,
      passRate,
      results: results.map((result) => ({
        testCase: {
          id: result.testCaseId,
          input: result.testCase.messageBlocks
            .slice(0, -1)
            .map((m: { content: string }) => m.content)
            .join('\n'),
          expected:
            result.testCase.messageBlocks[
              result.testCase.messageBlocks.length - 1
            ].content,
        },
        score: result.score,
        passed: result.success,
        error: result.error,
        timestamp: new Date(),
        response: result.response || '',
      })),
      timestamp: new Date(),
      duration,
    };

    return report;
  }

  /**
   * Loads and executes test cases from a directory
   * @param agent The agent to test
   * @param directoryPath The path to the directory containing test case files
   * @param stopOnError Whether to stop processing files after the first error (default: true)
   * @returns Promise that resolves with the evaluation results
   */
  public async executeTestCasesFromDirectory(
    agent: IAgent,
    directoryPath: string,
    stopOnError: boolean = true,
  ): Promise<TestCaseEvaluation[]> {
    this.logger.info(`Loading test cases from directory: ${directoryPath}`);
    const loadResult = await this.testCaseLoader.loadFromDirectory(
      directoryPath,
      stopOnError,
    );

    if (loadResult.errors.length > 0) {
      this.logger.warn(
        `Encountered ${loadResult.errors.length} errors while loading test cases:`,
        {
          errors: loadResult.errors,
        },
      );
    }

    if (loadResult.testCases.length === 0) {
      this.logger.warn('No test cases were loaded successfully');
      return [];
    }

    this.logger.info(
      `Successfully loaded ${loadResult.testCases.length} test cases`,
    );
    return this.executeTestCases(agent, loadResult.testCases);
  }

  /**
   * Executes a single test case against an agent
   * @param agent The agent to test
   * @param testCase The test case to execute
   * @returns Promise that resolves with the evaluation result
   */
  public async executeTestCase(
    agent: IAgent,
    testCase: TestCase,
  ): Promise<TestCaseEvaluation> {
    const startTime = performance.now();
    try {
      if (testCase.messageBlocks.length < 2) {
        throw new Error(
          'Test case must have at least 2 message blocks: input and expected output',
        );
      }
      const input: AgentInput = {
        messages: testCase.messageBlocks.slice(0, -1).map((block) => ({
          role: block.role,
          content: block.content,
        })),
      };

      // Get the expected response from the last message block
      const expectedResponse =
        testCase.messageBlocks[testCase.messageBlocks.length - 1];

      // Execute the test
      const response = await agent.sendInput(input);
      const executionTime = performance.now() - startTime;

      // Calculate semantic similarity score
      const score = await this.scoringService.scoreStrings(
        response.response.trim(),
        expectedResponse.content.trim(),
      );

      // Consider it a success if score is above threshold (0.7 by default)
      const isMatch = score >= this.threshold;

      return {
        testCaseId: testCase.id,
        success: isMatch,
        error: isMatch ? undefined : 'Response mismatch',
        score,
        executionTime,
        response: response.response,
        testCase,
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return {
        testCaseId: testCase.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        score: 0,
        executionTime,
        response: '',
        testCase,
      };
    }
  }

  /**
   * Executes multiple test cases against an agent
   * @param agent The agent to test
   * @param testCases The test cases to execute
   * @returns Promise that resolves with the evaluation results
   */
  public async executeTestCases(
    agent: IAgent,
    testCases: TestCase[],
  ): Promise<TestCaseEvaluation[]> {
    const results: TestCaseEvaluation[] = [];
    try {
      for (const testCase of testCases) {
        try {
          results.push(await this.executeTestCase(agent, testCase));
        } catch (error) {
          this.logger.error(
            `Error executing test case ${testCase.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          results.push({
            testCaseId: testCase.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            score: 0,
            executionTime: 0,
            response: '',
            testCase,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Fatal error in executeTestCases: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error; // Re-throw fatal errors that affect the entire execution
    }
    return results;
  }

  /**
   * Executes test cases in parallel with a maximum concurrency
   * @param agent The agent to test
   * @param testCases The test cases to execute
   * @param maxConcurrency Maximum number of concurrent executions
   * @returns Promise that resolves with the evaluation results
   */
  private async executeTestCasesInParallel(
    agent: IAgent,
    testCases: TestCase[],
    maxConcurrency: number,
  ): Promise<TestCaseEvaluation[]> {
    const chunks: TestCase[][] = [];
    for (let i = 0; i < testCases.length; i += maxConcurrency) {
      chunks.push(testCases.slice(i, i + maxConcurrency));
    }

    const results: TestCaseEvaluation[] = [];
    this.logger.info(
      `Starting parallel execution of ${testCases.length} test cases with concurrency ${maxConcurrency}`,
    );

    for (const chunk of chunks) {
      this.logger.debug(
        `Executing chunk of ${chunk.length} test cases (${results.length}/${testCases.length} completed)`,
      );
      // Process each test case with error handling
      const chunkPromises = chunk.map(async (testCase) => {
        try {
          return await this.executeTestCase(agent, testCase);
        } catch (error) {
          this.logger.error(
            `Error executing test case ${testCase.id}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
          return {
            testCaseId: testCase.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            score: 0,
            executionTime: 0,
            response: '',
            testCase,
          };
        }
      });
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    this.logger.info(
      `Completed parallel execution of ${testCases.length} test cases`,
    );
    return results;
  }
}
