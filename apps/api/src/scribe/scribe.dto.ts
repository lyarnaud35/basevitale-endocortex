import { z } from 'zod';
import { ApiProperty } from '@nestjs/swagger';
import { ConsultationSchema } from '@basevitale/shared';

/**
 * DTOs pour les endpoints du Module Scribe
 * 
 * Utilisent les schémas Zod comme source de vérité unique (Law I)
 */

/**
 * DTO pour process-dictation
 */
export const ProcessDictationDto = z.object({
  text: z.string().min(1, 'Le texte est requis'),
  patientId: z.string().min(1, 'Le patientId est requis'),
});

export type ProcessDictationDtoType = z.infer<typeof ProcessDictationDto>;

/**
 * DTO pour analyze-consultation
 */
export const AnalyzeConsultationDto = z.object({
  text: z.string().min(1, 'Le texte est requis'),
  patientId: z.string().min(1).optional(),
});

export type AnalyzeConsultationDtoType = z.infer<typeof AnalyzeConsultationDto>;

/**
 * Response DTO pour process-dictation
 * consultation inclut symptoms, diagnosis, medications, billingCodes (CCAM/NGAP), prescription (ordonnance).
 */
export interface ProcessDictationResponse {
  success: boolean;
  draft: {
    id: string;
    patientId: string;
    status: string;
    createdAt: Date;
  };
  consultation: z.infer<typeof ConsultationSchema>;
}

/** DTO Swagger pour billingCodes (actes facturables). */
export class BillingCodeDto {
  @ApiProperty() code: string;
  @ApiProperty() label: string;
  @ApiProperty({ minimum: 0, maximum: 1 }) confidence: number;
}

/** DTO Swagger pour prescription (ordonnance). */
export class PrescriptionItemDto {
  @ApiProperty() drug: string;
  @ApiProperty() dosage: string;
  @ApiProperty() duration: string;
}

/**
 * Response DTO pour validate
 */
export interface ValidateDraftResponse {
  success: boolean;
  draft: {
    id: string;
    patientId: string;
    status: string;
  };
  nodesCreated: number;
  neo4jRelationsCreated: number;
  nodes: any[];
}

/**
 * DTO Swagger – Réponse succès POST /scribe/validate/:draftId (201).
 * Données écrites dans Neo4j et Postgres.
 */
export class ValidateFinalSuccessDto {
  @ApiProperty({ example: true }) success: true;
  @ApiProperty({ example: 5, description: 'Nombre de relations Neo4j créées (REVEALED, CONCLUDED, etc.)' })
  graphNodesCreated: number;
}

/**
 * DTO Swagger – Réponse erreur 400 (Firewall Gardien Causal).
 * Format standard API : success false, error = message lisible (ex. INTERDICTION CRITIQUE…).
 * Le widget affiche l’alerte et garde le formulaire ouvert ; l’API bloque l’écriture.
 */
export class GuardianBlockErrorDto {
  @ApiProperty({ example: false }) success: false;
  @ApiProperty({
    example: 'INTERDICTION CRITIQUE : Patient allergique à Pénicilline.',
    description: 'Message d’interdiction (allergie ou interaction détectée). À afficher tel quel dans l’UI.',
  })
  error: string;
  @ApiProperty({ example: 400 }) statusCode: number;
  @ApiProperty({ example: '2025-01-28T18:00:00.000Z' }) timestamp: string;
  @ApiProperty({ example: '/api/scribe/validate/draft-123' }) path: string;
}

/**
 * DTO Swagger pour GET /patient/:patientId/intelligence
 */
export class IntelligenceTimelineItemDto {
  @ApiProperty() date: string;
  @ApiProperty() type: string;
  @ApiProperty() summary: string;
}

export class IntelligenceAlertDto {
  @ApiProperty({ enum: ['HIGH', 'MEDIUM'] }) level: 'HIGH' | 'MEDIUM';
  @ApiProperty() message: string;
}

export class IntelligenceResponseDto {
  @ApiProperty() summary: string;
  @ApiProperty({ type: [IntelligenceTimelineItemDto] }) timeline: IntelligenceTimelineItemDto[];
  @ApiProperty({ type: [IntelligenceAlertDto] }) activeAlerts: IntelligenceAlertDto[];
  @ApiProperty({ type: [String] }) quickActions: string[];
}
