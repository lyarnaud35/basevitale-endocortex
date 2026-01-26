import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * LoggingInterceptor
 * 
 * Intercepte les requêtes et les réponses pour logger les performances
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const requestId = request.requestId || 'unknown';
    const startTime = Date.now();

    this.logger.log(`→ ${method} ${url} [${requestId}] from ${ip}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          
          this.logger.log(
            `← ${method} ${url} [${requestId}] ${statusCode} ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `✗ ${method} ${url} [${requestId}] ${error.status || 500} ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
