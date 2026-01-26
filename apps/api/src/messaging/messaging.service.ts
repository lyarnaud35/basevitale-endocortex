import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../common/services/metrics.service';
import { withMetrics } from '../common/utils/metrics.util';
import { WebSocketsGateway } from '../websockets/websockets.gateway';

/**
 * MessagingService
 * 
 * Service pour la messagerie interne sécurisée
 * Communication HDS avec notifications temps réel
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
    private readonly websocketsGateway: WebSocketsGateway,
  ) {}

  /**
   * Envoyer un message
   */
  async sendMessage(data: {
    senderId: string;
    recipientId?: string;
    threadId?: string;
    subject?: string;
    content: string;
    messageType?: string;
  }) {
    return withMetrics(
      this.metricsService,
      'messaging.sendMessage',
      async () => {
        // Créer ou récupérer le thread
        let threadId = data.threadId;

        if (!threadId && data.recipientId) {
          // Créer un thread de conversation directe
          const existingThread = await this.prisma.messageThread.findFirst({
            where: {
              threadType: 'DIRECT',
              participantIds: {
                hasEvery: [data.senderId, data.recipientId],
              },
            },
          });

          if (existingThread) {
            threadId = existingThread.id;
          } else {
            const newThread = await this.prisma.messageThread.create({
              data: {
                threadType: 'DIRECT',
                participantIds: [data.senderId, data.recipientId],
                createdBy: data.senderId,
              },
            });
            threadId = newThread.id;
          }
        }

        const message = await this.prisma.internalMessage.create({
          data: {
            senderId: data.senderId,
            recipientId: data.recipientId,
            threadId,
            subject: data.subject,
            content: data.content,
            messageType: data.messageType || 'TEXT',
            status: 'SENT',
          },
          include: {
            thread: {
              include: {
                messages: {
                  take: 1,
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        });

        // Mettre à jour le thread
        if (threadId) {
          await this.prisma.messageThread.update({
            where: { id: threadId },
            data: {
              lastMessageAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }

        // Notification temps réel via WebSockets
        if (data.recipientId) {
          this.websocketsGateway.sendNotification(data.recipientId, {
            type: 'new-message',
            title: 'Nouveau message',
            message: data.subject || 'Vous avez reçu un nouveau message',
            metadata: {
              messageId: message.id,
              senderId: data.senderId,
              subject: data.subject,
              threadId,
            },
          });
        }

        this.logger.log(`Message ${message.id} sent from ${data.senderId}`);
        this.metricsService.incrementCounter('messaging.messages.sent');

        return message;
      },
    );
  }

  /**
   * Obtenir les messages d'un utilisateur
   */
  async getUserMessages(
    userId: string,
    options?: {
      threadId?: string;
      unreadOnly?: boolean;
      limit?: number;
    },
  ) {
    return withMetrics(
      this.metricsService,
      'messaging.getUserMessages',
      async () => {
        const where: any = {
          OR: [{ senderId: userId }, { recipientId: userId }],
        };

        if (options?.threadId) {
          where.threadId = options.threadId;
        }

        if (options?.unreadOnly) {
          where.status = 'DELIVERED';
          where.recipientId = userId;
        }

        const messages = await this.prisma.internalMessage.findMany({
          where,
          include: {
            thread: true,
            attachments: true,
          },
          orderBy: { createdAt: 'desc' },
          take: options?.limit || 50,
        });

        return messages;
      },
    );
  }

  /**
   * Obtenir les threads d'un utilisateur
   */
  async getUserThreads(userId: string) {
    return withMetrics(
      this.metricsService,
      'messaging.getUserThreads',
      async () => {
        const threads = await this.prisma.messageThread.findMany({
          where: {
            participantIds: {
              has: userId,
            },
          },
          include: {
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                attachments: true,
              },
            },
          },
          orderBy: { lastMessageAt: 'desc' },
        });

        return threads;
      },
    );
  }

  /**
   * Marquer un message comme lu
   */
  async markAsRead(messageId: string, userId: string) {
    return withMetrics(
      this.metricsService,
      'messaging.markAsRead',
      async () => {
        const message = await this.prisma.internalMessage.findUnique({
          where: { id: messageId },
        });

        if (!message) {
          throw new NotFoundException(`Message ${messageId} not found`);
        }

        if (message.recipientId !== userId) {
          throw new BadRequestException(
            'You can only mark your own messages as read',
          );
        }

        const updated = await this.prisma.internalMessage.update({
          where: { id: messageId },
          data: {
            status: 'READ',
            readAt: new Date(),
          },
        });

        this.metricsService.incrementCounter('messaging.messages.read');
        return updated;
      },
    );
  }

  /**
   * Créer un thread de groupe
   */
  async createGroupThread(data: {
    name: string;
    description?: string;
    threadType: string;
    participantIds: string[];
    createdBy: string;
  }) {
    return withMetrics(
      this.metricsService,
      'messaging.createGroupThread',
      async () => {
        const thread = await this.prisma.messageThread.create({
          data: {
            name: data.name,
            description: data.description,
            threadType: data.threadType,
            participantIds: data.participantIds,
            createdBy: data.createdBy,
          },
        });

        this.logger.log(`Created group thread ${thread.id}`);
        this.metricsService.incrementCounter('messaging.threads.created');

        return thread;
      },
    );
  }

  /**
   * Obtenir les messages non lus d'un utilisateur
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.internalMessage.count({
      where: {
        recipientId: userId,
        status: { in: ['SENT', 'DELIVERED'] },
      },
    });

    return { count };
  }
}
