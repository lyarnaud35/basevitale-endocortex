import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createActor } from 'xstate';
import { createCodingMachine } from '../machines/coding-assistant.machine';
import { CodingSimulatorService } from './coding-simulator.service';

/** Interface minimale de l'actor XState (évite les contraintes génériques strictes). */
interface StrategistActor {
  start: () => void;
  stop?: () => void;
  send: (event: { type: string; text?: string }) => void;
  subscribe: (listener: (snapshot: { value: unknown; context: { currentInput: string; suggestions: unknown[]; lastError?: string } }) => void) => { unsubscribe: () => void };
  getSnapshot: () => { value: unknown; context: { currentInput: string; suggestions: unknown[]; lastError?: string } };
}

/** Entrée du Registry : un acteur par session + métadonnées (TTL possible). */
export interface SessionEntry {
  actor: StrategistActor;
  createdAt: Date;
  lastActivityAt: Date;
}

/** DTO retourné par getSnapshot (aligné sur CodingStrategistState). */
export interface StrategistSnapshot {
  value: string;
  context: {
    currentInput: string;
    suggestions: unknown[];
    lastError?: string;
  };
  shouldDisplay: boolean;
}

const SESSION_ID_MAX_LENGTH = 128;
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

/** Snapshot vide (session inexistante). */
const EMPTY_SNAPSHOT: StrategistSnapshot = {
  value: 'IDLE',
  context: { currentInput: '', suggestions: [] },
  shouldDisplay: false,
};

/**
 * Orchestrateur NestJS – Stratège multi-tenant (v200).
 * Registry : une instance XState par sessionId. Isolation stricte (aucune fuite inter-sessions).
 */
@Injectable()
export class CodingStrategistService implements OnModuleDestroy {
  private readonly logger = new Logger(CodingStrategistService.name);
  private readonly registry = new Map<string, SessionEntry>();

  constructor(private readonly simulator: CodingSimulatorService) {}

  /**
   * Valide le sessionId (sécurité : pas de caractères dangereux, longueur bornée).
   */
  private validateSessionId(sessionId: string): boolean {
    return (
      typeof sessionId === 'string' &&
      sessionId.length > 0 &&
      sessionId.length <= SESSION_ID_MAX_LENGTH &&
      SESSION_ID_REGEX.test(sessionId)
    );
  }

  /**
   * Retourne l'actor pour ce sessionId ; le crée si nécessaire (lazy).
   */
  getOrCreateActor(sessionId: string): StrategistActor | null {
    if (!this.validateSessionId(sessionId)) {
      this.logger.warn(`Invalid sessionId (rejected)`);
      return null;
    }

    let entry = this.registry.get(sessionId);
    if (!entry) {
      const machine = createCodingMachine(this.simulator);
      const actor = createActor(machine) as unknown as StrategistActor;
      actor.start();

      actor.subscribe((snapshot) => {
        this.logger.debug(
          `[${sessionId}] STATE ${snapshot.value} | suggestions: ${snapshot.context.suggestions.length}`,
        );
      });

      const now = new Date();
      entry = { actor, createdAt: now, lastActivityAt: now };
      this.registry.set(sessionId, entry);
      this.logger.log(`[${sessionId}] Session created`);
    } else {
      entry.lastActivityAt = new Date();
    }

    return entry.actor;
  }

  /**
   * Envoie un texte à la machine de la session. Crée la session si besoin.
   */
  updateInput(sessionId: string, text: string): void {
    const actor = this.getOrCreateActor(sessionId);
    if (!actor) return;
    actor.send({ type: 'INPUT_UPDATED', text });
  }

  /**
   * Retourne le snapshot de la machine pour cette session. Vide si session inconnue.
   */
  getSnapshot(sessionId: string): StrategistSnapshot {
    if (!this.validateSessionId(sessionId)) {
      return EMPTY_SNAPSHOT;
    }

    const entry = this.registry.get(sessionId);
    if (!entry) {
      return EMPTY_SNAPSHOT;
    }

    const snapshot = entry.actor.getSnapshot();
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

  /**
   * Détruit la session (logout / nettoyage). Optionnel.
   */
  destroySession(sessionId: string): void {
    if (!this.validateSessionId(sessionId)) return;
    const entry = this.registry.get(sessionId);
    if (entry) {
      if (typeof entry.actor.stop === 'function') {
        entry.actor.stop();
      }
      this.registry.delete(sessionId);
      this.logger.log(`[${sessionId}] Session destroyed`);
    }
  }

  /** Nombre de sessions actives (debug / métriques). */
  getSessionCount(): number {
    return this.registry.size;
  }

  onModuleDestroy(): void {
    this.registry.forEach((entry, sessionId) => {
      if (typeof entry.actor.stop === 'function') {
        entry.actor.stop();
      }
    });
    this.registry.clear();
    this.logger.log('CodingStrategistService: Registry cleared');
  }
}
