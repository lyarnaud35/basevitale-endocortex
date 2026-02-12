// Types pour POST /api/orchestrator/analyze (Fusion C+ et B+).

import type { SecurityGuardWsState, CodingSuggestionItem } from '@basevitale/shared';

/** Réponse de l'endpoint fusion : sécurité (Gardien) + suggestions CIM-10 (Stratège). */
export interface AnalyzeFullContextResponse {
  security: SecurityGuardWsState;
  suggestions: CodingSuggestionItem[];
}

/** Body de la requête POST /api/orchestrator/analyze */
export interface AnalyzeFullContextBody {
  text?: string;
  patientId?: string;
}
