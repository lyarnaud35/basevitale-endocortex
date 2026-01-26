import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Format d'erreur standardisé
 */
interface ErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: any;
}

/**
 * HttpExceptionFilter
 * 
 * Filtre global pour formater toutes les exceptions HTTP
 * 
 * Application dans main.ts:
 * app.useGlobalFilters(new HttpExceptionFilter());
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse: ErrorResponse = {
      success: false,
      error: typeof message === 'string' ? message : (message as any).message || 'An error occurred',
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      details: typeof message === 'object' ? message : undefined,
    };

    // Log l'erreur
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${errorResponse.error}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
