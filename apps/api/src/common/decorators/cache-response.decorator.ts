import { SetMetadata } from '@nestjs/common';

export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_KEY_PREFIX = 'cache_key_prefix';

/**
 * Décorateur pour mettre en cache les réponses
 * 
 * Usage:
 * @CacheResponse(60000) // Cache 60 secondes
 * @Get()
 * async getData() { ... }
 */
export const CacheResponse = (ttl: number = 60000, keyPrefix?: string) =>
  SetMetadata(CACHE_TTL_KEY, ttl) && SetMetadata(CACHE_KEY_PREFIX, keyPrefix || '');
