import React from 'react';
import type { IntelligenceResponse } from '@basevitale/shared';

export interface IntelligencePanelProps {
  /** Données intelligence. Si null, affiche loading ou Mode Déconnecté selon les autres props. */
  data: IntelligenceResponse | null;
  loading?: boolean;
  error?: string | null;
  /** Affiche "Mode Déconnecté" au lieu du contenu (API indisponible). */
  disconnected?: boolean;
  /** Nombre max d'événements dans la timeline. Défaut 3. */
  timelineLimit?: number;
}

/**
 * Panneau Intelligence (Résumé + Alertes + Timeline). Pure component.
 */
export function IntelligencePanel({
  data,
  loading = false,
  error = null,
  disconnected = false,
  timelineLimit = 3,
}: IntelligencePanelProps) {
  if (disconnected || error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Mode Déconnecté</p>
        <p className="mt-0.5 text-xs text-amber-700">
          Intelligence indisponible. Vérifiez le backend et la connexion.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-500">Chargement de l’intelligence patient…</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const timeline = (data.timeline ?? []).slice(0, timelineLimit);
  const alerts = data.activeAlerts ?? [];

  return (
    <div className="space-y-3">
      {/* Header – Résumé */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Résumé patient
        </h3>
        <p className="mt-2 text-sm text-slate-800">{data.summary}</p>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div
          className={`rounded-lg border px-4 py-3 ${
            alerts.some((a) => a.level === 'HIGH')
              ? 'border-red-300 bg-red-50'
              : 'border-orange-300 bg-orange-50'
          }`}
        >
          <h3
            className={`text-xs font-semibold uppercase tracking-wide ${
              alerts.some((a) => a.level === 'HIGH') ? 'text-red-800' : 'text-orange-800'
            }`}
          >
            Alertes
          </h3>
          <ul className="mt-2 space-y-1">
            {alerts.map((a, i) => (
              <li
                key={i}
                className={`text-sm ${a.level === 'HIGH' ? 'text-red-800' : 'text-orange-800'}`}
              >
                {a.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Timeline – 3 derniers événements */}
      {timeline.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Derniers événements
          </h3>
          <ul className="mt-2 space-y-2">
            {timeline.map((evt, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="shrink-0 text-slate-400">{evt.date || '—'}</span>
                <span className="shrink-0 text-slate-500">·</span>
                <span className="text-slate-700">{evt.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default IntelligencePanel;
