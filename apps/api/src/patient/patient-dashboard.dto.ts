import { ApiProperty } from '@nestjs/swagger';

/**
 * GHOST PROTOCOL - DTOs Swagger pour GET /api/patient/:id/dashboard-state
 * Alignés sur libs/shared (PatientDashboardState, DashboardCodingState, CodingSuggestionItem).
 * Chaque champ a @ApiProperty ; enums explicites (const) pour générateur OpenAPI.
 */

/** Élément de timeline (Oracle). */
export class DashboardTimelineItemDto {
  @ApiProperty({ example: '2024-01-15', description: 'Date de l’événement' })
  date: string;

  @ApiProperty({ example: 'consultation', description: 'Type (consultation, diagnostic, …)' })
  type: string;

  @ApiProperty({ example: 'Consultation cardiologie – bilan hypertension', description: 'Résumé' })
  summary: string;
}

/** Alerte active (Oracle). */
export class DashboardAlertDto {
  @ApiProperty({ example: 'HIGH', enum: ['HIGH', 'MEDIUM'] as const, description: 'Niveau de gravité' })
  level: string;

  @ApiProperty({ example: 'Allergie à la Pénicilline – ne pas prescrire', description: 'Message d’alerte' })
  message: string;
}

/** Données patient exposées quand l’Oracle est READY. */
export class DashboardOracleDataDto {
  @ApiProperty({ example: 'patient-dashboard-test', description: 'Identifiant patient' })
  patientId: string;

  @ApiProperty({ type: [DashboardTimelineItemDto], description: 'Timeline des événements' })
  timeline: DashboardTimelineItemDto[];

  @ApiProperty({ type: [DashboardAlertDto], description: 'Alertes actives (allergies, interactions, …)' })
  alertes: DashboardAlertDto[];
}

/** États possibles de l'Oracle (PatientContextMachine). */
export const DashboardOracleStateEnum = ['IDLE', 'INITIALIZING', 'FETCHING_CONTEXT', 'ANALYZING', 'READY', 'ERROR'] as const;

/** État Oracle pour le dashboard. */
export class DashboardOracleStateDto {
  @ApiProperty({
    example: 'READY',
    enum: DashboardOracleStateEnum,
    description: 'État de la PatientContextMachine (Oracle)',
  })
  state: string;

  @ApiProperty({
    type: DashboardOracleDataDto,
    nullable: true,
    description: 'Données patient (timeline + alertes) lorsque state === READY, sinon null',
  })
  data: DashboardOracleDataDto | null;
}

/** États possibles du SecurityGuard. */
export const DashboardSecurityStatusEnum = [
  'IDLE',
  'DEFCON_3',
  'OVERRIDE_ACTIVE',
  'SUCCESS',
] as const;

/** Actions autorisées par le Backend (Server-Driven UI). */
export const DashboardSecurityAllowedActionsEnum = [
  'OVERRIDE',
  'ACKNOWLEDGE',
  'VALIDATE_PRESCRIPTION',
  'RESET',
] as const;

/** Dérogation active (état Orange — preuve visible). */
export class DashboardActiveOverrideDto {
  @ApiProperty({ example: 'Urgence vitale - Bénéfice > Risque' })
  reason: string;

  @ApiProperty({ example: '2026-02-05T12:00:00.000Z' })
  at: string;

  @ApiProperty({ example: 'Dr. House', required: false })
  author?: string;
}

/** État Security pour le dashboard (SecurityGuardMachine). */
export class DashboardSecurityStateDto {
  @ApiProperty({
    example: 'DEFCON_3',
    enum: DashboardSecurityStatusEnum,
    description: 'IDLE=ras, DEFCON_3=danger, OVERRIDE_ACTIVE=dérogation active (orange)',
  })
  status: string;

  @ApiProperty({
    type: [String],
    example: ['Allergie à la Pénicilline – ne pas prescrire'],
    description: 'Raisons de blocage / vigilance (danger toujours affiché en Orange)',
  })
  blocking_reasons: string[];

  @ApiProperty({
    type: [String],
    enum: DashboardSecurityAllowedActionsEnum,
    example: ['OVERRIDE', 'ACKNOWLEDGE'],
    description: 'Actions que le frontend peut proposer (OVERRIDE en DEFCON_3, VALIDATE_PRESCRIPTION en OVERRIDE_ACTIVE)',
  })
  allowed_actions: string[];

  @ApiProperty({
    type: DashboardActiveOverrideDto,
    required: false,
    description: 'Dérogation active (présent uniquement en OVERRIDE_ACTIVE)',
  })
  active_override?: DashboardActiveOverrideDto;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Message de confirmation après engagement (état SUCCESS, ex. trace d'audit)",
  })
  confirmation_message?: string;
}

/** Une suggestion de code CIM-10 (CodingAssistant). */
export class DashboardCodingSuggestionItemDto {
  @ApiProperty({ example: 'Z00.0', description: 'Code CIM-10' })
  code: string;

  @ApiProperty({ example: 'Examen médical général', description: 'Libellé du code' })
  label: string;

  @ApiProperty({
    example: 0.85,
    minimum: 0,
    maximum: 1,
    description: 'Score de confiance (0.0–1.0). Au-dessus du seuil → état SUGGESTING.',
  })
  confidence: number;
}

/** États possibles du Coding Assistant (CodingAssistantMachine). */
export const DashboardCodingStatusEnum = ['IDLE', 'ANALYZING', 'SUGGESTING', 'SILENT'] as const;

/** État Coding Assistant pour le dashboard (CodingAssistantMachine). */
export class DashboardCodingStateDto {
  @ApiProperty({
    example: 'SUGGESTING',
    enum: DashboardCodingStatusEnum,
    description: 'IDLE=inactif, ANALYZING=analyse en cours, SUGGESTING=codes proposés, SILENT=confiance trop basse',
  })
  status: string;

  @ApiProperty({
    type: [DashboardCodingSuggestionItemDto],
    description: 'Suggestions de codes CIM-10 (remplies en SUGGESTING, vides sinon)',
  })
  suggestions: DashboardCodingSuggestionItemDto[];
}

/** Réponse agrégée : source unique de vérité pour le frontend (3 piliers). */
export class PatientDashboardStateDto {
  @ApiProperty({ type: DashboardOracleStateDto, description: 'État de l’Oracle (contexte patient)' })
  oracle: DashboardOracleStateDto;

  @ApiProperty({ type: DashboardSecurityStateDto, description: 'État du SecurityGuard (vigilance / DEFCON_3)' })
  security: DashboardSecurityStateDto;

  @ApiProperty({
    type: DashboardCodingStateDto,
    description: 'État du Coding Assistant (suggestions CIM-10, Silence attentionnel)',
  })
  coding: DashboardCodingStateDto;
}
