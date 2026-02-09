import { Module, forwardRef } from '@nestjs/common';
import { OracleModule } from '../oracle/oracle.module';
import { CodingController } from './coding.controller';
import { CodingService } from './coding.service';
import { CodingGhostService } from './coding-ghost.service';
import { CodingAssistantService } from './coding-assistant.service';
import { CodingAssistantController } from './coding-assistant.controller';
import { CodingSimulatorService } from './coding-simulator.service';
import { CodingStrategistService } from './coding-strategist.service';
import { CodingStrategistController } from './coding-strategist.controller';

/**
 * CodingModule – Ghost Protocol (CodingMachine + CodingAssistantMachine).
 * CodingMachine : CIM-10/11, seuil 0.6 → SUGGESTING ou SILENT (texte manuel).
 * CodingAssistantMachine (Semaine 3) : s'abonne à l'Oracle, IDLE → ANALYZING → SUGGESTING | SILENT.
 * Stratège (Laboratoire déterministe) : machine XState + simulateur, routes /coding/strategist/*.
 */
@Module({
  imports: [forwardRef(() => OracleModule)],
  controllers: [
    CodingController,
    CodingAssistantController,
    CodingStrategistController,
  ],
  providers: [
    CodingService,
    CodingGhostService,
    CodingAssistantService,
    CodingSimulatorService,
    CodingStrategistService,
  ],
  exports: [
    CodingService,
    CodingGhostService,
    CodingAssistantService,
    CodingSimulatorService,
    CodingStrategistService,
  ],
})
export class CodingModule {}
