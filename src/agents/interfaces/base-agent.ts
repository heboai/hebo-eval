import { IAgent } from './agent.interface';
import {
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentAuthConfig,
} from '../types/agent.types';

/**
 * Abstract base class for agent implementations
 *
 * This class provides a foundation for implementing the IAgent interface,
 * including common functionality and error handling.
 *
 * @remarks
 * Agents are designed to be initialized once during their lifecycle. Reinitialization
 * is not supported as it could lead to inconsistent state. If you need to change
 * the agent's configuration, create a new instance instead.
 */
export abstract class BaseAgent implements IAgent {
  protected config: AgentConfig;
  protected isInitialized: boolean = false;
  protected isAuthenticated: boolean = false;
  protected authConfig?: AgentAuthConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Gets the current configuration of the agent
   * @returns The agent's configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Initializes the agent with the provided configuration
   * @param config The agent configuration
   * @returns Promise that resolves when initialization is complete
   * @throws Error if the agent is already initialized
   */
  async initialize(config: AgentConfig): Promise<void> {
    if (this.isInitialized) {
      throw new Error(
        'Agent is already initialized. Create a new instance to use different configuration.',
      );
    }
    this.config = config;
    await this.validateConfig();
    this.isInitialized = true;
  }

  /**
   * Authenticates the agent with the provided API key
   * @param authConfig Authentication configuration containing the API key
   * @returns Promise that resolves when authentication is complete
   */
  async authenticate(authConfig: AgentAuthConfig): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Agent must be initialized before authentication');
    }
    await this.validateAuthConfig(authConfig);
    this.authConfig = authConfig;
    this.isAuthenticated = true;
  }

  /**
   * Sends input to the agent and receives its response
   * @param input The input to send to the agent
   * @returns Promise that resolves with the agent's output
   */
  async sendInput(input: AgentInput): Promise<AgentOutput> {
    if (!this.isInitialized) {
      throw new Error('Agent must be initialized before sending input');
    }
    if (!this.isAuthenticated) {
      throw new Error('Agent must be authenticated before sending input');
    }
    return this.processInput(input);
  }

  /**
   * Validates the agent's configuration
   * @returns Promise that resolves with true if the configuration is valid
   * @throws Error if the configuration is invalid
   */
  validateConfig(): Promise<boolean> {
    if (!this.config.model) {
      throw new Error('Agent model is required');
    }
    return Promise.resolve(true);
  }

  /**
   * Cleans up any resources used by the agent
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup(): Promise<void> {
    this.isInitialized = false;
    this.isAuthenticated = false;
    this.authConfig = undefined;
    return Promise.resolve();
  }

  /**
   * Validates the authentication configuration
   * @param authConfig Authentication configuration to validate
   * @throws Error if the authentication configuration is invalid
   */
  protected validateAuthConfig(authConfig: AgentAuthConfig): Promise<void> {
    if (!authConfig.agentKey) {
      throw new Error('API key is required for authentication');
    }
    return Promise.resolve();
  }

  /**
   * Gets the authentication headers for API requests
   * @returns Record containing the authentication headers
   * @throws Error if authentication configuration is invalid
   */
  protected getAuthHeaders(): Record<string, string> {
    if (!this.authConfig) {
      throw new Error('Authentication configuration not found');
    }

    const {
      agentKey,
      headerName = 'Authorization',
      headerFormat = 'Bearer {agentKey}',
    } = this.authConfig;
    return {
      [headerName]: headerFormat.replace('{agentKey}', agentKey),
    };
  }

  /**
   * Processes the input and returns the agent's response
   * @param input The input to process
   * @returns Promise that resolves with the agent's output
   */
  protected abstract processInput(input: AgentInput): Promise<AgentOutput>;
}
