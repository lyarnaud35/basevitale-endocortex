import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_TTL_KEY, CACHE_KEY_PREFIX } from '../decorators/cache-response.decorator';
import { MemoryCache } from '../utils/memory-cache.util';
import { CacheService } from '../services/cache.service';

/**
 * Cache Response Interceptor
 * 
 * Intercepteur pour mettre en cache les réponses HTTP
 * Version BaseVitale Optimisée
 */
@Injectable()
export class CacheResponseInterceptor implements NestInterceptor {
  private readonly memoryCache = new MemoryCache<any>();
  private readonly reflector = new Reflector();

  constructor(private readonly cacheService?: CacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Vérifier si le cache est activé pour cette route
    const ttl = this.reflector.get<number>(CACHE_TTL_KEY, handler);
    const keyPrefix = this.reflector.get<string>(CACHE_KEY_PREFIX, handler) || '';

    if (!ttl) {
      // Pas de cache configuré, passer directement
      return next.handle();
    }

    // Générer la clé de cache
    const cacheKey = this.generateCacheKey(request, controller.name, handler.name, keyPrefix);

    // Vérifier le cache mémoire d'abord
    const cached = this.memoryCache.get(cacheKey);
    if (cached !== undefined) {
      return of(cached);
    }

    // Vérifier le cache Redis si disponible
    if (this.cacheService) {
      // TODO: Implémenter vérification Redis
    }

    // Exécuter la requête et mettre en cache
    return next.handle().pipe(
      tap((data) => {
        // Mettre en cache en mémoire
        this.memoryCache.set(cacheKey, data, ttl);

        // Mettre en cache Redis si disponible
        if (this.cacheService) {
          // TODO: Implémenter mise en cache Redis
        }
      }),
    );
  }

  private generateCacheKey(
    request: any,
    controllerName: string,
    handlerName: string,
    prefix: string,
  ): string {
    const params = JSON.stringify(request.params || {});
    const query = JSON.stringify(request.query || {});
    const baseKey = `${prefix}${controllerName}:${handlerName}:${params}:${query}`;
    
    // Hasher pour réduire la taille
    return Buffer.from(baseKey).toString('base64').substring(0, 200);
  }
}
