/**
 * E2E Coding Stratège (Semaine 3) – Preuve de vie du laboratoire déterministe.
 * Valide SUGGESTING (confiance haute) et SILENT (confiance basse) sans cURL manuel.
 *
 * Note : une seule machine (singleton) par app – acceptable pour le lab ; en prod, une machine par session.
 *
 * Run: nx run api:test-e2e --testPathPattern=coding-scenario
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';

describe('Coding Assistant (Scenario E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  }, 30000);

  it('SCENARIO 1: Détection de la Grippe (Confiance Haute)', async () => {
    await request(app.getHttpServer())
      .post('/api/coding/strategist/input')
      .send({ text: 'Le patient a une forte fièvre et une grippe' })
      .expect(201);

    await new Promise((r) => setTimeout(r, 2500));

    const response = await request(app.getHttpServer())
      .get('/api/coding/strategist/state')
      .expect(200);

    const body = response.body?.data ?? response.body;
    expect(body.value).toBe('SUGGESTING');
    expect(body.shouldDisplay).toBe(true);
    expect(body.context?.suggestions?.length).toBeGreaterThan(0);
    expect(body.context.suggestions[0].code).toBe('J10.1');
  }, 10000);

  it('SCENARIO 2: Silence sur symptômes vagues (Confiance Basse)', async () => {
    await request(app.getHttpServer())
      .post('/api/coding/strategist/input')
      .send({ text: 'Je me sens juste un peu mal et fatigue' })
      .expect(201);

    await new Promise((r) => setTimeout(r, 2500));

    const response = await request(app.getHttpServer())
      .get('/api/coding/strategist/state')
      .expect(200);

    const body = response.body?.data ?? response.body;
    expect(body.value).toBe('SILENT');
    expect(body.shouldDisplay).toBe(false);
  }, 10000);

  afterAll(async () => {
    await app.close();
  });
});
