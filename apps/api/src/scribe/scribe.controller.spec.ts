import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ScribeController } from './scribe.controller';
import { ScribeService } from './scribe.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { PrismaService } from '../prisma/prisma.service';
import { Neo4jService } from '../neo4j/neo4j.service';
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

const mockScribeService = {
  analyze: jest.fn().mockResolvedValue(mockConsultation),
  analyzeConsultation: jest.fn().mockResolvedValue(mockConsultation),
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

const mockKnowledgeGraphService = {
  createNodes: jest.fn().mockResolvedValue([
    { id: 'node-1', nodeType: 'SYMPTOM', label: 'Toux', cim10Code: null, confidence: null },
  ]),
};

const mockNeo4jService = {
  executeTransaction: jest.fn().mockResolvedValue([{ summary: () => ({ counters: { relationshipsCreated: () => 2 } }) }]),
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
        { provide: KnowledgeGraphService, useValue: mockKnowledgeGraphService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: Neo4jService, useValue: mockNeo4jService },
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
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(mockDraft);
      mockPrisma.consultationDraft.update.mockResolvedValueOnce({
        ...mockDraft,
        structuredData: mockConsultation,
        updatedAt: new Date(),
      });
      const body = { structuredData: mockConsultation };
      const res = await controller.updateDraft('draft-1', body);
      expect(res.consultation).toEqual(mockConsultation);
      expect(mockPrisma.consultationDraft.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when draft missing', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(null);
      await expect(
        controller.updateDraft('missing', { structuredData: mockConsultation }),
      ).rejects.toThrow(NotFoundException);
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
    it('should validate draft, create nodes and return result', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(mockDraft);
      const res = await controller.validateDraft('draft-1');
      expect(res.draft.status).toBe('VALIDATED');
      expect(res.nodesCreated).toBeGreaterThanOrEqual(0);
      expect(mockKnowledgeGraphService.createNodes).toHaveBeenCalled();
      expect(mockPrisma.consultationDraft.update).toHaveBeenCalled();
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith('scribe.validation.started');
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith('scribe.validation.success');
    });

    it('should return early when draft already validated', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(mockValidatedDraft);
      const res = await controller.validateDraft('draft-1');
      expect(res.warning).toBe('Draft was already validated');
      expect(res.nodesCreated).toBe(0);
      expect(mockKnowledgeGraphService.createNodes).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when draft missing', async () => {
      mockPrisma.consultationDraft.findUnique.mockResolvedValueOnce(null);
      await expect(controller.validateDraft('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
