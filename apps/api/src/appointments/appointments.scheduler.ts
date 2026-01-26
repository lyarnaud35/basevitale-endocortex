import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * AppointmentsScheduler
 * 
 * Scheduler pour les tâches périodiques de l'agenda
 * - Vérification des rappels toutes les heures
 * - Envoi automatique des rappels
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Injectable()
export class AppointmentsScheduler implements OnModuleInit {
  private readonly logger = new Logger(AppointmentsScheduler.name);

  constructor(
    @InjectQueue('appointments') private readonly appointmentsQueue: Queue,
  ) {}

  onModuleInit() {
    this.logger.log('AppointmentsScheduler initialized');
  }

  /**
   * Vérifier et envoyer les rappels toutes les heures
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleSendReminders() {
    this.logger.log('Checking for reminders to send');

    await this.appointmentsQueue.add('send-reminders', {
      beforeDate: new Date(),
    });
  }
}
