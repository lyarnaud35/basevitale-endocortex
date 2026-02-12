import { Injectable, Logger } from '@nestjs/common';
import { PatientContextMachine } from './patient-context.machine';
import type {
  PatientContextMachineContext,
  PatientContextEvent,
  PatientContextMachineState,
  PatientContextData,
} from './patient-context-machine.schema';
import { ConfigService } from '../common/services/config.service';
import { MockOracleStrategy } from './strategies/mock-oracle.strategy';
import { LiveOracleStrategy } from './strategies/live-oracle.strategy';

/**
 * Service NestJS pour la PatientContextMachine.
 * Pattern Strategy : MOCK (données fictives) | LIVE (Gemini).
 * Si LIVE et appel API en échec → fallback MOCK + log "⚠️ ORACLE RUNNING IN MOCK MODE".
 * Résilience : toute exception inattendue → FETCH_FAILED → ERROR (flux SSE jamais bloqué).
 */
@Injectable()
export class PatientContextMachineService {
  private readonly logger = new Logger(PatientContextMachineService.name);
  private readonly mockStrategy = new MockOracleStrategy();

  constructor(
    private readonly liveStrategy: LiveOracleStrategy,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Crée une nouvelle instance de la machine (état IDLE).
   */
  create(initialContext?: Partial<PatientContextMachineContext>): PatientContextMachine {
    return new PatientContextMachine(initialContext);
  }

  /**
   * Envoie un événement à une instance de machine et retourne le nouvel état.
   */
  send(
    machine: PatientContextMachine,
    event: PatientContextEvent,
  ): PatientContextMachineState {
    return machine.send(event);
  }

  /**
   * Réagit à l'état FETCHING_CONTEXT : transition ANALYZING puis Strategy MOCK ou LIVE.
   * ORACLE_MODE=MOCK ou erreur API (LIVE) → fallback MOCK + log "⚠️ ORACLE RUNNING IN MOCK MODE".
   * Tout throw inattendu → FETCH_FAILED + ERROR pour ne jamais laisser le flux SSE bloqué.
   */
  async processState(
    machine: PatientContextMachine,
    patientId: string,
    onState?: (state: PatientContextMachineState) => void,
  ): Promise<void> {
    if (machine.value !== 'FETCHING_CONTEXT') {
      this.logger.debug(`processState skipped: machine not in FETCHING_CONTEXT (${machine.value})`);
      return;
    }

    const push = () => onState?.(machine.getState());

    try {
      this.send(machine, { type: 'START_ANALYZING' });
      push();

      let data: PatientContextData;
      const useMockByConfig = this.configService.oracleMode === 'MOCK';

      if (useMockByConfig) {
        this.logger.warn('⚠️ ORACLE RUNNING IN MOCK MODE');
        data = await this.mockStrategy.fetchContext(patientId);
      } else {
        try {
          data = await this.liveStrategy.fetchContext(patientId);
        } catch (err) {
          this.logger.warn('⚠️ ORACLE RUNNING IN MOCK MODE');
          this.logger.debug(`Live strategy failed: ${err instanceof Error ? err.message : err}`);
          data = await this.mockStrategy.fetchContext(patientId);
        }
      }

      machine.send({ type: 'CONTEXT_LOADED', payload: data });
      this.logger.log(
        `[${patientId}] CONTEXT_LOADED (timeline=${data.timeline.length}, alertes=${data.alertes.length})`,
      );
      push();
    } catch (unexpected) {
      const message = unexpected instanceof Error ? unexpected.message : String(unexpected);
      this.logger.error(`[${patientId}] processState unexpected error, sending FETCH_FAILED`, unexpected);
      machine.send({ type: 'FETCH_FAILED', payload: { message: `Erreur inattendue: ${message}` } });
      push();
    }
  }
}
