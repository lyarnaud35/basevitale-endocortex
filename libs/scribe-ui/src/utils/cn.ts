import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine classNames avec clsx puis tailwind-merge pour éviter les conflits
 * de classes Tailwind (isolation des styles du widget).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Préfixe pour tous les IDs HTML du widget (éviter collisions DOM dans le Host). */
export const BV_SCRIBE_ID_PREFIX = 'bv-scribe';

/**
 * Génère un ID préfixé pour un élément du widget.
 * @example id('root') => 'bv-scribe-root'
 */
export function scribeId(suffix: string): string {
  return `${BV_SCRIBE_ID_PREFIX}-${suffix}`;
}
