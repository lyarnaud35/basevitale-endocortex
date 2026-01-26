import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../common/services/metrics.service';
import { withMetrics } from '../common/utils/metrics.util';

/**
 * AppointmentsService
 * 
 * Service pour la gestion de l'agenda de rendez-vous
 * Avec rappels automatiques et prévention double réservation
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Créer un rendez-vous
   * Vérifie automatiquement les conflits (double réservation)
   */
  async createAppointment(data: {
    patientId: string;
    doctorId?: string;
    doctorName?: string;
    appointmentDate: Date;
    startTime: Date;
    endTime: Date;
    appointmentType: string;
    title?: string;
    description?: string;
    location?: string;
    createdBy: string;
  }) {
    return withMetrics(
      this.metricsService,
      'appointments.create',
      async () => {
        // Vérifier conflit si médecin spécifié
        if (data.doctorId) {
          const conflict = await this.prisma.appointment.findFirst({
            where: {
              doctorId: data.doctorId,
              status: { in: ['SCHEDULED', 'CONFIRMED'] },
              OR: [
                {
                  AND: [
                    { startTime: { lte: data.startTime } },
                    { endTime: { gt: data.startTime } },
                  ],
                },
                {
                  AND: [
                    { startTime: { lt: data.endTime } },
                    { endTime: { gte: data.endTime } },
                  ],
                },
                {
                  AND: [
                    { startTime: { gte: data.startTime } },
                    { endTime: { lte: data.endTime } },
                  ],
                },
              ],
            },
          });

          if (conflict) {
            throw new ConflictException(
              'Le médecin a déjà un rendez-vous à ce créneau',
            );
          }
        }

        // Calculer durée
        const duration = Math.round(
          (data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60),
        );

        const appointment = await this.prisma.appointment.create({
          data: {
            patientId: data.patientId,
            doctorId: data.doctorId,
            doctorName: data.doctorName,
            appointmentDate: data.appointmentDate,
            startTime: data.startTime,
            endTime: data.endTime,
            duration,
            appointmentType: data.appointmentType,
            title: data.title,
            description: data.description,
            location: data.location,
            createdBy: data.createdBy,
          },
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        });

        // Créer rappels automatiques (24h avant, 2h avant)
        await this.createAutomaticReminders(appointment.id, data.startTime);

        this.logger.log(`Created appointment ${appointment.id}`);
        this.metricsService.incrementCounter('appointments.created');

        return appointment;
      },
    );
  }

  /**
   * Créer des rappels automatiques
   */
  private async createAutomaticReminders(
    appointmentId: string,
    appointmentTime: Date,
  ) {
    const reminders = [
      {
        appointmentId,
        reminderType: 'EMAIL',
        reminderTime: new Date(
          appointmentTime.getTime() - 24 * 60 * 60 * 1000,
        ), // 24h avant
        status: 'PENDING',
      },
      {
        appointmentId,
        reminderType: 'SMS',
        reminderTime: new Date(
          appointmentTime.getTime() - 2 * 60 * 60 * 1000,
        ), // 2h avant
        status: 'PENDING',
      },
    ];

    await this.prisma.appointmentReminder.createMany({
      data: reminders,
    });

    this.logger.debug(
      `Created ${reminders.length} automatic reminders for appointment ${appointmentId}`,
    );
  }

  /**
   * Obtenir les rendez-vous d'un médecin
   */
  async getDoctorAppointments(
    doctorId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return withMetrics(
      this.metricsService,
      'appointments.getDoctorAppointments',
      async () => {
        const where: any = {
          doctorId,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        };

        if (startDate || endDate) {
          where.appointmentDate = {};
          if (startDate) where.appointmentDate.gte = startDate;
          if (endDate) where.appointmentDate.lte = endDate;
        }

        const appointments = await this.prisma.appointment.findMany({
          where,
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
            reminders: {
              where: { status: 'PENDING' },
            },
          },
          orderBy: { startTime: 'asc' },
        });

        return appointments;
      },
    );
  }

  /**
   * Obtenir les rendez-vous d'un patient
   */
  async getPatientAppointments(patientId: string, upcomingOnly = true) {
    return withMetrics(
      this.metricsService,
      'appointments.getPatientAppointments',
      async () => {
        const where: any = { patientId };

        if (upcomingOnly) {
          where.startTime = { gte: new Date() };
          where.status = { in: ['SCHEDULED', 'CONFIRMED'] };
        }

        const appointments = await this.prisma.appointment.findMany({
          where,
          include: {
            reminders: {
              where: { status: 'PENDING' },
            },
          },
          orderBy: { startTime: 'asc' },
        });

        return appointments;
      },
    );
  }

  /**
   * Annuler un rendez-vous
   */
  async cancelAppointment(
    appointmentId: string,
    cancelledBy: string,
    reason?: string,
  ) {
    return withMetrics(
      this.metricsService,
      'appointments.cancel',
      async () => {
        const appointment = await this.prisma.appointment.findUnique({
          where: { id: appointmentId },
        });

        if (!appointment) {
          throw new NotFoundException(`Appointment ${appointmentId} not found`);
        }

        if (appointment.status === 'CANCELLED') {
          throw new BadRequestException('Appointment already cancelled');
        }

        // Annuler les rappels en attente
        await this.prisma.appointmentReminder.updateMany({
          where: {
            appointmentId,
            status: 'PENDING',
          },
          data: {
            status: 'CANCELLED',
          },
        });

        const updated = await this.prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelledBy,
            cancellationReason: reason,
          },
        });

        this.logger.log(`Cancelled appointment ${appointmentId}`);
        this.metricsService.incrementCounter('appointments.cancelled');

        return updated;
      },
    );
  }

  /**
   * Confirmer un rendez-vous
   */
  async confirmAppointment(appointmentId: string) {
    return withMetrics(
      this.metricsService,
      'appointments.confirm',
      async () => {
        const appointment = await this.prisma.appointment.findUnique({
          where: { id: appointmentId },
        });

        if (!appointment) {
          throw new NotFoundException(`Appointment ${appointmentId} not found`);
        }

        const updated = await this.prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            status: 'CONFIRMED',
          },
        });

        this.logger.log(`Confirmed appointment ${appointmentId}`);
        this.metricsService.incrementCounter('appointments.confirmed');

        return updated;
      },
    );
  }

  /**
   * Marquer un rendez-vous comme complété
   */
  async completeAppointment(appointmentId: string) {
    return withMetrics(
      this.metricsService,
      'appointments.complete',
      async () => {
        const appointment = await this.prisma.appointment.findUnique({
          where: { id: appointmentId },
        });

        if (!appointment) {
          throw new NotFoundException(`Appointment ${appointmentId} not found`);
        }

        const updated = await this.prisma.appointment.update({
          where: { id: appointmentId },
          data: {
            status: 'COMPLETED',
          },
        });

        this.logger.log(`Completed appointment ${appointmentId}`);
        this.metricsService.incrementCounter('appointments.completed');

        return updated;
      },
    );
  }

  /**
   * Obtenir les rappels à envoyer (pour job automatique)
   */
  async getPendingReminders(beforeDate?: Date) {
    const where: any = {
      status: 'PENDING',
      reminderTime: { lte: beforeDate || new Date() },
    };

    return this.prisma.appointmentReminder.findMany({
      where,
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { reminderTime: 'asc' },
      take: 100, // Limiter pour éviter surcharge
    });
  }

  /**
   * Marquer un rappel comme envoyé
   */
  async markReminderSent(reminderId: string) {
    await this.prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  }
}
