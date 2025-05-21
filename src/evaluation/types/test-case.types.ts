import { BaseMessage } from '../../core/types/message.types.js';
import { TestCase as CoreTestCase } from '../../core/types/message.types.js';

/**
 * Represents a test case for agent evaluation.
 */
export interface TestCase extends CoreTestCase {
  /**
   * Unique identifier for the test case.
   */
  id: string;

  /**
   * Name of the test case.
   */
  name: string;

  /**
   * The sequence of messages that form the test case.
   */
  messageBlocks: BaseMessage[];
}

/**
 * Represents the result of executing a test case.
 */
export interface TestCaseResult {
  /**
   * Whether the test case execution was successful.
   */
  success: boolean;

  /**
   * Error message if the test case failed.
   */
  error?: string;

  /**
   * Score between 0 and 1 indicating how well the agent performed.
   */
  score: number;

  /**
   * Time taken to execute the test case in milliseconds.
   */
  executionTime: number;
}

/**
 * Represents the complete result of evaluating a test case, including the test case itself
 * and the agent's response.
 */
export interface TestCaseEvaluation {
  /**
   * Unique identifier of the test case.
   */
  testCaseId: string;

  /**
   * Whether the test case execution was successful.
   */
  success: boolean;

  /**
   * Error message if the test case failed.
   */
  error?: string;

  /**
   * Score between 0 and 1 indicating how well the agent performed.
   */
  score: number;

  /**
   * Time taken to execute the test case in milliseconds.
   */
  executionTime: number;

  /**
   * The response from the agent.
   */
  response?: string;

  /**
   * The original test case that was evaluated.
   */
  testCase: TestCase;
}
