import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LISService } from './lis.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';
import { Public } from '../common/decorators/public.decorator';

/**
 * LISController
 * 
 * Endpoints pour le Laboratory Information System (LIS)
 * Réception automatique des résultats de laboratoire
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Controller('lis')
@UseGuards(AuthGuard, RoleGuard)
export class LISController {
  constructor(private readonly lisService: LISService) {}

  /**
   * Réceptionner un résultat de laboratoire (API externe)
   * POST /lis/results
   */
  @Post('results')
  @Public() // Peut être appelé par des laboratoires externes avec authentification spéciale
  async receiveLaboratoryResult(@Body() body: any) {
    const result = await this.lisService.receiveLaboratoryResult(body);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Réceptionner un batch de résultats (HL7/FHIR)
   * POST /lis/results/batch
   */
  @Post('results/batch')
  @Public()
  async receiveBatchResults(@Body() body: { results: any[] }) {
    const results = await this.lisService.receiveBatchResults(body.results);
    return {
      success: true,
      data: results,
      count: results.length,
    };
  }

  /**
   * Obtenir les résultats d'un patient
   * GET /lis/patients/:patientId/results
   */
  @Get('patients/:patientId/results')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
  async getPatientResults(
    @Param('patientId') patientId: string,
    @Query('testDateFrom') testDateFrom?: string,
    @Query('testDateTo') testDateTo?: string,
    @Query('status') status?: string,
  ) {
    const results = await this.lisService.getPatientResults(patientId, {
      testDateFrom: testDateFrom ? new Date(testDateFrom) : undefined,
      testDateTo: testDateTo ? new Date(testDateTo) : undefined,
      status,
    });
    return {
      success: true,
      data: results,
    };
  }
}
