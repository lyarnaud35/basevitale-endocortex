/**
 * Seed Neo4j : scénarios fixtures pour Ben (Deep Roots – bac à sable).
 * 3 profils types : M. Allergique (Pénicilline), Mme Enceinte (Grossesse), M. Standard (facturation).
 *
 * Usage (racine) : npm run seed:scenarios
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

/** IDs pour le frontend / cabinet (scénarios en un clic). */
export const SCENARIO_IDS = {
  /** M. Allergique – Allergie Pénicilline / Amoxicilline. Test : prescrire Amox → BLOQUÉ. */
  ALLERGIQUE: 'scenario-jean-peuplu',
  /** Mme Enceinte – Tag Grossesse (futur : AINS bloqués). */
  ENCEINTE: 'scenario-marie-enceinte',
  /** M. Standard – Aucune contre-indication. Test : facturation (prix total correct). */
  STANDARD: 'scenario-paul-normal',
} as const;

async function run() {
  const app = await NestFactory.createApplicationContext(IngestCisModule);
  const neo4j = app.get(Neo4jService);

  console.log('🌱 Seed Scénarios (fixtures pour Ben)\n');

  try {
    // 1. M. Allergique – Jean Peuplu – Pénicilline + AMOXICILLINE (match direct molécule, showstopper)
    await neo4j.executeQuery(
      `
      MERGE (p:Patient { id: $patientId })
      SET p.displayName = $displayName
      MERGE (a:Allergy { name: $allergyName })
      MERGE (p)-[:HAS_ALLERGY]->(a)
      RETURN p.id AS id
    `,
      {
        patientId: SCENARIO_IDS.ALLERGIQUE,
        displayName: 'Jean Peuplu',
        allergyName: 'pénicilline',
      },
    );
    await neo4j.executeQuery(
      `
      MATCH (p:Patient { id: $patientId })
      MERGE (a:Allergy { name: $allergyName })
      MERGE (p)-[:HAS_ALLERGY]->(a)
      RETURN p.id AS id
    `,
      {
        patientId: SCENARIO_IDS.ALLERGIQUE,
        allergyName: 'amoxicilline',
      },
    );
    console.log('  1. M. Allergique (Jean Peuplu) – allergie Pénicilline + Amoxicilline. Test : Amox → BLOQUÉ.');

    // 2. Mme Enceinte – Marieouth – Condition Grossesse (pour futur bloc AINS)
    await neo4j.executeQuery(
      `
      MERGE (p:Patient { id: $patientId })
      SET p.displayName = $displayName
      MERGE (c:Condition { name: $conditionName })
      MERGE (p)-[:HAS_CONDITION]->(c)
      RETURN p.id AS id
    `,
      {
        patientId: SCENARIO_IDS.ENCEINTE,
        displayName: 'Marie Enceinte',
        conditionName: 'Grossesse',
      },
    );
    console.log('  2. Mme Enceinte (Marie Enceinte) – Condition Grossesse. Futur : Ibuprofène → BLOQUÉ.');

    // 3. M. Standard – Paul Normal – rien de spécial
    await neo4j.executeQuery(
      `
      MERGE (p:Patient { id: $patientId })
      SET p.displayName = $displayName
      RETURN p.id AS id
    `,
      {
        patientId: SCENARIO_IDS.STANDARD,
        displayName: 'Paul Normal',
      },
    );
    console.log('  3. M. Standard (Paul Normal) – aucun risque. Test : facturation (prix total).');

    console.log('\n  IDs pour le cabinet :');
    console.log(`    - M. Allergique : ${SCENARIO_IDS.ALLERGIQUE}`);
    console.log(`    - Mme Enceinte  : ${SCENARIO_IDS.ENCEINTE}`);
    console.log(`    - M. Standard   : ${SCENARIO_IDS.STANDARD}`);
  } catch (e) {
    console.error('❌ Erreur Neo4j:', (e as Error).message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();
