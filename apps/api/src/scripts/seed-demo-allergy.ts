/**
 * Seed Neo4j : patient démo avec allergie Paracétamol (pour test "Efferalgan" / Doliprane).
 * Le PrescriptionGuard (graphe) doit bloquer Doliprane ET Efferalgan pour ce patient.
 *
 * Usage (racine) : npm run seed:demo-allergy
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

export const DEMO_PATIENT_PARACETAMOL_ID = 'demo-patient-paracetamol';

async function run() {
  const app = await NestFactory.createApplicationContext(IngestCisModule);
  const neo4j = app.get(Neo4jService);

  console.log('🌱 Seed démo : Patient avec allergie Paracétamol\n');

  try {
    await neo4j.executeQuery(`
      MERGE (p:Patient { id: $patientId })
      MERGE (a:Allergy { name: $allergyName })
      MERGE (p)-[:HAS_ALLERGY]->(a)
      RETURN p.id AS patientId
    `, { patientId: DEMO_PATIENT_PARACETAMOL_ID, allergyName: 'paracétamol' });

    console.log(`  Patient "${DEMO_PATIENT_PARACETAMOL_ID}" créé ou mis à jour.`);
    console.log(`  Allergie "paracétamol" liée.`);
    console.log('');
    console.log('  Dans /demo/cabinet : charger "Scénario Paracétamol", puis taper "Prescription Doliprane" ou "Prescription Efferalgan" → ROUGE.');
  } catch (e) {
    console.error('❌ Erreur Neo4j:', (e as Error).message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();
