/**
 * E2E Scribe - Flux complet : API + JSON + Prisma
 *
 * - POST /scribe/analyze (MOCK) : vérification JSON + enregistrement en base
 * - POST /scribe/analyze (LOCAL) : idem si Python accessible (optionnel)
 *
 * Prérequis : Postgres (DATABASE_URL), Redis. Pour LOCAL : Python sur :8000.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConsultationSchema, type Consultation } from '@basevitale/shared';

function assertConsultationShape(data: unknown): asserts data is Consultation {
  const parsed = ConsultationSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Invalid consultation shape: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }
}

async function isPythonSidecarUp(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:8000/health');
    return res.ok;
  } catch {
    return false;
  }
}

async function createApp(aiMode: 'MOCK' | 'LOCAL'): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const prev = process.env.AI_MODE;
  process.env.AI_MODE = aiMode;
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  process.env.AI_MODE = prev;

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma };
}

describe('Scribe E2E', () => {
  describe('POST /api/scribe/analyze (MOCK)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    const uniqueText = `E2E_ANALYZE_${Date.now()}_Patient avec fièvre 39°C et toux sèche.`;

    beforeAll(async () => {
      const out = await createApp('MOCK');
      app = out.app;
      prisma = out.prisma;
    }, 35000);

    afterAll(async () => {
      await app?.close();
    });

    it('retourne 200 et un JSON conforme à ConsultationSchema', async () => {
      const { body, status } = await request(app.getHttpServer())
        .post('/api/scribe/analyze')
        .send({ text: uniqueText })
        .expect('Content-Type', /json/);

      expect(status).toBe(200);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      assertConsultationShape(body.data);

      const c = body.data as Consultation;
      expect(c.transcript).toBe(uniqueText);
      expect(Array.isArray(c.symptoms)).toBe(true);
      expect(c.symptoms.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(c.diagnosis)).toBe(true);
      expect(c.diagnosis.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(c.medications)).toBe(true);
    });

    it('persiste un ConsultationDraft en base (Prisma)', async () => {
      const drafts = await prisma.consultationDraft.findMany({
        where: { status: 'DRAFT' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      const draft = drafts.find(
        (d) =>
          (d.structuredData as { transcript?: string })?.transcript ===
          uniqueText,
      );
      expect(draft).toBeDefined();
      expect(draft!.structuredData).toBeDefined();
      const sd = draft!.structuredData as Record<string, unknown>;
      expect(sd.transcript).toBe(uniqueText);
      expect(Array.isArray(sd.symptoms)).toBe(true);
      expect(Array.isArray(sd.diagnosis)).toBe(true);
      expect(Array.isArray(sd.medications)).toBe(true);
    });
  });

  describe('POST /api/scribe/analyze (LOCAL)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let skipLocal = true;
    const uniqueTextLocal = `E2E_LOCAL_${Date.now()}_Patient nausées et douleurs abdominales.`;

    beforeAll(async () => {
      const pythonUp = await isPythonSidecarUp();
      if (!pythonUp) {
        console.warn(
          'Python sidecar (localhost:8000) non accessible — skip LOCAL E2E',
        );
        return;
      }
      skipLocal = false;
      const out = await createApp('LOCAL');
      app = out.app;
      prisma = out.prisma;
    }, 35000);

    afterAll(async () => {
      await app?.close?.();
    });

    it('retourne 200, JSON valide et persiste en base si Python est disponible', async () => {
      if (skipLocal) return;

      const { body, status } = await request(app.getHttpServer())
        .post('/api/scribe/analyze')
        .send({ text: uniqueTextLocal })
        .expect('Content-Type', /json/);

      expect(status).toBe(200);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      assertConsultationShape(body.data);

      const c = body.data as Consultation;
      expect(c.transcript).toBe(uniqueTextLocal);
      expect(c.symptoms.length).toBeGreaterThanOrEqual(1);
      expect(c.diagnosis.length).toBeGreaterThanOrEqual(1);

      const drafts = await prisma.consultationDraft.findMany({
        where: { status: 'DRAFT' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      const draft = drafts.find(
        (d) =>
          (d.structuredData as { transcript?: string })?.transcript ===
          uniqueTextLocal,
      );
      expect(draft).toBeDefined();
      expect(
        (draft!.structuredData as Record<string, unknown>).transcript,
      ).toBe(uniqueTextLocal);
    });
  });
});
