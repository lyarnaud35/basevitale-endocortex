/**
 * Query Utilities
 * 
 * Utilitaires pour construire des requêtes Prisma
 */

// Prisma namespace via client généré
// eslint-disable-next-line @typescript-eslint/no-namespace
import type { Prisma } from '../../prisma/client';

/**
 * Créer un filtre de recherche de texte pour plusieurs champs
 */
export function createMultiFieldSearchFilter(
  searchTerm: string,
  fields: string[],
  mode: 'insensitive' | 'default' = 'insensitive',
): any {
  if (!searchTerm || searchTerm.trim() === '') {
    return {};
  }

  const searchMode = mode === 'insensitive' ? 'insensitive' : undefined;

  if (fields.length === 1) {
    return {
      [fields[0]]: {
        contains: searchTerm,
        ...(searchMode && { mode: searchMode }),
      },
    };
  }

  // Recherche dans plusieurs champs avec OR
  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: searchTerm,
        ...(searchMode && { mode: searchMode }),
      },
    })),
  };
}

/**
 * Créer un tri Prisma
 */
export function createSortOrder(
  field: string,
  direction: 'asc' | 'desc' = 'desc',
): any {
  return { [field]: direction };
}

/**
 * Créer un filtre de date entre deux dates
 */
export function createDateRangeFilter(
  field: string,
  startDate?: Date,
  endDate?: Date,
): any {
  const filter: any = {};

  if (startDate && endDate) {
    filter[field] = {
      gte: startDate,
      lte: endDate,
    };
  } else if (startDate) {
    filter[field] = {
      gte: startDate,
    };
  } else if (endDate) {
    filter[field] = {
      lte: endDate,
    };
  }

  return filter;
}

/**
 * Créer un filtre pour une valeur dans un tableau
 */
export function createInFilter(field: string, values: string[]): any {
  if (!values || values.length === 0) {
    return {};
  }

  return {
    [field]: {
      in: values,
    },
  };
}
