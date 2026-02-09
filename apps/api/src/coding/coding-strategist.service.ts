import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createActor } from 'xstate';
import { createCodingMachine } from '../machines/coding-assistant.machine';
import { CodingSimulatorService } from './coding-simulator.service';

/**
 * Orchestrateur NestJS – Stratège (Semaine 3).
 * Détient l'Actor XState alimenté par le simulateur (laboratoire déterministe).
 */
@Injectable()
export class CodingStrategistService implements OnModuleInit {
  private readonly logger = new Logger(CodingStrategistService.name);
  private actor: ReturnType<typeof createActor<ReturnType<typeof createCodingMachine>>> | null =
    null;

  constructor(private readonly simulator: CodingSimulatorService) {}

  onModuleInit(): void {
    const machine = createCodingMachine(this.simulator);
    this.actor = createActor(machine);
    this.actor.start();

    this.actor.subscribe((snapshot) => {
      this.logger.debug(
        `[MACHINE STATE] ${snapshot.value} | suggestions: ${snapshot.context.suggestions.length}`,
      );
    });

    this.logger.log('CodingStrategistService: Actor started (Stratège)');
  }

  updateInput(text: string): void {
    if (!this.actor) return;
    this.actor.send({ type: 'INPUT_UPDATED', text });
  }

  getSnapshot(): {
    value: string;
    context: { currentInput: string; suggestions: unknown[]; lastError?: string };
    shouldDisplay: boolean;
  } {
    if (!this.actor) {
      return {
        value: 'IDLE',
        context: { currentInput: '', suggestions: [] },
        shouldDisplay: false,
      };
    }
    const snapshot = this.actor.getSnapshot();
    return {
      value: typeof snapshot.value === 'string' ? snapshot.value : String(snapshot.value),
      context: {
        currentInput: snapshot.context.currentInput,
        suggestions: snapshot.context.suggestions,
        ...(snapshot.context.lastError && { lastError: snapshot.context.lastError }),
      },
      shouldDisplay: snapshot.value === 'SUGGESTING',
    };
  }
}
