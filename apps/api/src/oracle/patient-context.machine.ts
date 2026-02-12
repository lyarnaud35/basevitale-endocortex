import { Logger } from '@nestjs/common';
import type {
  PatientContextState,
  PatientContextMachineContext,
  PatientContextEvent,
  PatientContextMachineState,
  InitializeEvent,
  ContextLoadedEvent,
  FetchFailedEvent,
  StartFetchEvent,
  StartAnalyzingEvent,
} from './patient-context-machine.schema';

/**
 * GHOST PROTOCOL v999 - PatientContextMachine (L'Oracle)
 *
 * Machine à états finis pour le contexte patient.
 * Transitions : IDLE -> INITIALIZING -> FETCHING_CONTEXT -> ANALYZING -> READY | ERROR.
 * Le Backend est le Cerveau ; les événements sont traités de façon stricte.
 */
export class PatientContextMachine {
  private readonly logger = new Logger(PatientContextMachine.name);
  private state: PatientContextState = 'IDLE';
  private context: PatientContextMachineContext;
  private updatedAt: Date = new Date();

  constructor(initialContext: Partial<PatientContextMachineContext> = {}) {
    this.context = {
      patientId: initialContext.patientId ?? '',
      timeline: initialContext.timeline ?? [],
      alertes: initialContext.alertes ?? [],
      error: initialContext.error ?? null,
    };
  }

  /**
   * Envoie un événement à la machine.
   * Retourne le nouvel état si la transition est valide, sinon l'état actuel.
   */
  send(event: PatientContextEvent): PatientContextMachineState {
    this.logger.debug(`[${this.state}] Received event: ${event.type}`);

    switch (this.state) {
      case 'IDLE':
        return this.handleIdle(event);
      case 'INITIALIZING':
        return this.handleInitializing(event);
      case 'FETCHING_CONTEXT':
        return this.handleFetchingContext(event);
      case 'ANALYZING':
        return this.handleAnalyzing(event);
      case 'READY':
      case 'ERROR':
        return this.handleTerminal(event);
      default:
        this.logger.warn(`Unknown state: ${this.state}`);
        return this.getState();
    }
  }

  private handleIdle(event: PatientContextEvent): PatientContextMachineState {
    if (event.type === 'INITIALIZE') {
      const { patientId } = (event as InitializeEvent).payload;
      this.state = 'INITIALIZING';
      this.context.patientId = patientId;
      this.context.error = null;
      this.updatedAt = new Date();
      return this.getState();
    }
    this.logger.warn(`[IDLE] Event ${event.type} ignoré`);
    return this.getState();
  }

  private handleInitializing(
    event: PatientContextEvent,
  ): PatientContextMachineState {
    if (event.type === 'START_FETCH') {
      this.state = 'FETCHING_CONTEXT';
      this.updatedAt = new Date();
      return this.getState();
    }
    this.logger.warn(`[INITIALIZING] Event ${event.type} ignoré`);
    return this.getState();
  }

  private handleFetchingContext(
    event: PatientContextEvent,
  ): PatientContextMachineState {
    if (event.type === 'START_ANALYZING') {
      this.state = 'ANALYZING';
      this.updatedAt = new Date();
      return this.getState();
    }
    this.logger.warn(`[FETCHING_CONTEXT] Event ${event.type} ignoré`);
    return this.getState();
  }

  private handleAnalyzing(event: PatientContextEvent): PatientContextMachineState {
    if (event.type === 'CONTEXT_LOADED') {
      const { patientId, timeline, alertes } = (event as ContextLoadedEvent)
        .payload;
      this.state = 'READY';
      this.context.patientId = patientId;
      this.context.timeline = timeline;
      this.context.alertes = alertes;
      this.context.error = null;
      this.updatedAt = new Date();
      return this.getState();
    }
    if (event.type === 'FETCH_FAILED') {
      const { message } = (event as FetchFailedEvent).payload;
      this.state = 'ERROR';
      this.context.error = message;
      this.updatedAt = new Date();
      return this.getState();
    }
    this.logger.warn(`[ANALYZING] Event ${event.type} ignoré`);
    return this.getState();
  }

  private handleTerminal(
    event: PatientContextEvent,
  ): PatientContextMachineState {
    if (event.type === 'INITIALIZE') {
      const { patientId } = (event as InitializeEvent).payload;
      this.state = 'INITIALIZING';
      this.context.patientId = patientId;
      this.context.timeline = [];
      this.context.alertes = [];
      this.context.error = null;
      this.updatedAt = new Date();
      return this.getState();
    }
    this.logger.warn(`[${this.state}] Event ${event.type} ignoré (état terminal)`);
    return this.getState();
  }

  getState(): PatientContextMachineState {
    return {
      value: this.state,
      context: { ...this.context },
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  get value(): PatientContextState {
    return this.state;
  }

  get ctx(): PatientContextMachineContext {
    return { ...this.context };
  }
}
