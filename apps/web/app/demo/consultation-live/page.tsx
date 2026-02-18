'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  setBaseUrl,
  useFiscalPredictionFromContext,
  getFiscalPredictionFromContextQueryKey,
  addPatientProcedure,
  removePatientProcedure,
  useValidateInvoice,
  useDailyActivity,
} from '@basevitale/ghost-sdk';
import { ScenarioSelector } from '../components/ScenarioSelector';

const API_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : '';
setBaseUrl(API_BASE);

/** Actes rapides pour la démo "Ajouter au dossier". */
const ACTES_RAPIDES = [
  { code: 'C', label: 'Consultation (C)' },
  { code: 'ECG', label: 'ECG' },
  { code: 'ALQP003', label: 'Spirométrie' },
] as const;

type ProfileKey = 'standard' | 'child' | 'ald';

const PROFILES: { id: ProfileKey; label: string; description: string }[] = [
  { id: 'standard', label: 'Standard', description: '70 % Sécu / 30 % patient' },
  { id: 'child', label: 'Enfant (< 6 ans)', description: 'Majoration MEG auto' },
  { id: 'ald', label: 'ALD (100 %)', description: 'Tiers-payant intégral' },
];

function getOverrides(profile: ProfileKey): { age?: number; ald?: boolean } | undefined {
  if (profile === 'child') return { age: 4, ald: false };
  if (profile === 'ald') return { ald: true };
  return undefined;
}

