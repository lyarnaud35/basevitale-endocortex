import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { Neo4jService } from '../neo4j/neo4j.service';
import { GpuLockService } from '../common/services/gpu-lock.service';

/**
 * ScribeHealthService
 *
 * Vérifie la santé du Module Scribe : Postgres, Neo4j, Redis (sémaphore GPU), queue Bull.
 */
@Injectable()
export class ScribeHealthService {
  private readonly logger = new Logger(ScribeHealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4j: Neo4jService,
    private readonly gpuLock: GpuLockService,
    @Optional() @InjectQueue('scribe-consultation') private scribeQueue?: Queue,
  ) {}

  /**
   * Vérifier la santé complète du Module Scribe
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    postgres: { connected: boolean; latency?: number };
    neo4j: { connected: boolean; latency?: number };
    redis?: { connected: boolean; latencyMs?: number };
    message: string;
  }> {
    const results: {
      postgres: { connected: boolean; latency?: number };
      neo4j: { connected: boolean; latency?: number };
      redis?: { connected: boolean; latencyMs?: number };
    } = {
      postgres: { connected: false },
      neo4j: { connected: false },
    };

    try {
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      results.postgres.connected = true;
      results.postgres.latency = Date.now() - startTime;
    } catch (error) {
      this.logger.error('Postgres health check failed', error);
    }

    try {
      const health = await this.neo4j.checkHealth();
      results.neo4j.connected = health.status === 'ok';
      results.neo4j.latency = health.latency;
    } catch (error) {
      this.logger.error('Neo4j health check failed', error);
    }

    try {
      const ping = await this.gpuLock.ping();
      results.redis = { connected: ping.ok, latencyMs: ping.latencyMs };
    } catch (error) {
      this.logger.error('Redis (GPU lock) health check failed', error);
      results.redis = { connected: false };
    }

    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;

    if (!results.postgres.connected) {
      status = 'unhealthy';
      message = 'Module Scribe indisponible (Postgres non accessible)';
    } else if (results.neo4j.connected && results.redis?.connected) {
      status = 'healthy';
      message = 'Module Scribe opérationnel';
    } else if (results.neo4j.connected) {
      status = 'degraded';
      message = 'Module Scribe opérationnel (Redis indisponible, mode LOCAL IA limité)';
    } else if (results.redis?.connected) {
      status = 'degraded';
      message = 'Module Scribe opérationnel (Neo4j indisponible)';
    } else {
      status = 'degraded';
      message = 'Module Scribe opérationnel (Neo4j et Redis indisponibles)';
    }

    return { status, ...results, message };
  }

  /**
   * Obtenir les statistiques du Module Scribe
   */
  async getStats(): Promise<{
    totalDrafts: number;
    validatedDrafts: number;
    draftDrafts: number;
    totalSemanticNodes: number;
    queue?: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    };
  }> {
    try {
      const [drafts, nodes, queueStats] = await Promise.all([
        this.prisma.consultationDraft.groupBy({
          by: ['status'],
          _count: true,
        }),
        this.prisma.semanticNode.count(),
        this.getQueueStats(),
      ]);

      const validatedDrafts =
        drafts.find((d) => d.status === 'VALIDATED')?._count || 0;
      const draftDrafts =
        drafts.find((d) => d.status === 'DRAFT')?._count || 0;
      const totalDrafts = drafts.reduce((sum, d) => sum + d._count, 0);

      return {
        totalDrafts,
        validatedDrafts,
        draftDrafts,
        totalSemanticNodes: nodes,
        queue: queueStats,
      };
    } catch (error) {
      this.logger.error('Failed to get Scribe stats', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques de la queue Redis
   */
  private async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  } | undefined> {
    if (!this.scribeQueue) {
      return undefined;
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.scribeQueue.getWaitingCount(),
        this.scribeQueue.getActiveCount(),
        this.scribeQueue.getCompletedCount(),
        this.scribeQueue.getFailedCount(),
        this.scribeQueue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats', error);
      return undefined;
    }
  }
}
