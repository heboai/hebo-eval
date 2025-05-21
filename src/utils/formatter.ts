import { TestCase, BaseMessage } from '../core/types/message.types.js';

/**
 * Formats a test case as plain text, showing roles, content, tool usages, and tool responses.
 * Matches the style of the current test case files.
 * @param testCase The test case to format
 * @returns The formatted plain text string
 */
export const formatTestCasePlain = (testCase: TestCase): string => {
  return testCase.messageBlocks.map(formatMessageBlockPlain).join('\n');
};

/**
 * Formats a single message block as plain text.
 * @param block The message block to format
 * @returns The formatted string
 */
const formatMessageBlockPlain = (block: BaseMessage): string => {
  const lines: string[] = [];
  // Show the role as it would appear in the test case file
  lines.push(`${block.role.replace(/_/g, ' ')}: ${block.content}`.trim());

  // Show tool usages (if any)
  if (block.toolUsages && block.toolUsages.length > 0) {
    for (const usage of block.toolUsages) {
      lines.push(`tool use: ${usage.name} args: ${usage.args}`);
    }
  }

  // Show tool responses (if any)
  if (block.toolResponses && block.toolResponses.length > 0) {
    for (const response of block.toolResponses) {
      lines.push(`tool response: ${response.content}`);
    }
  }

  return lines.join('\n');
};
