/**
 * ETL BDPM – Import massif ANSM → Neo4j (The Great Ingestion).
 * Lecture en stream (pas de saturation RAM), encodage Latin-1 → UTF-8,
 * normalisation des noms de molécules (trim + majuscules) pour éviter la fragmentation du graphe.
 *
 * Usage (racine) : npm run import:bdpm
 * Optionnel       : npm run import:bdpm -- --download  (télécharge d’abord les fichiers)
 * Prérequis       : NEO4J_* dans .env, fichiers dans data/bdpm/ ou --download
 */
import { readFileSync, existsSync, createReadStream } from 'fs';
import { join } from 'path';
import * as iconv from 'iconv-lite';
import csv from 'csv-parser';

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

const BATCH_SIZE = 1000;
const DATA_DIR = join(process.cwd(), 'data', 'bdpm');
const CIS_FILE = 'CIS_bdpm.txt';
const COMPO_FILE = 'CIS_COMPO_bdpm.txt';
/** Présentations / conditionnements (CIP7, CIP13) – facturation Ghost. */
const CIP_FILE = 'CIS_CIP_bdpm.txt';

/** Normalise le nom de molécule : trim + majuscules pour éviter PARACETAMOL vs Paracétamol. */
function normalizeMoleculeName(name: string): string {
  return (name ?? '').trim().toUpperCase();
}

function streamTsv(path: string): NodeJS.ReadableStream {
  return createReadStream(path).pipe(iconv.decodeStream('latin1'));
}

