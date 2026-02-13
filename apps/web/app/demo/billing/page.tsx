'use client';

import { useState } from 'react';
import { setBaseUrl, useBillingSimulation } from '@basevitale/ghost-sdk';
import { ScenarioSelector } from '../components/ScenarioSelector';

const API_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : '';
setBaseUrl(API_BASE);

/** Actes NGAP pour la preuve visuelle (C, V, K = spec Ghost Protocol). */
const ACT_BUTTONS = [
  { code: 'C', label: 'Consultation (26,50 €)' },
  { code: 'V', label: 'Visite (33 €)' },
  { code: 'K', label: 'Acte technique (1,92 €)' },
  { code: 'MD', label: 'Majoration dimanche (+19,06 €)' },
] as const;

export default function BillingDemoPage() {
  const [patientId, setPatientId] = useState<string | undefined>('scenario-jean-peuplu');
  const [acts, setActs] = useState<string[]>([]);

  const {
    total,
    partSecu,
    partMutuelle,
    partPatient,
    rulesApplied,
    loading,
    error,
    data,
  } = useBillingSimulation(acts, {
    patientId: patientId || undefined,
    enabled: true,
  });

  const addAct = (code: string) => setActs((prev) => [...prev, code]);
  const removeAct = (index: number) => setActs((prev) => prev.filter((_, i) => i !== index));
  const clearActs = () => setActs([]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <h1 className="text-2xl font-semibold mb-1">
        Réacteur fiscal (Preuve visuelle)
      </h1>
      <p className="text-zinc-400 text-sm mb-8">
        Moteur Server-Driven : scénario patient + actes → Total, Part Sécu, Reste à charge, règles appliquées. Jean Peuplu = ALD 100%.
      </p>

      {/* Sélecteur de scénario */}
      <section className="mb-8 max-w-md">
        <ScenarioSelector
          value={patientId}
          onChange={(v) => setPatientId(v)}
          label="Patient (scénario)"
        />
      </section>

      {/* Sélecteur d’actes (C, V, K) */}
      <section className="mb-8">
        <label className="block text-sm font-medium text-zinc-400 mb-3">
          Actes
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {ACT_BUTTONS.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => addAct(code)}
              className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium text-sm transition-colors"
              title={label}
            >
              + {code}
            </button>
          ))}
          {acts.length > 0 && (
            <button
              type="button"
              onClick={clearActs}
              className="px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-800/50 text-red-200 text-sm"
            >
              Tout effacer
            </button>
          )}
        </div>
        {acts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500 text-sm">Actes :</span>
            {acts.map((code, i) => (
              <span
                key={`${code}-${i}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 text-zinc-200 text-sm"
              >
                {code}
                <button
                  type="button"
                  onClick={() => removeAct(i)}
                  className="text-zinc-500 hover:text-red-400 text-xs"
                  aria-label="Retirer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {loading && (
        <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4">
          <span className="inline-block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Calcul en cours…
        </div>
      )}

      {error && (
        <div className="p-4 mb-6 rounded-lg bg-red-900/30 border border-red-600 text-red-200">
          <strong>Erreur :</strong> {error.message}
          <p className="mt-2 text-sm text-red-300">
            Vérifie que l’API tourne (proxy ou <code className="bg-zinc-800 px-1 rounded">NEXT_PUBLIC_API_URL</code>).
          </p>
        </div>
      )}

      {/* Affichage : Total, Part Sécu, Reste à charge, Règles */}
      {!loading && !error && (
        <section className="max-w-lg p-6 rounded-xl bg-zinc-900 border border-zinc-700">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Résultat (useBillingSimulation)</h2>
          {acts.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              Sélectionne un scénario et des actes (C, V, K) pour voir le calcul en temps réel.
            </p>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-300">Total</span>
                  <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                    {total.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Part Sécu (AMO)</span>
                  <span className="tabular-nums font-medium">
                    {(partSecu ?? 0).toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300">
                  <span>Part Mutuelle (AMC)</span>
                  <span className="tabular-nums">{(partMutuelle ?? 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-zinc-300 pt-2 border-t border-zinc-700">
                  <span>Reste à charge patient</span>
                  <span className={`tabular-nums font-medium ${(partPatient ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(partPatient ?? 0).toFixed(2)} €
                  </span>
                </div>
              </div>
              {rulesApplied && rulesApplied.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Règles appliquées</p>
                  <ul className="flex flex-wrap gap-2" role="list">
                    {rulesApplied.map((r) => (
                      <li
                        key={r}
                        className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs font-mono"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data?.breakdown && data.breakdown.length > 0 && (
                <div className="mt-4 pt-4 border-t border-zinc-700">
                  <p className="text-xs text-zinc-500 mb-2">Détail des lignes</p>
                  <ul className="space-y-1 text-sm text-zinc-400">
                    {data.breakdown.map((line: { label: string; amount: number }, i: number) => (
                      <li key={i} className="flex justify-between">
                        <span>{line.label}</span>
                        <span className="tabular-nums">{line.amount.toFixed(2)} €</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
