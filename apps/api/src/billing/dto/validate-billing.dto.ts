import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Body pour POST /billing/validate – Valider la facture.
 * Mode 1 (contexte) : patientId seul → actes du jour (Procedure) + âge/ALD.
 * Mode 2 (explicite) : patientId + acts [+ modifiers] → validation directe depuis un Quote.
 */
export class ValidateBillingDto {
  @ApiProperty({ description: 'ID patient', example: 'scenario-paul-normal' })
  @IsString()
  patientId!: string;

  @ApiPropertyOptional({ description: 'Actes explicites (ex. C, NUIT). Si absent, utilise les actes du jour.' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acts?: string[];

  @ApiPropertyOptional({ description: 'Modificateurs (NUIT, MD...) fusionnés avec acts' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifiers?: string[];

  @ApiPropertyOptional({ description: 'Date/heure de l\'acte (ISO). Par défaut: now.' })
  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @ApiPropertyOptional({ description: 'ID consultation (lien médical-admin)' })
  @IsOptional()
  @IsString()
  consultationId?: string;

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
