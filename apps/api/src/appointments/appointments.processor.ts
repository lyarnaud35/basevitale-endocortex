import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

/**
 * AppointmentsProcessor
 * 
 * Processeur BullMQ pour les tâches d'agenda
 * - Envoi des rappels automatiques
 * - Notification des rendez-vous à venir
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Processor('appointments')
@Injectable()
export class AppointmentsProcessor {
  private readonly logger = new Logger(AppointmentsProcessor.name);

  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * Traiter les rappels à envoyer
   */
  @Process('send-reminders')
  async handleSendReminders(job: Job<{ beforeDate?: Date }>) {
    this.logger.log(`Processing reminders job ${job.id}`);

    try {
      const reminders = await this.appointmentsService.getPendingReminders(
        job.data.beforeDate,
      );

      this.logger.log(`Found ${reminders.length} reminders to send`);

      for (const reminder of reminders) {
        try {
          // Envoyer le rappel selon le type
          if (reminder.reminderType === 'EMAIL') {
            // TODO: Intégrer service email (SendGrid, etc.)
            this.logger.log(
              `Would send EMAIL reminder for appointment ${reminder.appointmentId}`,
            );
          } else if (reminder.reminderType === 'SMS') {
            // TODO: Intégrer service SMS (Twilio, etc.)
            this.logger.log(
              `Would send SMS reminder for appointment ${reminder.appointmentId}`,
            );
          }

          // Marquer comme envoyé
          await this.appointmentsService.markReminderSent(reminder.id);
        } catch (error) {
          this.logger.error(
            `Failed to send reminder ${reminder.id}`,
            error,
          );
        }
      }

      return { processed: reminders.length };
    } catch (error) {
      this.logger.error('Error processing reminders', error);
      throw error;
    }
  }
}
