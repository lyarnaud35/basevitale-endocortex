import { Injectable, Logger } from '@nestjs/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, share, filter, take, timeout } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { createActor } from 'xstate';
import { createCodingMachine } from './coding.machine';
import { CodingService } from './coding.service';
import type {
  CodingContext,
  CodingEvent,
  CodingMachineState,
} from '@basevitale/shared';

function toSerializableState(state: {
  value: string;
  context: CodingContext;
  updatedAt?: string;
}): CodingMachineState {
  const context = JSON.parse(JSON.stringify(state.context ?? {})) as CodingContext;
  return {
    value: state.value as CodingMachineState['value'],
    context,
    updatedAt: state.updatedAt ?? new Date().toISOString(),
  };
}

@Injectable()
export class CodingGhostService {
  private readonly logger = new Logger(CodingGhostService.name);
  private actor: ReturnType<typeof createActor> | null = null;
  private stateSubject: BehaviorSubject<CodingMachineState> | null = null;

  constructor(private readonly codingService: CodingService) {}

  private getOrCreateActor() {
    if (!this.actor) {
      this.logger.log('Creating CodingMachine');
      const machine = createCodingMachine((text) =>
        this.codingService.analyze(text)
      );
      this.actor = createActor(machine);
      this.stateSubject = new BehaviorSubject<CodingMachineState>(
        toSerializableState({
          value: this.actor.getSnapshot().value as string,
          context: this.actor.getSnapshot().context as CodingContext,
          updatedAt: new Date().toISOString(),
        })
      );
      this.actor.subscribe((snapshot) => {
        if (this.stateSubject) {
          this.stateSubject.next(
            toSerializableState({
              value: snapshot.value as string,
              context: snapshot.context as CodingContext,
              updatedAt: new Date().toISOString(),
            })
          );
        }
      });
      this.actor.start();
    }
    return this.actor;
  }

  getStream(): Observable<CodingMachineState> {
    this.getOrCreateActor();
    if (!this.stateSubject) throw new Error('Coding stream not initialized');
    return this.stateSubject.asObservable().pipe(
      map((s) => ({ ...s, updatedAt: new Date().toISOString() })),
      share()
    );
  }

  async sendEvent(event: CodingEvent): Promise<CodingMachineState> {
    const actor = this.getOrCreateActor();
    this.logger.log(`Coding event: ${event.type}`);
    actor.send(event as CodingEvent & { type: string });
    const snapshot = actor.getSnapshot();
    const serializable = toSerializableState({
      value: snapshot.value as string,
      context: snapshot.context as CodingContext,
      updatedAt: new Date().toISOString(),
    });
    if (this.stateSubject) this.stateSubject.next(serializable);
    return serializable;
  }

  /**
   * Envoie un événement et attend que la machine quitte l'état ANALYZING (pour POST /analyze).
   * Retourne l'état final (SUGGESTING ou SILENT) avec les suggestions remplies.
   */
  async sendEventAndWaitStable(
    event: CodingEvent,
    timeoutMs: number = 10_000
  ): Promise<CodingMachineState> {
    const actor = this.getOrCreateActor();
    if (!this.stateSubject) throw new Error('Coding stream not initialized');
    this.logger.log(`Coding event (wait stable): ${event.type}`);
    actor.send(event as CodingEvent & { type: string });
    const serializable = toSerializableState({
      value: actor.getSnapshot().value as string,
      context: actor.getSnapshot().context as CodingContext,
      updatedAt: new Date().toISOString(),
    });
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

  getState(): CodingMachineState {
    const actor = this.getOrCreateActor();
    const snapshot = actor.getSnapshot();
    return toSerializableState({
      value: snapshot.value as string,
      context: snapshot.context as CodingContext,
      updatedAt: new Date().toISOString(),
    });
  }
}
