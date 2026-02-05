import { ApiProperty } from '@nestjs/swagger';

/** Contexte de la SecurityMachine (médicament vérifié, niveau de risque, raison de blocage). */
export class SecurityContextDto {
  @ApiProperty({
    example: 'Amoxicilline',
    nullable: true,
    description: 'Médicament en cours de vérification',
  })
  currentDrug: string | null;

  @ApiProperty({
    example: 'NONE',
    enum: ['NONE', 'HIGH'],
    description: 'Niveau de risque (HIGH = contre-indication détectée)',
  })
  riskLevel: string;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Raison du blocage si riskLevel HIGH',
  })
  blockReason: string | null;

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Justification enregistrée en cas de dérogation (REQUEST_OVERRIDE)',
  })
  auditTrail: string | null;
}

/** État complet de la SecurityMachine (réponse des endpoints /ghost-security/send, /ghost-security/state). */
export class SecurityResponseDto {
  @ApiProperty({
    example: 'SAFE',
    enum: ['IDLE', 'ANALYZING', 'SAFE', 'LOCKED', 'OVERRIDE_APPROVED'],
    description: 'État courant (LOCKED = contre-indication, OVERRIDE_APPROVED = dérogation validée)',
  })
  value: string;

  @ApiProperty({ type: SecurityContextDto, description: 'Contexte (currentDrug, riskLevel, blockReason)' })
  context: SecurityContextDto;

  @ApiProperty({
    example: '2026-02-05T12:00:00.000Z',
    description: 'Date/heure de dernière mise à jour (ISO 8601)',
  })
  updatedAt: string;
}

/** Body pour envoi d’un événement (ex. CHECK_DRUG pour vérification prescription). */
export class CheckDrugBodyDto {
  @ApiProperty({
    example: 'CHECK_DRUG',
    enum: ['CHECK_DRUG', 'RESET', 'REQUEST_OVERRIDE'],
    description: 'Type d’événement',
  })
  type: string;

  @ApiProperty({
    example: { drug: 'Amoxicilline' },
    description: 'Payload : drug pour CHECK_DRUG, justification pour REQUEST_OVERRIDE',
  })
  payload: Record<string, unknown>;
}