/** Parse un prix (virgule ou point, espaces). Retourne null si invalide. */
function parsePrix(raw: string): number | null {
  const s = (raw ?? '').trim().replace(/,/, '.');
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function ensureConstraints(neo4j: Neo4jService) {
  const queries = [
    'CREATE CONSTRAINT drug_cis_id IF NOT EXISTS FOR (d:Drug) REQUIRE d.cisId IS UNIQUE',
    'CREATE CONSTRAINT molecule_code_unique IF NOT EXISTS FOR (m:Molecule) REQUIRE m.code IS UNIQUE',
    'CREATE CONSTRAINT pack_cip13 IF NOT EXISTS FOR (p:Pack) REQUIRE p.cip13 IS UNIQUE',
  ];
  for (const q of queries) {
    try {
      await neo4j.executeQuery(q);
    } catch (e: any) {
      if (!e?.message?.includes('already exists')) console.warn(q.slice(0, 50), e?.message);
    }
  }
}

async function run() {
  const app = await NestFactory.createApplicationContext(IngestCisModule);
  const neo4j = app.get(Neo4jService);

  const cisPath = join(DATA_DIR, CIS_FILE);
  const compoPath = join(DATA_DIR, COMPO_FILE);

  if (!existsSync(cisPath) || !existsSync(compoPath)) {
    console.error(`❌ Fichiers attendus dans ${DATA_DIR}/ : ${CIS_FILE}, ${COMPO_FILE}`);
    console.error('   Téléchargez-les (POST /api/ontology/bdpm-sync ou npm run seed:demo-allergy après download) ou lancez avec --download si implémenté.');
    await app.close();
    process.exit(1);
  }

  console.log('📥 ETL BDPM – Ingestion brute (stream + normalisation)\n');

  await ensureConstraints(neo4j);

  // —— ÉTAPE 1 : Drug (CIS) en stream ——
  let drugCount = 0;
  let batch: Array<{ cisId: string; name: string; form: string }> = [];

  const cisStream = streamTsv(cisPath).pipe(
    csv({
      separator: '\t',
      headers: ['cisId', 'name', 'form', 'voie', 'statut', 'type', 'commercial', 'dateAMM', 'num', 'titulaire'],
      skipLines: 0,
    })
  );

  for await (const row of cisStream as AsyncIterable<Record<string, string>>) {
    const cisId = (row.cisId ?? '').trim();
    if (!cisId) continue;
    batch.push({
      cisId,
      name: (row.name ?? '').trim(),
      form: (row.form ?? '').trim(),
    });
    if (batch.length >= BATCH_SIZE) {
      await neo4j.executeQuery(
        `UNWIND $rows AS row MERGE (d:Drug { cisId: row.cisId }) SET d.name = row.name, d.form = row.form`,
        { rows: batch }
      );
      drugCount += batch.length;
      process.stdout.write(`\r  Drug: ${drugCount}`);
      batch = [];
    }
  }
  if (batch.length > 0) {
    await neo4j.executeQuery(
      `UNWIND $rows AS row MERGE (d:Drug { cisId: row.cisId }) SET d.name = row.name, d.form = row.form`,
      { rows: batch }
    );
    drugCount += batch.length;
  }
  console.log(`\n  ✅ ${drugCount} Drug (CIS)`);

  // —— ÉTAPE 2 : Molecule + CONTIENT (CIS_COMPO) en stream par batch (pas de saturation RAM) ——
  type CompoRow = { cisId: string; code: string; name: string; dosage: string };
  let compoBatch: CompoRow[] = [];
  let moleculeBatch = new Map<string, string>();
  let totalMolecules = 0;
  let totalContient = 0;

  const flushCompoBatch = async () => {
    if (compoBatch.length === 0) return;
    const molecules = Array.from(moleculeBatch.entries()).map(([code, name]) => ({ code, name }));
    for (let i = 0; i < molecules.length; i += BATCH_SIZE) {
      const chunk = molecules.slice(i, i + BATCH_SIZE);
      await neo4j.executeQuery(
        `UNWIND $rows AS row MERGE (m:Molecule { code: row.code }) SET m.name = row.name`,
        { rows: chunk }
      );
    }
    totalMolecules += moleculeBatch.size;
    for (let i = 0; i < compoBatch.length; i += BATCH_SIZE) {
      const chunk = compoBatch.slice(i, i + BATCH_SIZE);
      await neo4j.executeQuery(
        `UNWIND $rows AS row
         MATCH (d:Drug { cisId: row.cisId })
         MATCH (m:Molecule { code: row.code })
         MERGE (d)-[r:CONTIENT]->(m) SET r.dosage = row.dosage`,
        { rows: chunk }
      );
    }
    totalContient += compoBatch.length;
    process.stdout.write(`\r  COMPO: ${totalContient} relations`);
    compoBatch = [];
    moleculeBatch = new Map();
  };

  const compoStream = streamTsv(compoPath).pipe(
    csv({
      separator: '\t',
      headers: ['cisId', 'elemType', 'substanceCode', 'substanceName', 'dosage', 'ref', 'nature'],
      skipLines: 0,
    })
  );

  for await (const row of compoStream as AsyncIterable<Record<string, string>>) {
    if ((row.nature ?? '').trim() !== 'SA') continue;
    const cisId = (row.cisId ?? '').trim();
    const code = (row.substanceCode ?? '').trim();
    const rawName = (row.substanceName ?? '').trim();
    if (!cisId || !code || !rawName) continue;
    const name = normalizeMoleculeName(rawName);
    moleculeBatch.set(code, name);
    compoBatch.push({ cisId, code, name, dosage: (row.dosage ?? '').trim() });
    if (compoBatch.length >= BATCH_SIZE) await flushCompoBatch();
  }
  await flushCompoBatch();
  const molCountResult = await neo4j.executeQuery(`MATCH (m:Molecule) RETURN count(m) AS c`);
  const moleculeCount = Number(molCountResult.records[0]?.get('c') ?? 0);
  console.log(`\n  ✅ ${moleculeCount} Molecule (noms normalisés), ${totalContient} relations CONTIENT`);

  // —— ÉTAPE 2b : Pack + VENDU_SOUS (CIS_CIP) – optionnel si fichier présent ——
  const cipPath = join(DATA_DIR, CIP_FILE);
  if (existsSync(cipPath)) {
    type PackRow = { cisId: string; cip7: string; cip13: string; libelle: string; prix: number | null; taux: number | null };
    let packBatch: PackRow[] = [];
    let packCount = 0;
    const flushPackBatch = async () => {
      if (packBatch.length === 0) return;
      const rows = packBatch.map((r) => ({
        cisId: r.cisId,
        cip7: r.cip7,
        cip13: r.cip13,
        libelle: r.libelle,
        prix: r.prix,
        taux: r.taux,
      }));
      await neo4j.executeQuery(
        `UNWIND $rows AS row
         MERGE (p:Pack { cip13: row.cip13 })
         SET p.cip7 = row.cip7, p.libelle = row.libelle, p.prix = row.prix, p.tauxRemboursement = row.taux
         WITH p, row
         MATCH (d:Drug { cisId: row.cisId })
         MERGE (d)-[:VENDU_SOUS]->(p)`,
        { rows }
      );
      packCount += packBatch.length;
      process.stdout.write(`\r  Pack: ${packCount}`);
      packBatch = [];
    };
    const cipStream = streamTsv(cipPath).pipe(
      csv({
        separator: '\t',
        headers: ['cisId', 'libelle', 'cip7', 'cip13', 'statut', 'dateDecla', 'prix', 'taux'],
        skipLines: 0,
      })
    );
    for await (const row of cipStream as AsyncIterable<Record<string, string>>) {
      const cisId = (row.cisId ?? '').trim();
      const cip13 = (row.cip13 ?? '').trim();
      const cip7 = (row.cip7 ?? '').trim();
      if (!cisId || !cip13) continue;
      const libelle = (row.libelle ?? '').trim();
      const prix = parsePrix(row.prix ?? '');
      const taux = parsePrix(row.taux ?? '');
      packBatch.push({ cisId, cip7, cip13, libelle, prix, taux });
      if (packBatch.length >= BATCH_SIZE) await flushPackBatch();
    }
    await flushPackBatch();
    const packTotalResult = await neo4j.executeQuery(`MATCH (p:Pack) RETURN count(p) AS c`);
    const packTotal = Number(packTotalResult.records[0]?.get('c') ?? 0);
    console.log(`\n  ✅ ${packTotal} Pack (VENDU_SOUS)`);
  } else {
    console.log(`  ⏭️  ${CIP_FILE} absent – Packs non importés.`);
  }

  // —— ÉTAPE 3 : Index fulltext ——
  try {
    await neo4j.executeQuery(`
      CREATE FULLTEXT INDEX medical_search IF NOT EXISTS
      FOR (n:Drug|Molecule) ON EACH [n.name]
    `);
    console.log('  ✅ Index fulltext medical_search');
  } catch (e: any) {
    if (!e?.message?.includes('already exists')) console.warn('  ⚠️ Index:', e?.message);
  }

  // —— Sanity check (KPI orphelins) ——
  const orphanResult = await neo4j.executeQuery(`
    MATCH (d:Drug) WHERE NOT (d)-[:CONTIENT]->(:Molecule)
    RETURN count(d) AS orphans
  `);
  const orphans = Number(orphanResult.records[0]?.get('orphans') ?? 0);
  const pct = drugCount > 0 ? ((orphans / drugCount) * 100).toFixed(2) : '0';

  console.log('\n📊 Santé des données (KPI)');
  console.log(`  Total Drug: ${drugCount}`);
  console.log(`  Orphelins (sans molécule): ${orphans} (${pct}%)`);
  if (Number(pct) > 5) {
    console.log('  ⚠️  > 5 % : revoir le parsing / normalisation.');
  } else if (Number(pct) <= 1) {
    console.log('  ✅ < 1 % : acceptable pour une V1.');
  }

  await app.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
