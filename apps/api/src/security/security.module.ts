import { Module } from '@nestjs/common';
import { SecurityGhostController } from './security-ghost.controller';
import { SecurityGhostService } from './security-ghost.service';

@Module({
  controllers: [SecurityGhostController],
  providers: [SecurityGhostService],
  exports: [SecurityGhostService],
})
export class SecurityModule {}
