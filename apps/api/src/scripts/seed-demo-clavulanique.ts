/**
 * Seed Neo4j : patient démo allergique à l'acide clavulanique UNIQUEMENT.
 * Test "Augmentin" (Action 3) : Augmentin = Amoxicilline + Acide clavulanique.
 * Le Guardian doit bloquer Augmentin (car contient acide clavulanique), pas un médicament à l'amoxicilline seule.
 *
 * Usage (racine) : npm run seed:demo-clavulanique
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const rootEnv = join(process.cwd(), '..', '..', '.env');
if (existsSync(rootEnv)) {
  const content = readFileSync(rootEnv, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1);
        if (key && val !== undefined) process.env[key] = val;
      }
    }
  }
}

import { NestFactory } from '@nestjs/core';
import { IngestCisModule } from './ingestion/ingest-cis.module';
import { Neo4jService } from '../neo4j/neo4j.service';

export const DEMO_PATIENT_CLAVULANIQUE_ID = 'demo-patient-clavulanique';

async function run() {
  const app = await NestFactory.createApplicationContext(IngestCisModule);
  const neo4j = app.get(Neo4jService);

  console.log('🌱 Seed démo : Patient allergique à l\'acide clavulanique (test Augmentin)\n');

  try {
    await neo4j.executeQuery(
      `
      MERGE (p:Patient { id: $patientId })
      MERGE (a:Allergy { name: $allergyName })
      MERGE (p)-[:HAS_ALLERGY]->(a)
      RETURN p.id AS patientId
    `,
      { patientId: DEMO_PATIENT_CLAVULANIQUE_ID, allergyName: 'acide clavulanique' },
    );

    console.log(`  Patient "${DEMO_PATIENT_CLAVULANIQUE_ID}" créé ou mis à jour.`);
    console.log(`  Allergie "acide clavulanique" uniquement (pas pénicilline).`);
    console.log('');
    console.log('  Dans /demo/cabinet : "Scénario Augmentin" → Prescription Augmentin doit être ROUGE.');
    console.log('  (Augmentin contient Amoxicilline + Acide clavulanique ; le Guardian scanne toutes les molécules.)');
  } catch (e) {
    console.error('❌ Erreur Neo4j:', (e as Error).message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();
