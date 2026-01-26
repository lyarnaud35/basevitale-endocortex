import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Injectable, Logger } from '@nestjs/common';

/**
 * AppointmentsQueue
 * 
 * Queue helper pour les tâches d'agenda
 * Version BaseVitale Révolutionnaire
 */
@Injectable()
export class AppointmentsQueue {
  private readonly logger = new Logger(AppointmentsQueue.name);

  constructor(
    @InjectQueue('appointments') private readonly appointmentsQueue: Queue,
  ) {}

  /**
   * Ajouter une tâche de vérification des rappels
   */
  async scheduleReminderCheck() {
    await this.appointmentsQueue.add('send-reminders', {
      beforeDate: new Date(),
    });
  }
}
