import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { connect, NatsConnection, StringCodec, Subscription } from 'nats';

/**
 * NatsService
 * 
 * Service pour la communication microservices via NATS
 * Latence minimale (<1ms) pour communication NestJS ↔ Python
 * 
 * Version BaseVitale V112 - Optimisations Stack Technique
 */
@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private nc: NatsConnection | null = null;
  private readonly sc = StringCodec();

  async onModuleInit() {
    try {
      const servers = process.env.NATS_SERVERS || 'nats://localhost:4222';
      
      this.nc = await connect({
        servers: servers.split(','),
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
      });

      this.logger.log(`Connected to NATS: ${servers}`);

      // Gestion des événements
      this.nc.closed().then(() => {
        this.logger.warn('NATS connection closed');
      });

      // Note: NatsConnection n'a pas de méthode servers() dans la version actuelle
      // Les événements de connexion sont gérés via closed() et status()
      if (this.nc.status) {
        this.logger.log(`NATS connection status: ${this.nc.status()}`);
      }
    } catch (error) {
      this.logger.error('Failed to connect to NATS', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.nc) {
      await this.nc.close();
      this.logger.log('NATS connection closed');
    }
  }

  /**
   * Publier un message sur un sujet
   */
  async publish(subject: string, data: any): Promise<void> {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }

    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      this.nc.publish(subject, this.sc.encode(payload));
    } catch (error) {
      this.logger.error(`Failed to publish to ${subject}`, error);
      throw error;
    }
  }

  /**
   * S'abonner à un sujet
   */
  async subscribe(
    subject: string,
    callback: (data: any) => void | Promise<void>,
  ): Promise<Subscription> {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }

    const sub = this.nc.subscribe(subject);
    
    (async () => {
      for await (const msg of sub) {
        try {
          const decoded = this.sc.decode(msg.data);
          const data = JSON.parse(decoded);
          await callback(data);
        } catch (error) {
          this.logger.error(`Error processing message from ${subject}`, error);
        }
      }
    })().catch((error) => {
      this.logger.error(`Error in subscription ${subject}`, error);
    });

    this.logger.log(`Subscribed to ${subject}`);
    return sub;
  }

  /**
   * Request/Reply pattern
   */
  async request(
    subject: string,
    data: any,
    timeout: number = 5000,
  ): Promise<any> {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }

    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      const response = await this.nc.request(
        subject,
        this.sc.encode(payload),
        { timeout },
      );

      const decoded = this.sc.decode(response.data);
      return JSON.parse(decoded);
    } catch (error) {
      this.logger.error(`Request to ${subject} failed`, error);
      throw error;
    }
  }

  /**
   * Publier vers le service Python (AI Cortex)
   */
  async publishToAICortex(event: string, data: any): Promise<void> {
    await this.publish(`ai-cortex.${event}`, data);
  }

  /**
   * S'abonner aux événements du service Python
   */
  async subscribeToAICortex(
    event: string,
    callback: (data: any) => void | Promise<void>,
  ): Promise<Subscription> {
    return this.subscribe(`ai-cortex.${event}`, callback);
  }

  /**
   * Vérifier la connexion
   */
  isConnected(): boolean {
    return this.nc !== null && !this.nc.isClosed();
  }
}
