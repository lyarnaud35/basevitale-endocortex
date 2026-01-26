import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { WebSocketsGateway } from '../websockets/websockets.gateway';

/**
 * OrchestratorService - Module O
 * 
 * Gestion des priorités et workflows
 * - Mode "Urgence" vs "Routine"
 * - Arbitrage Fast Path / Slow Path
 * - Gestion des files d'attente BullMQ
 * 
 * Version BaseVitale V112 - Stack Technique Optimale
 */
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    @InjectQueue('high-priority') private highPriorityQueue: Queue,
    @InjectQueue('normal-priority') private normalPriorityQueue: Queue,
    @InjectQueue('low-priority') private lowPriorityQueue: Queue,
    private readonly wsGateway: WebSocketsGateway,
  ) {}

  /**
   * Ajouter une tâche avec priorité
   */
  async addTask(
    job: {
      type: string;
      data: any;
      priority: 'URGENT' | 'NORMAL' | 'LOW';
    },
  ) {
    const queue =
      job.priority === 'URGENT'
        ? this.highPriorityQueue
        : job.priority === 'NORMAL'
        ? this.normalPriorityQueue
        : this.lowPriorityQueue;

    const addedJob = await queue.add(job.type, job.data, {
      priority: job.priority === 'URGENT' ? 1 : job.priority === 'NORMAL' ? 5 : 10,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    this.logger.log(
      `Task added: ${job.type} with priority ${job.priority} (Job ID: ${addedJob.id})`,
    );

    // Si urgence, broadcast alerte
    if (job.priority === 'URGENT') {
      this.wsGateway.broadcastAlert({
        type: 'CRITICAL',
        message: `Tâche urgente: ${job.type}`,
        metadata: { jobId: addedJob.id },
      });
    }

    return addedJob;
  }

  /**
   * Mode Urgence - Inhibe les alertes non-critiques
   */
  async enableUrgencyMode(location?: string) {
    this.logger.warn(`URGENCY MODE ENABLED${location ? ` at ${location}` : ''}`);

    // Pause les queues non-urgentes
    await this.normalPriorityQueue.pause();
    await this.lowPriorityQueue.pause();

    // Broadcast Code Rouge
    if (location) {
      this.wsGateway.broadcastCodeRouge({
        location,
        reason: 'Mode Urgence Activé',
        priority: 'URGENT',
      });
    }
  }

  /**
   * Désactiver le mode urgence
   */
  async disableUrgencyMode() {
    this.logger.log('URGENCY MODE DISABLED - Returning to normal operations');

    // Resume les queues
    await this.normalPriorityQueue.resume();
    await this.lowPriorityQueue.resume();

    this.wsGateway.broadcastAlert({
      type: 'INFO',
      message: 'Mode Urgence désactivé - Opérations normales reprises',
    });
  }

  /**
   * Obtenir les statistiques des queues
   */
  async getQueueStats() {
    const [high, normal, low] = await Promise.all([
      this.highPriorityQueue.getJobCounts(),
      this.normalPriorityQueue.getJobCounts(),
      this.lowPriorityQueue.getJobCounts(),
    ]);

    return {
      highPriority: high,
      normalPriority: normal,
      lowPriority: low,
      total:
        high.waiting +
        high.active +
        high.completed +
        normal.waiting +
        normal.active +
        normal.completed +
        low.waiting +
        low.active +
        low.completed,
    };
  }
}
