import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
 * Transforme toutes les réponses en format standardisé
 * 
 * Utilisation:
 * - Appliquer globalement dans main.ts
 * - Ou sur des routes spécifiques avec @UseInterceptors(TransformInterceptor)
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
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
