import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';

/**
 * WebSocketsGateway
 * 
 * Gateway pour les communications temps réel
 * - Alertes monitorage
 * - Notifications Code Rouge
 * - Synchronisation multi-utilisateurs
 * - Updates temps réel des données
 * 
 * Version BaseVitale V112 - Optimisations Stack Technique
 */
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/ws',
})
export class WebSocketsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketsGateway.name);
  private readonly connectedClients = new Map<string, Socket>();

  /**
   * Gestion des connexions
   */
  handleConnection(client: Socket) {
    const clientId = client.id;
    this.connectedClients.set(clientId, client);
    this.logger.log(`Client connected: ${clientId}`);

    // Envoyer confirmation de connexion
    client.emit('connected', {
      clientId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Gestion des déconnexions
   */
  handleDisconnect(client: Socket) {
    const clientId = client.id;
    this.connectedClients.delete(clientId);
    this.logger.log(`Client disconnected: ${clientId}`);
  }

  /**
   * Rejoindre une room spécifique (patient, salle, etc.)
   */
  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; userId?: string },
  ) {
    client.join(data.room);
    this.logger.log(`Client ${client.id} joined room: ${data.room}`);

    client.emit('room-joined', {
      room: data.room,
      timestamp: new Date().toISOString(),
    });

    // Notifier les autres clients dans la room
    client.to(data.room).emit('user-joined', {
      clientId: client.id,
      userId: data.userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Quitter une room
   */
  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    client.leave(data.room);
    this.logger.log(`Client ${client.id} left room: ${data.room}`);

    client.to(data.room).emit('user-left', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Alertes monitorage (temps réel)
   */
  @SubscribeMessage('subscribe-monitoring')
  handleSubscribeMonitoring(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { patientId?: string; roomId?: string },
  ) {
    const room = data.patientId
      ? `monitoring:patient:${data.patientId}`
      : data.roomId
      ? `monitoring:room:${data.roomId}`
      : 'monitoring:global';

    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to monitoring: ${room}`);
  }

  /**
   * Broadcast une alerte
   */
  broadcastAlert(alert: {
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
    patientId?: string;
    roomId?: string;
    metadata?: any;
  }) {
    const room = alert.patientId
      ? `monitoring:patient:${alert.patientId}`
      : alert.roomId
      ? `monitoring:room:${alert.roomId}`
      : 'monitoring:global';

    this.server.to(room).emit('alert', {
      ...alert,
      timestamp: new Date().toISOString(),
    });

    // Si critique, envoyer aussi globalement
    if (alert.type === 'CRITICAL') {
      this.server.emit('critical-alert', {
        ...alert,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Code Rouge (urgence vitale)
   */
  broadcastCodeRouge(codeRouge: {
    location: string;
    patientId?: string;
    reason: string;
    priority: 'URGENT' | 'CRITICAL';
  }) {
    this.server.emit('code-rouge', {
      ...codeRouge,
      timestamp: new Date().toISOString(),
    });

    this.logger.warn(`Code Rouge broadcasted: ${JSON.stringify(codeRouge)}`);
  }

  /**
   * Notification générique
   */
  sendNotification(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      metadata?: any;
    },
  ) {
    this.server.emit(`notification:${userId}`, {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast mise à jour de données
   */
  broadcastUpdate(room: string, data: { type: string; payload: any }) {
    this.server.to(room).emit('data-update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Obtenir le nombre de clients connectés
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
