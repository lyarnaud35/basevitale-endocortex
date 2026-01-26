/**
 * Prisma Helpers
 * 
 * Utilitaires pour optimiser les requêtes Prisma
 */

// Prisma namespace est disponible via PrismaClient généré
// Utiliser PrismaService pour accéder aux types si nécessaire
// eslint-disable-next-line @typescript-eslint/no-namespace
import type { Prisma } from '../../prisma/client';

/**
 * Créer une requête Prisma avec relations communes
 */
export function includeCommonRelations<T extends Prisma.PatientInclude | Prisma.ConsultationInclude>(
  include: T = {} as T,
): T {
  return include;
}

/**
 * Options de pagination pour Prisma
 */
export interface PrismaPaginationOptions {
  skip: number;
  take: number;
  orderBy?: 'asc' | 'desc' | Record<string, 'asc' | 'desc'>;
}

/**
 * Créer des options de pagination Prisma
 */
export function createPrismaPagination(
  page: number = 1,
  limit: number = 20,
  orderBy: 'asc' | 'desc' = 'desc',
): PrismaPaginationOptions {
  const skip = (page - 1) * limit;
  const take = Math.min(limit, 100); // Max 100 items

  return {
    skip,
    take,
    orderBy,
  };
}

/**
 * Créer une clause WHERE pour la recherche de texte
 */
export function createTextSearchWhere(
  fields: string[],
  searchTerm: string,
  mode: 'insensitive' | 'default' = 'insensitive',
): Prisma.StringFilter {
  return {
    contains: searchTerm,
    mode: mode === 'insensitive' ? 'insensitive' : undefined,
  };
}

/**
 * Combiner plusieurs clauses WHERE avec AND
 */
export function combineWhereClauses<T>(
  ...clauses: (T | undefined)[]
): T {
  const validClauses = clauses.filter((c) => c !== undefined && c !== null);
  
  if (validClauses.length === 0) {
    return {} as T;
  }

  if (validClauses.length === 1) {
    return validClauses[0] as T;
  }

  return {
    AND: validClauses,
  } as T;
}
