import { ProviderType } from '../config/types/config.types.js';

/**
 * Regular expressions for matching model names to providers
 */
const MODEL_PATTERNS = {
  [ProviderType.OPENAI]: /^gpt-/, // Matches gpt-3.5-turbo, gpt-4, etc.
  [ProviderType.HEBO]: /^hebo-/, // Matches hebo-*, etc.
  [ProviderType.ANTHROPIC]: /^claude-/, // Matches claude-2, claude-instant, etc.
} as const;

/**
 * Interface for provider mapping result
 */
interface ProviderMappingResult {
  provider: ProviderType;
  modelName: string;
}

/**
 * Maps a model name to its provider and extracts the actual model name
 * @param fullModelName The full name of the model (e.g., hebo-gato-qa:v1)
 * @returns Object containing the provider and the actual model name
 * @throws Error if the model name doesn't match any known pattern
 */
export function getProviderFromModel(
  fullModelName: string,
): ProviderMappingResult {
  for (const [provider, pattern] of Object.entries(MODEL_PATTERNS)) {
    if (pattern.test(fullModelName)) {
      // Only extract model name for Hebo agents
      const modelName =
        provider === ProviderType.HEBO
          ? fullModelName.replace(pattern, '')
          : fullModelName;
      return {
        provider: provider as ProviderType,
        modelName,
      };
    }
  }
  throw new Error(
    `Unknown model pattern: ${fullModelName}. Supported patterns are: gpt-*, hebo-*, claude-*`,
  );
}

/**
 * Validates if a model name matches a known pattern
 * @param modelName The name of the model to validate
 * @returns True if the model name matches a known pattern
 */
export function isValidModelName(modelName: string): boolean {
  return Object.values(MODEL_PATTERNS).some((pattern) =>
    pattern.test(modelName),
  );
}
