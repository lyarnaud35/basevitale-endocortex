import { Module } from '@nestjs/common';
import { GhostMachineService } from './ghost-machine.service';
import { GhostController } from './ghost.controller';

/**
 * GHOST PROTOCOL v999 - CoreGhostModule
 * 
 * Module de base pour toutes les machines à états.
 * Fournit :
 * - GhostMachineService : Gestion des instances de machines
 * - GhostController : Endpoints SSE et REST pour les machines
 * 
 * Les modules métier (ex: ScribeModule) doivent :
 * 1. Importer CoreGhostModule
 * 2. Créer leurs machines en étendant GhostMachine
 * 3. Enregistrer leurs machines dans GhostMachineService
 */
@Module({
  providers: [GhostMachineService],
  controllers: [GhostController],
  exports: [GhostMachineService],
})
export class CoreGhostModule {}
