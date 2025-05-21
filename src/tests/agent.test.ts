import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BaseAgent } from '../agents/interfaces/base-agent.js';
import {
  AgentConfig,
  AgentInput,
  AgentOutput,
} from '../agents/types/agent.types.js';
import { HeboAgent } from '../agents/implementations/hebo-agent.js';
import { BaseMessage, MessageRole } from '../core/types/message.types.js';
import { roleMapper } from '../core/utils/role-mapper.js';

/**
 * Test implementation of BaseAgent for testing abstract functionality
 */
class TestAgent extends BaseAgent {
  protected processInput(_: AgentInput): Promise<AgentOutput> {
    return Promise.resolve({
      response: 'test response',
      metadata: { test: true },
    });
  }
}

describe('Agent Types and Interfaces', () => {
  describe('BaseMessage', () => {
    it('should create a valid user message', () => {
      const message: BaseMessage = {
        role: MessageRole.USER,
        content: 'Hello',
      };
      expect(message.role).toBe(MessageRole.USER);
      expect(message.content).toBe('Hello');
    });
  });

  describe('AgentInput', () => {
    it('should create input with multiple messages', () => {
      const input: AgentInput = {
        messages: [
          { role: MessageRole.USER, content: 'Hello' },
          { role: MessageRole.ASSISTANT, content: 'Hi there' },
        ],
      };
      expect(input.messages).toHaveLength(2);
    });
  });
});

describe('BaseAgent', () => {
  let agent: TestAgent;
  const config: AgentConfig = {
    model: 'gpt-4o',
  };

  beforeEach(() => {
    agent = new TestAgent(config);
  });

  describe('Initialization', () => {
    it('should initialize with valid config', async () => {
      await agent.initialize(config);
      expect(agent.getConfig()).toEqual(config);
    });

    it('should throw error for invalid config', async () => {
      const invalidConfig = { ...config, model: '' };
      await expect(agent.initialize(invalidConfig)).rejects.toThrow();
    });
  });

  describe('Authentication', () => {
    it('should authenticate with valid API key', async () => {
      await agent.initialize(config);
      await agent.authenticate({ agentKey: 'test-key' });
      // No error means success
    });

    it('should throw error if not initialized before authentication', async () => {
      await expect(
        agent.authenticate({ agentKey: 'test-key' }),
      ).rejects.toThrow();
    });
  });

  describe('Input Processing', () => {
    it('should process input after initialization and authentication', async () => {
      await agent.initialize(config);
      await agent.authenticate({ agentKey: 'test-key' });

      const input: AgentInput = {
        messages: [{ role: MessageRole.USER, content: 'Hello' }],
      };

      const output = await agent.sendInput(input);
      expect(output.response).toBe('test response');
    });

    it('should throw error if not authenticated before sending input', async () => {
      await agent.initialize(config);
      const input: AgentInput = {
        messages: [{ role: MessageRole.USER, content: 'Hello' }],
      };
      await expect(agent.sendInput(input)).rejects.toThrow();
    });
  });
});

