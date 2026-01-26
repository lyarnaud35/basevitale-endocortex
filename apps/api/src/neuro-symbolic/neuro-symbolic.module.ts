import { Module } from '@nestjs/common';
import { NeuroSymbolicService } from './neuro-symbolic.service';
import { NeuroSymbolicController } from './neuro-symbolic.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NatsModule } from '../nats/nats.module';

/**
 * NeuroSymbolicModule
 * 
 * Module pour le pont neuro-symbolique
 * Version BaseVitale V112
 */
@Module({
  imports: [PrismaModule, NatsModule],
  controllers: [NeuroSymbolicController],
  providers: [NeuroSymbolicService],
  exports: [NeuroSymbolicService],
})
export class NeuroSymbolicModule {}
