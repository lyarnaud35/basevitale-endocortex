import { SetMetadata, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '../interceptors/cache.interceptor';

export const CACHE_TTL_KEY = 'cacheTtl';
export const CACHE_KEY_PREFIX = 'cacheKeyPrefix';

/**
 * Decorator pour mettre en cache une méthode
 * 
 * @param ttlMs - TTL en millisecondes (défaut: 5 minutes)
 * @param keyPrefix - Préfixe pour la clé de cache
 * 
 * @example
 * @Cache(60000, 'patient') // Cache 1 minute
 * @Get(':id')
 * async getPatient(@Param('id') id: string) {
 *   return this.service.getById(id);
 * }
 */
export const Cache = (ttlMs: number = 5 * 60 * 1000, keyPrefix?: string) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    SetMetadata(CACHE_TTL_KEY, ttlMs)(target, propertyKey, descriptor);
    SetMetadata(CACHE_KEY_PREFIX, keyPrefix || 'default')(target, propertyKey, descriptor);
    UseInterceptors(CacheInterceptor)(target, propertyKey, descriptor);
  };
};