export default function ConsultationLivePage() {
  const [patientId, setPatientId] = useState<string | undefined>('scenario-paul-normal');
  const [profile, setProfile] = useState<ProfileKey>('standard');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const dailyActivity = useDailyActivity();
  const validateMutation = useValidateInvoice({
    onSuccess: (d) => {
      setSuccessMessage(`Facture validée ! ${d.totalAmount.toFixed(2)} €`);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const overrides = useMemo(() => getOverrides(profile), [profile]);
  const prediction = useFiscalPredictionFromContext(patientId ?? null, {
    age: overrides?.age,
    ald: overrides?.ald,
  });
  const data = prediction.data;
  const actsFromContext = data?.actsFromContext ?? [];

  const invalidatePrediction = () => {
    if (patientId) {
      queryClient.invalidateQueries({
        queryKey: getFiscalPredictionFromContextQueryKey(patientId, overrides),
      });
    }
  };

  const addMutation = useMutation({
    mutationFn: ({ code, name }: { code: string; name?: string }) =>
      addPatientProcedure(patientId!, code, name),
    onSuccess: invalidatePrediction,
  });

  const removeMutation = useMutation({
    mutationFn: (code: string) => removePatientProcedure(patientId!, code),
    onSuccess: invalidatePrediction,
  });

  const handleAddAct = (code: string, label: string) => {
    addMutation.mutate({ code, name: label });
  };

  const handleRemoveAct = (code: string) => {
    removeMutation.mutate(code);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <h1 className="text-2xl font-semibold mb-1">
        Consultation live – Fusion Clinique → Financier
      </h1>
      <p className="text-zinc-400 text-sm mb-8">
        Zone clinique (gauche) : simulez les actes du jour. La colonne droite se met à jour automatiquement (facturation dérivée).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
        {/* Colonne gauche : Clinique */}
        <section className="p-6 rounded-xl bg-zinc-900 border border-zinc-700">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Zone clinique</h2>
          <div className="mb-6">
            <ScenarioSelector
              value={patientId}
              onChange={(v) => setPatientId(v)}
              label="Patient"
            />
          </div>
          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-300 mb-2">Profil patient (simulé)</p>
            <p className="text-xs text-zinc-500 mb-2">
              Change le contexte sans changer les actes : âge & droits (ALD).
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Profil facturation">
              {PROFILES.map((p) => (
                <label
                  key={p.id}
                  className={`inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border text-sm ${
                    profile === p.id
                      ? 'border-emerald-500 bg-emerald-900/30 text-emerald-200'
                      : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="profile"
                    value={p.id}
                    checked={profile === p.id}
                    onChange={() => setProfile(p.id)}
                    className="sr-only"
                  />
                  <span className="font-medium">{p.label}</span>
                  <span className="text-xs opacity-80">({p.description})</span>
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-zinc-500 mb-3">Simuler un acte (enregistré dans le graphe pour aujourd’hui) :</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {ACTES_RAPIDES.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => handleAddAct(code, label)}
                disabled={!patientId || addMutation.isPending}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium"
              >
                + {label}
              </button>
            ))}
          </div>
          {actsFromContext.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2">Actes du jour (cliquez pour retirer) :</p>
              <ul className="flex flex-wrap gap-2">
                {actsFromContext.map((code) => (
                  <li
                    key={code}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-sm"
                  >
                    {code}
                    <button
                      type="button"
                      onClick={() => handleRemoveAct(code)}
                      disabled={removeMutation.isPending}
                      className="text-zinc-500 hover:text-red-400 text-xs ml-1"
                      aria-label="Retirer"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {actsFromContext.length === 0 && patientId && !prediction.isLoading && (
            <p className="text-zinc-500 text-sm">Aucun acte aujourd’hui. Par défaut la prédiction affiche une consultation (C).</p>
          )}
        </section>

        {/* Colonne droite : Financier (lecture seule / validation) */}
        <section className="p-6 rounded-xl bg-zinc-900 border border-zinc-700">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Valorisation (dérivée du contexte)</h2>
          {prediction.isLoading && (
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <span className="inline-block w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              Calcul…
            </div>
          )}
          {prediction.error && (
            <div className="p-4 rounded-lg bg-red-900/30 border border-red-600 text-red-200 text-sm">
              {prediction.error.message}
            </div>
          )}
          {!patientId && (
            <p className="text-zinc-500 text-sm">Sélectionnez un patient pour voir la prédiction.</p>
          )}
          {patientId && !prediction.isLoading && !prediction.error && data && (
            <>
              {/* Détail du calcul (explicabilité) */}
              {data.breakdown && data.breakdown.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-zinc-400 mb-2">Détail du calcul</p>
                  <ul className="space-y-1.5 text-sm">
                    {data.breakdown.map((line: { label: string; amount: number; ruleId?: string }, i: number) => (
                      <li
                        key={i}
                        className="flex justify-between items-center gap-2 text-zinc-300"
                      >
                        <span className="flex items-center gap-2">
                          {line.label}
                          {line.ruleId && (
                            <span
                              className="px-1.5 py-0.5 rounded text-xs bg-amber-900/40 text-amber-300"
                              title="Ajouté automatiquement par le moteur (contexte patient)"
                            >
                              Auto
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums font-medium">{line.amount.toFixed(2)} €</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-3 mb-4 pt-3 border-t border-zinc-700">
                <div className="flex justify-between items-baseline">
                  <span className="text-zinc-300">Total</span>
                  <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                    {data.total.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between text-zinc-300 text-sm">
                  <span>Part Sécu (AMO)</span>
                  <span className="tabular-nums">{(data.amo ?? 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-zinc-300 text-sm">
                  <span>Part Mutuelle (AMC)</span>
                  <span className="tabular-nums">{(data.amc ?? 0).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-zinc-300 text-sm pt-2 border-t border-zinc-700">
                  <span>Reste à charge</span>
                  <span className={`tabular-nums font-medium ${(data.amount_patient ?? 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(data.amount_patient ?? 0).toFixed(2)} €
                  </span>
                </div>
              </div>
              {(data.amount_patient ?? 0) === 0 && (
                <p className="text-sm font-medium text-emerald-400 mb-2">
                  Tiers-Payant Intégral
                </p>
              )}
              {data.actsFromContext.length > 0 && (
                <p className="text-xs text-zinc-500 mb-4">
                  Actes pris en compte : {data.actsFromContext.join(', ')}
                </p>
              )}
              <div className="pt-3 border-t border-zinc-700">
                <button
                  type="button"
                  onClick={() =>
                    validateMutation.mutate({
                      patientId: patientId!,
                      overrides,
                    })
                  }
                  disabled={
                    !patientId ||
                    validateMutation.isPending ||
                    (data != null && data.total <= 0)
                  }
                  className="w-full py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm"
                >
                  {validateMutation.isPending ? 'Validation…' : 'Valider la Facture'}
                </button>
                {successMessage && (
                  <p className="mt-2 text-sm text-emerald-400 text-center">{successMessage}</p>
                )}
                {validateMutation.error && (
                  <p className="mt-2 text-sm text-red-400 text-center">{validateMutation.error.message}</p>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Activité du jour – CA Journée */}
      <section className="mt-10 max-w-6xl p-6 rounded-xl bg-zinc-900 border border-zinc-700">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">Activité du jour</h2>
        {dailyActivity.isLoading && (
          <p className="text-zinc-500 text-sm">Chargement…</p>
        )}
        {dailyActivity.data && (
          <>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-zinc-300">CA Journée</span>
              <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                {dailyActivity.data.totalAmount.toFixed(2)} €
              </span>
            </div>
            {dailyActivity.data.invoices.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {dailyActivity.data.invoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex justify-between items-center gap-4 py-2 border-b border-zinc-700 last:border-0"
                  >
                    <span className="text-zinc-400">
                      {new Date(inv.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      – {inv.patientId ?? 'Patient'}{' '}
                      – {inv.acts.join(' + ')}
                    </span>
                    <span className="tabular-nums font-medium text-emerald-400">
                      {inv.totalAmount.toFixed(2)} €
                    </span>
                    <span className="text-xs text-zinc-500">({inv.status})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-500 text-sm">Aucune facture validée aujourd&apos;hui.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
