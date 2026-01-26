import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { TIMEOUT_MS_KEY } from '../decorators/timeout.decorator';

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * TimeoutInterceptor
 *
 * Applique un timeout aux requêtes. Utilise @Timeout(ms) sur la route ou la classe
 * pour override, sinon DEFAULT_TIMEOUT_MS (30s).
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ms =
      this.reflector.get<number>(TIMEOUT_MS_KEY, context.getHandler()) ??
      this.reflector.get<number>(TIMEOUT_MS_KEY, context.getClass()) ??
      DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout(ms),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(
            () => new RequestTimeoutException('Request timeout'),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
