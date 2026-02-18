import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrescriptionDraftService } from './prescription-draft.service';
import type {
  PrescriptionDraftState,
  AddDrugBody,
  RemoveDrugBody,
  ValidateDraftBody,
  ValidateDraftResponse,
  PrescriptionHistoryResponse,
} from './prescription-draft.types';

@ApiTags('Draft')
@Controller('draft')
export class PrescriptionDraftController {
  constructor(private readonly draftService: PrescriptionDraftService) {}

  @Post('add')
  @ApiOperation({
    summary: 'Ajouter un médicament au brouillon',
    description:
      'Ajoute un CIS au brouillon du patient. Recalcule immédiatement la sécurité globale (allergies + doublons de molécules). Retourne le brouillon mis à jour avec global_safety.',
  })
  @ApiResponse({ status: 201, description: 'Brouillon mis à jour avec safetyReport (status: OK|WARNING|CRITICAL).' })
  async addDrug(@Body() body: AddDrugBody): Promise<PrescriptionDraftState & { global_safety: PrescriptionDraftState['safetyReport'] }> {
    const { patientId, cisId, posology } = body;
    const state = await this.draftService.addDrug(patientId ?? '', cisId ?? '', posology);
    return { ...state, global_safety: state.safetyReport };
  }

  @Delete('remove')
  @ApiOperation({
    summary: 'Retirer un médicament du brouillon',
    description: 'Retire un CIS du brouillon. Retourne l\'état mis à jour avec global_safety.',
  })
  @ApiResponse({ status: 200, description: 'Brouillon mis à jour.' })
  async removeDrug(
    @Body() body: RemoveDrugBody,
  ): Promise<PrescriptionDraftState & { global_safety: PrescriptionDraftState['safetyReport'] }> {
    const { patientId, cisId } = body;
    const state = await this.draftService.removeDrug(patientId ?? '', cisId ?? '');
    return { ...state, global_safety: state.safetyReport };
  }

  @Get('current')
  @ApiOperation({
    summary: 'État actuel du brouillon',
    description: 'Retourne le brouillon complet (liste de médicaments + safetyReport) pour le patient.',
  })
  @ApiQuery({ name: 'patientId', required: true, description: 'ID patient' })
  @ApiResponse({ status: 200, description: 'Brouillon avec cisIds, drugs, safetyReport (global_safety).' })
  async getCurrent(
    @Query('patientId') patientId: string,
  ): Promise<PrescriptionDraftState & { global_safety: PrescriptionDraftState['safetyReport'] }> {
    const state = await this.draftService.getCurrent(patientId ?? '');
    return { ...state, global_safety: state.safetyReport };
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Valider le brouillon (cristallisation)',
    description:
      'Écrit l\'ordonnance en Neo4j (nœud Prescription, relations A_DOSSIER_CLINIQUE et PRESCROIT), vide le brouillon. Refusé si brouillon vide ou sécurité CRITICAL.',
  })
  @ApiResponse({ status: 201, description: 'Prescription créée, retourne prescriptionId.' })
  @ApiResponse({ status: 400, description: 'Brouillon vide.' })
  @ApiResponse({ status: 403, description: 'Sécurité CRITICAL (allergie ou doublon).' })
  async validate(@Body() body: ValidateDraftBody): Promise<ValidateDraftResponse> {
    const patientId = body.patientId ?? '';
    return this.draftService.validate(patientId);
  }

  @Get('prescriptions-history')
  @ApiOperation({
    summary: 'Historique des ordonnances validées (timeline patient)',
    description: 'Dernières 5 ordonnances du patient (nœuds Prescription liés par A_DOSSIER_CLINIQUE).',
  })
  @ApiQuery({ name: 'patientId', required: true, description: 'ID patient' })
  @ApiResponse({ status: 200, description: 'Liste des prescriptions avec médicaments et posologies.' })
  async getPrescriptionHistory(
    @Query('patientId') patientId: string,
  ): Promise<PrescriptionHistoryResponse> {
    return this.draftService.getPrescriptionHistory(patientId ?? '');
  }
}
