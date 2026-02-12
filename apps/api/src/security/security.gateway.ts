import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import type { SecurityInputPayload, OverridePayload } from '@basevitale/shared';
import { PrescriptionGuardService } from './prescription-guard.service';

/**
 * Gateway WebSocket – Gardien de prescription (namespace /security).
 * Pattern identique au CodingGateway : sessionId = room, nettoyage mémoire au disconnect.
 */
@WebSocketGateway({
  namespace: '/security',
  cors: { origin: process.env.CORS_ORIGIN || '*', credentials: true },
})
export class SecurityGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SecurityGateway.name);

  constructor(private readonly guard: PrescriptionGuardService) {}

  handleConnection(client: Socket) {
    const sessionId = this.getSessionIdFromHandshake(client);
    if (!sessionId) {
      this.logger.warn('Connection without valid sessionId, disconnecting');
      client.disconnect();
      return;
    }

    (client as Socket & { data: { sessionId?: string } }).data.sessionId = sessionId;
    client.join(sessionId);

    const initial = this.guard.getSnapshot(sessionId);
    this.server.to(sessionId).emit('state_updated', initial);

    this.logger.log(`[${sessionId}] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const sessionId = (client as Socket & { data: { sessionId?: string } }).data?.sessionId;
    if (sessionId) {
      this.guard.destroySession(sessionId);
      this.logger.log(`[${sessionId}] Session closed. Memory freed.`);
    }
  }

  @SubscribeMessage('check_prescription')
  handleCheckPrescription(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SecurityInputPayload,
  ) {
    const sessionId = (client as Socket & { data: { sessionId?: string } }).data?.sessionId;
    if (!sessionId) return;
    const safe: SecurityInputPayload = {
      drugId: typeof payload?.drugId === 'string' ? payload.drugId : '',
      patientContext: payload?.patientContext,
    };
    const state = this.guard.checkPrescription(sessionId, safe);
    this.server.to(sessionId).emit('state_updated', state);
  }

  @SubscribeMessage('request_override')
  handleRequestOverride(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: OverridePayload,
  ) {
    const sessionId = (client as Socket & { data: { sessionId?: string } }).data?.sessionId;
    if (!sessionId) return;
    const reason = typeof payload?.reason === 'string' ? payload.reason : '';
    const state = this.guard.requestOverride(sessionId, { reason });
    this.server.to(sessionId).emit('state_updated', state);
  }

  private getSessionIdFromHandshake(client: Socket): string | null {
    const raw = client.handshake?.query?.sessionId;
    const sid = typeof raw === 'string' ? raw.trim() : Array.isArray(raw) ? raw[0]?.trim() : null;
    if (!sid || sid.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(sid)) return null;
    return sid;
  }
}
