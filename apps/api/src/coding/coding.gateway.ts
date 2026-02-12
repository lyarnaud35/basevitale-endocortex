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
import type { CodingStrategistWsState } from '@basevitale/shared';
import { CodingStrategistService } from './coding-strategist.service';

/** Formate le snapshot XState en payload contrat partagé (state_updated). */
function formatStatePayload(snapshot: { value: unknown; context: { currentInput: string; suggestions: unknown[]; lastError?: string } }): CodingStrategistWsState {
  const value = typeof snapshot.value === 'string' ? snapshot.value : String(snapshot.value);
  return {
    value,
    context: {
      currentInput: snapshot.context.currentInput,
      suggestions: snapshot.context.suggestions,
      ...(snapshot.context.lastError && { lastError: snapshot.context.lastError }),
    },
    shouldDisplay: value === 'SUGGESTING',
  };
}

/**
 * Gateway WebSocket – Stratège temps réel (Voie B).
 * Namespace /coding : room = sessionId. Aucune donnée ne fuit entre sessions.
 */
@WebSocketGateway({
  namespace: '/coding',
  cors: { origin: process.env.CORS_ORIGIN || '*', credentials: true },
})
export class CodingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CodingGateway.name);
  /** Sessions pour lesquelles on a déjà abonné l’acteur (une souscription par session). */
  private readonly subscribedSessions = new Set<string>();

  constructor(private readonly strategist: CodingStrategistService) {}

  handleConnection(client: Socket) {
    const sessionId = this.getSessionIdFromHandshake(client);
    if (!sessionId) {
      this.logger.warn('Connection without valid sessionId, disconnecting');
      client.disconnect();
      return;
    }

    (client as Socket & { data: { sessionId?: string } }).data.sessionId = sessionId;
    client.join(sessionId);

    if (!this.subscribedSessions.has(sessionId)) {
      const actor = this.strategist.getOrCreateActor(sessionId);
      if (actor) {
        actor.subscribe((snapshot) => {
          const payload = formatStatePayload(snapshot);
          this.server.to(sessionId).emit('state_updated', payload);
        });
        this.subscribedSessions.add(sessionId);
        const initial = this.strategist.getSnapshot(sessionId);
        this.server.to(sessionId).emit('state_updated', initial);
      }
    }

    this.logger.log(`[${sessionId}] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const sessionId = (client as Socket & { data: { sessionId?: string } }).data?.sessionId;
    if (sessionId) {
      this.subscribedSessions.delete(sessionId);
      this.strategist.destroySession(sessionId);
      this.logger.log(`[${sessionId}] Session closed. Memory freed.`);
    }
  }

  @SubscribeMessage('text_input')
  handleTextInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { text?: string },
  ) {
    const sessionId = (client as Socket & { data: { sessionId?: string } }).data?.sessionId;
    if (!sessionId) return;
    const text = typeof payload?.text === 'string' ? payload.text : '';
    this.strategist.updateInput(sessionId, text);
  }

  private getSessionIdFromHandshake(client: Socket): string | null {
    const raw = client.handshake?.query?.sessionId;
    const sid = typeof raw === 'string' ? raw.trim() : Array.isArray(raw) ? raw[0]?.trim() : null;
    if (!sid || sid.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(sid)) return null;
    return sid;
  }
}
