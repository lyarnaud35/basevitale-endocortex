import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';

/**
 * Format standardisé pour les réponses API
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * TransformInterceptor
 *
 * Transforme toutes les réponses en format standardisé.
 * Les routes marquées @SkipTransform() (ex. SSE) ne sont pas enveloppées.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }
    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

/**
 * TransformErrorInterceptor
 * 
 * Transforme les erreurs en format standardisé
 */
@Injectable()
export class TransformErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data?.error || data?.statusCode) {
          // Si c'est déjà une erreur formatée, la retourner
          return {
            success: false,
            error: data.message || data.error || 'Une erreur est survenue',
            statusCode: data.statusCode || 500,
            timestamp: new Date().toISOString(),
          };
        }
        return data;
      }),
    );
  }
}
