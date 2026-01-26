/**
 * Slug Utilities
 * 
 * Utilitaires pour créer et manipuler des slugs
 */

/**
 * Créer un slug depuis une chaîne
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/[^a-z0-9\s-]/g, '') // Garder seulement alphanumériques, espaces, tirets
    .trim()
    .replace(/\s+/g, '-') // Remplacer espaces par tirets
    .replace(/-+/g, '-') // Remplacer tirets multiples par un seul
    .replace(/^-+|-+$/g, ''); // Supprimer tirets en début/fin
}

/**
 * Créer un slug avec limite de longueur
 */
export function createSlugLimited(text: string, maxLength: number = 50): string {
  const slug = createSlug(text);
  return slug.substring(0, maxLength).replace(/-+$/, ''); // Supprimer tiret final si coupé
}

/**
 * Valider qu'une chaîne est un slug valide
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}
