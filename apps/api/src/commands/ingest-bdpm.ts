/**
 * Commande NestJS : télécharger et ingérer la BDPM (ANSM) dans Neo4j.
 * Usage: npx ts-node apps/api/src/commands/ingest-bdpm.ts [--download] [--dataDir=./data/bdpm]
 *
 * --download : télécharge les fichiers avant ingestion (défaut: true)
 * --no-download : ingère uniquement depuis des fichiers déjà présents dans dataDir
 * --dataDir=path : répertoire des fichiers CIS / CIS_COMPO (défaut: <cwd>/data/bdpm)
 *
 * Prérequis: NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD (chargés depuis .env à la racine du monorepo).
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Charger .env à la racine du monorepo (quand cwd = apps/api)
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
import { CommandModule } from './ingest-bdpm.module';
import { BdpmIngestService } from '../ontology/bdpm-ingest.service';

async function run() {
  const args = process.argv.slice(2);
  const doDownload = !args.includes('--no-download');
  const dataDirArg = args.find((a) => a.startsWith('--dataDir='));
  const dataDir = dataDirArg
    ? dataDirArg.replace('--dataDir=', '').trim()
    : join(process.cwd(), 'data', 'bdpm');

  const app = await NestFactory.createApplicationContext(CommandModule);
  const ingest = app.get(BdpmIngestService);

  if (doDownload) {
    console.log('Download + ingest BDPM into Neo4j...');
    const stats = await ingest.downloadAndIngest(dataDir);
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log('Ingest BDPM from', dataDir, '...');
    const stats = await ingest.ingestFromDirectory(dataDir);
    console.log(JSON.stringify(stats, null, 2));
  }

  await app.close();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
