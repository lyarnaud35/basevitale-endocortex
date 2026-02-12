import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '../common/services/config.module';
import { SecurityModule } from '../security/security.module';
import { CodingModule } from '../coding/coding.module';
import { PatientContextMachineService } from './patient-context-machine.service';
import { OracleGhostService } from './oracle-ghost.service';
import { OracleController } from './oracle.controller';
import { LiveOracleStrategy } from './strategies/live-oracle.strategy';

/**
 * Module Oracle - PatientContextMachine (L'Oracle).
 * Strategy : ORACLE_MODE=MOCK (fictif) | LIVE (Gemini). Fallback MOCK si LIVE échoue.
 * Au start(), déclenche automatiquement l'abonnement du SecurityGuard et du CodingAssistant (zéro config frontend).
 */
@Module({
  imports: [ConfigModule, forwardRef(() => SecurityModule), forwardRef(() => CodingModule)],
  controllers: [OracleController],
  providers: [LiveOracleStrategy, PatientContextMachineService, OracleGhostService],
  exports: [PatientContextMachineService, OracleGhostService],
})
export class OracleModule {}
