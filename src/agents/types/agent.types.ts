import { BaseMessage } from '../../core/types/message.types';

/**
 * Represents the base configuration for an agent
 */
export interface AgentConfig {
  /**
   * The model to use for the agent
   * @example "myfirstagent:next", "myfirstagent:v1"
   */
  model: string;
}

/**
 * Represents the input that can be sent to an agent
 */
export interface AgentInput {
  /**
   * List of messages to send to the agent
   */
  messages: BaseMessage[];
}

/**
 * Represents the output received from an agent
 */
export interface AgentOutput {
  /**
   * The main response from the agent
   */
  response: string;

  /**
   * Optional metadata about the response
   */
  metadata?: Record<string, unknown>;

  /**
   * Optional error information if the request failed
   */
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Configuration for API key authentication
 */
export interface ApiKeyAuthConfig {
  /**
   * The API key to be used for authentication
   */
  agentKey: string;

  /**
   * The header name where the API key should be sent
   * @default 'Authorization'
   */
  headerName?: string;

  /**
   * The format of the API key in the header
   * @default 'Bearer {apiKey}'
   */
  headerFormat?: string;
}

/**
 * Represents the authentication configuration for an agent
 */
export type AgentAuthConfig = ApiKeyAuthConfig;
