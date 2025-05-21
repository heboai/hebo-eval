import { TestCaseParser } from './tokenizer.js';
import {
  MessageRole,
  BaseMessage,
  TestCase,
} from '../core/types/message.types.js';
import { roleMapper } from '../core/utils/role-mapper.js';
import { ParseError } from './errors.js';

/**
 * Parser for test case text files
 */
export class Parser {
  private parser: TestCaseParser;

  constructor() {
    this.parser = new TestCaseParser();
  }

  /**
   * Parses a test case from text
   * @param text The text to parse
   * @param name The name of the test case
   * @returns The parsed test case
   * @throws ParseError if parsing fails
   */
  public parse(text: string, name: string): TestCase {
    const elements = this.parser.tokenize(text);
    const messageBlocks: BaseMessage[] = [];
    let currentBlock: BaseMessage | null = null;

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      switch (element.type) {
        case 'role': {
          // Save previous block if exists
          if (currentBlock) {
            messageBlocks.push(currentBlock);
          }

          // Start new block
          const role = this.parseRole(element.value);
          currentBlock = {
            role,
            content: '',
            toolUsages: [],
            toolResponses: [],
          };
          break;
        }

        case 'content': {
          if (!currentBlock) {
            throw new ParseError('Content found without a role');
          }

          // Append content with proper spacing
          if (currentBlock.content) {
            currentBlock.content += '\n';
          }
          currentBlock.content += element.value;
          break;
        }

        case 'tool_use': {
          if (!currentBlock) {
            throw new ParseError('Tool use found without a role');
          }

          // Parse tool usage and args from the combined value
          const toolValue = element.value;
          const argsMatch = toolValue.match(/^(.*?)\s*args:\s*(.*)$/i);

          if (!argsMatch) {
            throw new ParseError(
              'Tool use must include args in format: "name args: {...}"',
            );
          }

          const toolName = argsMatch[1].trim();
          const args = argsMatch[2].trim();

          // Validate that args is valid JSON
          let parsedArgs: Record<string, unknown>;
          try {
            const parsed = JSON.parse(args) as unknown;
            if (typeof parsed !== 'object' || parsed === null) {
              throw new Error('Tool args must be a valid object');
            }
            parsedArgs = parsed as Record<string, unknown>;
          } catch (e: unknown) {
            const errorMessage =
              e instanceof Error ? e.message : 'Invalid JSON';
            throw new ParseError(
              `Tool args must be valid JSON: ${errorMessage}`,
            );
          }

          if (!currentBlock.toolUsages) {
            currentBlock.toolUsages = [];
          }
          currentBlock.toolUsages.push({
            name: toolName,
            args: JSON.stringify(parsedArgs).replace(/"([^"]+)":/g, '"$1": '), // Add space after colon only
          });
          break;
        }

        case 'tool_response': {
          if (!currentBlock) {
            throw new ParseError('Tool response found without a role');
          }

          if (!currentBlock.toolResponses) {
            currentBlock.toolResponses = [];
          }
          currentBlock.toolResponses.push({ content: element.value });
          break;
        }
      }
    }

    // Add the last block if exists
    if (currentBlock) {
      messageBlocks.push(currentBlock);
    }

    // Validate the test case structure
    this.validateTestCase(messageBlocks);

    return {
      id: name,
      name,
      messageBlocks,
    };
  }

  /**
   * Parses a role string into a MessageRole enum value
   * @param role The role string to parse
   * @returns The parsed MessageRole
   * @throws ParseError if the role is invalid
   */
  private parseRole(role: string): MessageRole {
    try {
      return roleMapper.toRole(role);
    } catch {
      throw new ParseError(`Invalid role: ${role}`);
    }
  }

  /**
   * Validates the structure of a test case
   * @param messageBlocks The message blocks to validate
   * @throws ParseError if validation fails
   */
  private validateTestCase(messageBlocks: BaseMessage[]): void {
    if (messageBlocks.length === 0) {
      throw new ParseError('Test case must contain at least one message block');
    }

    // Validate that all messages have a role
    for (const block of messageBlocks) {
      if (!block.role) {
        throw new ParseError(
          'All messages must have a role marker (e.g. "user:", "assistant:", "human agent:")',
        );
      }

      // Validate tool usage and response sequence
      if (block.toolUsages && block.toolUsages.length > 0) {
        // Tool usage must be from assistant or human agent
        if (
          block.role !== MessageRole.ASSISTANT &&
          block.role !== MessageRole.HUMAN_AGENT
        ) {
          throw new ParseError(
            'Tool usage must be from assistant or human agent message',
          );
        }

        // Tool usage must be followed by tool response
        if (!block.toolResponses || block.toolResponses.length === 0) {
          throw new ParseError('Tool usage must be followed by tool response');
        }
      }
    }
  }
}
