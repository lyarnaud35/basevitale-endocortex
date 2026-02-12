import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import type { SecurityGuardWsState } from '@basevitale/shared';
import {
  ConsultationOrchestratorService,
  type ConsultationState,
  type PrescribeResult,
} from './consultation-orchestrator.service';

const PRESCRIBE_TAG = 'Orchestrator (Module O – Cerveau Central)';

/** Réponse exposée au frontend / curl : status + feedback + securityData (compat procédure Cerveau Central) */
export type PrescribeResponse = PrescribeResult & {
  status: 'IDLE' | 'ANALYZING' | 'SECURE' | 'BLOCKED';
  feedback: string;
  securityData?: PrescribeResult['securityDetails'];
};

function toPrescribeResponse(result: PrescribeResult): PrescribeResponse {
  const status: PrescribeResponse['status'] =
    result.state === 'BLOCKED_BY_SECURITY' ? 'BLOCKED' :
    result.state === 'IN_PROGRESS' ? 'SECURE' :
    result.state === 'IDLE' ? 'IDLE' : 'SECURE';
  return {
    ...result,
    status,
    feedback: result.message,
    securityData: result.securityDetails,
  };
}

/** DTO entrant pour POST /orchestrator/analyze (Fusion C+ et B+) */
class AnalyzeBodyDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Le patient a de la fièvre et tousse. Pénicilline contre-indiquée.', required: false })
  text?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: 'Identifiant patient pour le Gardien', required: false })
  patientId?: string;
}

/** DTO entrant pour POST /orchestrator/analyze-symptoms (Module B+) */
class AnalyzeSymptomsBodyDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Le patient présente une toux sèche et de la fièvre.', required: false })
  text?: string;
}

/** DTO entrant pour POST /orchestrator/prescribe (drugName ou drugId acceptés) */
class PrescribeBodyDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Doliprane', description: 'Nom du médicament (alias drugId)', required: false })
  drugName?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'Doliprane', description: 'Identifiant du médicament', required: false })
  drugId?: string;

  @IsOptional()
  @IsObject()
  @ApiProperty({ required: false, description: 'Contexte patient optionnel' })
  patientContext?: Record<string, unknown>;
}

@ApiTags(PRESCRIBE_TAG)
@Controller('orchestrator')
@Public()
export class OrchestratorController {
  constructor(
    private readonly consultationOrchestrator: ConsultationOrchestratorService,
  ) {}

  @Post('prescribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Intention PRESCRIBE',
    description:
      'Un seul appel déclenche la chaîne : Sécurité (Gardien) puis état global. Blocage si allergie.',
  })
  @ApiResponse({ status: 200, description: 'État et message après vérification sécurité.' })
  async prescribe(@Body() body: PrescribeBodyDto): Promise<PrescribeResponse> {
    const drugName = (typeof body?.drugName === 'string' ? body.drugName.trim() : '') || (typeof body?.drugId === 'string' ? body.drugId.trim() : '');
    const result = await this.consultationOrchestrator.processIntent({
      type: 'PRESCRIBE',
      drugId: drugName || '(vide)',
      patientContext: body?.patientContext,
    });
    return toPrescribeResponse(result);
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fusion C+ et B+ – Analyse texte (sécurité + codes CIM-10) en parallèle',
    description: 'Un seul appel : Gardien (C+) + Stratège (B+). Ne modifie pas l\'état global.',
  })
  @ApiResponse({ status: 200, description: 'security (Gardien) + suggestions (CIM-10)' })
  async analyze(@Body() body: AnalyzeBodyDto): Promise<{
    security: SecurityGuardWsState;
    suggestions: Array<{ code: string; label: string; confidence: number }>;
  }> {
    const text = typeof body?.text === 'string' ? body.text : '';
    const patientId = typeof body?.patientId === 'string' ? body.patientId : undefined;
    const result = await this.consultationOrchestrator.analyzeText(text, patientId);
    return {
      security: result.security,
      suggestions: result.suggestions as Array<{ code: string; label: string; confidence: number }>,
    };
  }

  @Post('analyze-symptoms')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Module B+ – Analyse symptômes → suggestions CIM-10',
    description: 'Passe par l\'Orchestrateur. Mock déterministe (fièvre/toux/grippe).',
  })
  @ApiResponse({ status: 200, description: 'Liste de suggestions { code, label, confidence }' })
  async analyzeSymptoms(@Body() body: AnalyzeSymptomsBodyDto): Promise<{ suggestions: Array<{ code: string; label: string; confidence: number }> }> {
    const text = typeof body?.text === 'string' ? body.text : '';
    const { suggestions } = await this.consultationOrchestrator.analyzeSymptoms(text);
    return { suggestions: suggestions as Array<{ code: string; label: string; confidence: number }> };
  }

  @Get('state')
  @ApiOperation({ summary: 'État global de la consultation' })
  @ApiResponse({ status: 200, description: 'IDLE | IN_PROGRESS | BLOCKED_BY_SECURITY | READY_TO_SIGN' })
  getState(): { state: ConsultationState } {
    return { state: this.consultationOrchestrator.getCurrentState() };
  }

  @Post('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remet l’état à IDLE (nouvelle consultation)' })
  reset(): void {
    this.consultationOrchestrator.reset();
  }
}
