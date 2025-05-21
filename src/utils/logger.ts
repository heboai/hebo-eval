/**
 * Box drawing characters for consistent styling
 */
const BOX = {
  TOP_LEFT: '┌',
  TOP_RIGHT: '┐',
  BOTTOM_LEFT: '└',
  BOTTOM_RIGHT: '┘',
  HORIZONTAL: '─',
  VERTICAL: '│',
  SPACE: ' ',
};

/**
 * Icons for different message types
 */
const ICONS = {
  error: '❌',
  success: '✅',
  info: 'ℹ️',
  warning: '⚠️',
  debug: '🔍',
};

/**
 * Colors for different message types
 */
const COLORS = {
  error: '\x1b[31m', // Red
  success: '\x1b[32m', // Green
  info: '\x1b[36m', // Cyan
  warning: '\x1b[33m', // Yellow
  debug: '\x1b[35m', // Magenta
  reset: '\x1b[0m', // Reset
};

/**
 * Rainbow colors for loading indicator
 */
const RAINBOW_COLORS = [
  '\x1b[31m', // Red
  '\x1b[33m', // Yellow
  '\x1b[32m', // Green
  '\x1b[36m', // Cyan
  '\x1b[34m', // Blue
  '\x1b[35m', // Magenta
];

/**
 * Loading indicator characters for spinner animation
 */
const LOADING_CHARS = [
  '⚡',
  '✨',
  '🌟',
  '💫',
  '⭐',
  '🌠',
  '⚡',
  '✨',
  '🌟',
  '💫',
];

/**
 * Message types for different styles
 */
type MessageType = 'error' | 'success' | 'info' | 'warning' | 'debug';

/**
 * Simple logger utility for CLI output
 */
export class Logger {
  private static instance: Logger | null = null;
  private static loadingInterval: NodeJS.Timeout | null = null;
  private static loadingIndex: number = 0;
  private static loadingMessage: string = '';
  private static loadingTotal: number = 0;
  private static loadingCurrent: number = 0;
  private static colorIndex: number = 0;

  private constructor() {}

  public static getInstance(): Logger {
    if (!this.instance) {
      this.instance = new Logger();
    }
    return this.instance;
  }

  /**
   * Starts a loading indicator with progress
   * @param message The message to display
   * @param total The total number of items to process
   */
  static startLoading(message: string, total: number): void {
    this.loadingMessage = message;
    this.loadingTotal = total;
    this.loadingCurrent = 0;
    this.loadingIndex = 0;
    this.colorIndex = 0;

    // Clear any existing loading indicator
    this.stopLoading();

    // Start new loading indicator
    this.loadingInterval = setInterval(() => {
      const color = RAINBOW_COLORS[this.colorIndex];
      const spinner = LOADING_CHARS[this.loadingIndex];
      const progress = `${this.loadingCurrent}/${this.loadingTotal}`;
      const percentage = Math.round(
        (this.loadingCurrent / this.loadingTotal) * 100,
      );

      process.stdout.write(
        `\r${color}${spinner} ${this.loadingMessage} ${progress} (${percentage}%)${COLORS.reset}`,
      );

      this.loadingIndex = (this.loadingIndex + 1) % LOADING_CHARS.length;
      this.colorIndex = (this.colorIndex + 1) % RAINBOW_COLORS.length;
    }, 100);
  }

  /**
   * Updates the progress of the loading indicator
   * @param current The current number of completed items
   */
  static updateLoadingProgress(current: number): void {
    this.loadingCurrent = current;
  }

  /**
   * Stops the loading indicator and clears the line
   */
  static stopLoading(): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
      process.stdout.write('\r\x1b[K'); // Clear the line
    }
  }

  /**
   * Creates a boxed message with consistent styling
   * @param content The message content
   * @param type The type of message
   * @returns The formatted message
   */
  private static formatMessage(content: string, type: MessageType): string {
    const lines = content.split('\n');
    const maxLength = Math.max(...lines.map((line) => line.length));
    const padding = 2;
    const width = maxLength + padding * 2;

    const top = `${BOX.TOP_LEFT}${BOX.HORIZONTAL.repeat(width)}${BOX.TOP_RIGHT}`;
    const bottom = `${BOX.BOTTOM_LEFT}${BOX.HORIZONTAL.repeat(width)}${BOX.BOTTOM_RIGHT}`;

    const formattedLines = lines.map((line) => {
      const paddedLine = line.padEnd(maxLength);
      return `${BOX.VERTICAL}${BOX.SPACE.repeat(padding)}${paddedLine}${BOX.SPACE.repeat(padding)}${BOX.VERTICAL}`;
    });

    // Add a separator between lines for better readability
    const separator = `${BOX.VERTICAL}${BOX.HORIZONTAL.repeat(width)}${BOX.VERTICAL}`;

    return [
      '',
      `${COLORS[type]}${ICONS[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}${COLORS.reset}`,
      top,
      ...formattedLines.flatMap((line, index) =>
        index < formattedLines.length - 1 ? [line, separator] : [line],
      ),
      bottom,
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
    console.error(this.formatMessage(messageStr, 'error'));
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
    console.warn(this.formatMessage(messageStr, 'warning'));
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
    console.log(this.formatMessage(messageStr, 'info'));
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
    console.log(this.formatMessage(messageStr, 'success'));
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
      console.debug(this.formatMessage(messageStr, 'debug'));
      if (meta) {
        console.debug(JSON.stringify(meta, null, 2));
      }
    }
  }
}
