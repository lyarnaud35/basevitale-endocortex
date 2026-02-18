import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Body pour POST /billing/validate – Valider la facture en un clic (contexte actuel).
 * Reprend le même contexte que la prédiction (patientId + overrides optionnels).
 */
export class ValidateBillingDto {
  @ApiProperty({ description: 'ID patient (actes du jour + contexte)', example: 'scenario-paul-normal' })
  @IsString()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Âge simulé (ex: 4 pour Enfant)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  age?: number;

  @ApiPropertyOptional({ description: 'Patient ALD (100 % Sécu)' })
  @IsOptional()
  @IsBoolean()
  ald?: boolean;
}
