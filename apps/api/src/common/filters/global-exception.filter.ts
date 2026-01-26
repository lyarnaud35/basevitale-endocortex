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
 * GlobalExceptionFilter
 * 
 * Filtre global pour capturer toutes les exceptions non gérées
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request['requestId'] || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        details = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      
      // Logger les erreurs non gérées
      this.logger.error(
        `Unhandled error [${requestId}]: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse = {
      success: false,
      error: message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && exception instanceof Error && {
        stack: exception.stack,
      }),
    };

    response.status(status).json(errorResponse);
  }
}
