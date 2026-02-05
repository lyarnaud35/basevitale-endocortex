import { Logger } from '@nestjs/common';
import {
  ScribeState,
  ScribeContext,
  ScribeEvent,
  StartRecordEvent,
  StopRecordEvent,
  UpdateTextEvent,
  ConfirmEvent,
  ScribeMachineState,
} from './scribe-machine.schema';
import { ConsultationSchema, type Consultation } from '@basevitale/shared';

/**
 * GHOST PROTOCOL v999 - ScribeMachine
 * 
 * State Machine pour le flux Scribe.
 * Le Backend est le Cerveau, le Frontend est le Terminal.
 * 
 * Transitions strictes :
 * IDLE -> RECORDING (START_RECORD)
 * RECORDING -> PROCESSING_NLP (STOP_RECORD)
 * PROCESSING_NLP -> REVIEW (auto après analyse)
 * REVIEW -> SAVED (CONFIRM)
 * 
 * Si un événement arrive dans le mauvais état, il est ignoré.
 */
export class ScribeMachine {
  private readonly logger = new Logger(ScribeMachine.name);
  private state: ScribeState = 'IDLE';
  private context: ScribeContext;
  private updatedAt: Date = new Date();

  constructor(initialContext: Partial<ScribeContext> = {}) {
    this.context = {
      patientId: initialContext.patientId || '',
      transcript: initialContext.transcript || '',
      consultation: initialContext.consultation || null,
      draftId: initialContext.draftId || null,
      error: initialContext.error || null,
      metadata: initialContext.metadata,
    };
  }

  /**
   * Envoie un événement à la machine.
   * Retourne le nouvel état si la transition est valide, sinon retourne l'état actuel.
   */
  send(event: ScribeEvent): ScribeMachineState {
    this.logger.debug(`[${this.state}] Received event: ${event.type}`);

    switch (this.state) {
      case 'IDLE':
        return this.handleIdle(event);
      case 'RECORDING':
        return this.handleRecording(event);
      case 'PROCESSING_NLP':
        return this.handleProcessingNlp(event);
      case 'REVIEW':
        return this.handleReview(event);
      case 'SAVED':
        return this.handleSaved(event);
      default:
        this.logger.warn(`Unknown state: ${this.state}`);
        return this.getState();
    }
  }

  /**
   * IDLE : Attente de démarrage
   * Accepte : START_RECORD
   */
  private handleIdle(event: ScribeEvent): ScribeMachineState {
    if (event.type === 'START_RECORD') {
      const { patientId } = (event as StartRecordEvent).payload;
      this.state = 'RECORDING';
      this.context.patientId = patientId;
      this.context.transcript = '';
      this.context.error = null;
      this.updatedAt = new Date();
      this.logger.log(`[IDLE -> RECORDING] Started recording for patient ${patientId}`);
      return this.getState();
    }
    this.logger.warn(`[IDLE] Event ${event.type} ignored (only START_RECORD allowed)`);
    return this.getState();
  }

  /**
   * RECORDING : Enregistrement en cours
   * Accepte : STOP_RECORD, UPDATE_TEXT
   */
  private handleRecording(event: ScribeEvent): ScribeMachineState {
    if (event.type === 'STOP_RECORD') {
      const { transcript } = (event as StopRecordEvent).payload;
      if (!transcript || transcript.trim().length === 0) {
        this.context.error = 'Le transcript ne peut pas être vide';
        this.logger.warn('[RECORDING] STOP_RECORD with empty transcript');
        return this.getState();
      }
      this.state = 'PROCESSING_NLP';
      this.context.transcript = transcript.trim();
      this.context.error = null;
      this.updatedAt = new Date();
      this.logger.log(`[RECORDING -> PROCESSING_NLP] Transcript: ${transcript.substring(0, 50)}...`);
      return this.getState();
    }
    if (event.type === 'UPDATE_TEXT') {
      const { text } = (event as UpdateTextEvent).payload;
      this.context.transcript = text;
      this.updatedAt = new Date();
      this.logger.debug(`[RECORDING] Updated transcript (length: ${text.length})`);
      return this.getState();
    }
    this.logger.warn(`[RECORDING] Event ${event.type} ignored (only STOP_RECORD, UPDATE_TEXT allowed)`);
    return this.getState();
  }

