import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * TransformResponseInterceptor
 * 
 * Transforme automatiquement les réponses en format standardisé
 * Utilisé en complément de TransformInterceptor pour des transformations spécifiques
 */
@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Si la réponse est déjà au format standardisé, on la retourne telle quelle
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Sinon, on encapsule dans le format standard
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
