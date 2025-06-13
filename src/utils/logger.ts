/**
 * Icons for different message types
 */
const ICONS = {
  error: '❌',
  success: '✅',
  info: 'ℹ️',
  warning: '⚠️',
  debug: '🔍',
  test: {
    pass: '✓',
    fail: '✗',
    skip: '!',
  },
};

/**
 * Colors for different message types
 */
export const COLORS = {
  error: '\x1b[31m', // Red
  success: '\x1b[32m', // Green
  info: '\x1b[36m', // Cyan
  warning: '\x1b[33m', // Yellow
  debug: '\x1b[35m', // Magenta
  test: {
    pass: '\x1b[32m', // Green
    fail: '\x1b[31m', // Red
    skip: '\x1b[33m', // Yellow
  },
  reset: '\x1b[0m', // Reset
  loading: '\x1b[38;2;255;196;76m', // #ffc44c
};

/**
 * Progress bar characters
 */
const PROGRESS_BAR = {
  LEFT: '[',
  RIGHT: ']',
  FILLED: '█',
  EMPTY: '░',
  WIDTH: 30,
};

/**
 * Message types for different styles
 */
type MessageType = 'error' | 'success' | 'info' | 'warning' | 'debug';

/**
 * Logger configuration options
 */
interface LoggerConfig {
  /**
   * Whether to show verbose output including test results and provider information
   */
  verbose: boolean;
  /**
   * Path to debug log file for storing suppressed messages
   */
  debugLogFile?: string;
}

/**
 * Simple logger utility for CLI output
 */
export class Logger {
  private static instance: Logger | null = null;
  private static loadingInterval: NodeJS.Timeout | null = null;
  private static loadingMessage: string = '';
  private static loadingTotal: number = 0;
  private static loadingCurrent: number = 0;
  private static config: LoggerConfig = {
    verbose: false,
  };
  private static testResults: Array<{
    id: string;
    passed: boolean;
    error?: string;
    score: number;
    executionTime: number;
    testCase: {
      input: string;
      expected: string;
    };
    response: string;
    formattedResult: string;
  }> = [];

  private constructor() {}

  public static getInstance(): Logger {
    if (!this.instance) {
      this.instance = new Logger();
    }
    return this.instance;
  }

  /**
   * Check if verbose mode is enabled
   * @returns true if verbose mode is enabled
   */
  public static isVerbose(): boolean {
    return Logger.config.verbose;
  }

  /**
   * Configure the logger
   * @param config Logger configuration options
   */
  public static configure(config: Partial<LoggerConfig>): void {
    Logger.config = { ...Logger.config, ...config };
  }

  /**
   * Starts a loading indicator with progress
   * @param message The message to display
   * @param total The total number of items to process
   */
  static startLoading(message: string, total: number): void {
    Logger.loadingMessage = message;
    Logger.loadingTotal = total;
    Logger.loadingCurrent = 0;

    // Clear any existing loading indicator
    Logger.stopLoading();

    // Start new loading indicator
    Logger.loadingInterval = setInterval(() => {
      const progress = Logger.loadingCurrent / Logger.loadingTotal;
      const filledWidth = Math.floor(progress * PROGRESS_BAR.WIDTH);
      const emptyWidth = PROGRESS_BAR.WIDTH - filledWidth;

      // Create the progress bar with the specified color
      const filledBar =
        COLORS.loading + PROGRESS_BAR.FILLED.repeat(filledWidth) + COLORS.reset;
      const emptyBar = PROGRESS_BAR.EMPTY.repeat(emptyWidth);
      const percentage = Math.round(progress * 100);

      process.stdout.write(
        `\r${Logger.loadingMessage} ${PROGRESS_BAR.LEFT}${filledBar}${emptyBar}${PROGRESS_BAR.RIGHT} ${percentage}%`,
      );
    }, 100);
  }

  /**
   * Updates the progress of the loading indicator
   * @param current The current number of completed items
   */
  static updateLoadingProgress(current: number): void {
    Logger.loadingCurrent = current;
  }

  /**
   * Stops the loading indicator and clears the line
   */
  static stopLoading(): void {
    if (Logger.loadingInterval) {
      clearInterval(Logger.loadingInterval);
      Logger.loadingInterval = null;
      process.stdout.write('\r\x1b[K'); // Clear the line
    }
  }

  /**
   * Creates a formatted message with consistent styling
   * @param content The message content
   * @param type The type of message
   * @returns The formatted message
   */
  private static formatMessage(content: string, type: MessageType): string {
    const lines = content.split('\n');
    return [
      '',
      `${COLORS[type]}${ICONS[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}${COLORS.reset}`,
      ...lines.map((line) => `${COLORS[type]}${line}${COLORS.reset}`),
      '',
    ].join('\n');
  }

  /**
   * Logs an error message
   * @param message The message to log
   * @param meta Optional metadata to include
   */
  static error(message: unknown, meta?: Record<string, unknown>): void {
    const messageStr = typeof message === 'string' ? message : String(message);

    // Always show critical errors
    if (
      messageStr.includes('API key') ||
      messageStr.includes('Configuration error') ||
      messageStr.includes('Authentication failed') ||
      messageStr.includes('Failed to load config') ||
      messageStr.includes('Invalid API key') ||
      messageStr.includes('Invalid or inactive API key') ||
      messageStr.includes('Environment variable') ||
      messageStr.includes('baseUrl') ||
      messageStr.includes('provider') ||
      messageStr.includes('model') ||
      messageStr.includes('threshold') ||
      messageStr.includes('max-concurrency')
    ) {
      console.error(Logger.formatMessage(messageStr, 'error'));
      if (meta) {
        console.error(JSON.stringify(meta, null, 2));
      }
      return;
    }

    // For non-critical errors, log to debug if not in verbose mode
    if (!Logger.config.verbose) {
      Logger.debug(messageStr, meta);
      return;
    }

    // In verbose mode, show all errors
    console.error(Logger.formatMessage(messageStr, 'error'));
    if (meta) {
      console.error(JSON.stringify(meta, null, 2));
    }
  }

