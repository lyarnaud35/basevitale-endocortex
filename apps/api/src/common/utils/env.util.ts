/**
 * Environment Utilities
 * 
 * Utilitaires pour gérer les variables d'environnement
 */

/**
 * Obtenir une variable d'environnement avec valeur par défaut
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return defaultValue;
  }
  return value;
}

/**
 * Obtenir une variable d'environnement booléenne
 */
export function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Obtenir une variable d'environnement numérique
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${value}`);
  }
  return parsed;
}

/**
 * Obtenir une variable d'environnement de type enum
 */
export function getEnvEnum<T extends string>(
  key: string,
  validValues: T[],
  defaultValue?: T,
): T {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return defaultValue;
  }
  if (!validValues.includes(value as T)) {
    throw new Error(
      `Environment variable ${key} must be one of: ${validValues.join(', ')}, got: ${value}`,
    );
  }
  return value as T;
}

/**
 * Vérifier que toutes les variables d'environnement requises sont définies
 */
export function validateRequiredEnv(requiredVars: string[]): void {
  const missing: string[] = [];

  for (const key of requiredVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}
