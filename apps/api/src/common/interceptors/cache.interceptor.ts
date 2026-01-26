import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Inject, forwardRef } from '@nestjs/common';
import { CacheService } from '../services/cache.service';

/**
 * CacheInterceptor
 * 
 * Mise en cache automatique des réponses GET
 * 
 * Note: Décorer les méthodes avec @Cache() pour activer
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(forwardRef(() => CacheService))
    private readonly cacheService: CacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Ne mettre en cache que les requêtes GET
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Construire la clé de cache
    const cacheKey = this.generateCacheKey(request);

    // Vérifier le cache
    const cached = this.cacheService.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    // Exécuter la requête et mettre en cache
    return next.handle().pipe(
      tap((data) => {
        // Mettre en cache pendant 5 minutes par défaut
        this.cacheService.set(cacheKey, data, 5 * 60 * 1000);
      }),
    );
  }

  private generateCacheKey(request: any): string {
    const { method, url, query } = request;
    const queryString = JSON.stringify(query || {});
    return `cache:${method}:${url}:${queryString}`;
  }
}
