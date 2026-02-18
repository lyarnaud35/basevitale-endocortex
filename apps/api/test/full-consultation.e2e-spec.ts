/**
 * E2E Full Consultation – Preuve de vie du MVP Cabinet (Deep Roots).
 * Scénario "Jean Peuplu a la Grippe" : Scribe, Sécurité, Prescription, Facturation, Ledger.
 *
 * Prérequis : Neo4j avec seed (seed.cypher), Postgres, API démarrée.
 * Run : nx run api:test-e2e --testPathPattern=full-consultation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';

const PATIENT_ID = 'scenario-jean-peuplu';

describe('Full Consultation E2E (MVP Cabinet)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  }, 30000);

  it('1. Orchestrator/Analyze (Scribe) – note médicale', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orchestrator/analyze')
      .send({
        text: 'Fièvre 39°C, toux sèche. Patient grippé.',
        patientId: PATIENT_ID,
      })
      .expect(200);
    const body = res.body?.data ?? res.body;
    expect(body?.security).toBeDefined();
    expect(body?.suggestions).toBeDefined();
  }, 15000);

  it('2. Prescription Amoxicilline → BLOQUÉ (allergie)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orchestrator/prescribe')
      .send({ drugName: 'Amoxicilline', patientContext: { patientId: PATIENT_ID } })
      .expect(200);
    const body = res.body?.data ?? res.body;
    expect(body?.status).toBe('BLOCKED');
    const reason = body?.securityData?.context?.blockReason ?? body?.feedback ?? '';
    expect(reason).toMatch(/allerg|pénicillin|bétalactam|amoxicillin/i);
  }, 10000);

  it('3. Prescription Doliprane → OK', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orchestrator/prescribe')
      .send({ drugName: 'Doliprane', patientContext: { patientId: PATIENT_ID } })
      .expect(200);
    const body = res.body?.data ?? res.body;
    expect(body?.status).toBe('SECURE');
  }, 10000);

  it('4. Billing Quote – C + MEG (enfant) + Nuit', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/billing/quote')
      .send({
        patientId: PATIENT_ID,
        acts: ['C'],
        modifiers: ['NUIT'],
      })
      .expect(201);
    const body = res.body?.data ?? res.body;
    expect(body?.lines).toBeDefined();
    expect(Array.isArray(body.lines)).toBe(true);
    expect(body.total).toBeGreaterThan(0);
    expect(body.totalAMO).toBeGreaterThan(0);
    expect(body.totalAMC).toBeGreaterThanOrEqual(0);
  }, 5000);

  it('5. Billing Validate – création facture (Ledger)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/billing/validate')
      .send({
        patientId: PATIENT_ID,
        acts: ['C'],
        modifiers: ['NUIT'],
        age: 4,
      })
      .expect(201);
    const body = res.body?.data ?? res.body;
    expect(body?.id).toBeDefined();
    expect(body?.status).toBe('VALIDATED');
    expect(body?.totalAmount).toBeGreaterThan(0);
    expect(body?.createdAt).toBeDefined();
  }, 5000);

  it('6. Facture persistée avec snapshot', async () => {
    const activityRes = await request(app.getHttpServer())
      .get('/api/billing/daily-activity')
      .expect(200);
    const activity = activityRes.body?.data ?? activityRes.body;
    expect(activity?.invoices).toBeDefined();
    expect(Array.isArray(activity.invoices)).toBe(true);
    const lastInvoice = activity.invoices[0];
    expect(lastInvoice).toBeDefined();
    expect(lastInvoice.acts).toContain('C');
    expect(lastInvoice.status).toBe('VALIDATED');
    expect(lastInvoice.totalAmount).toBeGreaterThan(0);

    const detailRes = await request(app.getHttpServer())
      .get(`/api/billing/invoice/${lastInvoice.id}`)
      .expect(200);
    const detail = detailRes.body?.data ?? detailRes.body;
    expect(detail?.breakdown).toBeDefined();
    expect(detail?.rulesVersion).toBeDefined();
  }, 5000);

  afterAll(async () => {
    await app.close();
  });
});