describe('HeboAgent', () => {
  let agent: HeboAgent;
  const config = {
    model: 'gpt-4o',
  };

  beforeEach(() => {
    agent = new HeboAgent(config);
  });

  describe('Network Error Handling', () => {
    it('should handle network failure gracefully', async () => {
      await agent.initialize(config);
      await agent.authenticate({ agentKey: 'test-key' });

      // Mock fetch to simulate network errors
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() => {
        throw new Error('Network error: Failed to fetch');
      }) as jest.MockedFunction<typeof fetch>;

      const input: AgentInput = {
        messages: [{ role: MessageRole.USER, content: 'Hello' }],
      };

      const output = await agent.sendInput(input);

      // Verify error handling
      expect(output).toBeDefined();
      expect(output.response).toBe('');
      expect(output.error).toBeDefined();
      expect(output.error?.message).toBe('Network error: Failed to fetch');
      expect(output.error?.details).toBeDefined();

      // Restore original fetch
      global.fetch = originalFetch;
    });

    it('should handle HTTP error responses gracefully', async () => {
      await agent.initialize(config);
      await agent.authenticate({ agentKey: 'test-key' });

      // Mock fetch to simulate HTTP error
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({ error: { message: 'Server error' } }),
          clone: () => ({
            text: () =>
              Promise.resolve('{"error": {"message": "Server error"}}'),
          }),
        } as Response);
      }) as jest.MockedFunction<typeof fetch>;

      const input: AgentInput = {
        messages: [{ role: MessageRole.USER, content: 'Hello' }],
      };

      const output = await agent.sendInput(input);

      // Verify error handling
      expect(output).toBeDefined();
      expect(output.response).toBe('');
      expect(output.error).toBeDefined();
      expect(output.error?.message).toContain('HTTP error! status: 500');
      expect(output.error?.details).toBeDefined();

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('Message History', () => {
    it('should maintain conversation history', async () => {
      await agent.initialize(config);
      await agent.authenticate({ agentKey: 'test-key' });

      const input: AgentInput = {
        messages: [
          { role: MessageRole.USER, content: 'Hello' },
          { role: MessageRole.ASSISTANT, content: 'Hi there' },
        ],
      };

      await agent.sendInput(input);
      expect(agent['messageHistory']).toHaveLength(2);
    });
  });

  describe('Message Conversion', () => {
    it('should handle role conversion correctly', () => {
      expect(roleMapper.toOpenAI(MessageRole.USER)).toBe('user');
      expect(roleMapper.toOpenAI(MessageRole.ASSISTANT)).toBe('assistant');
      expect(roleMapper.toOpenAI(MessageRole.SYSTEM)).toBe('system');
    });
  });

  describe('Memory Management', () => {
    it('should handle multiple consecutive inputs without performance degradation', async () => {
      await agent.initialize(config);
      await agent.authenticate({ agentKey: 'test-key' });

      // Mock fetch to simulate API responses
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: 'test-id',
              model: config.model,
              choices: [
                {
                  message: {
                    role: 'assistant',
                    content: 'Test response',
                  },
                },
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
              },
            }),
          clone: () => ({
            text: () =>
              Promise.resolve(
                JSON.stringify({
                  id: 'test-id',
                  model: config.model,
                  choices: [
                    {
                      message: {
                        role: 'assistant',
                        content: 'Test response',
                      },
                    },
                  ],
                  usage: {
                    prompt_tokens: 10,
                    completion_tokens: 5,
                    total_tokens: 15,
                  },
                }),
              ),
          }),
        } as Response);
      }) as jest.MockedFunction<typeof fetch>;

      // Simulate a conversation with multiple messages
      const conversationRounds = 10;
      const messagesPerRound = 3;

      for (let round = 0; round < conversationRounds; round++) {
        const input: AgentInput = {
          messages: Array.from({ length: messagesPerRound }, (_, i) => ({
            role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
            content: `Message ${round * messagesPerRound + i + 1}`,
          })),
        };

        const output = await agent.sendInput(input);

        // Verify response is received
        expect(output).toBeDefined();
        expect(output.response).toBe('Test response');

        // Verify message history is maintained correctly
        expect(agent['messageHistory']).toHaveLength(
          (round + 1) * messagesPerRound + (round + 1), // Add one for each assistant response
        );
      }

      // Final verification of message history
      const finalHistory = agent['messageHistory'];
      expect(finalHistory).toHaveLength(
        conversationRounds * messagesPerRound + conversationRounds,
      );

      // Verify message order and content
      finalHistory.forEach((message, index) => {
        // Calculate the expected role based on the index
        // Even indices are user messages, odd indices are assistant messages
        const expectedRole =
          index % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT;
        expect(roleMapper.toOpenAI(message.role)).toBe(
          roleMapper.toOpenAI(expectedRole),
        );
      });

      // Restore original fetch
      global.fetch = originalFetch;
    });
  });
});
