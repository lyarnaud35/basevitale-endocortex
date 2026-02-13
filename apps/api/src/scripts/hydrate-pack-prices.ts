/**
 * Hydratation des prix sur les Packs existants (Deep Roots – Phase 2.5).
 * Ne crée pas de nœuds : MATCH (p:Pack {cip13}) SET p.prix, p.tauxRemboursement.
 *
 * Usage :
 *   npm run hydrate:pack-prices -- --file=data/bdpm/prix.csv
 *   npm run hydrate:pack-prices -- --api
 *
 * Fichier : CSV/TSV, colonnes (ordre ou noms) cip13, prix (, ou .), taux (optionnel, ex. 0.65 ou 65%). Avec en-tête, les noms peuvent être cip13/CIP13, prix/Prix, taux/Taux/tauxRemboursement.
 * API : récupère la base complète depuis medicaments-api.giygas.dev et extrait présentations (cip13, prix, taux).
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

const BATCH_SIZE = 500;
const MEDICAMENTS_API = 'https://medicaments-api.giygas.dev';

function parsePrix(raw: string): number | null {
  const s = (raw ?? '').trim().replace(/,/, '.');
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** "65%" ou "0.65" ou 0.65 → 0.65 */
function parseTaux(raw: string | number): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : null;
  const s = String(raw).trim().replace(/,/, '.');
  const withoutPct = s.replace(/%\s*$/, '');
  const n = parseFloat(withoutPct);
  if (!Number.isFinite(n) || n < 0) return null;
  return n > 1 ? n / 100 : n; // 65 → 0.65
}

async function hydrateFromFile(neo4j: Neo4jService, filePath: string): Promise<{ updated: number }> {
  let updated = 0;
  const rows: { cip13: string; prix: number | null; taux: number | null }[] = [];

  const stream = createReadStream(filePath)
    .pipe(iconv.decodeStream('latin1'))
    .pipe(
      csv({
        separator: /[\t,;]/.test(filePath) ? (filePath.endsWith('.tsv') ? '\t' : ',') : ',',
        headers: ['cip13', 'prix', 'taux'],
        skipLines: 0,
      })
    );

  for await (const row of stream as AsyncIterable<Record<string, string>>) {
    const cip13 = (row.cip13 ?? row.CIP13 ?? '').trim();
    if (!cip13) continue;
    const prix = parsePrix(row.prix ?? row.Prix ?? '');
    const taux = parseTaux(row.taux ?? row.Taux ?? row.tauxRemboursement ?? '');
    rows.push({ cip13, prix, taux });
    if (rows.length >= BATCH_SIZE) {
      await neo4j.executeQuery(
        `UNWIND $rows AS row
         MATCH (p:Pack { cip13: row.cip13 })
         SET p.prix = row.prix, p.tauxRemboursement = row.taux`,
        { rows: rows.map((r) => ({ ...r, cip13: r.cip13 })) }
      );
      updated += rows.length;
      process.stdout.write(`\r  Hydraté: ${updated}`);
      rows.length = 0;
    }
  }
  if (rows.length > 0) {
    await neo4j.executeQuery(
      `UNWIND $rows AS row
       MATCH (p:Pack { cip13: row.cip13 })
       SET p.prix = row.prix, p.tauxRemboursement = row.taux`,
      { rows }
    );
    updated += rows.length;
  }
  return { updated };
}

async function hydrateFromApi(neo4j: Neo4jService): Promise<{ updated: number }> {
  const res = await fetch(`${MEDICAMENTS_API}/database`);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as
    | Array<{ cis?: number; presentation?: Array<{ cip13?: number; cip7?: number; libelle?: string; prix?: number; tauxRemboursement?: string }> }>
    | { data?: Array<{ cis?: number; presentation?: Array<{ cip13?: number; cip7?: number; libelle?: string; prix?: number; tauxRemboursement?: string }> }> };
  const data = Array.isArray(body) ? body : body?.data ?? [];
  const rows: { cisId: string; cip13: string; cip7: string; libelle: string; prix: number | null; taux: number | null }[] = [];
  for (const med of data) {
    const cisId = med.cis != null ? String(med.cis) : '';
    if (!cisId) continue;
    for (const p of med.presentation ?? []) {
      const cip13 = p.cip13 != null ? String(p.cip13) : '';
      if (!cip13) continue;
      const prix = p.prix != null && Number.isFinite(p.prix) ? p.prix : null;
      const taux = parseTaux(p.tauxRemboursement ?? '');
      rows.push({
        cisId,
        cip13,
        cip7: p.cip7 != null ? String(p.cip7) : '',
        libelle: (p.libelle ?? '').trim(),
        prix,
        taux,
      });
    }
  }
  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await neo4j.executeQuery(
      `UNWIND $rows AS row
       MATCH (d:Drug { cisId: row.cisId })
       MERGE (p:Pack { cip13: row.cip13 })
       SET p.cip7 = row.cip7, p.libelle = row.libelle, p.prix = row.prix, p.tauxRemboursement = row.taux
       MERGE (d)-[:VENDU_SOUS]->(p)`,
      { rows: batch }
    );
    updated += batch.length;
    process.stdout.write(`\r  Hydraté: ${updated}/${rows.length}`);
  }
  return { updated };
}

async function run() {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='));
  const useApi = args.includes('--api');

  const app = await NestFactory.createApplicationContext(IngestCisModule);
  const neo4j = app.get(Neo4jService);

  console.log('💧 Hydratation des prix Pack (avec --api : MERGE Pack + lien Drug si Drug existe)\n');

  if (useApi) {
    console.log('  Source: API medicaments-api.giygas.dev/database');
    const { updated } = await hydrateFromApi(neo4j);
    console.log(`\n  ✅ ${updated} Packs mis à jour (prix/taux).`);
  } else if (fileArg) {
    const filePath = fileArg.replace('--file=', '').trim();
    const resolved = filePath.startsWith('/') ? filePath : join(process.cwd(), filePath);
    if (!existsSync(resolved)) {
      console.error(`❌ Fichier introuvable: ${resolved}`);
      await app.close();
      process.exit(1);
    }
    console.log(`  Source: ${resolved}`);
    const { updated } = await hydrateFromFile(neo4j, resolved);
    console.log(`\n  ✅ ${updated} Packs mis à jour.`);
  } else {
    console.error('  Usage: --file=chemin/vers/prix.csv  ou  --api');
    await app.close();
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
