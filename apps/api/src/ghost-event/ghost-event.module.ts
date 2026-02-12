import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module';
import { GhostEventController } from './ghost-event.controller';

/**
 * GHOST PROTOCOL - GhostEventModule
 * Expose POST /api/ghost/event : gateway unique pour les intentions (State Mutation).
 */
@Module({
  imports: [SecurityModule],
  controllers: [GhostEventController],
})
export class GhostEventModule {}
