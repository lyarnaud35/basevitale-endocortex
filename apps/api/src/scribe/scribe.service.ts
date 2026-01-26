import {
  Injectable,
  Logger,
  Inject,
  Optional,
  ServiceUnavailableException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MetricsService } from '../common/services/metrics.service';
import { CacheService } from '../common/services/cache.service';
import { ConfigService } from '../common/services/config.service';
import { GpuLockService } from '../common/services/gpu-lock.service';
import { PrismaService } from '../prisma/prisma.service';
import { withMetrics } from '../common/utils/metrics.util';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { faker } from '@faker-js/faker';
import { OpenAI } from 'openai';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash } from 'crypto';
import {
  ConsultationSchema,
  Consultation,
  zodToJsonSchema,
  KnowledgeGraphSchema,
  KnowledgeGraph,
  CreateSemanticNode,
} from '@basevitale/shared';
import { GraphProjectorService } from '../knowledge-graph/graph-projector.service';

/**
 * ScribeService - Module S (Scribe) Phase 1
 * 
 * Implémente la Law II: Hybrid Toggle
 * - MOCK (Default): Retourne des données générées par Faker basées sur le Zod Schema
 * - CLOUD: Appelle OpenAI directement via Node.js SDK
 * - LOCAL: Appelle le sidecar Python (AI Cortex) via endpoint /structure
 * 
 * Law I: Contract-First Intelligence
 * - Le schéma Zod (ConsultationSchema) est la source de vérité unique
 * - Le schéma est converti en JSON Schema pour être envoyé au sidecar Python
 * - Python utilise instructor pour forcer la structuration selon le schéma
 */
