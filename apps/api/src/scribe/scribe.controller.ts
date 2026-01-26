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
} from '@nestjs/common';
import { ScribeService } from './scribe.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { PrismaService } from '../prisma/prisma.service';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ZodValidationPipe } from '../common';
import { AuthGuard } from '../common/guards/auth.guard';
import { ConsultationSchema, type Consultation } from '@basevitale/shared';
import { z, ZodError } from 'zod';
import { sanitizeString } from '../common/utils/sanitize.util';
import { ScribeHealthService } from './scribe.health.service';
import { MetricsService } from '../common/services/metrics.service';
import { Public } from '../common/decorators/public.decorator';
import { Timeout } from '../common/decorators/timeout.decorator';

/**
 * ScribeController
 * 
 * Endpoints pour le Module S (Scribe/Cortex Sémantique)
 * 
 * Version BaseVitale V112+ - Toutes phases complétées
 * 
 * INVARIANT: Toute donnée médicale doit passer par le moteur d'Abstraction
 */
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
    private readonly knowledgeGraphService: KnowledgeGraphService,
    private readonly prisma: PrismaService,
    private readonly neo4jService: Neo4jService,
    private readonly scribeHealthService: ScribeHealthService,
    private readonly metricsService: MetricsService,
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
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @Timeout(360000) // 6 min : GPU lock + Ollama/Llama (1er appel lent)
  async analyze(
    @Body(new ZodValidationPipe(z.object({
      text: z.string().min(1, 'Le texte est requis').max(50000, 'Le texte ne peut pas dépasser 50000 caractères'),
    })))
    body: {
      text: string;
    },
  ) {
    try {
      // Sanitization de l'input
      const sanitizedText = sanitizeString(body.text);
      
      // Validation de la longueur après sanitization
      if (sanitizedText.length === 0) {
        throw new BadRequestException('Le texte est vide après nettoyage');
      }
      
      if (sanitizedText.length > 50000) {
        throw new BadRequestException('Le texte est trop long (max 50000 caractères)');
      }
      
      this.logger.log(
        `[Tracer Bullet] POST /scribe/analyze - Analyzing text (length: ${sanitizedText.length})`,
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
    })))
    body: {
      text: string;
      patientId?: string;
    },
  ) {
    const { text, patientId } = body;
    this.logger.log(
      `Analyzing consultation (text length: ${text.length}, patientId: ${patientId || 'none'})`,
    );

    const consultation = await this.scribeService.analyzeConsultation(text, patientId);

    return consultation;
  }

  /**
   * PHASE B : Process dictation - Front → NestJS → Postgres
   * POST /scribe/process-dictation
   * 
   * Reçoit un texte brut de dictée, l'analyse (MOCK/CLOUD/LOCAL),
   * et sauvegarde le Draft dans ConsultationDraft (Postgres JSONB)
   * 
   * Law II: Hybrid Toggle - Respecte AI_MODE
   */
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
        `Analyzed consultation: ${consultation.symptoms.length} symptoms, ${consultation.diagnosis.length} diagnoses, ${consultation.medications.length} medications`,
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
  async validateDraft(
    @Param('id') id: string,
  ) {
    const validationStartTime = Date.now();
    this.logger.log(`Validating consultation draft ${id}`);
    
    // Métrique: validation démarrée
    this.metricsService.incrementCounter('scribe.validation.started');

    // 1. Récupérer le draft avec vérification
    const draft = await this.prisma.consultationDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      throw new NotFoundException(`Consultation draft ${id} not found`);
    }

    // Vérifier que le draft n'est pas déjà validé
    if (draft.status === 'VALIDATED') {
      this.logger.warn(`Draft ${id} is already validated`);
      return {
        draft: {
          id: draft.id,
          patientId: draft.patientId,
          status: 'VALIDATED',
        },
        nodesCreated: 0,
        neo4jRelationsCreated: 0,
        nodes: [],
        warning: 'Draft was already validated',
      };
    }

    try {
      // 2. Valider les données structurées avec Zod
      let consultation: any;
      try {
        consultation = ConsultationSchema.parse(draft.structuredData);
        this.logger.debug(`Consultation data validated for draft ${id}`);
      } catch (zodError) {
        this.logger.error(`Invalid consultation data in draft ${id}`, zodError instanceof Error ? zodError : String(zodError));
        throw new BadRequestException({
          message: 'Données structurées invalides',
          errors: zodError instanceof ZodError ? zodError.errors : [],
        });
      }

      // 3. Vérifier si le patient existe (contrainte FK)
      // Si le patient n'existe pas, on crée les nœuds sans patientId pour éviter violation FK
      let validPatientId: string | undefined = draft.patientId;
      try {
        const patientExists = await this.prisma.patient.findUnique({
          where: { id: draft.patientId },
          select: { id: true },
        });
        if (!patientExists) {
          this.logger.warn(
            `Patient ${draft.patientId} not found in database, creating nodes without patientId`,
          );
          validPatientId = undefined; // Laisser undefined pour éviter violation FK
        } else {
          this.logger.debug(`Patient ${draft.patientId} exists in database`);
        }
      } catch (patientCheckError) {
        this.logger.warn(
          `Error checking patient existence for ${draft.patientId}, proceeding without patientId`,
          patientCheckError instanceof Error ? patientCheckError : String(patientCheckError),
        );
        validPatientId = undefined;
      }

      // 4. Préparer les nœuds sémantiques pour PostgreSQL (batch)
      // Note: consultationId est null car ConsultationDraft n'est pas une Consultation
      // La Consultation sera créée plus tard dans le workflow si nécessaire
      const nodesData = [];
      
      // Préparer nœuds pour symptômes
      for (const symptom of consultation.symptoms || []) {
        if (typeof symptom === 'string' && symptom.trim().length > 0) {
          nodesData.push({
            nodeType: 'SYMPTOM' as const,
            label: symptom.trim(),
            description: `Symptôme: ${symptom.trim()}`,
            consultationId: undefined, // Pas de Consultation encore créée
            patientId: validPatientId,
          });
        }
      }

      // Préparer nœuds pour diagnostics
      for (const diag of consultation.diagnosis || []) {
        if (diag && (diag.code || diag.label)) {
          nodesData.push({
            nodeType: 'DIAGNOSIS' as const,
            label: diag.label || diag.code || 'Diagnostic inconnu',
            description: `Diagnostic: ${diag.label || diag.code} ${diag.code ? `(${diag.code})` : ''}`,
            cim10Code: diag.code || null,
            confidence: typeof diag.confidence === 'number' ? diag.confidence : null,
            consultationId: undefined, // Pas de Consultation encore créée
            patientId: validPatientId,
          });
        }
      }

      // Préparer nœuds pour médicaments
      for (const med of consultation.medications || []) {
        if (med && med.name && typeof med.name === 'string') {
          nodesData.push({
            nodeType: 'MEDICATION' as const,
            label: med.name.trim(),
            description: `Médicament: ${med.name}${med.dosage ? ` - ${med.dosage}` : ''}${med.duration ? ` - ${med.duration}` : ''}`,
            consultationId: undefined, // Pas de Consultation encore créée
            patientId: validPatientId,
          });
        }
      }

      this.logger.debug(`Prepared ${nodesData.length} nodes for draft ${id}`);

      // 5. Créer les nœuds PostgreSQL en batch (transaction atomique)
      let nodes = [];
      try {
        nodes = nodesData.length > 0 
          ? await this.knowledgeGraphService.createNodes(nodesData)
          : [];
        this.logger.log(`Created ${nodes.length} semantic nodes in PostgreSQL for draft ${id}`);
      } catch (nodesError) {
        this.logger.error(`Error creating semantic nodes for draft ${id}`, nodesError instanceof Error ? nodesError : String(nodesError));
        throw new BadRequestException({
          message: 'Erreur lors de la création des nœuds sémantiques',
          error: nodesError instanceof Error ? nodesError.message : 'Unknown error',
        });
      }

      // 6. Créer le graphe Neo4j (continue même en cas d'erreur partielle)
      let neo4jRelationsCreated = 0;
      let neo4jError: any = null;
      try {
        neo4jRelationsCreated = await this.createNeo4jGraph(draft.patientId, consultation);
        this.logger.log(
          `Created Neo4j graph for patient ${draft.patientId}: ${neo4jRelationsCreated} relations`,
        );
      } catch (neo4jErr) {
        neo4jError = neo4jErr;
        this.logger.error('Error creating Neo4j graph (non-blocking)', neo4jErr instanceof Error ? neo4jErr : String(neo4jErr));
        // Ne pas faire échouer la validation si Neo4j échoue (Law IV: Write Postgres, Sync Neo4j)
        // Le draft sera validé même si Neo4j n'est pas disponible
      }

      // 7. Mettre à jour le statut du draft à VALIDATED (Postgres transaction réussie)
      try {
        await this.prisma.consultationDraft.update({
          where: { id },
          data: { 
            status: 'VALIDATED',
            updatedAt: new Date(),
          },
        });
        this.logger.log(`Draft ${id} validated successfully`);
      } catch (updateError) {
        this.logger.error(`Error updating draft ${id} status`, updateError instanceof Error ? updateError : String(updateError));
        // Les nœuds ont été créés mais le statut n'a pas été mis à jour
        // C'est une situation de corruption partielle - logger l'erreur
        throw new BadRequestException({
          message: 'Erreur lors de la mise à jour du statut du draft',
          error: updateError instanceof Error ? updateError.message : 'Unknown error',
        });
      }

      // 8. Enregistrer les métriques de succès
      const validationDuration = Date.now() - validationStartTime;
      this.metricsService.recordTiming('scribe.validation.duration', validationDuration);
      this.metricsService.incrementCounter('scribe.validation.success');
      this.metricsService.incrementCounter('scribe.validation.nodes_created', nodes.length);
      this.metricsService.incrementCounter('scribe.validation.neo4j_relations', neo4jRelationsCreated);
      if (neo4jError) {
        this.metricsService.incrementCounter('scribe.validation.neo4j_errors');
      }

      // 9. Retourner le résultat avec métriques (TransformInterceptor ajoute success/data/timestamp)
      return {
        draft: {
          id: draft.id,
          patientId: draft.patientId,
          status: 'VALIDATED',
        },
        nodesCreated: nodes.length,
        neo4jRelationsCreated,
        nodes: nodes.map(node => ({
          id: node.id,
          nodeType: node.nodeType,
          label: node.label,
          cim10Code: node.cim10Code,
          confidence: node.confidence,
        })),
        ...(neo4jError && {
          warning: 'Neo4j synchronization completed with errors',
        }),
      };
    } catch (error) {
      // Métrique: erreur de validation
      this.metricsService.incrementCounter('scribe.validation.errors');
      const validationDuration = Date.now() - validationStartTime;
      this.metricsService.recordTiming('scribe.validation.error_duration', validationDuration);
      
      this.logger.error('Error validating draft', error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Créer le graphe Neo4j pour un patient
   * Crée (:Patient)-[:HAS_SYMPTOM]->(:Symptom), etc.
   */
  private async createNeo4jGraph(patientId: string, consultation: any): Promise<number> {
    this.logger.debug(`Creating Neo4j graph for patient ${patientId}`);
    const queries: Array<{ query: string; parameters: Record<string, any> }> = [];

    // MERGE Patient
    queries.push({
      query: `
        MERGE (p:Patient {id: $patientId})
        ON CREATE SET p.createdAt = datetime()
        ON MATCH SET p.updatedAt = datetime()
        RETURN p
      `,
      parameters: { patientId },
    });

    // Créer les Symptômes et relations
    for (const symptom of consultation.symptoms || []) {
      queries.push({
        query: `
          MATCH (p:Patient {id: $patientId})
          MERGE (s:Symptom {label: $symptom})
          ON CREATE SET s.createdAt = datetime()
          ON MATCH SET s.updatedAt = datetime()
          MERGE (p)-[r:HAS_SYMPTOM]->(s)
          ON CREATE SET r.createdAt = datetime()
          RETURN r
        `,
        parameters: { patientId, symptom },
      });
    }

    // Créer les Diagnostics et relations
    for (const diag of consultation.diagnosis || []) {
      queries.push({
        query: `
          MATCH (p:Patient {id: $patientId})
          MERGE (d:Diagnosis {code: $code})
          ON CREATE SET d.label = $label, d.confidence = $confidence, d.createdAt = datetime()
          ON MATCH SET d.label = $label, d.confidence = $confidence, d.updatedAt = datetime()
          MERGE (p)-[r:HAS_DIAGNOSIS]->(d)
          ON CREATE SET r.createdAt = datetime()
          RETURN r
        `,
        parameters: {
          patientId,
          code: diag.code,
          label: diag.label,
          confidence: diag.confidence,
        },
      });
    }

    // Créer les Médicaments et relations
    for (const med of consultation.medications || []) {
      queries.push({
        query: `
          MATCH (p:Patient {id: $patientId})
          MERGE (m:Medication {name: $name})
          ON CREATE SET m.dosage = $dosage, m.duration = $duration, m.createdAt = datetime()
          ON MATCH SET m.dosage = $dosage, m.duration = $duration, m.updatedAt = datetime()
          MERGE (p)-[r:PRESCRIBED]->(m)
          ON CREATE SET r.createdAt = datetime()
          RETURN r
        `,
        parameters: {
          patientId,
          name: med.name,
          dosage: med.dosage,
          duration: med.duration,
        },
      });
    }

    if (queries.length > 0) {
      const results = await this.neo4jService.executeTransaction(queries);
      // Compter le nombre de relations créées
      let totalRelations = 0;
      if (results && Array.isArray(results)) {
        for (const result of results) {
          try {
            // Neo4j Result.summary() peut retourner une Promise selon la version
            const summary = await Promise.resolve((result as any).summary());
            if (summary?.counters && typeof summary.counters.relationshipsCreated === 'function') {
              const created = summary.counters.relationshipsCreated();
              totalRelations += typeof created === 'number' ? created : 0;
            }
          } catch (error) {
            // Ignorer les erreurs de comptage, continuer
            this.logger.warn('Error counting Neo4j relationships', error instanceof Error ? error : String(error));
          }
        }
      }
      return totalRelations;
    }
    return 0;
  }

  /**
   * GET /scribe/health
   * 
   * Health check du Module Scribe avec métriques détaillées
   * Endpoint public pour monitoring
   */
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

}
