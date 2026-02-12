import { IsArray, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SimulateBillingDto {
  @ApiProperty({ description: 'Liste des codes actes (ex. C, MD)', example: ['C'] })
  @IsArray()
  @IsString({ each: true })
  acts!: string[];

  @ApiPropertyOptional({ description: 'ID patient (pour règles conditionnelles âge, etc.)' })
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional({ description: 'Âge du patient (pour règles enfant < 6 ans)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  patientAge?: number;
}
