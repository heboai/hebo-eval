/**
 * Utility functions for environment variable interpolation
 */

/**
 * Interpolates environment variables in a string
 * @param value The string to interpolate
 * @returns The interpolated string
 * @example
 * interpolateEnvVars('${OPENAI_API_KEY}') // Returns the value of OPENAI_API_KEY
 * interpolateEnvVars('https://api.openai.com/v1') // Returns the string as-is
 */
export function interpolateEnvVars(value: string): string {
  return value.replace(/\${([^}]+)}/g, (match, envVar) => {
    const value = process.env[envVar as keyof NodeJS.ProcessEnv];
    if (value === undefined) {
      // Return the original string if the environment variable is not set
      return match;
    }
    return value;
  });
}

/**
 * Interpolates environment variables in an object recursively
 * @param obj The object to interpolate
 * @returns The interpolated object
 */
export function interpolateEnvVarsInObject<T extends Record<string, unknown>>(
  obj: T,
): T {
  const result = { ...obj };

  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = interpolateEnvVars(value);
    } else if (typeof value === 'object' && value !== null) {
      (result as Record<string, unknown>)[key] = interpolateEnvVarsInObject(
        value as Record<string, unknown>,
      );
    }
  }

  return result;
}
