import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * CacheModule
 * 
 * Module global pour le service de cache
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
