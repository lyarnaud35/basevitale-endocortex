import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException } from '@nestjs/common';
import { ScribeService } from './scribe.service';
import { MetricsService } from '../common/services/metrics.service';
import { GpuLockService } from '../common/services/gpu-lock.service';
import { ConfigService } from '../common/services/config.service';
import { PrismaService } from '../prisma/prisma.service';
import { GraphProjectorService } from '../knowledge-graph/graph-projector.service';
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
    consultationDraft: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
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

    it('!MOCK + Python OK: POST /process-generic { text, schema }, draft + projection', async () => {
      process.env.AI_MODE = 'LOCAL';
      const text = 'Patient avec fièvre';
      const mockData = {
        patientId: 'patient-py',
        transcript: text,
        symptoms: ['Fièvre'],
        diagnosis: [{ code: 'J11.1', label: 'Grippe', confidence: 0.9 }],
        medications: [{ name: 'Doliprane', dosage: '1g', duration: '7j' }],
      };
      mockHttpService.post.mockReturnValue(of({ data: { data: mockData } }));
      const result = await service.analyze(text);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/process-generic$/),
        expect.objectContaining({ text, schema: expect.any(Object) }),
        expect.any(Object),
      );
      expect(result.patientId).toBe('patient-py');
      expect(mockPrisma.consultationDraft.create).toHaveBeenCalled();
      expect(mockGraphProjector.projectConsultation).toHaveBeenCalledWith('patient-py', expect.any(Object));
    });

    it('!MOCK + Python KO: fallback mock, pas de 503', async () => {
      process.env.AI_MODE = 'LOCAL';
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );
      const result = await service.analyze('Texte');
      expect(ConsultationSchema.parse(result)).toBeDefined();
      expect(result.transcript).toBe('Texte');
      expect(mockPrisma.consultationDraft.create).toHaveBeenCalled();
      expect(mockGraphProjector.projectConsultation).toHaveBeenCalled();
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
});
