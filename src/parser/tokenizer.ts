import { ParseError } from './errors.js';

/**
 * Represents an element in the test case text
 */
export interface TestCaseElement {
  /**
   * The type of the element
   */
  type: 'role' | 'content' | 'tool_use' | 'tool_response' | 'args';

  /**
   * The value of the element
   */
  value: string;
}

/**
 * Type definition for pattern handler functions
 */
type PatternHandler = (line: string, elements: TestCaseElement[]) => void;

/**
 * Interface for pattern handler configuration
 */
interface PatternHandlerConfig {
  pattern: RegExp;
  handle: PatternHandler;
}

/**
 * Parser for test case text files
 */
export class TestCaseParser {
  /**
   * Regular expression patterns for element matching
   */
  private static readonly PATTERNS = {
    ROLE: /^\s*(\w+):/i,
    TOOL_USE: /^tool use:/i,
    TOOL_RESPONSE: /^\s*tool response:/i,
    ARGS: /^args:/i,
  };

  /**
   * Valid roles that can be used in test cases
   */
  private static readonly VALID_ROLES = new Set([
    'user',
    'assistant',
    'human agent',
    'tool use',
    'tool response',
  ]);

  /**
   * Pattern handlers for different line types
   */
  private readonly patternHandlers: PatternHandlerConfig[] = [
    {
      pattern: TestCaseParser.PATTERNS.TOOL_USE,
      handle: (line: string, elements: TestCaseElement[]) => {
        elements.push({
          type: 'tool_use',
          value: line.substring('tool use:'.length).trim(),
        });
      },
    },
    {
      pattern: TestCaseParser.PATTERNS.TOOL_RESPONSE,
      handle: (line: string, elements: TestCaseElement[]) => {
        const match = line.match(/^\s*tool response:\s*(.*)$/i);
        if (match) {
          elements.push({
            type: 'tool_response',
            value: match[1].trim(),
          });
        }
      },
    },
    {
      pattern: TestCaseParser.PATTERNS.ARGS,
      handle: (line: string, elements: TestCaseElement[]) => {
        elements.push({
          type: 'args',
          value: line.substring('args:'.length).trim(),
        });
      },
    },
    {
      pattern: TestCaseParser.PATTERNS.ROLE,
      handle: (line: string, elements: TestCaseElement[]) => {
        const match = line.match(/^\s*(\w+):/i);
        if (!match) return; // This should never happen due to pattern matching

        const role = match[1];
        const normalizedRole = role.toLowerCase().trim();

        if (!TestCaseParser.VALID_ROLES.has(normalizedRole)) {
          throw new ParseError(
            `Invalid message role: ${role}. Valid roles are: ${Array.from(
              TestCaseParser.VALID_ROLES,
            ).join(', ')}`,
          );
        }

        elements.push({ type: 'role', value: normalizedRole });
        // Get the content after the role marker, preserving whitespace except for the space after the colon and line endings
        const content = line
          .substring(match[0].length)
          .replace(/^\s+/, '') // Remove space after colon
          .replace(/[\r\n]+$/, ''); // Remove line endings
        elements.push({
          type: 'content',
          value: content,
        });
      },
    },
  ];

  /**
   * Parses the input text into test case elements
   * @param text The text to parse
   * @returns Array of test case elements
   */
  public tokenize(text: string): TestCaseElement[] {
    const lines = text.split('\n');
    const elements: TestCaseElement[] = [];
    let currentRole: string | null = null;

    for (const line of lines) {
      if (line.trim() === '') continue;

      let handled = false;
      for (const { pattern, handle } of this.patternHandlers) {
        if (pattern.test(line)) {
          handle(line, elements);
          handled = true;
          // Update current role if this was a role marker
          if (pattern === TestCaseParser.PATTERNS.ROLE) {
            const match = line.match(/^\s*(\w+):/i);
            if (match) {
              currentRole = match[1].toLowerCase().trim();
            }
          }
          break;
        }
      }

      if (!handled) {
        // If no pattern matches but we have a current role, treat as content
        if (currentRole) {
          elements.push({
            type: 'content',
            value: line.trim(),
          });
        } else {
          throw new ParseError(
            'All messages must have a role marker (e.g. "user:", "assistant:", "human agent:", "tool use:", "tool response:")',
          );
        }
      }
    }

    // Validate the parsed elements
    this.validateElements(elements);

    return elements;
  }

  /**
   * Validates the parsed elements for common errors
   * @param elements The parsed elements
   * @throws Error if validation fails
   */
  private validateElements(elements: TestCaseElement[]): void {
    // Example validation: Ensure tool_use is followed by either args or tool_response
    for (let i = 0; i < elements.length - 1; i++) {
      if (
        elements[i].type === 'tool_use' &&
        elements[i + 1].type !== 'args' &&
        elements[i + 1].type !== 'tool_response'
      ) {
        console.warn(
          'Warning: tool_use should be followed by args or tool_response',
        );
      }
    }
  }
}
