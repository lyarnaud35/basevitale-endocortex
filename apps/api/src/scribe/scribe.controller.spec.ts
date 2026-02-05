import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ServiceUnavailableException, InternalServerErrorException } from '@nestjs/common';
import { ScribeController } from './scribe.controller';
import { ScribeService } from './scribe.service';
import { ScribeGraphProjectorService } from './graph-projector.service';
import { GraphReaderService } from './graph-reader.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScribeHealthService } from './scribe.health.service';
import { MetricsService } from '../common/services/metrics.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { ConsultationSchema } from '@basevitale/shared';

const mockConsultation = {
  patientId: 'patient-123',
  transcript: 'Le patient tousse et a de la fièvre.',
  symptoms: ['Toux', 'Fièvre'],
  diagnosis: [{ code: 'J00', label: 'Rhinopharyngite', confidence: 0.9 }],
  medications: [{ name: 'Paracétamol', dosage: '500mg', duration: '5 jours' }],
  billingCodes: [{ code: 'HBLT001', label: 'Consultation au cabinet', confidence: 0.9 }],
  prescription: [{ drug: 'Paracétamol', dosage: '500mg', duration: '5 jours' }],
};

const mockDraft = {
  id: 'draft-1',
  patientId: 'patient-123',
  status: 'DRAFT',
  structuredData: mockConsultation,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockValidatedDraft = { ...mockDraft, status: 'VALIDATED' as const };

const mockIntelligence = {
  summary: 'Patient avec 1 consultation(s). Suivi régulier.',
  timeline: [{ date: '2025-01-01', type: 'consultation', summary: 'Consultation du 2025-01-01' }],
  activeAlerts: [] as { level: 'HIGH' | 'MEDIUM'; message: string }[],
  quickActions: ['Planifier prochain RDV'],
};

const mockScribeService = {
  analyze: jest.fn().mockResolvedValue(mockConsultation),
  analyzeConsultation: jest.fn().mockResolvedValue(mockConsultation),
  updateDraft: jest.fn().mockResolvedValue({
    draft: { id: 'draft-1', patientId: 'patient-123', status: 'DRAFT', updatedAt: new Date() },
    consultation: mockConsultation,
  }),
  validateDraft: jest.fn().mockResolvedValue({
    draft: { id: 'draft-1', patientId: 'patient-123', status: 'VALIDATED' },
    nodesCreated: 0,
    neo4jRelationsCreated: 2,
  }),
  getPatientIntelligence: jest.fn().mockResolvedValue(mockIntelligence),
};

const mockPrisma = {
  consultationDraft: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  patient: {
    findUnique: jest.fn(),
  },
};

const mockScribeHealthService = {
  checkHealth: jest.fn().mockResolvedValue({
    status: 'healthy',
    postgres: { connected: true, latency: 1 },
    neo4j: { connected: true, latency: 2 },
    redis: { connected: true, latencyMs: 1 },
    message: 'Module Scribe opérationnel',
  }),
  getStats: jest.fn().mockResolvedValue({
    totalDrafts: 10,
    validatedDrafts: 5,
    draftDrafts: 5,
    totalSemanticNodes: 42,
  }),
};

const mockMetricsService = {
  incrementCounter: jest.fn(),
  recordTiming: jest.fn(),
  getMetrics: jest.fn().mockReturnValue({
    counters: { 'scribe.validation.success': 5, 'scribe.analyze.local.success': 2 },
    values: {},
    timings: { 'scribe.validation.duration': { count: 5, avg: 120, min: 80, max: 200 } },
  }),
};

const mockScribeGraphProjector = {
  projectDraft: jest.fn().mockResolvedValue(0),
};

const mockGraphReaderService = {
  getPatientMedicalProfile: jest.fn().mockResolvedValue({
    patientId: 'patient-123',
    consultations: [{ id: 'c1', date: '2025-01-01' }],
    conditions: [],
    medications: [],
    symptomsRecurrent: ['Toux'],
  }),
};

describe('ScribeController', () => {
  let controller: ScribeController;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.consultationDraft.findUnique.mockResolvedValue(null);
    mockPrisma.consultationDraft.create.mockResolvedValue(mockDraft);
    mockPrisma.consultationDraft.update.mockResolvedValue(mockValidatedDraft);
    mockPrisma.patient.findUnique.mockResolvedValue({ id: 'patient-123' });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScribeController],
      providers: [
        { provide: ScribeService, useValue: mockScribeService },
        { provide: ScribeGraphProjectorService, useValue: mockScribeGraphProjector },
        { provide: GraphReaderService, useValue: mockGraphReaderService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScribeHealthService, useValue: mockScribeHealthService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ScribeController>(ScribeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /scribe/analyze', () => {
    it('should return consultation from service', async () => {
      const body = { text: 'Le patient tousse.' };
      const res = await controller.analyze(body);
      expect(ConsultationSchema.parse(res)).toBeDefined();
      expect(res.symptoms).toEqual(mockConsultation.symptoms);
      expect(mockScribeService.analyze).toHaveBeenCalledWith('Le patient tousse.');
    });

    it('should reject empty text after sanitization', async () => {
      mockScribeService.analyze.mockRejectedValueOnce(new BadRequestException('Le texte est vide après nettoyage'));
      const body = { text: '   ' };
      await expect(controller.analyze(body)).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /scribe/process-dictation', () => {
    it('should create draft and return consultation', async () => {
      const body = { text: 'Le patient tousse.', patientId: 'patient-123' };
      const res = await controller.processDictation(body);
      expect(res.draft.id).toBe('draft-1');
      expect(res.draft.status).toBe('DRAFT');
      expect(res.consultation).toEqual(mockConsultation);
      expect(mockPrisma.consultationDraft.create).toHaveBeenCalled();
      expect(mockScribeService.analyzeConsultation).toHaveBeenCalledWith('Le patient tousse.', 'patient-123');
    });
  });

  describe('GET /scribe/drafts', () => {
    it('should return paginated drafts', async () => {
      const items = [
        { id: 'd1', patientId: 'p1', status: 'DRAFT', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockPrisma.consultationDraft.findMany.mockResolvedValueOnce(items);
      mockPrisma.consultationDraft.count.mockResolvedValueOnce(1);
      const res = await controller.listDrafts(undefined, '20', '0');
      expect(res.items).toEqual(items);
      expect(res.total).toBe(1);
      expect(res.limit).toBe(20);
      expect(res.offset).toBe(0);
      expect(mockPrisma.consultationDraft.findMany).toHaveBeenCalled();
      expect(mockPrisma.consultationDraft.count).toHaveBeenCalled();
    });
  });

  describe('GET /scribe/draft/:id', () => {
    it('should return draft when found', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(mockDraft);
      const res = await controller.getDraft('draft-1');
      expect(res.draft.id).toBe('draft-1');
      expect(res.consultation).toEqual(mockConsultation);
    });

    it('should throw NotFoundException when draft missing', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(null);
      await expect(controller.getDraft('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('PUT /scribe/draft/:id', () => {
    it('should update draft with validated structuredData', async () => {
      const body = { structuredData: mockConsultation };
      const res = await controller.updateDraft('draft-1', body);
      expect(mockScribeService.updateDraft).toHaveBeenCalledWith('draft-1', mockConsultation);
      expect(res.consultation).toEqual(mockConsultation);
      expect(res.draft).toBeDefined();
      expect(res.draft.id).toBe('draft-1');
    });

    it('should throw NotFoundException when draft missing', async () => {
      mockScribeService.updateDraft.mockRejectedValueOnce(new NotFoundException('Consultation draft missing not found'));
      await expect(
        controller.updateDraft('missing', { structuredData: mockConsultation }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /scribe/patient/:patientId/profile', () => {
    it('should return patient medical profile', async () => {
      const profile = await controller.getPatientProfile('patient-123');
      expect(profile.patientId).toBe('patient-123');
      expect(profile.consultations).toHaveLength(1);
      expect(profile.consultations[0].id).toBe('c1');
      expect(profile.symptomsRecurrent).toContain('Toux');
      expect(mockGraphReaderService.getPatientMedicalProfile).toHaveBeenCalledWith('patient-123');
    });

    it('should throw when graph reader throws', async () => {
      mockGraphReaderService.getPatientMedicalProfile.mockRejectedValueOnce(new NotFoundException('Patient xyz introuvable'));
      await expect(controller.getPatientProfile('xyz')).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /scribe/patient/:patientId/intelligence', () => {
    it('should return human-ready intelligence', async () => {
      const res = await controller.getPatientIntelligence('patient-123');
      expect(res.summary).toBe(mockIntelligence.summary);
      expect(res.timeline).toHaveLength(1);
      expect(res.activeAlerts).toEqual([]);
      expect(res.quickActions).toContain('Planifier prochain RDV');
      expect(mockScribeService.getPatientIntelligence).toHaveBeenCalledWith('patient-123');
    });

    it('should return empty intelligence when patient unknown (no 404)', async () => {
      const empty = {
        summary: 'Aucune donnée enregistrée pour ce patient.',
        timeline: [],
        activeAlerts: [],
        quickActions: [],
      };
      mockScribeService.getPatientIntelligence.mockResolvedValueOnce(empty);
      const res = await controller.getPatientIntelligence('xyz');
      expect(res).toEqual(empty);
      expect(mockScribeService.getPatientIntelligence).toHaveBeenCalledWith('xyz');
    });
  });

  describe('GET /scribe/health', () => {
    it('should return health payload', async () => {
      const res = await controller.getHealth();
      expect(res.status).toBe('healthy');
      expect(res.timestamp).toBeDefined();
      expect(mockScribeHealthService.checkHealth).toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException on checkHealth error', async () => {
      mockScribeHealthService.checkHealth.mockRejectedValueOnce(new Error('DB down'));
      await expect(controller.getHealth()).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('GET /scribe/stats', () => {
    it('should return stats and scribe metrics', async () => {
      const res = await controller.getStats();
      expect(res.totalDrafts).toBe(10);
      expect(res.metrics.counters).toBeDefined();
      expect(res.metrics.timings).toBeDefined();
      expect(res.timestamp).toBeDefined();
    });
  });

  describe('PUT /scribe/validate/:id', () => {
    it('should validate draft via service and return result', async () => {
      const res = await controller.validateDraft('draft-1');
      expect(mockScribeService.validateDraft).toHaveBeenCalledWith('draft-1');
      expect(res.draft.status).toBe('VALIDATED');
      expect(res.nodesCreated).toBe(0);
      expect(res.neo4jRelationsCreated).toBe(2);
      expect(res.nodes).toEqual([]);
    });

    it('should return early when draft already validated', async () => {
      mockScribeService.validateDraft.mockResolvedValueOnce({
        draft: { id: 'draft-1', patientId: 'patient-123', status: 'VALIDATED' },
        nodesCreated: 0,
        neo4jRelationsCreated: 0,
        warning: 'Draft was already validated',
      });
      const res = await controller.validateDraft('draft-1');
      expect(res.warning).toBe('Draft was already validated');
      expect(res.nodesCreated).toBe(0);
    });

    it('should throw NotFoundException when draft missing', async () => {
      mockScribeService.validateDraft.mockRejectedValueOnce(new NotFoundException('Consultation draft missing not found'));
      await expect(controller.validateDraft('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /scribe/validate/:draftId (validateFinal)', () => {
    it('should delegate to validateDraft and return { success, graphNodesCreated }', async () => {
      mockScribeService.validateDraft.mockResolvedValueOnce({
        draft: { id: 'draft-1', patientId: 'patient-123', status: 'VALIDATED' },
        nodesCreated: 0,
        neo4jRelationsCreated: 5,
      });

      const res = await controller.validateFinal('draft-1');

      expect(res).toEqual({ success: true, graphNodesCreated: 5 });
      expect(mockScribeService.validateDraft).toHaveBeenCalledWith('draft-1');
    });

    it('should throw NotFoundException when draft missing', async () => {
      mockScribeService.validateDraft.mockRejectedValueOnce(new NotFoundException('Consultation draft missing not found'));
      await expect(controller.validateFinal('missing')).rejects.toThrow(NotFoundException);
      expect(mockScribeService.validateDraft).toHaveBeenCalledWith('missing');
    });

    it('should throw BadRequestException when Guardian blocks (allergy)', async () => {
      mockScribeService.validateDraft.mockRejectedValueOnce(new BadRequestException('INTERDICTION CRITIQUE : Patient allergique à Pénicilline.'));
      await expect(controller.validateFinal('draft-1')).rejects.toThrow(BadRequestException);
      expect(mockScribeService.validateDraft).toHaveBeenCalledWith('draft-1');
    });

    it('should throw InternalServerErrorException when validateDraft fails', async () => {
      mockScribeService.validateDraft.mockRejectedValueOnce(new Error('Neo4j connection refused'));

      await expect(controller.validateFinal('draft-1')).rejects.toThrow(InternalServerErrorException);
      expect(mockScribeService.validateDraft).toHaveBeenCalledWith('draft-1');
    });
  });
});