@Injectable()
export class ScribeService {
  private readonly logger = new Logger(ScribeService.name);
  private readonly aiMode: 'MOCK' | 'CLOUD' | 'LOCAL';
  private readonly openaiClient: OpenAI | null;
  private readonly pythonSidecarUrl: string;
  private readonly useQueue: boolean;
  private readonly enableCache: boolean;
  private readonly cacheTTL: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly metricsService: MetricsService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly gpuLock: GpuLockService,
    private readonly graphProjector: GraphProjectorService,
    @Optional() private readonly cacheService?: CacheService,
    @Optional() @InjectQueue('scribe-consultation') private scribeQueue?: Queue,
  ) {
    this.aiMode = (process.env.AI_MODE || 'MOCK').toUpperCase() as 'MOCK' | 'CLOUD' | 'LOCAL';
    // Phase C : Utiliser la queue si activée (par défaut true pour LOCAL)
    this.useQueue =
      process.env.USE_REDIS_QUEUE !== 'false' && this.aiMode === 'LOCAL';
    
    // Cache pour éviter de réanalyser le même texte
    this.enableCache = process.env.ENABLE_AI_CACHE !== 'false';
    this.cacheTTL = parseInt(process.env.AI_CACHE_TTL || '3600000', 10); // 1h par défaut
    
    this.logger.log(`ScribeService initialized with AI_MODE: ${this.aiMode}`);
    if (this.useQueue && this.scribeQueue) {
      this.logger.log('Phase C: Redis Queue enabled for async processing');
    }
    if (this.enableCache && this.cacheService) {
      this.logger.log(`AI Cache enabled (TTL: ${this.cacheTTL}ms)`);
    }

    // Initialiser client cloud (OpenAI-compatible) si mode CLOUD — Groq ou OpenAI
    if (this.aiMode === 'CLOUD') {
      const provider = this.configService.cloudProvider;
      const apiKey = this.configService.cloudApiKey;
      if (!apiKey) {
        this.logger.warn(
          `${provider === 'groq' ? 'GROQ_API_KEY' : 'OPENAI_API_KEY'} not found, CLOUD mode may fail`,
        );
      }
      this.openaiClient = new OpenAI({
        apiKey: apiKey || 'dummy',
        baseURL: this.configService.cloudBaseUrl,
      });
      this.logger.log(`CLOUD provider: ${provider}, model: ${this.configService.cloudModel}`);
    } else {
      this.openaiClient = null;
    }
  }

  /**
   * PHASE "TRACER BULLET" : Méthode analyze simplifiée
   *
   * - MOCK : données factices → ConsultationDraft + projection Neo4j
   * - LOCAL : POST Python /process-generic { text, schema } → {"data": ...} → parser → DB + Neo4j.
   *   Si Python injoignable : fallback Mock (⚠️ Neuro-Cortex Unreachable).
   * - CLOUD : Groq ou OpenAI (JSON mode) → même flux DB + Neo4j. Réponse typiquement < 2s.
   */
  async analyze(text: string): Promise<Consultation> {
    const startTime = Date.now();
    this.logger.log(`[Tracer Bullet] Analyzing consultation (text length: ${text.length})`);

    const aiMode = this.configService.aiMode;
    this.logger.debug(`AI_MODE: ${aiMode}`);

    if (aiMode === 'MOCK') {
      this.logger.log('🛑 MOCK MODE ACTIVÉ: Bypass AI Cortex');
      return this.runMockFallback(text, startTime);
    }

    if (aiMode === 'CLOUD') {
      return this.runCloudAnalyze(text, startTime);
    }

    if (aiMode !== 'LOCAL') {
      this.logger.debug(`[analyze] AI_MODE=${aiMode} → fallback MOCK`);
      return this.runMockFallback(text, startTime);
    }

    // AI_MODE === 'LOCAL' → appel HTTP sidecar Python (ai-cortex) /process-generic
    const aiServiceUrl = this.configService.aiServiceUrl;
    const endpoint = `${aiServiceUrl}/process-generic`;
    const timeoutMs = this.configService.aiCortexTimeoutMs; // 300s défaut (inférence CPU)
    const schema = zodToJsonSchema(ConsultationSchema);
    this.logger.debug(`[analyze] POST ${endpoint} (timeout ${timeoutMs}ms)`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ data?: unknown }>(
          endpoint,
          { text, schema },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: timeoutMs,
          },
        ),
      );

      // Python renvoie {"data": <JSON structuré>}. Axios met le body dans response.data.
      const raw = response.data?.data ?? response.data;
      if (!raw || typeof raw !== 'object') {
        throw new Error('No structured data in response from Python sidecar');
      }

      const validatedConsultation = ConsultationSchema.parse(raw) as Consultation;
      let draftId: string | null = null;

      try {
        const draft = await this.prisma.consultationDraft.create({
          data: {
            patientId: validatedConsultation.patientId,
            status: 'DRAFT',
            structuredData: validatedConsultation as object,
          },
        });
        draftId = draft.id;
        this.logger.log(`[analyze] ConsultationDraft sauvegardé: ${draft.id}`);
        this.metricsService.incrementCounter('scribe.analyze.local.saved');
        this.metricsService.recordTiming('scribe.analyze.local.duration', Date.now() - startTime);
        await this.graphProjector.projectConsultation(
          validatedConsultation.patientId,
          validatedConsultation,
        );
        this.logger.log(`✅ Graph Projection Complete for patient ${validatedConsultation.patientId}`);
      } catch (e) {
        this.logger.error('[analyze] Erreur sauvegarde ConsultationDraft', e);
        this.metricsService.incrementCounter('scribe.analyze.local.save_error');
      }

      this.metricsService.incrementCounter('scribe.analyze.local.success');
      return { ...validatedConsultation, draftId } as Consultation & { draftId?: string };
    } catch (err) {
      this.logger.warn('⚠️ Neuro-Cortex Unreachable', err instanceof Error ? err.message : String(err));
      this.metricsService.incrementCounter('scribe.analyze.local.error');
      return this.runMockFallback(text, startTime);
    }
  }

  /**
   * CLOUD: Groq ou OpenAI (JSON mode) → draft + Neo4j. Même flux que LOCAL, typiquement < 2s.
   */
  private async runCloudAnalyze(
    text: string,
    startTime: number,
  ): Promise<Consultation & { draftId?: string }> {
    const validatedConsultation = await this.analyzeConsultationCloud(text);
    let draftId: string | null = null;

    try {
      const draft = await this.prisma.consultationDraft.create({
        data: {
          patientId: validatedConsultation.patientId,
          status: 'DRAFT',
          structuredData: validatedConsultation as object,
        },
      });
      draftId = draft.id;
      this.logger.log(`[CLOUD] ConsultationDraft sauvegardé: ${draft.id}`);
      this.metricsService.incrementCounter('scribe.analyze.cloud.saved');
      this.metricsService.recordTiming('scribe.analyze.cloud.duration', Date.now() - startTime);
      await this.graphProjector.projectConsultation(
        validatedConsultation.patientId,
        validatedConsultation,
      );
      this.logger.log(`✅ Graph Projection Complete for patient ${validatedConsultation.patientId}`);
    } catch (e) {
      this.logger.error('[CLOUD] Erreur sauvegarde ConsultationDraft', e);
      this.metricsService.incrementCounter('scribe.analyze.cloud.save_error');
    }

    this.metricsService.incrementCounter('scribe.analyze.cloud.success');
    return { ...validatedConsultation, draftId } as Consultation & { draftId?: string };
  }

  private async runMockFallback(
    text: string,
    startTime: number,
  ): Promise<Consultation & { draftId?: string }> {
    const mockPatientId = `patient_${faker.string.alphanumeric(10)}`;
    const mockConsultation: Consultation = {
      patientId: mockPatientId,
      transcript: text || 'Consultation générée en mode MOCK',
      symptoms: ['Fièvre modérée', 'Maux de tête', 'Toux sèche', 'Fatigue'],
      diagnosis: [{ code: 'J11.1', label: 'Grippe saisonnière', confidence: 0.9 }],
      medications: [{ name: 'Doliprane', dosage: '1000mg', duration: '7 jours' }],
    };

    let validated: Consultation;
    try {
      validated = ConsultationSchema.parse(mockConsultation);
    } catch (zodError) {
      this.logger.error('[MOCK] Erreur validation Zod', zodError);
      this.metricsService.incrementCounter('scribe.analyze.mock.validation_error');
      throw new Error('Erreur de validation du schéma de consultation');
    }

    let draftId: string | null = null;
    try {
      const draft = await this.prisma.consultationDraft.create({
        data: {
          patientId: validated.patientId,
          status: 'DRAFT',
          structuredData: validated as object,
        },
      });
      draftId = draft.id;
      this.logger.log(`[MOCK] ConsultationDraft sauvegardé: ${draft.id}`);
      this.metricsService.incrementCounter('scribe.analyze.mock.saved');
      this.metricsService.recordTiming('scribe.analyze.mock.duration', Date.now() - startTime);
      await this.graphProjector.projectConsultation(validated.patientId, validated);
      this.logger.log(`✅ Graph Projection Complete for patient ${validated.patientId}`);
    } catch (e) {
      this.logger.error('[MOCK] Erreur sauvegarde ConsultationDraft', e);
      this.metricsService.incrementCounter('scribe.analyze.mock.save_error');
    }

    return { ...validated, draftId } as Consultation & { draftId?: string };
  }

  /**
   * Update a consultation draft with manual corrections (PATCH /scribe/draft/:id).
   * Accepte un Partial<Consultation>, merge avec l'existant, valide, persiste.
   *
   * @param id - Draft ID
   * @param partialData - Partial consultation data to merge with existing data
   * @returns { draft, consultation } — draft mis à jour et consultation validée
   */
  async updateDraft(
    id: string,
    partialData: Partial<Consultation>,
  ): Promise<{ draft: { id: string; patientId: string; status: string; updatedAt: Date }; consultation: Consultation }> {
    this.logger.log(`Updating draft ${id} with partial data`);

    const draft = await this.prisma.consultationDraft.findUnique({ where: { id } });
    if (!draft) {
      throw new NotFoundException(`Consultation draft ${id} not found`);
    }
    if (draft.status === 'VALIDATED') {
      throw new BadRequestException('Cannot update a validated draft');
    }

    const existingData = draft.structuredData as Record<string, unknown>;
    const incoming = partialData as Record<string, unknown>;

    const incomingSymptoms =
      incoming.symptoms !== undefined
        ? (incoming.symptoms as string[]).filter((s: string) => s && String(s).trim().length > 0)
        : undefined;
    const incomingDiagnosis =
      incoming.diagnosis !== undefined
        ? (incoming.diagnosis as Array<{ code?: string; label?: string; confidence?: number }>).filter(
            (d) => d && (String(d.code || '').trim() || String(d.label || '').trim()),
          )
        : undefined;
    const incomingMedications =
      incoming.medications !== undefined
        ? (incoming.medications as Array<{ name?: string; dosage?: string; duration?: string }>).filter(
            (m) => m && String(m.name || '').trim(),
          )
        : undefined;

    const merged = {
      ...existingData,
      ...incoming,
      symptoms:
        incomingSymptoms !== undefined
          ? incomingSymptoms
          : (existingData.symptoms as string[] || []).filter((s: string) => s && String(s).trim().length > 0),
      diagnosis:
        incomingDiagnosis !== undefined
          ? incomingDiagnosis
          : (existingData.diagnosis as unknown[] || []).filter(
              (d: { code?: string; label?: string }) =>
                d && (String((d as any).code || '').trim() || String((d as any).label || '').trim()),
            ),
      medications:
        incomingMedications !== undefined
          ? incomingMedications
          : (existingData.medications as unknown[] || []).filter(
              (m: { name?: string }) => m && String((m as any).name || '').trim(),
            ),
    };

    let validated: Consultation;
    try {
      validated = ConsultationSchema.parse(merged) as Consultation;
    } catch (e) {
      const err = e as { errors?: unknown[] };
      this.logger.warn(`[updateDraft] Validation failed for ${id}`, err?.errors);
      throw new BadRequestException({
        message: 'Données structurées invalides',
        errors: err?.errors ?? [],
        details: { draftId: id },
      });
    }

    const updated = await this.prisma.consultationDraft.update({
      where: { id },
      data: { structuredData: validated as object, updatedAt: new Date() },
    });

    this.logger.log(`Draft ${id} updated successfully`);
    return {
      draft: {
        id: updated.id,
        patientId: updated.patientId,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
      consultation: validated,
    };
  }

  /**
   * Analyze consultation text and return structured data according to ConsultationSchema
   * 
   * Law II: Hybrid Toggle
   * - MOCK: Returns Faker-generated data based on Zod Schema
   * - CLOUD: Calls OpenAI directly
   * - LOCAL: Calls Python sidecar endpoint /structure
   * 
   * Optimization: Cache results to avoid re-analyzing identical texts
   * 
   * @param text - Consultation text to analyze
   * @param patientId - Optional patient ID (required for Phase 2 schema)
   * @returns Structured Consultation data according to Zod Schema
   */
  async analyzeConsultation(text: string, patientId?: string): Promise<Consultation> {
    const startTime = Date.now();
    
    // Générer une clé de cache basée sur le hash du texte
    const cacheKey = this.generateCacheKey(text);
    
    // Vérifier le cache si activé
    if (this.enableCache && this.cacheService) {
      const cached = this.cacheService.get<Consultation>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for consultation analysis (key: ${cacheKey.substring(0, 8)}...)`);
        this.metricsService.incrementCounter('scribe.cache.hit');
        this.metricsService.recordTiming('scribe.analyzeConsultation.cached', Date.now() - startTime);
        
        // Mettre à jour patientId si fourni
        if (patientId && cached.patientId !== patientId) {
          return { ...cached, patientId };
        }
        return cached;
      }
    }

    const result = await withMetrics(
      this.metricsService,
      'scribe.analyzeConsultation',
      async () => {
        const aiMode = this.configService.aiMode;
        this.logger.debug(`Analyzing consultation with AI_MODE: ${aiMode}`);

        let consultation: Consultation;
        switch (aiMode) {
          case 'MOCK':
            consultation = this.analyzeConsultationMock(text, patientId);
            break;

          case 'CLOUD':
            consultation = await this.analyzeConsultationCloud(text);
            break;

          case 'LOCAL':
            consultation = await this.analyzeConsultationLocal(text);
            break;

          default:
            this.logger.warn(
              `Unknown AI_MODE: ${aiMode}, falling back to MOCK`,
            );
            consultation = this.analyzeConsultationMock(text, patientId);
        }

        // Mettre en cache si activé (sauf en mode MOCK pour éviter le cache inutile)
        if (this.enableCache && this.cacheService && aiMode !== 'MOCK') {
          this.cacheService.set(cacheKey, consultation, this.cacheTTL);
          this.metricsService.incrementCounter('scribe.cache.miss');
          this.logger.debug(`Cached consultation analysis (key: ${cacheKey.substring(0, 8)}...)`);
        }

        return consultation;
      },
    );

    // Enregistrer métrique de performance par mode
    const duration = Date.now() - startTime;
    const aiMode = this.configService.aiMode;
    this.metricsService.recordTiming(`scribe.analyzeConsultation.${aiMode.toLowerCase()}`, duration);
    
    return result;
  }

  /**
   * Générer une clé de cache basée sur le hash du texte
   */
  private generateCacheKey(text: string): string {
    const hash = createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
    return `scribe:consultation:${hash}`;
  }

  /**
   * Mock analysis - returns Faker-generated data based on ConsultationSchema Phase 2
   * Used when AI_MODE=MOCK or as fallback
   * 
   * Law I: Contract-First - Data matches ConsultationSchema exactly (Phase 2)
   * Schema: patientId, transcript, symptoms[], diagnosis[], medications[]
   */
  private analyzeConsultationMock(text: string, patientId?: string): Consultation {
    this.logger.debug('Using MOCK mode with Faker');

    // Générer un patientId si non fourni
    const generatedPatientId = patientId || `patient_${faker.string.alphanumeric(10)}`;

    // Générer des symptômes selon le schéma Zod avec Faker
    const symptoms = faker.helpers.arrayElements(
      [
        'Fièvre modérée',
        'Maux de tête',
        'Toux sèche',
        'Fatigue',
        'Nausée',
        'Douleurs articulaires',
        'Frissons',
        'Congestion nasale',
        'Mal de gorge',
        'Courbatures',
        'Essoufflement',
        'Douleurs musculaires',
      ],
      { min: 1, max: 5 },
    );

    // Générer des diagnostics avec codes CIM10 réalistes
    const diagnosesList = [
      { code: 'J11.1', label: 'Grippe saisonnière', confidence: 0.85 },
      { code: 'J00', label: 'Rhume', confidence: 0.75 },
      { code: 'J06.9', label: 'Infection des voies respiratoires supérieures', confidence: 0.80 },
      { code: 'A09', label: 'Gastro-entérite', confidence: 0.70 },
      { code: 'G43.9', label: 'Migraine', confidence: 0.65 },
      { code: 'R53.83', label: 'Fatigue chronique', confidence: 0.60 },
      { code: 'J10.1', label: 'Grippe avec autre manifestation respiratoire', confidence: 0.90 },
    ];
    const diagnoses = faker.helpers.arrayElements(diagnosesList, { min: 1, max: 3 });

    // Générer des médicaments réalistes
    const medicationsList = [
      { name: 'Paracétamol', dosage: '500mg', duration: '7 jours' },
      { name: 'Ibuprofène', dosage: '400mg', duration: '5 jours' },
      { name: 'Amoxicilline', dosage: '1g', duration: '10 jours' },
      { name: 'Amoxiclav', dosage: '625mg', duration: '7 jours' },
      { name: 'Doliprane', dosage: '1000mg', duration: '3 jours' },
      { name: 'Strepsils', dosage: '1 comprimé', duration: '5 jours' },
    ];
    const medications = faker.helpers.arrayElements(medicationsList, { min: 0, max: 3 });

    const consultation: Consultation = {
      patientId: generatedPatientId,
      transcript: text || 'Transcription générée en mode MOCK',
      symptoms,
      diagnosis: diagnoses,
      medications,
    };

    // Valider avec le schéma Zod avant de retourner
    this.metricsService.incrementCounter('scribe.extractions.mock');
    return ConsultationSchema.parse(consultation);
  }

  /**
   * Cloud analysis - calls OpenAI directly
   * Used when AI_MODE=CLOUD
   * 
   * Bypasses Python to save resources and reduce latency
   */
  private async analyzeConsultationCloud(text: string): Promise<Consultation> {
    const provider = this.configService.cloudProvider;
    const model = this.configService.cloudModel;
    this.logger.debug(`Using CLOUD mode with ${provider} (${model})`);

    if (!this.openaiClient) {
      throw new Error('Cloud LLM client not initialized');
    }

    // Convertir le schéma Zod en JSON Schema pour référence
    const jsonSchema = zodToJsonSchema(ConsultationSchema);

    // Créer le prompt système
    const systemPrompt = `Tu es un assistant médical expert.

Ta tâche: structurer une consultation médicale en JSON STRICTEMENT conforme au schéma fourni.

Règles impératives:
- Ne JAMAIS inventer de champs hors schéma (ex: pas de patientName, pas de vitals).
- Répondre UNIQUEMENT avec un JSON valide (aucun texte, aucune explication, aucun markdown).
- Respecter exactement les clés attendues:
  - patientId (string)
  - transcript (string) : transcription brute
  - symptoms (string[]) : liste non vide de symptômes (chaque entrée non vide)
  - diagnosis ({ code, label, confidence }[]) : liste non vide
  - medications ({ name, dosage, duration }[]) : peut être vide
- confidence doit être un nombre entre 0 et 1.
- Les champs requis doivent être présents même si certaines infos sont absentes du texte (dans ce cas, inférer le plus probable sans sortir du schéma).`;

    // Construire le prompt utilisateur
    const userPrompt = `Analyse la consultation suivante et génère une réponse structurée conforme au schéma JSON (source de vérité):

${text}

Schéma JSON à respecter (dérivé de ConsultationSchema Zod):
${JSON.stringify(jsonSchema, null, 2)}

Réponds UNIQUEMENT avec un JSON valide.`;

    try {
      const completion = await this.openaiClient.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error(`No response from ${provider}`);
      }

      // Parser la réponse JSON
      const parsedResponse = JSON.parse(responseText);

      // Valider avec le schéma Zod avant de retourner
      this.metricsService.incrementCounter('scribe.extractions.cloud');
      return ConsultationSchema.parse(parsedResponse);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error calling ${provider}`, err);
      this.metricsService.incrementCounter('scribe.extractions.cloud.error');
      throw new Error(`${provider} API error: ${err.message}`);
    }
  }

  /**
   * Local analysis - calls Python sidecar endpoint /structure
   * Used when AI_MODE=LOCAL
   * 
   * Phase C : Utilise Redis Queue pour traitement asynchrone
   * Flux : NestJS -> Redis Queue -> Python -> Redis -> NestJS
   * 
   * Law III: Universal Worker
   * - Le sidecar Python est générique (aucune logique métier)
   * - On envoie le texte + le JSON Schema (dérivé de Zod)
   * - Python utilise instructor pour forcer la structuration
   * 
   * @param useQueue - Si true, utilise Redis Queue (Phase C), sinon appel HTTP direct
   */
  private async analyzeConsultationLocal(
    text: string,
    useQueue: boolean = false,
  ): Promise<Consultation> {
    this.logger.debug(
      `Using LOCAL mode with Python sidecar (queue: ${useQueue})`,
    );

    // Convertir le schéma Zod en JSON Schema
    // C'est la connexion clé : TypeScript → JSON Schema → Python instructor
    const jsonSchema = zodToJsonSchema(ConsultationSchema);

    // Phase C : Utiliser Redis Queue si activé
    if (useQueue && this.scribeQueue) {
      return this.analyzeConsultationLocalQueue(text, jsonSchema);
    }

    // Phase B : Appel HTTP direct (synchronisé)
    return this.analyzeConsultationLocalDirect(text, jsonSchema);
  }

  /**
   * Phase C : Analyse via Redis Queue (asynchrone)
   * NestJS -> Redis Queue -> Python -> Redis -> NestJS
   */
  private async analyzeConsultationLocalQueue(
    text: string,
    jsonSchema: any,
  ): Promise<Consultation> {
    this.logger.debug('Phase C: Adding job to Redis Queue');

    try {
      // Ajouter le job à la queue
      const job = await this.scribeQueue!.add(
        'analyze-consultation',
        {
          text,
          jsonSchema,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          timeout: 120000, // 2 minutes max
          removeOnComplete: true,
          removeOnFail: false, // Garder pour debug
        },
      );

      this.logger.log(`[Queue] Job ${job.id} added, waiting for result...`);
      this.metricsService.incrementCounter('scribe.job.queued');

      // Note: BullMQ Job n'a pas de méthode .on() pour suivre la progression
      // La progression est gérée dans le processor via job.progress()

      // Attendre la complétion du job
      const result = await job.finished();

      this.logger.log(`[Queue] Job ${job.id} ✅ completed successfully`);

      // Valider avec le schéma Zod
      this.metricsService.incrementCounter('scribe.extractions.local.queue');
      return ConsultationSchema.parse(result);
    } catch (error) {
      this.logger.error('Error processing job via queue', error);
      this.metricsService.incrementCounter('scribe.extractions.local.queue.error');

      // Fallback vers appel direct
      this.logger.warn('Falling back to direct HTTP call due to queue error');
      return this.analyzeConsultationLocalDirect(text, jsonSchema);
    }
  }

  /**
   * Phase B : Analyse via appel HTTP direct (synchronisé)
   * NestJS -> Python (HTTP) -> NestJS
   * 
   * Law III: Universal Worker - Utilise /process-generic
   */
  private async analyzeConsultationLocalDirect(
    text: string,
    jsonSchema: any,
  ): Promise<Consultation> {
    this.logger.debug('Phase B: Direct HTTP call to Python sidecar (sémaphore GPU)');

    try {
      return await this.gpuLock.runWithLock(
        async () => {
          const aiServiceUrl = this.configService.aiServiceUrl;
          const endpoint = `${aiServiceUrl}/process-generic`;
          const timeoutMs = this.configService.aiCortexTimeoutMs;
          
          this.logger.debug(`[LOCAL Direct] Appel Python via ${endpoint}`);
          
          const response = await firstValueFrom(
            this.httpService.post<{ data: any }>(
              endpoint,
              { text, schema: jsonSchema },
              {
                headers: { 'Content-Type': 'application/json' },
                timeout: timeoutMs,
              },
            ),
          );
          const structuredData = response.data?.data;
          if (!structuredData) {
            throw new Error('No structured data in response');
          }
          this.logger.debug(
            `[LOCAL Direct] Données reçues: ${JSON.stringify(structuredData).substring(0, 200)}...`,
          );
          this.metricsService.incrementCounter('scribe.extractions.local.direct');
          return ConsultationSchema.parse(structuredData);
        },
        { ttlSeconds: 120 },
      );
    } catch (error) {
      this.logger.error('Error calling Python sidecar', error);
      this.metricsService.incrementCounter('scribe.extractions.local.error');
      throw new ServiceUnavailableException('AI Service Unavailable');
    }
  }

  /**
   * Extract Knowledge Graph from text
   * Used by controller for /extract-graph and /transcribe-and-extract endpoints
   * 
   * @param text - Text to extract knowledge graph from
   * @param patientId - Optional patient ID
   * @returns Knowledge Graph with nodes and relations
   */
  async extractKnowledgeGraph(
    text: string,
    patientId?: string,
  ): Promise<KnowledgeGraph> {
    return withMetrics(
      this.metricsService,
      'scribe.extractKnowledgeGraph',
      async () => {
        this.logger.debug(`Extracting knowledge graph with AI_MODE: ${this.aiMode}`);

        switch (this.aiMode) {
          case 'MOCK':
            return this.extractKnowledgeGraphMock(text, patientId);

          case 'CLOUD':
            return this.extractKnowledgeGraphCloud(text, patientId);

          case 'LOCAL':
            // Pour Knowledge Graph, on utilise toujours l'appel direct
            // (pas de queue nécessaire pour l'instant)
            return this.extractKnowledgeGraphLocal(text, patientId);

          default:
            this.logger.warn(
              `Unknown AI_MODE: ${this.aiMode}, falling back to MOCK`,
            );
            return this.extractKnowledgeGraphMock(text, patientId);
        }
      },
    );
  }

  /**
   * Mock extraction - returns Faker-generated Knowledge Graph
   */
  private extractKnowledgeGraphMock(
    text: string,
    patientId?: string,
  ): KnowledgeGraph {
    this.logger.debug('Using MOCK mode for Knowledge Graph extraction');

    const nodes: CreateSemanticNode[] = [
      {
        nodeType: 'SYMPTOM',
        label: 'Fièvre',
        description: 'Fièvre modérée rapportée par le patient',
        confidence: 0.9,
        patientId,
      },
      {
        nodeType: 'SYMPTOM',
        label: 'Maux de tête',
        description: 'Céphalées',
        confidence: 0.85,
        patientId,
      },
      {
        nodeType: 'DIAGNOSIS',
        label: 'Grippe saisonnière',
        cim10Code: 'J11.1',
        description: 'Grippe saisonnière suspectée',
        confidence: 0.8,
        patientId,
      },
      {
        nodeType: 'MEDICATION',
        label: 'Paracétamol',
        description: 'Médicament recommandé',
        confidence: 0.9,
        patientId,
      },
    ];

    const relations = [];

    this.metricsService.incrementCounter('scribe.kg.extractions.mock');
    return KnowledgeGraphSchema.parse({ nodes, relations });
  }

  /**
   * Cloud extraction - calls OpenAI directly
   */
  private async extractKnowledgeGraphCloud(
    text: string,
    patientId?: string,
  ): Promise<KnowledgeGraph> {
    this.logger.debug('Using CLOUD mode for Knowledge Graph extraction');

    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    // Convertir le schéma Zod en JSON Schema
    const jsonSchema = zodToJsonSchema(KnowledgeGraphSchema);

    const systemPrompt = `Tu es un assistant médical expert. Analyse le texte de consultation suivant et extrais un graphe de connaissances avec des nœuds sémantiques (symptômes, diagnostics, médicaments, etc.) et leurs relations.

Le schéma JSON inclut:
- nodes: Array de nœuds sémantiques (SYMPTOM, DIAGNOSIS, MEDICATION, etc.)
- relations: Array de relations entre nœuds (CAUSES, TREATS, etc.)

Réponds UNIQUEMENT avec un JSON valide selon ce schéma.`;

    const userPrompt = `Extrais le graphe de connaissances depuis ce texte:

${text}

${patientId ? `Patient ID: ${patientId}` : ''}

Schéma JSON à respecter:
${JSON.stringify(jsonSchema, null, 2)}

Réponds UNIQUEMENT avec un JSON valide.`;

    try {
      const completion = await this.openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      const parsedResponse = JSON.parse(responseText);
      
      // Ajouter patientId aux nœuds si fourni
      if (patientId && parsedResponse.nodes) {
        parsedResponse.nodes = parsedResponse.nodes.map((node: any) => ({
          ...node,
          patientId: node.patientId || patientId,
        }));
      }

      this.metricsService.incrementCounter('scribe.kg.extractions.cloud');
      return KnowledgeGraphSchema.parse(parsedResponse);
    } catch (error) {
      this.logger.error('Error calling OpenAI for Knowledge Graph', error);
      this.metricsService.incrementCounter('scribe.kg.extractions.cloud.error');
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  /**
   * Local extraction - calls Python sidecar via /process-generic
   * Law III: Universal Worker
   */
  private async extractKnowledgeGraphLocal(
    text: string,
    patientId?: string,
  ): Promise<KnowledgeGraph> {
    this.logger.debug('Using LOCAL mode for Knowledge Graph extraction (sémaphore GPU)');

    const jsonSchema = zodToJsonSchema(KnowledgeGraphSchema);
    const analysisText = patientId ? `Patient ID: ${patientId}\n\n${text}` : text;

    try {
      return await this.gpuLock.runWithLock(
        async () => {
          const aiServiceUrl = this.configService.aiServiceUrl;
          const endpoint = `${aiServiceUrl}/process-generic`;
          const timeoutMs = this.configService.aiCortexTimeoutMs;
          
          this.logger.debug(`[LOCAL KG] Appel Python via ${endpoint}`);
          
          const response = await firstValueFrom(
            this.httpService.post<{ data: any }>(
              endpoint,
              { text: analysisText, schema: jsonSchema },
              {
                headers: { 'Content-Type': 'application/json' },
                timeout: timeoutMs,
              },
            ),
          );
          const structuredData = response.data?.data;
          if (!structuredData) {
            throw new Error('No structured data in response');
          }
          if (patientId && structuredData.nodes) {
            structuredData.nodes = structuredData.nodes.map((node: any) => ({
              ...node,
              patientId: node.patientId || patientId,
            }));
          }
          this.metricsService.incrementCounter('scribe.kg.extractions.local');
          return KnowledgeGraphSchema.parse(structuredData);
        },
        { ttlSeconds: 90 },
      );
    } catch (error) {
      this.logger.error('Error calling Python sidecar for Knowledge Graph', error);
      this.metricsService.incrementCounter('scribe.kg.extractions.local.error');
      this.logger.warn('Falling back to MOCK mode for Knowledge Graph extraction');
      return this.extractKnowledgeGraphMock(text, patientId);
    }
  }
}
