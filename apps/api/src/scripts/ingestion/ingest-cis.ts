/**
 * Pipeline d'ingestion CIS (BDPM) – Streaming, Batching, Idempotence.
 * Usage: depuis apps/api → npx ts-node -P tsconfig.app.json src/scripts/ingestion/ingest-cis.ts
 * Ou depuis racine → npm run ingest:cis
 *
 * Principes : Stream (Latin-1 → UTF-8), Batch UNWIND (1000), MERGE (idempotent).
 * Prérequis : NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD (chargés depuis .env à la racine).
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

interface DrugRow {
  cisId: string;
  name: string;
  form: string;
  administration: string[];
  holder: string;
  status: string;
}

async function processBatch(neo4j: Neo4jService, batch: DrugRow[]): Promise<void> {
  const query = `
    UNWIND $batch AS row
    MERGE (d:Drug {cisId: row.cisId})
    ON CREATE SET
      d.name = row.name,
      d.form = row.form,
      d.administration = row.administration,
      d.holder = row.holder,
      d.status = row.status,
      d.createdAt = datetime()
    ON MATCH SET
      d.name = row.name,
      d.form = row.form,
      d.administration = row.administration,
      d.holder = row.holder,
      d.status = row.status,
      d.updatedAt = datetime()
  `;
  await neo4j.executeQuery(query, { batch });
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(IngestCisModule);
  const neo4jService = app.get(Neo4jService);

  console.log("🚀 Démarrage du Pipeline d'Ingestion CIS (Médicaments)...");

  const filePath = path.join(process.cwd(), 'src/scripts/ingestion/data/CIS_bdpm.txt');

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier introuvable : ${filePath}`);
    await app.close();
    process.exit(1);
  }

  const results: DrugRow[] = [];
  let processedCount = 0;

  const stream = fs
    .createReadStream(filePath)
    .pipe(iconv.decodeStream('latin1'))
    .pipe(
      csv({
        separator: '\t',
        headers: [
          'cisId',
          'name',
          'form',
          'administration',
          'status',
          'procedure',
          'commercial',
          'dateAMM',
          'statusBdm',
          'numberEU',
          'holder',
          'surveillance',
        ],
        skipLines: 0,
      })
    );

  for await (const row of stream as AsyncIterable<Record<string, string>>) {
    const administrationRaw = (row.administration ?? '').trim();
    const administration = administrationRaw
      ? administrationRaw.split(';').map((s) => s.trim()).filter(Boolean)
      : [];

    const drug: DrugRow = {
      cisId: (row.cisId ?? '').trim(),
      name: (row.name ?? '').trim(),
      form: (row.form ?? '').trim(),
      administration,
      holder: (row.holder ?? '').trim(),
      status: (row.commercial ?? '').trim(),
    };

    if (!drug.cisId) continue;

    results.push(drug);

    if (results.length >= BATCH_SIZE) {
      await processBatch(neo4jService, results);
      processedCount += results.length;
      console.log(`✅ ${processedCount} médicaments ingérés...`);
      results.length = 0;
    }
  }

  if (results.length > 0) {
    await processBatch(neo4jService, results);
    processedCount += results.length;
  }

  console.log('🏗️  Création des index de performance...');
  try {
    await neo4jService.executeQuery(`
      CREATE CONSTRAINT drug_cis_unique IF NOT EXISTS
      FOR (d:Drug) REQUIRE d.cisId IS UNIQUE
    `);
  } catch (e: any) {
    if (!e?.message?.includes('already exists')) console.warn('Constraint:', e?.message ?? e);
  }

  try {
    await neo4jService.executeQuery(`
      CREATE FULLTEXT INDEX drugNameSearch IF NOT EXISTS
      FOR (d:Drug) ON EACH [d.name]
    `);
  } catch (e: any) {
    console.log('⚠️ Index Fulltext déjà existant ou non supporté par cette version Neo4j.');
  }

  console.log(`🎉 Terminé ! ${processedCount} médicaments sont maintenant dans le Cortex.`);
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
