import { Injectable, Logger } from '@nestjs/common';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import { join } from 'path';
import { BDPM_FILES } from './bdpm.constants';
import { BDPM_DEFAULT_DOWNLOAD_DIR } from './bdpm-download.service';

const LAST_SYNC_FILENAME = '.last-bdpm-sync.json';

export interface LastSyncState {
  cisHash: string;
  cisCompoHash: string;
  lastRun: string; // ISO
}

/**
 * Gère le suivi des mises à jour BDPM par hash de fichiers.
 * Permet au cron de n'ingérer que si les fichiers ANSM ont changé.
 */
@Injectable()
export class BdpmSyncService {
  private readonly logger = new Logger(BdpmSyncService.name);

  private getSyncFilePath(dataDir: string): string {
    return join(dataDir, LAST_SYNC_FILENAME);
  }

  /**
   * Calcule le hash SHA-256 des fichiers CIS et CIS_COMPO dans dataDir.
   */
  async computeHashes(dataDir: string = BDPM_DEFAULT_DOWNLOAD_DIR): Promise<{ cisHash: string; cisCompoHash: string }> {
    const cisPath = join(dataDir, BDPM_FILES.CIS);
    const compoPath = join(dataDir, BDPM_FILES.CIS_COMPO);

    const [cisBuf, compoBuf] = await Promise.all([
      readFile(cisPath).catch((e) => {
        throw new Error(`Cannot read ${cisPath}: ${(e as Error).message}`);
      }),
      readFile(compoPath).catch((e) => {
        throw new Error(`Cannot read ${compoPath}: ${(e as Error).message}`);
      }),
    ]);

    const cisHash = createHash('sha256').update(cisBuf).digest('hex');
    const cisCompoHash = createHash('sha256').update(compoBuf).digest('hex');
    return { cisHash, cisCompoHash };
  }

  /**
   * Lit le dernier état de sync (hashes + date) depuis dataDir.
   */
  async readLastSync(dataDir: string = BDPM_DEFAULT_DOWNLOAD_DIR): Promise<LastSyncState | null> {
    const path = this.getSyncFilePath(dataDir);
    try {
      const raw = await readFile(path, 'utf-8');
      const data = JSON.parse(raw) as LastSyncState;
      if (data.cisHash && data.cisCompoHash) return data;
    } catch {
      // fichier absent ou invalide
    }
    return null;
  }

  /**
   * Enregistre l'état de sync après une ingestion réussie.
   */
  async writeLastSync(
    dataDir: string,
    hashes: { cisHash: string; cisCompoHash: string },
  ): Promise<void> {
    await mkdir(dataDir, { recursive: true });
    const path = this.getSyncFilePath(dataDir);
    const state: LastSyncState = {
      ...hashes,
      lastRun: new Date().toISOString(),
    };
    await writeFile(path, JSON.stringify(state, null, 2), 'utf-8');
    this.logger.log(`Last sync state written to ${path}`);
  }

  /**
   * Retourne true si les hashes actuels diffèrent du dernier sync (ou pas de dernier sync).
   */
  async hasChanges(
    dataDir: string = BDPM_DEFAULT_DOWNLOAD_DIR,
    currentHashes?: { cisHash: string; cisCompoHash: string },
  ): Promise<boolean> {
    const hashes = currentHashes ?? (await this.computeHashes(dataDir));
    const last = await this.readLastSync(dataDir);
    if (!last) return true;
    return last.cisHash !== hashes.cisHash || last.cisCompoHash !== hashes.cisCompoHash;
  }
}
