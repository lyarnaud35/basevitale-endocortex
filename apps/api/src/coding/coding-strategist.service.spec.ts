import { Test, TestingModule } from '@nestjs/testing';
import { CodingStrategistService } from './coding-strategist.service';
import { CodingSimulatorService } from './coding-simulator.service';

/**
 * Sanity check multi-tenant : isolation stricte entre sessions.
 * Session A reçoit "Grippe" → SUGGESTING ; Session B reste IDLE sans fuite de données.
 */
describe('CodingStrategistService (isolation)', () => {
  let service: CodingStrategistService;

  const mockSimulator = {
    analyzeText: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSimulator.analyzeText.mockImplementation((text: string) => {
      const lower = text.toLowerCase();
      if (lower.includes('grippe')) {
        return Promise.resolve({
          type: 'ANALYSIS_COMPLETE',
          data: [
            { code: 'J10.1', label: 'Grippe, virus identifié', confidence: 0.95 },
          ],
        });
      }
      return Promise.resolve({ type: 'ANALYSIS_COMPLETE', data: [] });
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodingStrategistService,
        {
          provide: CodingSimulatorService,
          useValue: mockSimulator,
        },
      ],
    }).compile();

    service = module.get<CodingStrategistService>(CodingStrategistService);
  });

  afterEach(async () => {
    service.destroySession('sessionA');
    service.destroySession('sessionB');
  });

  it('session A reçoit "Grippe" → SUGGESTING ; session B reste IDLE sans fuite', async () => {
    service.updateInput('sessionA', 'Le patient a la grippe');
    await new Promise((r) => setTimeout(r, 600));
    await new Promise((r) => setTimeout(r, 400));

    const snapshotA = service.getSnapshot('sessionA');
    expect(snapshotA.value).toBe('SUGGESTING');
    expect(snapshotA.context.currentInput).toContain('grippe');
    expect(snapshotA.context.suggestions?.length).toBeGreaterThan(0);
    expect(snapshotA.context.suggestions?.[0]).toMatchObject({ code: 'J10.1' });

    service.getOrCreateActor('sessionB');
    const snapshotB = service.getSnapshot('sessionB');
    expect(snapshotB.value).toBe('IDLE');
    expect(snapshotB.context.currentInput).toBe('');
    expect(snapshotB.context.suggestions).toEqual([]);
  }, 10000);

  it('rejette les sessionId invalides', () => {
    expect(service.getOrCreateActor('')).toBeNull();
    expect(service.getOrCreateActor('  ')).toBeNull();
    expect(service.getSnapshot('')).toMatchObject({ value: 'IDLE', shouldDisplay: false });
  });
});
