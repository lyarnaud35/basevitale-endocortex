/**
 * Error Helpers
 * 
 * Utilitaires pour la gestion des erreurs
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Créer une erreur Bad Request standardisée
 */
export function createBadRequestError(message: string, details?: any): HttpException {
  return new HttpException(
    {
      message,
      details,
    },
    HttpStatus.BAD_REQUEST,
  );
}

/**
 * Créer une erreur Not Found standardisée
 */
export function createNotFoundError(resource: string, id: string): HttpException {
  return new HttpException(
    {
      message: `${resource} with ID ${id} not found`,
    },
    HttpStatus.NOT_FOUND,
  );
}

/**
 * Créer une erreur Conflict standardisée
 */
export function createConflictError(message: string): HttpException {
  return new HttpException(
    {
      message,
    },
    HttpStatus.CONFLICT,
  );
}

/**
 * Créer une erreur Unauthorized standardisée
 */
export function createUnauthorizedError(message: string = 'Unauthorized'): HttpException {
  return new HttpException(
    {
      message,
    },
    HttpStatus.UNAUTHORIZED,
  );
}

/**
 * Créer une erreur Forbidden standardisée
 */
export function createForbiddenError(message: string = 'Forbidden'): HttpException {
  return new HttpException(
    {
      message,
    },
    HttpStatus.FORBIDDEN,
  );
}
