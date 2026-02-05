import { Injectable, Logger } from '@nestjs/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, share, filter, take, timeout } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { SecurityGhostMachine } from './security-ghost-machine';
import type {
  SecurityContext,
  SecurityEvent,
  SecurityMachineState,
} from '@basevitale/shared';

const DEFAULT_SESSION = 'default';

function toSerializableState(state: {
  value: string;
  context: SecurityContext;
  updatedAt: string;
}): SecurityMachineState {
  const context = JSON.parse(JSON.stringify(state.context ?? {})) as SecurityContext;
  return {
    value: state.value as SecurityMachineState['value'],
    context,
    updatedAt: state.updatedAt ?? new Date().toISOString(),
  };
}

@Injectable()
export class SecurityGhostService {
  private readonly logger = new Logger(SecurityGhostService.name);
  private machine: SecurityGhostMachine | null = null;
  private stateSubject: BehaviorSubject<SecurityMachineState> | null = null;

  getOrCreateMachine(): SecurityGhostMachine {
    if (!this.machine) {
      this.logger.log('Creating SecurityGhostMachine');
      this.machine = new SecurityGhostMachine(DEFAULT_SESSION, {
        currentDrug: null,
        riskLevel: 'NONE',
        blockReason: null,
        auditTrail: null,
      });
      this.stateSubject = new BehaviorSubject<SecurityMachineState>(
        toSerializableState(this.machine.getState())
      );
      this.machine.setStateChangeCallback((state) => {
        if (this.stateSubject) {
          this.stateSubject.next(toSerializableState(state));
        }
      });
    }
    return this.machine;
  }

  getStream(): Observable<SecurityMachineState> {
    this.getOrCreateMachine();
    if (!this.stateSubject) throw new Error('State stream not initialized');
    return this.stateSubject.asObservable().pipe(
      map((s) => ({ ...s, updatedAt: new Date().toISOString() })),
      share()
    );
  }

  async sendEvent(event: SecurityEvent): Promise<SecurityMachineState> {
    const m = this.getOrCreateMachine();
    this.logger.log(`Security event: ${event.type}`);
    const newState = m.send(event as SecurityEvent & { type: string });
    const serializable = toSerializableState(newState);
    if (this.stateSubject) this.stateSubject.next(serializable);
    return serializable;
  }

  /**
   * Envoie un événement et attend un état stable (hors ANALYZING).
   * Utilisé pour CHECK_DRUG afin de retourner SAFE ou LOCKED avec le contexte rempli.
   */
  async sendEventAndWaitStable(
    event: SecurityEvent,
    timeoutMs: number = 10_000
  ): Promise<SecurityMachineState> {
    const m = this.getOrCreateMachine();
    if (!this.stateSubject) throw new Error('Security stream not initialized');
    this.logger.log(`Security event (wait stable): ${event.type}`);
    const newState = m.send(event as SecurityEvent & { type: string });
    const serializable = toSerializableState(newState);
    this.stateSubject.next(serializable);
    const stable = await firstValueFrom(
      this.stateSubject.pipe(
        filter((s) => s.value !== 'ANALYZING'),
        take(1),
        timeout(timeoutMs)
      )
    );
    return stable;
  }

  getState(): SecurityMachineState {
    const m = this.getOrCreateMachine();
    return toSerializableState(m.getState());
  }
}
