import { BaseAgent } from '../interfaces/base-agent.js';
import { AgentConfig, AgentInput, AgentOutput } from '../types/agent.types.js';
import {
  Response,
  ResponseRequest,
  OpenAIMessage,
} from '../types/openai.types.js';
import { roleMapper } from '../../core/utils/role-mapper.js';
import { AgentAuthConfig } from '../types/agent.types.js';
import { IAgent } from '../interfaces/agent.interface.js';

/**
 * Configuration specific to Hebo agent
 */
export interface HeboAgentConfig extends AgentConfig {
  /**
   * The base URL for the Hebo API
   * @default 'https://app.hebo.ai'
   */
  baseUrl?: string;

  /**
   * Whether to store the conversation
   * @default true
   */
  store?: boolean;

  /**
   * The provider to use for the agent
   * @default 'hebo'
   */
  provider?: 'hebo' | 'openai';
}

/**
 * Implementation of the Hebo agent
 */
export class HeboAgent extends BaseAgent {
  private baseUrl: string;
  private store: boolean;
  private previousResponseId?: string;
  private messageHistory: OpenAIMessage[] = [];
  private agentKey?: string;
  private provider: 'hebo' | 'openai';

  constructor(config: HeboAgentConfig) {
    super(config);
    // Remove trailing slash from baseUrl if present
    const rawBaseUrl = config.baseUrl || 'https://app.hebo.ai';
    this.baseUrl = rawBaseUrl.replace(/\/$/, '');
    this.store = config.store ?? true;
    this.messageHistory = [];
    this.provider = config.provider || 'hebo';
  }

  /**
   * Validates the Hebo-specific configuration
   */
  public override validateConfig(): Promise<boolean> {
    if (!this.config.model) {
      throw new Error('Model is required for Hebo agent');
    }
    return super.validateConfig();
  }

  /**
   * Authenticates the agent with the provided API key
   * @param authConfig Authentication configuration containing the API key
   * @returns Promise that resolves when authentication is complete
   */
  public override async authenticate(
    authConfig: AgentAuthConfig,
  ): Promise<void> {
    // Set provider-specific header format
    const providerAuthConfig = {
      ...authConfig,
      headerName: this.provider === 'openai' ? 'Authorization' : 'X-API-Key',
      headerFormat:
        this.provider === 'openai' ? 'Bearer {agentKey}' : '{agentKey}',
    };
    this.agentKey = authConfig.agentKey;
    await super.authenticate(providerAuthConfig);
  }

  /**
   * Processes the input and returns the agent's response
   */
  protected async processInput(input: AgentInput): Promise<AgentOutput> {
    // Add all messages to history
    for (const msg of input.messages) {
      this.messageHistory.push({
        role: msg.role,
        content: msg.content,
      });
    }

    const request: ResponseRequest = {
      model: this.config.model,
      store: this.store,
      previous_response_id: this.previousResponseId,
      messages: this.messageHistory,
    };

    try {
      const response = await this.makeRequest(request);
      this.previousResponseId = response.id;

      // Add assistant's response to history
      let finalResponse = '';
      if (response.choices.length > 0 && response.choices[0].message) {
        const message = response.choices[0].message;

        // Log the raw message for debugging
        //console.log(
        //   '[HeboAgent] Raw message:',
        //   JSON.stringify(message, null, 2),
        // );

        if (!message.content && !message.function_call) {
          //console.log('[HeboAgent] Warning: Empty response received from API');
          return {
            response: '',
            error: {
              message: 'Empty response received from API',
              details: response,
            },
          };
        }

        // Convert function_call back to tool usage format
        const toolUsages = message.function_call
          ? [
              {
                name: message.function_call.name,
                args: message.function_call.arguments,
              },
            ]
          : [];

        // Add assistant's response to history
        this.messageHistory.push({
          role: roleMapper.toRole(message.role),
          content: message.content || '',
          toolUsages,
          toolResponses: [],
        });

        // Format the response
        finalResponse = message.content || '';
        if (message.function_call) {
          finalResponse += `\ntool use: ${message.function_call.name} args: ${message.function_call.arguments}`;
        }
      } else {
        // console.log('[HeboAgent] Warning: No message in response choices');
        return {
          response: '',
          error: {
            message: 'No message in response choices',
            details: response,
          },
        };
      }

      if (response.error) {
        //console.log('[HeboAgent] Error in response:', response.error);
        return {
          response: '',
          error: {
            message: response.error.message,
            code: response.error.code,
            details: response.error,
          },
        };
      }

      return {
        response: finalResponse,
        metadata: {
          id: response.id,
          model: response.model,
          usage: response.usage,
        },
      };
    } catch (error) {
      // console.log('[HeboAgent] Error processing input:', error);
      return {
        response: '',
        error: {
          message:
            error instanceof Error ? error.message : 'Unknown error occurred',
          details: error,
        },
      };
    }
  }

  /**
   * Makes a request to the API
   */
  private async makeRequest(request: ResponseRequest): Promise<Response> {
    const headers = {
      ...this.getAuthHeaders(),
      'Content-Type': 'application/json',
    };

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100000); // 100 seconds timeout

    try {
      const endpoint =
        this.provider === 'openai'
          ? 'https://api.openai.com/v1/responses'
          : `${this.baseUrl}/api/responses`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      // Clear timeout since request completed
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 504) {
          throw new Error('Gateway timeout - server took too long to respond');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json() as Promise<Response>;
    } catch (error) {
      // Clear timeout in case of error
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out after 100 seconds');
        }
        // If it's already a gateway timeout error, pass it through
        if (error.message.includes('Gateway timeout')) {
          throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Cleans up the agent's resources and message history
   */
  public override async cleanup(): Promise<void> {
    this.messageHistory = [];
    this.previousResponseId = undefined;
    // Add a small delay to ensure proper cleanup
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Creates a clone of the agent with the same configuration
   * @returns Promise that resolves with a new agent instance
   */
  public async clone(): Promise<IAgent> {
    const newAgent = new HeboAgent(this.config);
    await newAgent.initialize({ model: this.config.model });
    if (this.agentKey) {
      await newAgent.authenticate({ agentKey: this.agentKey });
    }
    // Don't copy message history to ensure test isolation
    return newAgent;
  }
}
