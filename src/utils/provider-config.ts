/**
 * Provider-specific configuration utilities
 */

import { ConfigLoader } from '../config/config.loader.js';
import { ProviderType } from '../config/types/config.types.js';

/**
 * Gets the base URL for a given provider
 * @param provider The provider name
 * @returns The base URL for the provider
 * @throws Error if the provider is not supported
 */
export function getProviderBaseUrl(provider: string): string {
  const normalizedProvider = provider.toLowerCase();
  const configLoader = ConfigLoader.getInstance();

  try {
    return configLoader.getProviderBaseUrl(normalizedProvider);
  } catch {
    // Fallback to default URLs if configuration is not loaded
    const defaultUrls = {
      [ProviderType.OPENAI]: 'https://api.openai.com/v1',
      [ProviderType.HEBO]: 'https://app.hebo.ai',
      [ProviderType.ANTHROPIC]: 'https://api.anthropic.com',
    };

    const baseUrl = defaultUrls[normalizedProvider as keyof typeof defaultUrls];
    if (!baseUrl) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return baseUrl;
  }
}

/**
 * Gets the API key for a given provider
 * @param provider The provider name
 * @returns The API key for the provider
 * @throws Error if the provider is not supported or if the API key is not configured
 */
export function getProviderApiKey(provider: string): string {
  const normalizedProvider = provider.toLowerCase();
  const configLoader = ConfigLoader.getInstance();

  try {
    return configLoader.getProviderApiKey(normalizedProvider);
  } catch {
    throw new Error(`API key not configured for provider: ${provider}`);
  }
}

/**
 * Gets the authentication header configuration for a given provider
 * @param provider The provider name
 * @returns The authentication header configuration
 */
export function getProviderAuthHeader(
  provider: string,
): { name: string; format: string } | undefined {
  const normalizedProvider = provider.toLowerCase();
  const configLoader = ConfigLoader.getInstance();

  try {
    return configLoader.getProviderAuthHeader(normalizedProvider);
  } catch {
    return undefined;
  }
}
