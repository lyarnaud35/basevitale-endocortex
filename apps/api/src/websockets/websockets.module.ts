import { Module } from '@nestjs/common';
import { WebSocketsGateway } from './websockets.gateway';

/**
 * WebSocketsModule
 * 
 * Module pour les communications temps réel
 * Version BaseVitale V112
 */
@Module({
  providers: [WebSocketsGateway],
  exports: [WebSocketsGateway],
})
export class WebSocketsModule {}
