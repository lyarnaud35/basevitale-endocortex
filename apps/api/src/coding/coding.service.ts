import { Injectable, Logger } from '@nestjs/common';
import type { CodingSuggestionItem } from '@basevitale/shared';

const CONFIDENCE_HIGH = 0.95;
const CONFIDENCE_LOW = 0.35;
const CONFIDENCE_RANDOM_MIN = 0.4;
const CONFIDENCE_RANDOM_MAX = 0.7;

/**
 * CodingService – Mock intelligent pour la démo (Silence Attentionnel).
 * Logique déterministe pour tester SUGGESTING vs SILENT.
 */
@Injectable()
export class CodingService {
  private readonly logger = new Logger(CodingService.name);

  /**
   * Analyse un texte et retourne des suggestions de codes CIM-10 avec score de confiance.
   * Mock déterministe :
   * - "fracture" ou "tibia" → S82 (0.95)
   * - "ventre" ou "vague" → R10 (0.35)
   * - Sinon → aléatoire entre 0.4 et 0.7
   */
  async analyze(text: string): Promise<CodingSuggestionItem[]> {
    const lower = text.trim().toLowerCase();
    this.logger.debug(`Analyzing text (length=${lower.length}): "${lower.slice(0, 50)}..."`);

    if (lower.includes('fracture') || lower.includes('tibia')) {
      return [
        {
          code: 'S82',
          label: 'Fracture de la jambe',
          confidence: CONFIDENCE_HIGH,
        },
      ];
    }

    if (lower.includes('ventre') || lower.includes('vague')) {
      return [
        {
          code: 'R10',
          label: 'Douleur abdominale',
          confidence: CONFIDENCE_LOW,
        },
      ];
    }

    const confidence =
      CONFIDENCE_RANDOM_MIN +
      Math.random() * (CONFIDENCE_RANDOM_MAX - CONFIDENCE_RANDOM_MIN);
    return [
      {
        code: 'R69',
        label: 'Diagnostic provisoire',
        confidence: Math.round(confidence * 100) / 100,
      },
    ];
  }

  ping(): { status: string; module: string } {
    return { status: 'ok', module: 'coding' };
  }
}
