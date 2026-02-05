import { ApiProperty } from '@nestjs/swagger';

/** Une suggestion de code CIM-10 avec score de confiance (0–1). */
export class CodingSuggestionItemDto {
  @ApiProperty({ example: 'S82', description: 'Code CIM-10' })
  code: string;

  @ApiProperty({ example: 'Fracture de la jambe', description: 'Libellé du code' })
  label: string;

  @ApiProperty({
    example: 0.95,
    minimum: 0,
    maximum: 1,
    description: 'Score de confiance (0.0–1.0)',
  })
  confidence: number;
}

/** Contexte de la machine de codage (dernier texte analysé + suggestions). */
export class CodingContextDto {
  @ApiProperty({ example: '', description: 'Dernier texte soumis à l’analyse' })
  lastInput: string;

  @ApiProperty({
    type: [CodingSuggestionItemDto],
    description: 'Liste des codes CIM-10 détectés (affichés uniquement en état SUGGESTING)',
  })
  suggestions: CodingSuggestionItemDto[];
}

/** État complet de la CodingMachine (réponse des endpoints /coding/analyze, /coding/send, /coding/state). */
export class CodingResponseDto {
  @ApiProperty({
    example: 'SUGGESTING',
    enum: ['IDLE', 'ANALYZING', 'SUGGESTING', 'SILENT'],
    description: 'État courant de la machine (Silence attentionnel : SILENT = confiance < seuil)',
  })
  value: string;

  @ApiProperty({ type: CodingContextDto, description: 'Contexte (lastInput, suggestions)' })
  context: CodingContextDto;

  @ApiProperty({
    example: '2026-02-05T12:00:00.000Z',
    description: 'Date/heure de dernière mise à jour (ISO 8601)',
  })
  updatedAt: string;
}

/** Body pour POST /coding/analyze (suggest). */
export class AnalyzeTextBodyDto {
  @ApiProperty({
    example: 'Le patient présente une fracture du tibia droit.',
    description: 'Texte à analyser (ex. sortie Scribe) pour proposer des codes CIM-10',
  })
  text: string;
}
