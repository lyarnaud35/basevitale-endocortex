/**
 * Sanity Check BDPM – Audit de qualité du graphe Drug → Molecule.
 * Stratégie "Crash Test" : détecter les médicaments orphelins (sans lien CONTIENT).
 *
 * Usage (racine) : npm run sanity-check:bdpm
 * Prérequis : NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD dans .env
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

async function run() {
  const app = await NestFactory.createApplicationContext(IngestCisModule);
  const neo4j = app.get(Neo4jService);

  console.log('🔍 Sanity Check BDPM – Graphe Drug / Molecule\n');

  try {
    const totalDrugs = await neo4j.executeQuery(`
      MATCH (d:Drug) RETURN count(d) AS c
    `);
    const total = Number(totalDrugs.records[0]?.get('c') ?? 0);

    const orphans = await neo4j.executeQuery(`
      MATCH (d:Drug)
      WHERE NOT (d)-[:CONTIENT]->(:Molecule)
      RETURN count(d) AS DrugsWithoutMolecules
    `);
    const orphanCount = Number(orphans.records[0]?.get('DrugsWithoutMolecules') ?? 0);

    const withMolecules = await neo4j.executeQuery(`
      MATCH (d:Drug)-[:CONTIENT]->(:Molecule)
      RETURN count(DISTINCT d) AS c
    `);
    const linkedCount = Number(withMolecules.records[0]?.get('c') ?? 0);

    const totalMolecules = await neo4j.executeQuery(`
      MATCH (m:Molecule) RETURN count(m) AS c
    `);
    const molecules = Number(totalMolecules.records[0]?.get('c') ?? 0);

    console.log(`  Total Drug (CIS)     : ${total}`);
    console.log(`  Drug avec ≥1 Molecule: ${linkedCount}`);
    console.log(`  Drug SANS Molecule   : ${orphanCount} ${orphanCount > 0 ? '⚠️ ORPHELINS' : '✅'}`);
    console.log(`  Total Molecule       : ${molecules}`);
    console.log('');

    if (orphanCount > 0) {
      console.log('⚠️  VERDICT : Trou de sécurité. Le Guardian ne peut pas vérifier les allergies pour ces médicaments.');
      console.log('   Correctif : affiner l’ingestion (BdpmIngestService / ingest-compo) pour les cas limites ANSM.');
      process.exitCode = 1;
    } else {
      console.log('✅ VERDICT : Aucun médicament orphelin. Le graphe est cohérent pour le Guardian.');
    }
  } catch (e) {
    console.error('❌ Erreur Neo4j:', (e as Error).message);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();
