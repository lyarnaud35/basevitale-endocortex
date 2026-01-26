import { Response } from 'express';

/**
 * Response Helper Utilities
 * 
 * Helpers pour simplifier les réponses HTTP
 */

/**
 * Envoyer une réponse de succès standardisée
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
): void {
  res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Envoyer une réponse d'erreur standardisée
 */
export function sendError(
  res: Response,
  message: string,
  statusCode: number = 400,
  details?: any,
): void {
  res.status(statusCode).json({
    success: false,
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    ...(details && { details }),
  });
}

/**
 * Envoyer une réponse de création standardisée
 */
export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

/**
 * Envoyer une réponse No Content
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Envoyer une réponse paginée standardisée
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
): void {
  const totalPages = Math.ceil(total / limit);
  
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
}
