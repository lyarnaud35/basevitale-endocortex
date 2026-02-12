import { Injectable, Logger } from '@nestjs/common';
import { createWriteStream } from 'fs';
import { mkdir, readFile } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { join } from 'path';
import { BDPM_BASE_URL, BDPM_FILES } from './bdpm.constants';

export const BDPM_DEFAULT_DOWNLOAD_DIR = join(process.cwd(), 'data', 'bdpm');

/**
 * Télécharge les fichiers BDPM (ANSM) et les enregistre en local.
 * Encodage attendu : UTF-8.
 */
@Injectable()
export class BdpmDownloadService {
  private readonly logger = new Logger(BdpmDownloadService.name);

  /**
   * Télécharge un fichier BDPM par son nom (ex. CIS_bdpm.txt).
   */
  async downloadFile(
    fileName: keyof typeof BDPM_FILES,
    outputDir: string = BDPM_DEFAULT_DOWNLOAD_DIR,
  ): Promise<string> {
    const file = BDPM_FILES[fileName];
    const url = `${BDPM_BASE_URL}/${file}`;
    await mkdir(outputDir, { recursive: true });
    const destPath = join(outputDir, file);

    this.logger.log(`Downloading ${file} from ANSM...`);
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) {
      throw new Error(`BDPM download failed: ${response.status} ${response.statusText} for ${url}`);
    }
    const body = response.body;
    if (!body) throw new Error('Empty response body');
    await pipeline(Readable.fromWeb(body as any), createWriteStream(destPath));
    this.logger.log(`Saved to ${destPath}`);
    return destPath;
  }

  /**
   * Télécharge CIS et CIS_COMPO dans outputDir.
   */
  async downloadAll(outputDir: string = BDPM_DEFAULT_DOWNLOAD_DIR): Promise<{ cis: string; cisCompo: string }> {
    const cis = await this.downloadFile('CIS', outputDir);
    const cisCompo = await this.downloadFile('CIS_COMPO', outputDir);
    return { cis, cisCompo };
  }

  /**
   * Lit un fichier TSV (UTF-8) et retourne les lignes (sans en-tête).
   */
  async readTsvLines(filePath: string): Promise<string[]> {
    const content = await readFile(filePath, 'utf-8');
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
}
