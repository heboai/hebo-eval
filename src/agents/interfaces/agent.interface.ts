import {
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentAuthConfig,
} from '../types/agent.types';

/**
 * Abstract interface for agent interactions
 *
 * This interface defines the contract that all agent implementations must follow,
 * providing a consistent way to interact with different types of agents.
 */
export interface IAgent {
  /**
   * Gets the configuration of the agent
   * @returns The agent's configuration
   */
  getConfig: () => AgentConfig;

  /**
   * Initializes the agent with the provided configuration
   * @param config The agent configuration
   * @returns Promise that resolves when initialization is complete
   */
  initialize: (config: AgentConfig) => Promise<void>;

  /**
   * Authenticates the agent with the provided credentials
   * @param authConfig Authentication configuration
   * @returns Promise that resolves when authentication is complete
   */
  authenticate: (authConfig: AgentAuthConfig) => Promise<void>;

  /**
   * Sends input to the agent and receives its response
   * @param input The input to send to the agent
   * @returns Promise that resolves with the agent's output
   */
  sendInput: (input: AgentInput) => Promise<AgentOutput>;

  /**
   * Validates the agent's configuration
   * @returns Promise that resolves with true if the configuration is valid
   * @throws Error if the configuration is invalid
   */
  validateConfig: () => Promise<boolean>;

  /**
   * Cleans up any resources used by the agent
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup: () => Promise<void>;

  /**
   * Creates a clone of the agent with the same configuration
   * @returns Promise that resolves with a new agent instance
   */
  clone?: () => Promise<IAgent>;
}