  /**
   * PROCESSING_NLP : Analyse en cours (backend fait le travail)
   * Accepte : aucun événement utilisateur (transition automatique vers REVIEW après analyse)
   * 
   * Cette méthode est appelée par le backend après l'analyse NLP.
   */
  transitionToReview(consultation: Consultation, draftId: string): ScribeMachineState {
    if (this.state !== 'PROCESSING_NLP') {
      this.logger.warn(`[transitionToReview] Invalid state: ${this.state} (expected PROCESSING_NLP)`);
      return this.getState();
    }
    this.state = 'REVIEW';
    this.context.consultation = consultation;
    this.context.draftId = draftId;
    this.context.error = null;
    this.updatedAt = new Date();
    this.logger.log(`[PROCESSING_NLP -> REVIEW] Draft ${draftId} ready for review`);
    return this.getState();
  }

  /**
   * PROCESSING_NLP : Gestion des événements (normalement aucun ne devrait arriver)
   */
  private handleProcessingNlp(event: ScribeEvent): ScribeMachineState {
    this.logger.warn(`[PROCESSING_NLP] Event ${event.type} ignored (processing in progress)`);
    return this.getState();
  }

  /**
   * REVIEW : Consultation prête pour validation
   * Accepte : CONFIRM, UPDATE_TEXT (corrections manuelles)
   */
  private handleReview(event: ScribeEvent): ScribeMachineState {
    if (event.type === 'CONFIRM') {
      const payload = (event as ConfirmEvent).payload;
      // Si des corrections sont fournies, elles seront appliquées par le service
      this.state = 'SAVED';
      this.context.error = null;
      this.updatedAt = new Date();
      this.logger.log(`[REVIEW -> SAVED] Draft ${this.context.draftId} confirmed`);
      return this.getState();
    }
    if (event.type === 'UPDATE_TEXT') {
      // Permet de corriger le transcript avant confirmation
      const { text } = (event as UpdateTextEvent).payload;
      this.context.transcript = text;
      this.updatedAt = new Date();
      this.logger.debug(`[REVIEW] Updated transcript (length: ${text.length})`);
      return this.getState();
    }
    this.logger.warn(`[REVIEW] Event ${event.type} ignored (only CONFIRM, UPDATE_TEXT allowed)`);
    return this.getState();
  }

  /**
   * SAVED : Consultation validée et sauvegardée
   * Accepte : aucun événement (état final)
   */
  private handleSaved(event: ScribeEvent): ScribeMachineState {
    this.logger.warn(`[SAVED] Event ${event.type} ignored (final state)`);
    return this.getState();
  }

  /**
   * Retourne l'état actuel de la machine
   */
  getState(): ScribeMachineState {
    return {
      value: this.state,
      context: { ...this.context },
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Retourne l'état brut (pour debug)
   */
  getRawState(): ScribeState {
    return this.state;
  }

  /**
   * Retourne le contexte brut (pour accès direct)
   */
  getContext(): ScribeContext {
    return { ...this.context };
  }

  /**
   * Réinitialise la machine à IDLE (pour nouveau cycle)
   */
  reset(): void {
    this.state = 'IDLE';
    this.context = {
      patientId: this.context.patientId, // Garder le patientId
      transcript: '',
      consultation: null,
      draftId: null,
      error: null,
      metadata: undefined,
    };
    this.updatedAt = new Date();
    this.logger.log('[RESET] Machine reset to IDLE');
  }

  /**
   * Définit une erreur dans le contexte (sans changer d'état)
   */
  setError(error: string): void {
    this.context.error = error;
    this.updatedAt = new Date();
    this.logger.warn(`[ERROR] ${error}`);
  }
}
