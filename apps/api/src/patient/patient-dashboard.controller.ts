import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import type {
  PatientDashboardState,
  DashboardOracleState,
  DashboardSecurityState,
  DashboardCodingState,
} from '@basevitale/shared';
import { OracleGhostService } from '../oracle/oracle-ghost.service';
import { SecurityGuardService } from '../security/security-guard.service';
import { CodingAssistantService } from '../coding/coding-assistant.service';
import {
  PatientDashboardStateDto,
  DashboardOracleStateDto,
  DashboardOracleDataDto,
  DashboardSecurityStateDto,
  DashboardCodingStateDto,
  DashboardCodingSuggestionItemDto,
  DashboardTimelineItemDto,
  DashboardAlertDto,
} from './patient-dashboard.dto';

/**
 * GHOST PROTOCOL - Dashboard State (Source unique pour Ben)
 * Un seul endpoint pour l'état agrégé Oracle + Security + Coding (3 piliers).
 */
@ApiTags('Patient')
@Controller('patient')
export class PatientDashboardController {
  constructor(
    private readonly oracleGhostService: OracleGhostService,
    private readonly securityGuardService: SecurityGuardService,
    private readonly codingAssistantService: CodingAssistantService,
  ) {}

  /**
   * GET /api/patient/:id/dashboard-state
   * Agrège l'état des trois machines (Oracle + Security + Coding) pour une seule source de vérité.
   */
  @Public()
  @Get(':id/dashboard-state')
  @ApiOperation({
    summary: 'État agrégé du dashboard patient (Oracle, Security, Coding)',
    description:
      'Source unique de vérité pour le frontend. Oracle = contexte patient (timeline, alertes). Security = vigilance DEFCON_3. Coding = suggestions CIM-10 (status SUGGESTING/SILENT, suggestions avec confidence).',
  })
  @ApiExtraModels(
    PatientDashboardStateDto,
    DashboardCodingStateDto,
    DashboardCodingSuggestionItemDto,
  )
  @ApiResponse({
    status: 200,
    description: 'État agrégé des 3 piliers (oracle, security, coding)',
    type: PatientDashboardStateDto,
  })
  getDashboardState(@Param('id') patientId: string): PatientDashboardState {
    const oracleState = this.oracleGhostService.getStateOrNull(patientId);
    const securityState = this.securityGuardService.getState(patientId);

    const oracle: DashboardOracleState = oracleState
      ? {
          state: oracleState.value,
          data:
            oracleState.value === 'READY' && oracleState.context.patientId
              ? {
                  patientId: oracleState.context.patientId,
                  timeline: oracleState.context.timeline,
                  alertes: oracleState.context.alertes,
                }
              : null,
        }
      : { state: 'IDLE', data: null };

    const blocking_reasons: string[] =
      (securityState.value === 'DEFCON_3' || securityState.value === 'OVERRIDE_ACTIVE') &&
      securityState.context.patientContext?.alertes
        ? securityState.context.patientContext.alertes.map((a) => a.message)
        : [];

    const isSubmitted = securityState.value === 'SUBMITTED';
    const allowed_actions: ('OVERRIDE' | 'ACKNOWLEDGE' | 'VALIDATE_PRESCRIPTION' | 'RESET')[] =
      securityState.value === 'DEFCON_3'
        ? ['OVERRIDE', 'ACKNOWLEDGE']
        : securityState.value === 'OVERRIDE_ACTIVE'
          ? ['VALIDATE_PRESCRIPTION']
          : isSubmitted
            ? ['RESET']
            : [];

    const active_override =
      securityState.value === 'OVERRIDE_ACTIVE' && securityState.context.activeOverride
        ? {
            reason: securityState.context.activeOverride.reason,
            at: securityState.context.activeOverride.at,
            author: securityState.context.activeOverride.author,
          }
        : undefined;

    // Ne jamais exposer SUBMITTED au front : on mappe vers SUCCESS (état terminal succès).
    const securityStatus: DashboardSecurityState['status'] =
      securityState.value === 'SUBMITTED' ? 'SUCCESS' : securityState.value;

    const security: DashboardSecurityState = {
      status: securityStatus,
      blocking_reasons: isSubmitted ? [] : blocking_reasons,
      allowed_actions,
      ...(active_override && { active_override }),
      ...(isSubmitted && {
        confirmation_message:
          "Prescription validée sous dérogation. Trace d'audit générée.",
      }),
    };

    const codingState = this.codingAssistantService.getState(patientId);
    const coding: DashboardCodingState = {
      status: codingState.value,
      suggestions: codingState.context.suggestions,
    };

    return { oracle, security, coding };
  }
}
