import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DPIService } from './dpi.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';

/**
 * DPIController
 * 
 * Endpoints pour le Dossier Patient Informatisé (DPI)
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Controller('dpi')
@UseGuards(AuthGuard, RoleGuard)
export class DPIController {
  constructor(private readonly dpiService: DPIService) {}

  /**
   * Obtenir le DPI complet d'un patient
   * GET /dpi/patients/:patientId
   */
  @Get('patients/:patientId')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
  async getPatientDPI(
    @Param('patientId') patientId: string,
    @CurrentUserId() userId: string,
  ) {
    const dpi = await this.dpiService.getPatientDPI(patientId);
    return {
      success: true,
      data: dpi,
    };
  }

  /**
   * Rechercher dans le DPI
   * GET /dpi/patients/:patientId/search?q=query
   */
  @Get('patients/:patientId/search')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
  async searchDPI(
    @Param('patientId') patientId: string,
    @Query('q') query: string,
    @CurrentUserId() userId: string,
  ) {
    const results = await this.dpiService.searchDPI(patientId, query);
    return {
      success: true,
      data: results,
    };
  }

  /**
   * Créer un document médical
   * POST /dpi/documents
   */
  @Post('documents')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async createMedicalDocument(
    @Body() body: any,
    @CurrentUserId() userId: string,
  ) {
    const document = await this.dpiService.createMedicalDocument({
      ...body,
      createdBy: userId,
    });
    return {
      success: true,
      data: document,
    };
  }

  /**
   * Créer un compte rendu médical
   * POST /dpi/reports
   */
  @Post('reports')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async createMedicalReport(
    @Body() body: any,
    @CurrentUserId() userId: string,
  ) {
    const report = await this.dpiService.createMedicalReport({
      ...body,
      createdBy: userId,
    });
    return {
      success: true,
      data: report,
    };
  }
}
