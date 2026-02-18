import { IsArray, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Body pour POST /billing/quote – Devis (Réacteur Fiscal).
 * patientId → âge récupéré automatiquement (MEG si &lt; 6 ans).
 * modifiers (ex: NUIT) → fusionnés avec acts pour le moteur.
 */
export class QuoteBillingDto {
  @ApiPropertyOptional({ description: 'ID patient (pour règles conditionnelles âge, ALD)' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiProperty({ description: 'Liste des codes actes (ex. C, V, TCG)', example: ['C'] })
  @IsArray()
  @IsString({ each: true })
  acts!: string[];

  @ApiPropertyOptional({ description: 'Modificateurs (NUIT, MD...) — fusionnés avec acts' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifiers?: string[];
}
