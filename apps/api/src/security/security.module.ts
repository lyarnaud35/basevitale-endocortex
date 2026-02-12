import { Module, forwardRef } from '@nestjs/common';
import { OracleModule } from '../oracle/oracle.module';
import { SecurityGhostController } from './security-ghost.controller';
import { SecurityGhostService } from './security-ghost.service';
import { SecurityGuardController } from './security-guard.controller';
import { SecurityGuardService } from './security-guard.service';
import { PrescriptionGuardService } from './prescription-guard.service';
import { SecurityGateway } from './security.gateway';

@Module({
  imports: [forwardRef(() => OracleModule)],
  controllers: [SecurityGhostController, SecurityGuardController],
  providers: [SecurityGhostService, SecurityGuardService, PrescriptionGuardService, SecurityGateway],
  exports: [SecurityGhostService, SecurityGuardService, PrescriptionGuardService],
})
export class SecurityModule {}
