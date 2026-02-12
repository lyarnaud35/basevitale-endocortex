/**
 * GHOST PROTOCOL - Contrat de sang (reflet EXACT du JSON dashboard-state).
 * Source de vérité pour la projection UI. Aligné sur @basevitale/shared.
 */

export type SecurityLevel = 'IDLE' | 'DEFCON_3' | 'OVERRIDE_ACTIVE' | 'SUCCESS';

export interface GhostActiveOverride {
  reason: string;
  at: string;
  author?: string;
}

export interface GhostSecurityState {
  status: SecurityLevel;
  blocking_reasons: string[];
  allowed_actions: ('OVERRIDE' | 'ACKNOWLEDGE' | 'VALIDATE_PRESCRIPTION' | 'RESET')[];
  active_override?: GhostActiveOverride;
  confirmation_message?: string;
}

export interface GhostTimelineEvent {
  date: string;
  type: string;
  summary: string;
}

export interface GhostAlert {
  level: 'HIGH' | 'MEDIUM';
  message: string;
}

export interface GhostCodingSuggestion {
  code: string;
  label: string;
  confidence: number;
}

/** État global du Dashboard (objet racine = data du GET /api/patient/:id/dashboard-state). */
export interface GhostDashboardState {
  oracle: {
    state: 'IDLE' | 'INITIALIZING' | 'FETCHING_CONTEXT' | 'ANALYZING' | 'READY' | 'ERROR';
    data: {
      patientId: string;
      timeline: GhostTimelineEvent[];
      alertes: GhostAlert[];
    } | null;
  };
  security: GhostSecurityState;
  coding: {
    status: 'IDLE' | 'ANALYZING' | 'SUGGESTING' | 'SILENT';
    suggestions: GhostCodingSuggestion[];
  };
}
