import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';

/**
 * Module C+ (Security Guardian) – Mini-Vidal.
 * Exporte SecurityService pour intégration Scribe / autres modules.
 */
@Module({
  providers: [SecurityService],
  exports: [SecurityService],
})
export class MedicalModule {}