  /**
   * Logs a warning message
   * @param message The message to log
   * @param meta Optional metadata to include
   */
  static warn(message: unknown, meta?: Record<string, unknown>): void {
    const messageStr = typeof message === 'string' ? message : String(message);

    // Skip redundant evaluation status messages
    if (
      messageStr.includes('Some test cases failed') ||
      messageStr.includes('Evaluation completed with errors')
    ) {
      return;
    }

    console.warn(Logger.formatMessage(messageStr, 'warning'));
    if (meta) {
      console.warn(JSON.stringify(meta, null, 2));
    }
  }

  /**
   * Logs an info message
   * @param message The message to log
   * @param meta Optional metadata to include
   */
  static info(message: unknown, meta?: Record<string, unknown>): void {
    const messageStr = typeof message === 'string' ? message : String(message);

    // Skip non-verbose messages and redundant status messages
    if (
      (!Logger.config.verbose &&
        (messageStr.includes('Initializing') ||
          messageStr.includes('Starting evaluation') ||
          messageStr.includes('Evaluation completed') ||
          messageStr.includes('Executing') ||
          meta?.provider)) ||
      messageStr.includes('Evaluation completed')
    ) {
      return;
    }

    // Show all messages in verbose mode
    console.log(Logger.formatMessage(messageStr, 'info'));
    if (meta) {
      console.log(JSON.stringify(meta, null, 2));
    }
  }

  /**
   * Logs a success message
   * @param message The message to log
   * @param meta Optional metadata to include
   */
  static success(message: unknown, meta?: Record<string, unknown>): void {
    const messageStr = typeof message === 'string' ? message : String(message);
    console.log(Logger.formatMessage(messageStr, 'success'));
    if (meta) {
      console.log(JSON.stringify(meta, null, 2));
    }
  }

  /**
   * Logs a debug message (only shown when DEBUG environment variable is set)
   * @param message The message to log
   * @param meta Optional metadata to include
   */
  static debug(message: unknown, meta?: Record<string, unknown>): void {
    if (process.env.DEBUG) {
      const messageStr =
        typeof message === 'string' ? message : String(message);
      console.debug(Logger.formatMessage(messageStr, 'debug'));
      if (meta) {
        console.debug(JSON.stringify(meta, null, 2));
      }
    }
  }

  /**
   * Logs a test result
   * @param id Test case ID
   * @param passed Whether the test passed
   * @param error Optional error message
   * @param score Test score
   * @param executionTime Execution time in milliseconds
   * @param testCase Optional test case information
   * @param response Optional response information
   */
  static testResult(
    id: string,
    passed: boolean,
    details: {
      error?: string;
      score?: number;
      executionTime?: number;
      testCase?: { input: string; expected: string };
      response?: string;
    } = {},
  ): void {
    const color = passed ? COLORS.test.pass : COLORS.test.fail;
    const status = passed ? 'Passed' : 'Failed';
    const formattedString = `${color}${status}${COLORS.reset} ${id}`;

    // Store the result for the final summary
    Logger.testResults.push({
      id,
      passed,
      error: details.error,
      score: details.score ?? 0,
      executionTime: details.executionTime ?? 0,
      testCase: details.testCase ?? { input: '', expected: '' },
      response: details.response ?? '',
      formattedResult: formattedString,
    });
  }

  /**
   * Logs a test summary
   * @param total Total number of tests
   * @param passed Number of passed tests
   * @param failed Number of failed tests
   * @param duration Total execution time in seconds
   */
  static testSummary(
    total: number,
    passed: number,
    failed: number,
    duration: number,
  ): void {
    // Clear any existing output
    process.stdout.write('\r\x1b[K');

    // Print a blank line for separation
    console.log('\n');

    // Log concise results for all tests
    Logger.testResults.forEach((result) => {
      console.log(result.formattedResult);
    });

    // Log detailed information for failed tests first
    if (failed > 0) {
      console.log('\nFailed Tests');
      console.log('------------');
      Logger.testResults
        .filter((result) => !result.passed)
        .forEach((result) => {
          console.log(`\n${result.id}`);
          console.log(`Status: ${COLORS.test.fail}Failed${COLORS.reset}`);
          if (result.score !== undefined) {
            console.log(`Score: ${result.score.toFixed(3)}`);
          }
          if (result.executionTime) {
            console.log(`Time: ${result.executionTime.toFixed(2)}ms`);
          }
          console.log('\nInput:');
          console.log(result.testCase.input);
          console.log('\nExpected Output:');
          console.log(result.testCase.expected);
          console.log('\nActual Response:');
          console.log(result.response);
          if (result.error) {
            console.log('\nError:');
            console.log(result.error);
          }
          console.log('\n---\n');
        });
    }

    // Print the summary statistics
    console.log('Test Summary');
    console.log('============');
    console.log(`Total: ${total}`);
    console.log(`${COLORS.test.pass}Passed: ${passed}${COLORS.reset}`);
    console.log(`${COLORS.test.fail}Failed: ${failed}${COLORS.reset}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);

    // Clear test results after summary
    Logger.testResults = [];
  }
}
