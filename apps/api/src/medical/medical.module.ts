import { Module } from '@nestjs/common';
import { Neo4jModule } from '../neo4j/neo4j.module';
import { SecurityService } from './security.service';
import { DrugService } from './drug.service';
import { DrugsController } from './drugs.controller';

/**
 * Module C+ (Security Guardian) – Deep Roots.
 * Ontologie BDPM (DrugService) + validation allergies (SecurityService).
 */
@Module({
  imports: [Neo4jModule],
  controllers: [DrugsController],
  providers: [SecurityService, DrugService],
  exports: [SecurityService, DrugService],
})
export class MedicalModule {}
