import { Module, Global } from '@nestjs/common';
import { NatsService } from './nats.service';

/**
 * NatsModule
 * 
 * Module pour la communication microservices via NATS
 * Version BaseVitale V112
 */
@Global()
@Module({
  providers: [NatsService],
  exports: [NatsService],
})
export class NatsModule {}
