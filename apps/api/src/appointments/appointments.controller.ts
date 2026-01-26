import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';

/**
 * AppointmentsController
 * 
 * Endpoints pour l'agenda de rendez-vous
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Controller('appointments')
@UseGuards(AuthGuard, RoleGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * Créer un rendez-vous
   * POST /appointments
   */
  @Post()
  @Roles(Role.ADMIN, Role.DOCTOR, Role.SECRETARY)
  async createAppointment(@Body() body: any, @CurrentUserId() userId: string) {
    const appointment = await this.appointmentsService.createAppointment({
      ...body,
      createdBy: userId,
    });
    return {
      success: true,
      data: appointment,
    };
  }

  /**
   * Obtenir les rendez-vous d'un médecin
   * GET /appointments/doctors/:doctorId
   */
  @Get('doctors/:doctorId')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.SECRETARY)
  async getDoctorAppointments(
    @Param('doctorId') doctorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const appointments = await this.appointmentsService.getDoctorAppointments(
      doctorId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return {
      success: true,
      data: appointments,
    };
  }

  /**
   * Obtenir les rendez-vous d'un patient
   * GET /appointments/patients/:patientId
   */
  @Get('patients/:patientId')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.SECRETARY)
  async getPatientAppointments(
    @Param('patientId') patientId: string,
    @Query('upcomingOnly') upcomingOnly?: string,
  ) {
    const appointments =
      await this.appointmentsService.getPatientAppointments(
        patientId,
        upcomingOnly !== 'false',
      );
    return {
      success: true,
      data: appointments,
    };
  }

  /**
   * Annuler un rendez-vous
   * PUT /appointments/:id/cancel
   */
  @Put(':id/cancel')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.SECRETARY)
  async cancelAppointment(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUserId() userId: string,
  ) {
    const appointment = await this.appointmentsService.cancelAppointment(
      id,
      userId,
      body.reason,
    );
    return {
      success: true,
      data: appointment,
    };
  }

  /**
   * Confirmer un rendez-vous
   * PUT /appointments/:id/confirm
   */
  @Put(':id/confirm')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.SECRETARY)
  async confirmAppointment(@Param('id') id: string) {
    const appointment = await this.appointmentsService.confirmAppointment(id);
    return {
      success: true,
      data: appointment,
    };
  }

  /**
   * Marquer un rendez-vous comme complété
   * PUT /appointments/:id/complete
   */
  @Put(':id/complete')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async completeAppointment(@Param('id') id: string) {
    const appointment = await this.appointmentsService.completeAppointment(id);
    return {
      success: true,
      data: appointment,
    };
  }

  /**
   * Obtenir les rappels en attente (pour job automatique)
   * GET /appointments/reminders/pending
   */
  @Get('reminders/pending')
  @Roles(Role.ADMIN)
  async getPendingReminders(@Query('beforeDate') beforeDate?: string) {
    const reminders = await this.appointmentsService.getPendingReminders(
      beforeDate ? new Date(beforeDate) : undefined,
    );
    return {
      success: true,
      data: reminders,
    };
  }
}
