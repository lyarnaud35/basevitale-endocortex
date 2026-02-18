/**
 * ETL "Maître Ingestor" BDPM – Télécharge, décode (Latin-1), parse et injecte en flux tendu.
 * Modèle : (Drug)-[:CONTIENT {dosage}]->(Molecule) + (Molecule)-[:INTERAGIT_AVEC {risque}]->(Molecule).
 *
 * Usage : depuis la racine du monorepo → npm run ingest:bdpm:etl
 * Prérequis : Neo4j démarré (docker-compose up -d), NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD dans .env
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import neo4j, { Driver } from 'neo4j-driver';
import axios from 'axios';
import iconv from 'iconv-lite';
import { parse } from 'csv-parse/sync';

// ----- Charger .env à la racine du monorepo (cwd = apps/api) -----
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

const NEO4J_URI = process.env.NEO4J_URI ?? 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER ?? 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? 'neo4j';

const URL_CIS =
  'https://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=CIS_bdpm.txt';
const URL_COMPO =
  'https://base-donnees-publique.medicaments.gouv.fr/telechargement.php?fichier=COMPO_bdpm.txt';
const URL_COMPO_ALT =
  'https://bdpmt.ansm.sante.fr/download/file/CIS_COMPO_bdpm.txt';

function getDriver(): Driver {
  return neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
}

async function downloadAndParse(
  url: string,
  options: { delimiter?: string } = {}
): Promise<string[][]> {
  console.log(`📥 Téléchargement de ${url}...`);
  const response = await axios({ url, method: 'GET', responseType: 'arraybuffer' });
  const decoded = iconv.decode(Buffer.from(response.data), 'latin1');
  const records = parse(decoded, {
    delimiter: options.delimiter ?? '\t',
    relax_quotes: true,
    relax_column_count: true,
    columns: false,
    skip_empty_lines: true,
  }) as string[][];
  return records;
}

async function run(): Promise<void> {
  const driver = getDriver();
  const session = driver.session();

  try {
    // ----- Contraintes (accélèrent les MERGE) -----
    console.log('🏗️  Vérification des contraintes Neo4j...');
    try {
      await session.run(`
        CREATE CONSTRAINT drug_cis_unique IF NOT EXISTS
        FOR (d:Drug) REQUIRE d.cisId IS UNIQUE
      `);
      await session.run(`
        CREATE CONSTRAINT molecule_code_unique IF NOT EXISTS
        FOR (m:Molecule) REQUIRE m.code IS UNIQUE
      `);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('already exists')) console.warn('Contraintes:', msg);
    }

    // ----- 1. Médicaments (CIS) -----
    let cisData: string[][];
    try {
      cisData = await downloadAndParse(URL_CIS);
    } catch (e) {
      console.warn('Téléchargement CIS depuis base-donnees-publique échoué, tentative ANSM directe...');
      const urlAlt = 'https://bdpmt.ansm.sante.fr/download/file/CIS_bdpm.txt';
      cisData = await downloadAndParse(urlAlt);
    }
    // En-tête éventuel ou première ligne : on garde tout ; colonnes 0=code, 1=nom, 2=forme
    const cisRows = cisData.filter((row) => row.length >= 3 && row[0]?.trim());
    console.log(`💊 ${cisRows.length} médicaments trouvés. Injection...`);
    await session.run(
      `
      UNWIND $batch AS row
      MERGE (d:Drug {cisId: trim(row[0])})
      SET d.name = trim(row[1]), d.form = trim(row[2])
    `,
      { batch: cisRows }
    );
    console.log('✅ Médicaments injectés.');

    // ----- 2. Compositions (COMPO) → Drug -[:CONTIENT]-> Molecule -----
    let compoData: string[][];
    try {
      compoData = await downloadAndParse(URL_COMPO);
    } catch {
      console.warn('COMPO_bdpm.txt non disponible, tentative CIS_COMPO_bdpm.txt...');
      compoData = await downloadAndParse(URL_COMPO_ALT);
    }
    // Colonnes : 0=CIS, 2=code substance, 3=nom substance, 4 ou 5=dosage, 6=nature (SA)
    const compoRows = compoData.filter((row) => {
      if (row.length < 4) return false;
      const nature = row[6]?.trim();
      return nature === 'SA'; // substance active uniquement
    });
    console.log(`🧪 ${compoRows.length} liens de composition (SA). Injection...`);
    const BATCH = 5000;
    for (let i = 0; i < compoRows.length; i += BATCH) {
      const batch = compoRows.slice(i, i + BATCH);
      await session.run(
        `
        UNWIND $batch AS row
        MERGE (d:Drug {cisId: trim(row[0])})
        ON CREATE SET d.name = '', d.form = ''
        MERGE (m:Molecule {code: trim(row[2])})
        ON CREATE SET m.name = trim(row[3])
        MERGE (d)-[r:CONTIENT]->(m)
        SET r.dosage = trim(row[4] ?? row[5] ?? '')
      `,
        { batch }
      );
      if ((i + BATCH) % 10000 === 0 || i + BATCH >= compoRows.length) {
        console.log(`   ${Math.min(i + BATCH, compoRows.length)} / ${compoRows.length} compositions.`);
      }
    }
    console.log('✅ Compositions et molécules injectées.');

    // ----- 3. Interactions critiques (seed MVP) -----
    const seedPath = join(__dirname, 'data', 'interactions-seed.json');
    if (!existsSync(seedPath)) {
      console.warn('⚠️ Fichier interactions-seed.json absent, étape interactions ignorée.');
    } else {
      const interactions: { source: string; target: string; risque: string }[] =
        JSON.parse(readFileSync(seedPath, 'utf-8'));
      console.log(`⚠️ Injection de ${interactions.length} interactions critiques (MVP)...`);
      await session.run(
        `
        UNWIND $batch AS row
        MATCH (m1:Molecule), (m2:Molecule)
        WHERE toUpper(m1.name) CONTAINS toUpper(row.source)
          AND toUpper(m2.name) CONTAINS toUpper(row.target)
          AND m1.code <> m2.code
        MERGE (m1)-[r:INTERAGIT_AVEC]->(m2)
        SET r.risque = row.risque
      `,
        { batch: interactions }
      );
      console.log('✅ Interactions critiques activées.');
    }
  } catch (error) {
    console.error('❌ Erreur critique:', error);
    throw error;
  } finally {
    await session.close();
    await driver.close();
  }
}

run()
  .then(() => {
    console.log('🎉 Transplantation du cerveau BDPM terminée.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
