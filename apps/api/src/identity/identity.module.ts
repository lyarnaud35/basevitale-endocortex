import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../common/services/cache.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * IdentityModule - Module C+ (Identité/INS)
 * 
 * Version Cabinet - Sprint 1: Fondation Invariante
 * 
 * Gère l'identification unique des patients selon les normes INS
 */
@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [IdentityController],
  providers: [IdentityService, MetricsService],
  exports: [IdentityService],
})
export class IdentityModule {}
