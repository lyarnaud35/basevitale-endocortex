import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsProcessor } from './appointments.processor';
import { AppointmentsScheduler } from './appointments.scheduler';
import { AppointmentsQueue } from './appointments.queue';
import { PrismaModule } from '../prisma/prisma.module';
import { MetricsService } from '../common/services/metrics.service';

/**
 * AppointmentsModule
 * 
 * Module pour l'agenda de rendez-vous avec rappels automatiques
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'appointments',
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppointmentsController],
  providers: [
    AppointmentsService,
    MetricsService,
    AppointmentsProcessor,
    AppointmentsScheduler,
    AppointmentsQueue,
  ],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
