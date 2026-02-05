import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import {
  ServiceUnavailableException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ScribeService } from './scribe.service';
import { MetricsService } from '../common/services/metrics.service';
import { GpuLockService } from '../common/services/gpu-lock.service';
import { ConfigService } from '../common/services/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { GraphProjectorService } from '../knowledge-graph/graph-projector.service';
import { GuardianService } from '../knowledge-graph/guardian.service';
import { Neo4jService } from '../neo4j/neo4j.service';
import { ScribeGuardianService } from './guardian.service';
import { ScribeGraphProjectorService } from './graph-projector.service';
import { GraphReaderService } from './graph-reader.service';
import { SecurityService } from '../medical/security.service';
import { getQueueToken } from '@nestjs/bull';
import { of, throwError } from 'rxjs';
import { ConsultationSchema, Consultation } from '@basevitale/shared';

describe('ScribeService', () => {
  let service: ScribeService;
  let httpService: HttpService;
  let metricsService: MetricsService;

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockMetricsService = {
    incrementCounter: jest.fn(),
    recordHistogram: jest.fn(),
    recordTiming: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
  };

  const mockGpuLock = {
    runWithLock: jest.fn(async <T>(fn: () => Promise<T>) => fn()),
  };

  const mockGraphProjector = {
    projectConsultation: jest.fn().mockResolvedValue(undefined),
    projectValidation: jest.fn().mockResolvedValue(3),
  };

  const mockScribeGraphProjector = {
    projectDraft: jest.fn().mockResolvedValue(5),
  };

  const mockGuardian = {
    checkMedicationsAgainstAllergies: jest.fn().mockResolvedValue({ safe: true, conflicts: [] }),
  };

  const mockScribeGuardian = {
    checkSafety: jest.fn().mockResolvedValue({ alerts: [] as string[] }),
  };

  const mockGraphReader = {
    getPatientMedicalProfile: jest.fn().mockResolvedValue({
      patientId: 'patient-1',
      consultations: [{ id: 'c1', date: '2024-01-15' }],
      conditions: [{ code: 'I10', name: 'Hypertension', since: '2023-01-01' }],
      medications: [{ name: 'Amlodipine', dosage: '5mg' }],
      symptomsRecurrent: ['Céphalées'],
    }),
  };

  const mockNeo4j = {
    getConnectionStats: jest.fn().mockReturnValue({ connected: true }),
  };

  const mockSecurityService = {
    validatePrescription: jest.fn().mockResolvedValue({ authorized: true, reason: '' }),
  };

  const mockConfigService = {
    get aiMode(): 'MOCK' | 'CLOUD' | 'LOCAL' {
      return (process.env.AI_MODE || 'MOCK').toUpperCase() as 'MOCK' | 'CLOUD' | 'LOCAL';
    },
    get aiCortexTimeoutMs(): number {
      return 60000;
    },
    get aiServiceUrl(): string {
      // Conformité avec ConfigService réel: en dev local, défaut = localhost
      return process.env.AI_SERVICE_URL || 'http://localhost:8000';
    },
  };

  const mockPrisma = {
    consultationDraft: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const originalEnv = process.env.AI_MODE;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScribeService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: GpuLockService, useValue: mockGpuLock },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GraphProjectorService, useValue: mockGraphProjector },
        { provide: GuardianService, useValue: mockGuardian },
        { provide: Neo4jService, useValue: mockNeo4j },
        { provide: ScribeGuardianService, useValue: mockScribeGuardian },
        { provide: ScribeGraphProjectorService, useValue: mockScribeGraphProjector },
        { provide: GraphReaderService, useValue: mockGraphReader },
        { provide: SecurityService, useValue: mockSecurityService },
        { provide: getQueueToken('scribe-consultation'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<ScribeService>(ScribeService);
    httpService = module.get<HttpService>(HttpService);
    metricsService = module.get<MetricsService>(MetricsService);
    
    // Restaurer l'environnement original
    if (originalEnv) {
      process.env.AI_MODE = originalEnv;
    }

    jest.clearAllMocks();
    mockGpuLock.runWithLock.mockImplementation(
      async <T>(fn: () => Promise<T>) => fn(),
    );
    mockPrisma.consultationDraft.create.mockResolvedValue({ id: 'draft-1' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyze', () => {
    it('MOCK: pas d’appel HTTP, runMockFallback → draft + projection', async () => {
      process.env.AI_MODE = 'MOCK';
      const text = 'Consultation test analyze';
      const result = await service.analyze(text);
      expect(mockHttpService.post).not.toHaveBeenCalled();
      expect(ConsultationSchema.parse(result)).toBeDefined();
      expect(result.transcript).toBe(text);
      expect(mockPrisma.consultationDraft.create).toHaveBeenCalled();
      expect(mockGraphProjector.projectConsultation).toHaveBeenCalled();
    });

    it('LOCAL + Python OK: POST /process { text, mode }, draft + projection', async () => {
      process.env.AI_MODE = 'LOCAL';
      const text = 'Patient avec fièvre';
      const mockData = {
        patientId: 'patient-py',
        transcript: text,
        symptoms: ['Fièvre'],
        diagnosis: [{ code: 'J11.1', label: 'Grippe', confidence: 0.9 }],
        medications: [{ name: 'Doliprane', dosage: '1g', duration: '7j' }],
      };
      mockHttpService.post.mockReturnValue(of({ data: mockData }));
      const result = await service.analyze(text);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/process$/),
        expect.objectContaining({ text, mode: 'PRECISE' }),
        expect.any(Object),
      );
      expect(result.patientId).toBe('patient-py');
      expect(mockPrisma.consultationDraft.create).toHaveBeenCalled();
      expect(mockGraphProjector.projectConsultation).toHaveBeenCalledWith('patient-py', expect.any(Object));
    });

    it('CLOUD + Python OK: POST /process { text, mode: FAST }, draft + projection', async () => {
      process.env.AI_MODE = 'CLOUD';
      const text = 'Angine, fièvre';
      const mockData = {
        patientId: 'pat-001',
        transcript: text,
        symptoms: ['Fièvre', 'Mal de gorge'],
        diagnosis: [{ code: 'J02.9', label: 'Angine', confidence: 0.85 }],
        medications: [{ name: 'Amoxicilline', dosage: '1g', duration: '7 jours' }],
      };
      mockHttpService.post.mockReturnValue(of({ data: mockData }));
      const result = await service.analyze(text);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/process$/),
        expect.objectContaining({ text, mode: 'FAST' }),
        expect.any(Object),
      );
      expect(result.patientId).toBe('pat-001');
      expect(mockPrisma.consultationDraft.create).toHaveBeenCalled();
      expect(mockGraphProjector.projectConsultation).toHaveBeenCalledWith('pat-001', expect.any(Object));
    });

    it('LOCAL + Python KO: 503 "Service IA indisponible" (pas de fallback mock)', async () => {
      process.env.AI_MODE = 'LOCAL';
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );
      await expect(service.analyze('Texte')).rejects.toThrow(ServiceUnavailableException);
      expect(mockPrisma.consultationDraft.create).not.toHaveBeenCalled();
      expect(mockGraphProjector.projectConsultation).not.toHaveBeenCalled();
    });
  });

  describe('analyzeConsultation - MOCK mode', () => {
    beforeEach(() => {
      process.env.AI_MODE = 'MOCK';
    });

    it('should return mock consultation data', async () => {
      const text = 'Le patient présente une fièvre et des maux de tête';
      const patientId = 'patient-123';

      const result = await service.analyzeConsultation(text, patientId);

      // Vérifier que le résultat est conforme au schéma
      expect(ConsultationSchema.parse(result)).toBeDefined();
      expect(result.patientId).toBe(patientId);
      expect(result.transcript).toBe(text);
      expect(Array.isArray(result.symptoms)).toBe(true);
      expect(Array.isArray(result.diagnosis)).toBe(true);
      expect(Array.isArray(result.medications)).toBe(true);
      expect(result.symptoms.length).toBeGreaterThan(0);
      expect(result.diagnosis.length).toBeGreaterThan(0);
    });

    it('should generate patientId if not provided', async () => {
      const text = 'Consultation test';

      const result = await service.analyzeConsultation(text);

      expect(result.patientId).toBeDefined();
      expect(result.patientId).toMatch(/^patient_/);
    });

    it('should increment metrics counter', async () => {
      const text = 'Test consultation';

      await service.analyzeConsultation(text);

      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'scribe.extractions.mock',
      );
    });
  });

  describe('analyzeConsultation - LOCAL mode', () => {
    beforeEach(() => {
      process.env.AI_MODE = 'LOCAL';
      process.env.AI_CORTEX_URL = 'http://localhost:8000';
      process.env.USE_REDIS_QUEUE = 'false';
    });

    it('should call Python sidecar when queue is disabled', async () => {
      const text = 'Test consultation';
      const mockResponse = {
        data: {
          data: {
            patientId: 'patient-123',
            transcript: text,
            symptoms: ['Fièvre'],
            diagnosis: [
              { code: 'J11.1', label: 'Grippe', confidence: 0.85 },
            ],
            medications: [
              { name: 'Paracétamol', dosage: '500mg', duration: '7 jours' },
            ],
          },
        },
      };

      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.analyzeConsultation(text, 'patient-123');

      expect(mockGpuLock.runWithLock).toHaveBeenCalled();
      expect(mockHttpService.post).toHaveBeenCalled();
      const [url, body, opts] = mockHttpService.post.mock.calls[0];
      expect(url).toMatch(/\/process-generic$/);
      expect(body).toEqual(expect.objectContaining({
        text,
        schema: expect.any(Object),
      }));
      expect(opts?.headers?.['Content-Type']).toBe('application/json');
      expect(result.patientId).toBe('patient-123');
      expect(result.symptoms).toContain('Fièvre');
    });

    it('should throw AI Service Unavailable when Python sidecar errors', async () => {
      const text = 'Test consultation';
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Python sidecar unavailable')),
      );

      let err: unknown;
      try {
        await service.analyzeConsultation(text);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect((err as Error).message).toBe('AI Service Unavailable');
    });
  });

  describe('analyzeConsultation - invalid mode', () => {
    it('should fallback to MOCK for unknown mode', async () => {
      process.env.AI_MODE = 'INVALID';

      const text = 'Test consultation';

      // Le service devrait fallback vers MOCK
      const result = await service.analyzeConsultation(text);

      expect(result).toBeDefined();
      expect(ConsultationSchema.parse(result)).toBeDefined();
    });
  });

  describe('updateDraft', () => {
    const existingDraft = {
      id: 'draft-1',
      patientId: 'patient-123',
      status: 'DRAFT',
      structuredData: {
        patientId: 'patient-123',
        transcript: 'Texte initial',
        symptoms: ['Fièvre'],
        diagnosis: [{ code: 'J11.1', label: 'Grippe', confidence: 0.9 }],
        medications: [{ name: 'Doliprane', dosage: '1g', duration: '7j' }],
        billingCodes: [],
        prescription: [{ drug: 'Doliprane', dosage: '1g', duration: '7j' }],
      },
    };
    it('should merge partial, validate, update and return { draft, consultation }', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(existingDraft);
      mockPrisma.consultationDraft.update.mockImplementation(async ({ data }: any) => ({
        id: 'draft-1',
        patientId: 'patient-123',
        status: 'DRAFT',
        updatedAt: new Date(),
        structuredData: data.structuredData,
      }));

      const partial = { symptoms: ['Fièvre', 'Toux'] };
      const res = await service.updateDraft('draft-1', partial);

      expect(mockPrisma.consultationDraft.findUnique).toHaveBeenCalledWith({ where: { id: 'draft-1' } });
      expect(mockPrisma.consultationDraft.update).toHaveBeenCalled();
      expect(res.draft).toBeDefined();
      expect(res.draft.id).toBe('draft-1');
      expect(res.consultation).toBeDefined();
      expect(Array.isArray(res.consultation.symptoms)).toBe(true);
      expect(res.consultation.symptoms).toContain('Toux');
    });

    it('should throw NotFoundException when draft missing', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(null);
      await expect(service.updateDraft('missing', {})).rejects.toThrow('Consultation draft missing not found');
    });
  });

  describe('validateDraft', () => {
    const draft = {
      id: 'draft-1',
      patientId: 'patient-123',
      status: 'DRAFT',
      structuredData: {
        patientId: 'patient-123',
        transcript: 'Consultation',
        symptoms: ['Fièvre'],
        diagnosis: [{ code: 'J11.1', label: 'Grippe', confidence: 0.9 }],
        medications: [{ name: 'Doliprane', dosage: '1g', duration: '7j' }],
        billingCodes: [{ code: 'HBLT001', label: 'Consultation', confidence: 0.85 }],
        prescription: [{ drug: 'Doliprane', dosage: '1g', duration: '7j' }],
      },
    };

    it('should run ÉTAPE A (Postgres VALIDATED) then B (Neo4j Scribe projector), return draft + counts', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(draft);
      mockPrisma.consultationDraft.update.mockResolvedValueOnce({ ...draft, status: 'VALIDATED' });

      const res = await service.validateDraft('draft-1');

      expect(mockPrisma.consultationDraft.findUnique).toHaveBeenCalledWith({ where: { id: 'draft-1' } });
      expect(mockPrisma.consultationDraft.update).toHaveBeenCalledWith({
        where: { id: 'draft-1' },
        data: { status: 'VALIDATED', updatedAt: expect.any(Date) },
      });
      expect(mockScribeGraphProjector.projectDraft).toHaveBeenCalledWith(draft);
      expect(res.draft.status).toBe('VALIDATED');
      expect(res.neo4jRelationsCreated).toBe(5);
      expect(res.nodesCreated).toBe(0);
    });

    it('should return early with warning when already VALIDATED', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce({ ...draft, status: 'VALIDATED' });

      const res = await service.validateDraft('draft-1');

      expect(mockPrisma.consultationDraft.update).not.toHaveBeenCalled();
      expect(mockScribeGraphProjector.projectDraft).not.toHaveBeenCalled();
      expect(res.warning).toBe('Draft was already validated');
      expect(res.nodesCreated).toBe(0);
      expect(res.neo4jRelationsCreated).toBe(0);
    });

    it('should throw NotFoundException when draft missing', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(null);
      await expect(service.validateDraft('missing')).rejects.toThrow('Consultation draft missing not found');
    });

    it('should throw 503 when Neo4j not connected (no Postgres update)', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(draft);
      (mockNeo4j.getConnectionStats as jest.Mock).mockReturnValueOnce({ connected: false });

      await expect(service.validateDraft('draft-1')).rejects.toThrow(ServiceUnavailableException);
      expect(mockPrisma.consultationDraft.update).not.toHaveBeenCalled();
      expect(mockScribeGraphProjector.projectDraft).not.toHaveBeenCalled();
      expect(mockGuardian.checkMedicationsAgainstAllergies).not.toHaveBeenCalled();
    });

    it('should rollback Postgres to DRAFT and throw 500 when Neo4j projection fails', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(draft);
      mockPrisma.consultationDraft.update.mockResolvedValue({ ...draft, status: 'VALIDATED' });
      mockScribeGraphProjector.projectDraft.mockRejectedValueOnce(new Error('Neo4j connection refused'));

      await expect(service.validateDraft('draft-1')).rejects.toThrow(InternalServerErrorException);

      expect(mockScribeGraphProjector.projectDraft).toHaveBeenCalledWith(draft);
      expect(mockPrisma.consultationDraft.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.consultationDraft.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'draft-1' },
        data: { status: 'VALIDATED', updatedAt: expect.any(Date) },
      });
      expect(mockPrisma.consultationDraft.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'draft-1' },
        data: { status: 'DRAFT', updatedAt: expect.any(Date) },
      });
    });

    it('should block validation (C+ Gardien) when medication contra-indiquée', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(draft);
      mockGuardian.checkMedicationsAgainstAllergies.mockResolvedValueOnce({
        safe: false,
        conflicts: [
          {
            medication: 'Amoxicilline',
            allergy: 'pénicilline',
            reason: 'Médication contre-indiquée : Amoxicilline (allergie connue : pénicilline)',
          },
        ],
      });

      await expect(service.validateDraft('draft-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.consultationDraft.update).not.toHaveBeenCalled();
      expect(mockScribeGraphProjector.projectDraft).not.toHaveBeenCalled();
    });
  });

  describe('getPatientIntelligence', () => {
    it('should return summary, timeline, activeAlerts, quickActions', async () => {
      mockGraphReader.getPatientMedicalProfile.mockResolvedValueOnce({
        patientId: 'p1',
        consultations: [{ id: 'c1', date: '2024-06-01' }, { id: 'c2', date: '2024-05-15' }],
        conditions: [{ code: 'I10', name: 'Hypertension', since: '2023-01-01' }],
        medications: [{ name: 'Amlodipine', dosage: '5mg' }],
        symptomsRecurrent: ['Céphalées'],
      });
      mockScribeGuardian.checkSafety.mockResolvedValueOnce({ alerts: [] });

      const res = await service.getPatientIntelligence('p1');

      expect(mockGraphReader.getPatientMedicalProfile).toHaveBeenCalledWith('p1');
      expect(mockScribeGuardian.checkSafety).toHaveBeenCalled();
      expect(res.summary).toContain('1 condition(s)');
      expect(res.summary).toContain('Hypertension');
      expect(res.summary).toContain('1 médicament(s)');
      expect(res.summary).toContain('2 consultation(s)');
      expect(res.timeline).toHaveLength(2);
      expect(res.timeline[0].type).toBe('consultation');
      expect(res.activeAlerts).toEqual([]);
      expect(res.quickActions).toContain('Renouvellement ordonnance');
      expect(res.quickActions).toContain('Planifier prochain RDV');
    });

    it('should map guardian alerts to activeAlerts with level', async () => {
      mockGraphReader.getPatientMedicalProfile.mockResolvedValueOnce({
        patientId: 'p2',
        consultations: [],
        conditions: [],
        medications: [{ name: 'Penicillin' }],
        symptomsRecurrent: [],
      });
      mockScribeGuardian.checkSafety.mockResolvedValueOnce({
        alerts: ['Attention : Allergie Pénicilline détectée (via classe médicamenteuse).'],
      });

      const res = await service.getPatientIntelligence('p2');

      expect(res.activeAlerts).toHaveLength(1);
      expect(res.activeAlerts[0].level).toBe('HIGH');
      expect(res.activeAlerts[0].message).toContain('Pénicilline');
      expect(res.quickActions).toContain('Vérifier alertes');
    });

    it('should return empty intelligence when patient not in Neo4j (no 404)', async () => {
      mockGraphReader.getPatientMedicalProfile.mockRejectedValueOnce(new NotFoundException('Patient x introuvable'));

      const res = await service.getPatientIntelligence('x');

      expect(res.summary).toBe('Aucune donnée enregistrée pour ce patient.');
      expect(res.timeline).toEqual([]);
      expect(res.activeAlerts).toEqual([]);
      expect(res.quickActions).toEqual([]);
      expect(mockScribeGuardian.checkSafety).not.toHaveBeenCalled();
    });
  });
});
