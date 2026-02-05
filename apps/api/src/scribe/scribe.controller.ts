import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Param,
  Put,
  Patch,
  Query,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { ScribeService } from './scribe.service';
import {
  IntelligenceResponseDto,
  IntelligenceTimelineItemDto,
  IntelligenceAlertDto,
  BillingCodeDto,
  PrescriptionItemDto,
  ValidateFinalSuccessDto,
  GuardianBlockErrorDto,
} from './scribe.dto';
import { ScribeGraphProjectorService } from './graph-projector.service';
import { GraphReaderService } from './graph-reader.service';
import { PrismaService } from '../prisma/prisma.service';
import { ZodValidationPipe } from '../common';
import { AuthGuard } from '../common/guards/auth.guard';
import { ConsultationSchema, type Consultation } from '@basevitale/shared';
import { z, ZodError } from 'zod';
import { sanitizeString } from '../common/utils/sanitize.util';
import { ScribeHealthService } from './scribe.health.service';
import { MetricsService } from '../common/services/metrics.service';
import { Public } from '../common/decorators/public.decorator';
import { Timeout } from '../common/decorators/timeout.decorator';
import { ScribeMachineService } from './scribe-machine.service';
import {
  ScribeEventSchema,
  StartRecordEventSchema,
  StopRecordEventSchema,
  UpdateTextEventSchema,
  ConfirmEventSchema,
  type ScribeMachineState,
} from './scribe-machine.schema';

/**
 * ScribeController
 *
 * Endpoints pour le Module S (Scribe/Cortex Sémantique)
 *
 * Version BaseVitale V112+ - Toutes phases complétées
 *
 * INVARIANT: Toute donnée médicale doit passer par le moteur d'Abstraction
 */
@ApiTags('Scribe')
@Controller('scribe')
@UseGuards(AuthGuard)
export class ScribeController {
  private readonly logger = new Logger(ScribeController.name);

  // Schémas de validation pour les requêtes
  private readonly extractGraphSchema = z.object({
    text: z.string().min(1, 'Le texte est requis'),
    patientId: z.string().cuid().optional(),
  });

  private readonly transcribeAndExtractSchema = z.object({
    text: z.string().min(1, 'Le texte est requis'),
    patientId: z.string().cuid('Patient ID invalide'),
    consultationDate: z.coerce.date().optional(),
  });

  constructor(
    private readonly scribeService: ScribeService,
    private readonly scribeGraphProjector: ScribeGraphProjectorService,
    private readonly graphReader: GraphReaderService,
    private readonly prisma: PrismaService,
    private readonly scribeHealthService: ScribeHealthService,
    private readonly metricsService: MetricsService,
    private readonly scribeMachineService: ScribeMachineService,
  ) {}

  /**
   * PHASE "TRACER BULLET" : Endpoint POST /scribe/analyze
   *
   * Analyse un texte de consultation.
   * En mode MOCK : Génère une réponse statique factice et la sauvegarde dans ConsultationDraft.
   *
   * @param body - Contient le texte à analyser
   * @returns Consultation structurée selon ConsultationSchema
   */
  @ApiOperation({ summary: 'Analyser un texte de consultation' })
  @ApiResponse({ status: 200, description: 'Consultation structurée (symptoms, diagnosis, medications)' })
  @ApiResponse({ status: 400, description: 'Texte vide ou invalide' })
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @Timeout(360000) // 6 min : GPU lock + Ollama/Llama (1er appel lent)
  async analyze(
    @Body(new ZodValidationPipe(z.object({
      text: z.string().min(1, 'Le texte est requis').max(50000, 'Le texte ne peut pas dépasser 50000 caractères'),
      patientId: z.string().min(1).max(100).optional(),
      externalPatientId: z.string().min(1).max(100).optional(),
    })))
    body: {
      text: string;
      patientId?: string;
      externalPatientId?: string;
    },
  ) {
    try {
      const sanitizedText = sanitizeString(body.text);
      const effectiveId = body.externalPatientId?.trim() || body.patientId?.trim();

      if (sanitizedText.length === 0) {
        throw new BadRequestException('Le texte est vide après nettoyage');
      }
      if (sanitizedText.length > 50000) {
        throw new BadRequestException('Le texte est trop long (max 50000 caractères)');
      }

      this.logger.log(
        `[Tracer Bullet] POST /scribe/analyze - Analyzing text (length: ${sanitizedText.length}, patientId: ${effectiveId || 'none'})`,
      );

      const consultation = await this.scribeService.analyze(sanitizedText);

      this.logger.log(
        `[Tracer Bullet] Analysis completed: ${consultation.symptoms.length} symptoms, ${consultation.diagnosis.length} diagnoses, ${consultation.medications.length} medications`,
      );

      // Retourner la consultation avec le draftId si disponible
      const response: any = { ...consultation };
      if ('draftId' in consultation && consultation.draftId) {
        response.draftId = consultation.draftId;
      }
      return response;
    } catch (error) {
      this.logger.error('[Tracer Bullet] Error in analyze endpoint', error);
      
      // Réutiliser l'erreur si c'est déjà une HttpException
      if (error instanceof BadRequestException || error instanceof Error) {
        throw error;
      }
      
      throw new BadRequestException('Erreur lors de l\'analyse de la consultation');
    }
  }

