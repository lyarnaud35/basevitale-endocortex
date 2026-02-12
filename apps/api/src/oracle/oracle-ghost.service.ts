import { Injectable, Logger, NotFoundException, Optional, Inject, forwardRef } from '@nestjs/common';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map, share } from 'rxjs/operators';
import { PatientContextMachine } from './patient-context.machine';
import type { PatientContextMachineState } from './patient-context-machine.schema';
import { PatientContextMachineService } from './patient-context-machine.service';
import { SecurityGuardService } from '../security/security-guard.service';
import { CodingAssistantService } from '../coding/coding-assistant.service';

/**
 * GHOST PROTOCOL - OracleGhostService
 *
 * Gère les instances de PatientContextMachine par patientId et expose
 * un Observable d'état pour le streaming SSE.
 * Au start(), déclenche automatiquement l'écoute du SecurityGuard et du CodingAssistant (zéro config frontend).
 */
@Injectable()
export class OracleGhostService {
  private readonly logger = new Logger(OracleGhostService.name);
  private readonly machines = new Map<string, PatientContextMachine>();
  private readonly stateStreams = new Map<string, Subject<PatientContextMachineState>>();

  constructor(
    private readonly machineService: PatientContextMachineService,
    @Optional() @Inject(forwardRef(() => SecurityGuardService)) private readonly securityGuard: SecurityGuardService | null,
    @Optional() @Inject(forwardRef(() => CodingAssistantService)) private readonly codingAssistant: CodingAssistantService | null,
  ) {}

  /**
   * Crée ou récupère la machine pour un patient.
   */
  getOrCreateMachine(patientId: string): PatientContextMachine {
    if (!this.machines.has(patientId)) {
      this.logger.log(`Creating PatientContextMachine for patient ${patientId}`);
      const machine = this.machineService.create({ patientId: '' });
      const stateSubject = new BehaviorSubject<PatientContextMachineState>(
        machine.getState(),
      );
      this.stateStreams.set(patientId, stateSubject);
      this.machines.set(patientId, machine);
    }
    return this.machines.get(patientId)!;
  }

  /**
   * Initialise la machine (INITIALIZE + START_FETCH) et lance processState en arrière-plan.
   * Chaque transition est poussée dans le stream.
   */
  async start(patientId: string): Promise<{ success: true; patientId: string }> {
    const machine = this.getOrCreateMachine(patientId);
    const subject = this.stateStreams.get(patientId)!;

    const push = (state: PatientContextMachineState) => {
      subject.next(state);
      this.logger.debug(`[${patientId}] State pushed: ${state.value}`);
    };

    this.machineService.send(machine, { type: 'INITIALIZE', payload: { patientId } });
    push(machine.getState());

    this.machineService.send(machine, { type: 'START_FETCH' });
    push(machine.getState());

    this.machineService
      .processState(machine, patientId, push)
      .catch((err) => this.logger.error(`[${patientId}] processState failed`, err));

    if (this.securityGuard) {
      this.securityGuard.startWatching(patientId);
      this.logger.debug(`[${patientId}] SecurityGuard watch started automatically`);
    }
    if (this.codingAssistant) {
      this.codingAssistant.startWatching(patientId);
      this.logger.debug(`[${patientId}] CodingAssistant watch started automatically`);
    }

    return { success: true, patientId };
  }

  /**
   * Observable des états de la machine pour ce patient (SSE).
   */
  getStream(patientId: string): Observable<PatientContextMachineState> {
    this.getOrCreateMachine(patientId);
    const subject = this.stateStreams.get(patientId);
    if (!subject) {
      throw new NotFoundException(`State stream for patient ${patientId} not found`);
    }
    return subject.asObservable().pipe(
      map((s) => ({ ...s, updatedAt: new Date().toISOString() })),
      share(),
    );
  }

  /**
   * État actuel de la machine pour ce patient.
   */
  getState(patientId: string): PatientContextMachineState {
    const machine = this.machines.get(patientId);
    if (!machine) {
      throw new NotFoundException(`Machine for patient ${patientId} not found`);
    }
    return machine.getState();
  }

  /**
   * État actuel ou null si aucune machine pour ce patient (pour dashboard agrégé).
   */
  getStateOrNull(patientId: string): PatientContextMachineState | null {
    const machine = this.machines.get(patientId);
    return machine ? machine.getState() : null;
  }
}
