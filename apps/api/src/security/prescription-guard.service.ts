import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { SecurityGuardWsState, SecurityInputPayload, OverridePayload } from '@basevitale/shared';
import { PrescriptionGuardMachine } from './prescription-guard.machine';

export interface PrescriptionGuardSessionEntry {
  machine: PrescriptionGuardMachine;
  createdAt: Date;
  lastActivityAt: Date;
}

const SESSION_ID_MAX_LENGTH = 128;
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

const EMPTY_STATE: SecurityGuardWsState = {
  value: 'IDLE',
  context: { drugId: null, blockReason: null, patientContext: null },
  canSubmit: false,
};

/**
 * Service Gardien – Registry par sessionId (même pattern que CodingStrategistService).
 * Une machine par session ; nettoyage via destroySession (handleDisconnect).
 */
@Injectable()
export class PrescriptionGuardService implements OnModuleDestroy {
  private readonly logger = new Logger(PrescriptionGuardService.name);
  private readonly registry = new Map<string, PrescriptionGuardSessionEntry>();

  private validateSessionId(sessionId: string): boolean {
    return (
      typeof sessionId === 'string' &&
      sessionId.length > 0 &&
      sessionId.length <= SESSION_ID_MAX_LENGTH &&
      SESSION_ID_REGEX.test(sessionId)
    );
  }

  getOrCreateMachine(sessionId: string): PrescriptionGuardMachine | null {
    if (!this.validateSessionId(sessionId)) {
      this.logger.warn('Invalid sessionId (rejected)');
      return null;
    }
    let entry = this.registry.get(sessionId);
    if (!entry) {
      const machine = new PrescriptionGuardMachine();
      const now = new Date();
      entry = { machine, createdAt: now, lastActivityAt: now };
      this.registry.set(sessionId, entry);
      this.logger.log(`[${sessionId}] Session created`);
    } else {
      entry.lastActivityAt = new Date();
    }
    return entry.machine;
  }

  checkPrescription(sessionId: string, payload: SecurityInputPayload): SecurityGuardWsState {
    const machine = this.getOrCreateMachine(sessionId);
    if (!machine) return EMPTY_STATE;
    return machine.checkPrescription(payload.drugId, payload.patientContext);
  }

  requestOverride(sessionId: string, payload: OverridePayload): SecurityGuardWsState {
    const machine = this.getOrCreateMachine(sessionId);
    if (!machine) return EMPTY_STATE;
    return machine.requestOverride(payload.reason);
  }

  getSnapshot(sessionId: string): SecurityGuardWsState {
    if (!this.validateSessionId(sessionId)) return EMPTY_STATE;
    const entry = this.registry.get(sessionId);
    if (!entry) return EMPTY_STATE;
    return entry.machine.getSnapshot();
  }

  destroySession(sessionId: string): void {
    if (!this.validateSessionId(sessionId)) return;
    if (this.registry.has(sessionId)) {
      this.registry.delete(sessionId);
      this.logger.log(`[${sessionId}] Session destroyed`);
    }
  }

  getSessionCount(): number {
    return this.registry.size;
  }

  onModuleDestroy(): void {
    this.registry.clear();
    this.logger.log('PrescriptionGuardService: Registry cleared');
  }
}
