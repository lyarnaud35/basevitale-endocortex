import { Module } from '@nestjs/common';
import { CodingController } from './coding.controller';
import { CodingService } from './coding.service';
import { CodingGhostService } from './coding-ghost.service';

/**
 * CodingModule – Ghost Protocol (CodingMachine + Silence Attentionnel).
 * CIM-10/11, seuil 0.6 → SUGGESTING ou SILENT.
 */
@Module({
  controllers: [CodingController],
  providers: [CodingService, CodingGhostService],
  exports: [CodingService, CodingGhostService],
})
export class CodingModule {}
