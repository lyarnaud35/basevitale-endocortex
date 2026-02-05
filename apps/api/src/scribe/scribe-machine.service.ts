import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ScribeMachine } from './scribe-machine';
import { ScribeEvent, ScribeMachineState, ScribeContext } from './scribe-machine.schema';
import { ScribeService } from './scribe.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultationSchema, type Consultation } from '@basevitale/shared';

/**
 * GHOST PROTOCOL v999 - ScribeMachineService
 * 
 * Gère les instances de ScribeMachine par session.
 * Chaque session (identifiée par sessionId) a sa propre machine.
 * 
 * Responsabilités :
 * - Créer/détruire des machines
 * - Router les événements vers la bonne machine
 * - Gérer les transitions automatiques (PROCESSING_NLP -> REVIEW)
 * - Persister l'état si nécessaire
 */
@Injectable()
export class ScribeMachineService {
  private readonly logger = new Logger(ScribeMachineService.name);
  private readonly machines = new Map<string, ScribeMachine>();

  constructor(
    private readonly scribeService: ScribeService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Crée ou récupère une machine pour une session
   */
  getOrCreateMachine(sessionId: string, initialContext?: Partial<ScribeContext>): ScribeMachine {
    if (!this.machines.has(sessionId)) {
      this.logger.log(`Creating new ScribeMachine for session ${sessionId}`);
      this.machines.set(sessionId, new ScribeMachine(initialContext));
    }
    return this.machines.get(sessionId)!;
  }

  /**
   * Récupère une machine existante (lance NotFoundException si absente)
   */
  getMachine(sessionId: string): ScribeMachine {
    const machine = this.machines.get(sessionId);
    if (!machine) {
      throw new NotFoundException(`ScribeMachine for session ${sessionId} not found`);
    }
    return machine;
  }

  /**
   * Envoie un événement à une machine et retourne le nouvel état
   */
  async sendEvent(sessionId: string, event: ScribeEvent): Promise<ScribeMachineState> {
    const machine = this.getOrCreateMachine(sessionId);
    const currentState = machine.getRawState();
    
    // Envoyer l'événement à la machine
    const newState = machine.send(event);

    // Si on vient de passer en PROCESSING_NLP (STOP_RECORD), déclencher l'analyse NLP
    if (currentState !== 'PROCESSING_NLP' && newState.value === 'PROCESSING_NLP') {
      this.logger.log(`[${sessionId}] Triggering NLP analysis...`);
      await this.processNlpAnalysis(sessionId, machine);
    }

    // Si on vient de passer en REVIEW (CONFIRM), valider le draft
    if (currentState === 'REVIEW' && newState.value === 'SAVED') {
      this.logger.log(`[${sessionId}] Triggering draft validation...`);
      await this.validateDraft(sessionId, machine, event);
    }

    return newState;
  }

  /**
   * Traite l'analyse NLP (transition automatique PROCESSING_NLP -> REVIEW)
   */
  private async processNlpAnalysis(sessionId: string, machine: ScribeMachine): Promise<void> {
    const context = machine.getContext();
    const transcript = context.transcript;

    if (!transcript || transcript.trim().length === 0) {
      machine.setError('Transcript vide, impossible d\'analyser');
      return;
    }

    try {
      // Appeler le service Scribe existant pour l'analyse
      const consultation = await this.scribeService.analyzeConsultation(
        transcript,
        context.patientId,
      );

      // Créer le draft dans Postgres
      const draft = await this.prisma.consultationDraft.create({
        data: {
          patientId: context.patientId,
          status: 'DRAFT',
          structuredData: consultation as any,
        },
      });

      // Transition automatique vers REVIEW
      machine.transitionToReview(consultation, draft.id);
      this.logger.log(`[${sessionId}] NLP analysis complete, draft ${draft.id} created`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      machine.setError(`Erreur lors de l'analyse NLP: ${errorMessage}`);
      this.logger.error(`[${sessionId}] NLP analysis failed`, error);
    }
  }

  /**
   * Valide le draft (transition REVIEW -> SAVED)
   */
  private async validateDraft(
    sessionId: string,
    machine: ScribeMachine,
    event: ScribeEvent,
  ): Promise<void> {
    const context = machine.getContext();

    if (!context.draftId) {
      machine.setError('Aucun draftId disponible pour validation');
      return;
    }

    try {
      // Si des corrections sont fournies dans l'événement CONFIRM, les appliquer
      if (event.type === 'CONFIRM' && event.payload?.structuredData) {
        await this.scribeService.updateDraft(context.draftId, event.payload.structuredData);
        this.logger.log(`[${sessionId}] Draft ${context.draftId} updated with corrections`);
      }

      // Valider le draft (Postgres + Neo4j)
      await this.scribeService.validateDraft(context.draftId);
      this.logger.log(`[${sessionId}] Draft ${context.draftId} validated successfully`);
    } catch (error) {
      // En cas d'erreur (ex: interdiction Gardien), on reste en REVIEW
      const errorMessage = error instanceof Error ? error.message : String(error);
      machine.setError(errorMessage);
      // Revenir à REVIEW si on était en SAVED
      const currentState = machine.getRawState();
      if (currentState === 'SAVED') {
        // On ne peut pas revenir en arrière directement, mais l'erreur sera dans le contexte
        this.logger.warn(`[${sessionId}] Validation failed, keeping state REVIEW`);
      }
      throw error; // Propager l'erreur pour que le controller puisse répondre 400
    }
  }

  /**
   * Récupère l'état actuel d'une machine
   */
  getState(sessionId: string): ScribeMachineState {
    const machine = this.getMachine(sessionId);
    return machine.getState();
  }

  /**
   * Supprime une machine (nettoyage)
   */
  deleteMachine(sessionId: string): void {
    if (this.machines.has(sessionId)) {
      this.machines.delete(sessionId);
      this.logger.log(`Deleted ScribeMachine for session ${sessionId}`);
    }
  }

  /**
   * Réinitialise une machine à IDLE
   */
  resetMachine(sessionId: string): void {
    const machine = this.getMachine(sessionId);
    machine.reset();
    this.logger.log(`Reset ScribeMachine for session ${sessionId}`);
  }

  /**
   * Liste toutes les sessions actives (pour debug)
   */
  listActiveSessions(): string[] {
    return Array.from(this.machines.keys());
  }
}
