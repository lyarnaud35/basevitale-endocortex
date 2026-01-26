import { Module } from '@nestjs/common';
import { GpuLockService } from './gpu-lock.service';

/**
 * GpuLockModule
 *
 * Fournit le sémaphore GPU (verrou Redis) pour réguler les appels IA.
 * Importé par ScribeModule et tout module effectuant des appels LLM locaux.
 */
@Module({
  providers: [GpuLockService],
  exports: [GpuLockService],
})
export class GpuLockModule {}
