/**
 * Number Utilities
 * 
 * Utilitaires pour manipuler les nombres
 */

/**
 * Arrondir un nombre à N décimales
 */
export function roundTo(num: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Clamper un nombre entre min et max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Formater un nombre avec séparateurs
 */
export function formatNumber(num: number, locale: string = 'fr-FR'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Vérifier si un nombre est dans une plage
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Obtenir un pourcentage
 */
export function getPercentage(part: number, total: number, decimals: number = 2): number {
  if (total === 0) return 0;
  return roundTo((part / total) * 100, decimals);
}

/**
 * Générer un nombre aléatoire dans une plage
 */
export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
