/**
 * UUID Utilities
 * 
 * Utilitaires pour générer des identifiants uniques
 */

/**
 * Générer un ID unique simple (8 caractères hex)
 * Utile pour les IDs de requête, logs, etc.
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Générer un ID unique plus long (16 caractères hex)
 */
export function generateMediumId(): string {
  return Math.random().toString(36).substring(2, 18);
}

/**
 * Générer un hash simple depuis une chaîne
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
