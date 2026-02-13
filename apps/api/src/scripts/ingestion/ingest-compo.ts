/**
 * Pipeline d'ingestion CIS_COMPO (Compositions) – Tissage Moléculaire.
 * Crée (:Molecule) et (Drug)-[:CONTIENT {dosage}]->(Molecule). Uniquement Substances Actives (SA).
 *
 * Usage: depuis racine → npm run ingest:compo
 * Prérequis: ingest:cis déjà exécuté (Drug existants), NEO4J_* dans .env.
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
import { IngestCisModule } from './ingest-cis.module';
import { Neo4jService } from '../../neo4j/neo4j.service';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import * as iconv from 'iconv-lite';

const BATCH_SIZE = 1000;

/** Une ligne de composition (SA uniquement) : Drug cisId → Molecule code + dosage */
interface CompoRow {
  cisId: string;
  substanceCode: string;
  substanceName: string;
  dosage: string;
}

async function processBatch(neo4j: Neo4jService, batch: CompoRow[]): Promise<void> {
  const query = `
    UNWIND $batch AS row
    MATCH (d:Drug {cisId: row.cisId})
    MERGE (m:Molecule {code: row.substanceCode})
    ON CREATE SET m.name = row.substanceName
    MERGE (d)-[r:CONTIENT]->(m)
    SET r.dosage = row.dosage
  `;
  await neo4j.executeQuery(query, { batch });
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(IngestCisModule);
  const neo4jService = app.get(Neo4jService);

  console.log('🧪 Démarrage du Tissage Moléculaire (Compositions)...');

  const filePath = path.join(process.cwd(), 'src/scripts/ingestion/data/CIS_COMPO_bdpm.txt');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier introuvable : ${filePath}`);
    await app.close();
    process.exit(1);
  }

  console.log('🏗️  Création de l\'index Moléculaire...');
  try {
    await neo4jService.executeQuery(`
      CREATE CONSTRAINT molecule_code_unique IF NOT EXISTS
      FOR (m:Molecule) REQUIRE m.code IS UNIQUE
    `);
  } catch (e: any) {
    if (!e?.message?.includes('already exists')) console.warn('Constraint:', e?.message ?? e);
  }

  const results: CompoRow[] = [];
  let processedCount = 0;

  const stream = fs
    .createReadStream(filePath)
    .pipe(iconv.decodeStream('latin1'))
    .pipe(
      csv({
        separator: '\t',
        headers: [
          'cisId',
          'elemType',
          'substanceCode',
          'substanceName',
          'dosage',
          'reference',
          'nature',
          'linkId',
        ],
        skipLines: 0,
      })
    );

  for await (const row of stream as AsyncIterable<Record<string, string>>) {
    const nature = (row.nature ?? row.elemType ?? '').trim();
    if (nature !== 'SA') continue;

    const cisId = (row.cisId ?? '').trim();
    const substanceCode = (row.substanceCode ?? '').trim();
    const substanceName = (row.substanceName ?? '').trim();
    if (!cisId || !substanceCode || !substanceName) continue;

    results.push({
      cisId,
      substanceCode,
      substanceName,
      dosage: (row.dosage ?? '').trim(),
    });

    if (results.length >= BATCH_SIZE) {
      await processBatch(neo4jService, results);
      processedCount += results.length;
      console.log(`🔗 ${processedCount} liens moléculaires tissés...`);
      results.length = 0;
    }
  }

  if (results.length > 0) {
    await processBatch(neo4jService, results);
    processedCount += results.length;
  }

  console.log(`🎉 Terminé ! L'intelligence chimique est activée.`);
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
