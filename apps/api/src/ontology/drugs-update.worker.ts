import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BdpmDownloadService } from './bdpm-download.service';
import { BdpmSyncService } from './bdpm-sync.service';
import { BdpmIngestService } from './bdpm-ingest.service';
import { BDPM_DEFAULT_DOWNLOAD_DIR } from './bdpm-download.service';

/**
 * Worker planifié "Heartbeat" BDPM (Stratégie PANACÉE v200.Graph).
 * Chaque nuit à 03h00 : télécharge les fichiers ANSM, compare les hashes,
 * ré-ingère le graphe Drug/CONTIENT/Molecule uniquement si les données ont changé.
 */
@Injectable()
export class DrugsUpdateWorker implements OnModuleInit {
  private readonly logger = new Logger(DrugsUpdateWorker.name);

  constructor(
    private readonly download: BdpmDownloadService,
    private readonly sync: BdpmSyncService,
    private readonly ingest: BdpmIngestService,
  ) {}

  onModuleInit() {
    this.logger.log('DrugsUpdateWorker initialized (cron 0 3 * * *)');
  }

  /**
   * Cron quotidien 03h00 (heure serveur) : vérification et mise à jour BDPM.
   */
  @Cron('0 3 * * *')
  async handleDailyBdpmSync() {
    const dataDir = BDPM_DEFAULT_DOWNLOAD_DIR;
    this.logger.log('Starting daily BDPM sync (heartbeat)');

    try {
      await this.download.downloadAll(dataDir);
      const hashes = await this.sync.computeHashes(dataDir);
      const changed = await this.sync.hasChanges(dataDir, hashes);

      if (!changed) {
        this.logger.log('No BDPM file changes detected, skip ingest');
        return;
      }

      this.logger.log('BDPM files changed, running Drug graph ingest');
      const stats = await this.ingest.ingestDrugGraph(dataDir);
      await this.sync.writeLastSync(dataDir, hashes);
      this.logger.log(
        `BDPM sync done: ${stats.drugsCreated} Drug, ${stats.moleculesCreated} Molecule, ${stats.relationsCreated} CONTIENT in ${stats.durationMs}ms`,
      );
    } catch (e: any) {
      this.logger.error('BDPM sync failed', e?.stack ?? e);
    }
  }

  /**
   * Lance manuellement un cycle complet (download + hash + ingest si changé).
   * Utile pour tests ou trigger manuel (admin).
   */
  async runNow(dataDir: string = BDPM_DEFAULT_DOWNLOAD_DIR): Promise<{ ingested: boolean; message: string }> {
    await this.download.downloadAll(dataDir);
    const hashes = await this.sync.computeHashes(dataDir);
    const changed = await this.sync.hasChanges(dataDir, hashes);

    if (!changed) {
      return { ingested: false, message: 'No BDPM file changes, skip ingest' };
    }

    await this.ingest.ingestDrugGraph(dataDir);
    await this.sync.writeLastSync(dataDir, hashes);
    return { ingested: true, message: 'BDPM ingested successfully' };
  }
}
