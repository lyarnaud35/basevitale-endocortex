import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsOptional } from 'class-validator';

/**
 * GHOST PROTOCOL - Body pour POST /api/ghost/event
 * L'Interrupteur Quantique : une seule porte d'entrée pour les intentions.
 */
export class GhostEventBodyDto {
  @IsString()
  @ApiProperty({
    example: 'security',
    description: 'Identifiant de la machine cible (ex: security)',
  })
  machineId: string;

  @IsString()
  @ApiProperty({
    example: 'OVERRIDE_REQUEST',
    description: 'Type d’événement (ex: OVERRIDE_REQUEST)',
  })
  eventType: string;

  @IsObject()
  @IsOptional()
  @ApiProperty({
    example: { patientId: 'patient-dashboard-test', reason: 'Urgence vitale - Bénéfice > Risque' },
    description: 'Payload (patientId, reason, etc.)',
  })
  payload?: Record<string, unknown>;
}