  /**
   * POST /scribe/analyze-consultation
   * 
   * Analyse une consultation et retourne les données structurées
   * Law II: Hybrid Toggle - Respecte AI_MODE
   */
  @Post('analyze-consultation')
  @HttpCode(HttpStatus.OK)
  @Timeout(360000) // 6 min — appel Python (ai-cortex) jusqu'à 300s
  async analyzeConsultation(
    @Body(new ZodValidationPipe(z.object({
      text: z.string().min(1, 'Le texte est requis'),
      patientId: z.string().min(1).optional(),
      externalPatientId: z.string().min(1).optional(),
    })))
    body: {
      text: string;
      patientId?: string;
      externalPatientId?: string;
    },
  ) {
    const effectiveId = body.externalPatientId?.trim() || body.patientId?.trim();
    this.logger.log(
      `Analyzing consultation (text length: ${body.text.length}, patientId: ${effectiveId || 'none'})`,
    );

    const consultation = await this.scribeService.analyzeConsultation(body.text, effectiveId || undefined);

    return consultation;
  }

  /**
   * PHASE B : Process dictation - Front → NestJS → Postgres
   * POST /scribe/process-dictation
   *
   * Reçoit un texte brut de dictée, l'analyse (MOCK/CLOUD/LOCAL),
   * et sauvegarde le Draft dans ConsultationDraft (Postgres JSONB).
   * Consultation inclut symptoms, diagnosis, medications, billingCodes (CCAM/NGAP), prescription (ordonnance).
   *
   * Law II: Hybrid Toggle - Respecte AI_MODE
   */
  @ApiOperation({
    summary: 'Analyser une dictée et créer un brouillon',
    description:
      'Analyse (MOCK/CLOUD/LOCAL), crée un ConsultationDraft. Réponse: success, draft, consultation (symptoms, diagnosis, medications, billingCodes, prescription).',
  })
  @ApiExtraModels(BillingCodeDto, PrescriptionItemDto)
  @ApiResponse({ status: 201, description: 'Draft créé ; consultation structurée (billingCodes, prescription inclus).' })
  @ApiResponse({ status: 400, description: 'Texte ou patientId invalide' })
  @Post('process-dictation')
  @HttpCode(HttpStatus.CREATED)
  @Timeout(360000) // 6 min : attente GPU lock + appel ai-cortex/Ollama (1er inference lent)
  async processDictation(
    @Body(new ZodValidationPipe(z.object({
      text: z.string().min(1, 'Le texte est requis').max(50000, 'Le texte ne peut pas dépasser 50000 caractères'),
      patientId: z.string().min(1, 'Le patientId est requis').max(100),
    })))
    body: {
      text: string;
      patientId: string;
    },
  ) {
    // Sanitization des inputs
    const sanitizedText = sanitizeString(body.text);
    const sanitizedPatientId = sanitizeString(body.patientId);
    
    // Validation de la longueur après sanitization
    if (sanitizedText.length === 0) {
      throw new BadRequestException('Le texte est vide après nettoyage');
    }
    
    if (sanitizedPatientId.length === 0) {
      throw new BadRequestException('Le patientId est vide après nettoyage');
    }
    
    const { text, patientId } = { text: sanitizedText, patientId: sanitizedPatientId };

    this.logger.log(
      `Processing dictation for patient ${patientId} (text length: ${text.length})`,
    );

    try {
      // 1. Analyser la consultation avec l'IA (MOCK/CLOUD/LOCAL)
      const consultation = await this.scribeService.analyzeConsultation(
        text,
        patientId,
      );

      this.logger.debug(
        `Analyzed consultation: ${consultation.symptoms.length} symptoms, ${consultation.diagnosis.length} diagnoses, ` +
          `${consultation.medications.length} medications, ${consultation.billingCodes?.length ?? 0} billingCodes, ` +
          `${consultation.prescription?.length ?? 0} prescription`,
      );

      // 2. Sauvegarder le Draft dans ConsultationDraft (Postgres JSONB)
      const draft = await this.prisma.consultationDraft.create({
        data: {
          patientId,
          status: 'DRAFT',
          structuredData: consultation as any, // JSONB conforme à ConsultationSchema
        },
      });

      this.logger.log(`Created consultation draft ${draft.id}`);

      return {
        success: true,
        draft: {
          id: draft.id,
          patientId: draft.patientId,
          status: draft.status,
          createdAt: draft.createdAt,
        },
        consultation,
      };
    } catch (error) {
      this.logger.error('Error processing dictation', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * GET /scribe/drafts
   *
   * Liste les brouillons avec pagination. Filtre optionnel par patientId.
   */
  @ApiOperation({ summary: 'Lister les brouillons (pagination, filtre patientId)' })
  @ApiResponse({ status: 200, description: 'items, total, limit, offset' })
  @Get('drafts')
  @HttpCode(HttpStatus.OK)
  async listDrafts(
    @Query('patientId') patientId?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const limit = Math.min(Math.max(parseInt(limitStr ?? '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(offsetStr ?? '0', 10) || 0, 0);

    const where = patientId && patientId.trim() ? { patientId: patientId.trim() } : {};
    const [items, total] = await Promise.all([
      this.prisma.consultationDraft.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          patientId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.consultationDraft.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  /**
   * PHASE D : Récupérer un draft existant
   * GET /scribe/draft/:id
   * 
   * Permet de charger un draft existant pour modification
   */
  @Get('draft/:id')
  @HttpCode(HttpStatus.OK)
  async getDraft(@Param('id') id: string) {
    this.logger.log(`Getting consultation draft ${id}`);

    try {
      const draft = await this.prisma.consultationDraft.findUnique({
        where: { id },
      });

      if (!draft) {
        throw new NotFoundException(`Consultation draft ${id} not found`);
      }

      return {
        success: true,
        draft: {
          id: draft.id,
          patientId: draft.patientId,
          status: draft.status,
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        },
        consultation: draft.structuredData,
      };
    } catch (error) {
      this.logger.error('Error getting draft', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * PHASE D : Mettre à jour un draft avec corrections manuelles
   * PATCH /scribe/draft/:id
   * PUT /scribe/draft/:id
   *
   * Body : { structuredData: Partial<Consultation> }. Merge avec l'existant, validation Zod, persistence.
   */
  @Patch('draft/:id')
  @Put('draft/:id')
  @HttpCode(HttpStatus.OK)
  async updateDraft(
    @Param('id') id: string,
    @Body(
      new ZodValidationPipe(
        z.object({ structuredData: z.record(z.unknown()).optional().default({}) }),
      ),
    )
    body: { structuredData?: Partial<Consultation> },
  ) {
    this.logger.log(`Updating consultation draft ${id} with manual corrections`);
    return this.scribeService.updateDraft(id, body.structuredData ?? {});
  }

  /**
   * PHASE B : Validate draft - Postgres → Neo4j
   * POST /scribe/draft/:id/validate
   * PUT /scribe/validate/:id
   * 
   * Valide un ConsultationDraft et crée les nœuds sémantiques dans Neo4j
   * Crée (:Patient)-[:HAS_SYMPTOM]->(:Symptom), etc.
   * 
   * Law IV: Data Safety - Write Postgres, Sync Neo4j on Validation
   * - Écriture PostgreSQL via transaction atomique
   * - Synchronisation Neo4j (continue même si échec partiel)
   * - Validation du schéma Zod avant traitement
   * 
   * IMPORTANT: La route POST doit être déclarée avant PUT pour éviter
   * les conflits de routage avec les routes dynamiques.
   */
  @Post('draft/:id/validate')
  @Put('validate/:id')
  @HttpCode(HttpStatus.OK)
  async validateDraft(@Param('id') id: string) {
    try {
      const res = await this.scribeService.validateDraft(id);
      return { ...res, nodes: [] };
    } catch (err) {
      this.logger.error(
        `[validateDraft] Error validating draft ${id}`,
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  }

  /**
   * Validation finale – POST /scribe/validate/:draftId
   *
   * Délègue à validateDraft : C+ Gardien (allergies vs ordonnance) puis Postgres + Neo4j.
   * En cas de conflit allergie (400), le frontend affiche l’alerte et ne ferme pas le widget.
   */
  @ApiOperation({
    summary: 'Valider un draft (Firewall médical)',
    description:
      'Vérifie les allergies du patient (Neo4j), puis écrit en Postgres + Neo4j. ' +
      'Si le Gardien Causal détecte une ordonnance contre-indiquée → 400 (pas un bug, feature vitale).',
  })
  @ApiResponse({
    status: 201,
    description: 'Succès : Données écrites dans Neo4j et Postgres.',
    type: ValidateFinalSuccessDto,
  })
  @ApiResponse({
    status: 400,
    description:
      "SÉCURITÉ : Interdiction critique (Allergie/Interaction). Le widget gère l'affichage, mais l'API bloque l'écriture.",
    type: GuardianBlockErrorDto,
  })
  @ApiResponse({ status: 404, description: 'Draft introuvable.' })
  @ApiResponse({ status: 500, description: 'Erreur interne (ex. Neo4j indisponible, projection échouée).' })
  @ApiExtraModels(ValidateFinalSuccessDto, GuardianBlockErrorDto)
  @Post('validate/:draftId')
  @HttpCode(HttpStatus.CREATED)
  async validateFinal(
    @Param('draftId') draftId: string,
  ): Promise<{ success: true; graphNodesCreated: number }> {
    try {
      const res = await this.scribeService.validateDraft(draftId);
      const graphNodesCreated = res.neo4jRelationsCreated ?? 0;
      this.logger.log(`[validateFinal] Draft ${draftId} validé, ${graphNodesCreated} opérations graphe`);
      return { success: true, graphNodesCreated };
    } catch (err) {
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      this.logger.error(
        `[validateFinal] Error validating draft ${draftId}`,
        err instanceof Error ? err.message : String(err),
      );
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Validation finale échouée',
      );
    }
  }

  /**
   * GET /scribe/patient/:patientId/profile
   *
   * Total Recall – Profil médical du patient (consultations, conditions, médicaments, symptômes récurrents).
   * Lit le graphe Neo4j. Pour l’affichage dans l’app hôte (ex. Ben).
   */
  @ApiOperation({ summary: 'Profil médical patient (Total Recall)' })
  @ApiResponse({ status: 200, description: 'consultations, conditions, medications, symptomsRecurrent' })
  @ApiResponse({ status: 404, description: 'Patient introuvable' })
  @Get('patient/:patientId/profile')
  @HttpCode(HttpStatus.OK)
  async getPatientProfile(@Param('patientId') patientId: string) {
    const profile = await this.graphReader.getPatientMedicalProfile(patientId);
    return profile;
  }

  /**
   * GET /scribe/patient/:patientId/intelligence
   * Agrège profil + alertes Guardian. JSON Human-Ready pour l'app hôte (Ben).
   */
  @ApiExtraModels(IntelligenceTimelineItemDto, IntelligenceAlertDto)
  @ApiOperation({ summary: 'Get Human-Ready Intelligence for Host App' })
  @ApiResponse({ status: 200, description: 'summary, timeline, activeAlerts, quickActions', type: IntelligenceResponseDto })
  @ApiResponse({ status: 404, description: 'Patient introuvable' })
  @Get('patient/:patientId/intelligence')
  @HttpCode(HttpStatus.OK)
  async getPatientIntelligence(@Param('patientId') patientId: string) {
    return this.scribeService.getPatientIntelligence(patientId);
  }

  /**
   * GET /scribe/health
   *
   * Health check du Module Scribe avec métriques détaillées
   * Endpoint public pour monitoring
   */
  @ApiOperation({ summary: 'Health check Scribe (public)' })
  @ApiResponse({ status: 200, description: 'aiCortex, neo4j, postgres, timestamp' })
  @Get('health')
  @Public()
  @HttpCode(HttpStatus.OK)
  async getHealth() {
    try {
      const health = await this.scribeHealthService.checkHealth();
      return {
        ...health,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error checking Scribe health', error instanceof Error ? error : String(error));
      throw new ServiceUnavailableException('Error checking health');
    }
  }

  /**
   * GET /scribe/stats
   * 
   * Statistiques détaillées du Module Scribe
   * Comprend: drafts, nœuds, queue, métriques
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats() {
    try {
      const stats = await this.scribeHealthService.getStats();
      const metrics = this.metricsService.getMetrics();

      const counters = metrics.counters ?? {};
      const timings = metrics.timings ?? {};
      const scribeMetrics = {
        counters: Object.fromEntries(
          Object.entries(counters).filter(([key]) => key.startsWith('scribe.')),
        ),
        timings: Object.fromEntries(
          Object.entries(timings).filter(([key]) => key.startsWith('scribe.')),
        ),
      };

      return {
        ...stats,
        metrics: scribeMetrics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error getting Scribe stats', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * GHOST PROTOCOL v999 - Endpoints State Machine
   * 
   * Le Frontend envoie des INTENTIONS (événements), le Backend répond avec le NOUVEL ÉTAT.
   */

  /**
   * POST /scribe/machine/:sessionId/event
   * 
   * Envoie un événement à la ScribeMachine.
   * Retourne le nouvel état de la machine.
   */
  @ApiOperation({
    summary: 'Envoyer un événement à la ScribeMachine (GHOST PROTOCOL)',
    description:
      'Envoie une intention (START_RECORD, STOP_RECORD, UPDATE_TEXT, CONFIRM) et reçoit le nouvel état.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nouvel état de la machine (value, context, updatedAt)',
  })
  @ApiResponse({ status: 400, description: 'Événement invalide ou transition non autorisée' })
  @ApiResponse({ status: 404, description: 'Session introuvable (pour certains événements)' })
  @Post('machine/:sessionId/event')
  @HttpCode(HttpStatus.OK)
  async sendMachineEvent(
    @Param('sessionId') sessionId: string,
    @Body(new ZodValidationPipe(ScribeEventSchema)) event: any,
  ): Promise<ScribeMachineState> {
    try {
      this.logger.log(`[${sessionId}] Received event: ${event.type}`);
      const newState = await this.scribeMachineService.sendEvent(sessionId, event);
      return newState;
    } catch (error) {
      this.logger.error(`[${sessionId}] Error processing event`, error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * GET /scribe/machine/:sessionId/state
   * 
   * Récupère l'état actuel de la machine.
   */
  @ApiOperation({
    summary: 'Récupérer l\'état actuel de la ScribeMachine',
    description: 'Retourne l\'état complet (value, context, updatedAt)',
  })
  @ApiResponse({ status: 200, description: 'État actuel de la machine' })
  @ApiResponse({ status: 404, description: 'Session introuvable' })
  @Get('machine/:sessionId/state')
  @HttpCode(HttpStatus.OK)
  async getMachineState(@Param('sessionId') sessionId: string): Promise<ScribeMachineState> {
    return this.scribeMachineService.getState(sessionId);
  }

  /**
   * POST /scribe/machine/:sessionId/reset
   * 
   * Réinitialise la machine à IDLE (nouveau cycle).
   */
  @ApiOperation({
    summary: 'Réinitialiser la ScribeMachine',
    description: 'Remet la machine à l\'état IDLE pour un nouveau cycle',
  })
  @ApiResponse({ status: 200, description: 'Machine réinitialisée' })
  @ApiResponse({ status: 404, description: 'Session introuvable' })
  @Post('machine/:sessionId/reset')
  @HttpCode(HttpStatus.OK)
  async resetMachine(@Param('sessionId') sessionId: string): Promise<{ success: true }> {
    this.scribeMachineService.resetMachine(sessionId);
    return { success: true };
  }

}
