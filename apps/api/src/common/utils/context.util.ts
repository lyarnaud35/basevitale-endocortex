import { ExecutionContext } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Context Utilities
 * 
 * Utilitaires pour extraire des informations du contexte NestJS
 */

/**
 * Extraire la requête HTTP du contexte
 */
export function getRequest(context: ExecutionContext): Request {
  return context.switchToHttp().getRequest<Request>();
}

/**
 * Extraire la réponse HTTP du contexte
 */
export function getResponse(context: ExecutionContext): Response {
  return context.switchToHttp().getResponse<Response>();
}

/**
 * Extraire les paramètres de la requête
 */
export function getParams(context: ExecutionContext): Record<string, any> {
  return getRequest(context).params;
}

/**
 * Extraire les query parameters
 */
export function getQuery(context: ExecutionContext): Record<string, any> {
  return getRequest(context).query;
}

/**
 * Extraire le body de la requête
 */
export function getBody(context: ExecutionContext): any {
  return getRequest(context).body;
}

/**
 * Extraire l'utilisateur de la requête
 */
export function getUser(context: ExecutionContext): any {
  return (getRequest(context) as any).user;
}

/**
 * Extraire le Request ID
 */
export function getRequestId(context: ExecutionContext): string {
  return getRequest(context)['requestId'] || 'unknown';
}
