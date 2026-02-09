import { Injectable, Logger } from '@nestjs/common';
import type { CodingEvent } from '@basevitale/cortex-sdk';

/**
 * Laboratoire Déterministe – Cerveau factice pour le Stratège (Semaine 3).
 * Remplace le futur appel LLM : réponses prévisibles pour valider SUGGESTING vs SILENT.
 */
@Injectable()
export class CodingSimulatorService {
  private readonly logger = new Logger(CodingSimulatorService.name);

  /**
   * Simule latence + réponse IA. Force les cas limites.
   */
  async analyzeText(text: string): Promise<CodingEvent> {
    const delay = Math.floor(Math.random() * 1000) + 500;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const lowerText = text.toLowerCase().trim();
    this.logger.debug(`[Simulator] analyzeText("${lowerText.slice(0, 40)}...")`);

    // CAS 1 : SUCCÈS CLAIR (Score > 0.4 → SUGGESTING)
    if (lowerText.includes('grippe') || lowerText.includes('fievre') || lowerText.includes('fièvre')) {
      return {
        type: 'ANALYSIS_COMPLETE',
        data: [
          { code: 'J10.1', label: 'Grippe, virus identifié', confidence: 0.95 },
          { code: 'R50.9', label: 'Fièvre, sans précision', confidence: 0.85 },
        ],
      };
    }

    // CAS 2 : INCERTITUDE (Score < 0.4 → SILENT)
    if (lowerText.includes('fatigue') || lowerText.includes('mal')) {
      return {
        type: 'ANALYSIS_COMPLETE',
        data: [
          { code: 'R53', label: 'Malaise et fatigue', confidence: 0.25 },
        ],
      };
    }

    // CAS 3 : ÉCHEC TECHNIQUE
    if (lowerText.includes('error')) {
      return { type: 'ANALYSIS_FAILED', error: 'Service Unavailable' };
    }

    // CAS 4 : RIEN À SIGNALER
    return { type: 'ANALYSIS_COMPLETE', data: [] };
  }
}
