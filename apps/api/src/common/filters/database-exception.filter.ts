import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
// Prisma namespace non utilisé directement ici, types d'erreur gérés via any

/**
 * DatabaseExceptionFilter
 * 
 * Gère les exceptions Prisma/Base de données et les transforme
 * en réponses HTTP appropriées
 */
@Catch()
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    // Vérifier si c'est une erreur Prisma
    if (!exception?.code || !exception.code.startsWith('P')) {
      // Pas une erreur Prisma, laisser passer au filtre suivant
      throw exception;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error occurred';

    // Gérer les différents codes d'erreur Prisma
    switch (exception.code) {
      case 'P2002':
        // Unique constraint violation
        status = HttpStatus.CONFLICT;
        message = `A record with this ${exception.meta?.target || 'field'} already exists`;
        break;

      case 'P2025':
        // Record not found
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        break;

      case 'P2003':
        // Foreign key constraint violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid reference to related record';
        break;

      case 'P2014':
        // Required relation violation
        status = HttpStatus.BAD_REQUEST;
        message = 'Required relation is missing';
        break;

      default:
        this.logger.error(
          `Unhandled Prisma error: ${exception.code}`,
          exception.stack,
        );
        message = 'Database operation failed';
    }

    response.status(status).json({
      success: false,
      error: message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      code: exception.code,
    });
  }
}
