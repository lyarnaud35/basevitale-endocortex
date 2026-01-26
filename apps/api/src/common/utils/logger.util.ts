import { Logger } from '@nestjs/common';

/**
 * Logger Utilities
 * 
 * Utilitaires pour le logging
 */

/**
 * Créer un logger avec contexte
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Formater un log avec contexte
 */
export function formatLog(context: string, message: string, ...args: any[]): string {
  return `[${context}] ${message} ${args.length > 0 ? JSON.stringify(args) : ''}`;
}

/**
 * Logger pour les erreurs avec stack trace
 */
export function logError(
  logger: Logger,
  error: Error | unknown,
  context?: string,
): void {
  if (error instanceof Error) {
    logger.error(`${context ? `[${context}] ` : ''}${error.message}`, error.stack);
  } else {
    logger.error(`${context ? `[${context}] ` : ''}${String(error)}`);
  }
}

/**
 * Logger pour les performances
 */
export function logPerformance(
  logger: Logger,
  operation: string,
  duration: number,
  threshold: number = 1000,
): void {
  if (duration > threshold) {
    logger.warn(`Slow operation: ${operation} took ${duration}ms`);
  } else {
    logger.debug(`${operation} completed in ${duration}ms`);
  }
}
