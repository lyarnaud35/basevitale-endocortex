/**
 * Pagination Utilities
 * 
 * Utilitaires pour la pagination des résultats
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Normaliser les paramètres de pagination
 */
export function normalizePagination(
  page?: number,
  limit?: number,
): { skip: number; take: number; page: number; limit: number } {
  const defaultLimit = 20;
  const maxLimit = 100;

  const normalizedPage = Math.max(1, page || 1);
  const normalizedLimit = Math.min(maxLimit, Math.max(1, limit || defaultLimit));
  const skip = (normalizedPage - 1) * normalizedLimit;

  return {
    skip,
    take: normalizedLimit,
    page: normalizedPage,
    limit: normalizedLimit,
  };
}

/**
 * Créer un résultat paginé
 */
export function createPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginationResult<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}
