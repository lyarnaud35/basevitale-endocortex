import { Module } from '@nestjs/common';
import { OracleModule } from '../oracle/oracle.module';
import { SecurityModule } from '../security/security.module';
import { CodingModule } from '../coding/coding.module';
import { PatientDashboardController } from './patient-dashboard.controller';

/**
 * Module Patient - Dashboard State (Ghost Protocol)
 * Expose l'état agrégé Oracle + Security + Coding en un seul endpoint pour le frontend.
 */
@Module({
  imports: [OracleModule, SecurityModule, CodingModule],
  controllers: [PatientDashboardController],
})
export class PatientModule {}
