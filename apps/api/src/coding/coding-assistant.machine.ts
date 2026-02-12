import { Logger } from '@nestjs/common';
import type {
  CodingAssistantState,
  CodingAssistantContext,
  CodingAssistantEvent,
  CodingAssistantMachineState,
  CodingAssistantOracleReadyEvent,
  AnalysisDoneEvent,
} from './coding-assistant-machine.schema';

/**
 * GHOST PROTOCOL - CodingAssistantMachine (Semaine 3 - Le Stratège)
 * Observateur : écoute l'Oracle ; dès que READY → ANALYZING.
 * ANALYZING → SUGGESTING (si confiance haute) ou SILENT (placeholder sans LLM).
 * Pas de logique Python/LLM : machine à états et câblage uniquement.
 */
export class CodingAssistantMachine {
  private readonly logger = new Logger(CodingAssistantMachine.name);
  private state: CodingAssistantState = 'IDLE';
  private context: CodingAssistantContext;
  private updatedAt: Date = new Date();

  constructor(initialContext: Partial<CodingAssistantContext> = {}) {
    this.context = {
      patientId: initialContext.patientId ?? '',
      patientContext: initialContext.patientContext ?? null,
      suggestions: initialContext.suggestions ?? [],
    };
  }

  send(event: CodingAssistantEvent): CodingAssistantMachineState {
    this.logger.debug(`[${this.state}] Received event: ${event.type}`);

    if (this.state === 'IDLE' && event.type === 'ORACLE_READY') {
      const { patientId, context } = (event as CodingAssistantOracleReadyEvent).payload;
      this.context.patientId = patientId;
      this.context.patientContext = context;
      this.updatedAt = new Date();
      this.state = 'ANALYZING';
      this.logger.log(`[${patientId}] CodingAssistant → ANALYZING (Oracle READY)`);
      return this.getState();
    }

    if (this.state === 'ANALYZING' && event.type === 'ANALYSIS_DONE') {
      const { suggestions, confidenceHigh } = (event as AnalysisDoneEvent).payload;
      this.context.suggestions = suggestions;
      this.updatedAt = new Date();
      this.state = confidenceHigh ? 'SUGGESTING' : 'SILENT';
      this.logger.log(
        `[${this.context.patientId}] CodingAssistant → ${this.state}`,
      );
      return this.getState();
    }

    return this.getState();
  }

  getState(): CodingAssistantMachineState {
    return {
      value: this.state,
      context: { ...this.context },
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  get value(): CodingAssistantState {
    return this.state;
  }

  get ctx(): CodingAssistantContext {
    return { ...this.context };
  }
}
