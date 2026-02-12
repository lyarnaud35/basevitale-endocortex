'use client';

import { useState } from 'react';
import { setBaseUrl, useFiscalPrediction } from '@basevitale/ghost-sdk';

const API_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : '';
setBaseUrl(API_BASE);

const DEMO_PATIENTS = [
  { id: 'patient_a', label: 'Patient A (Adulte, 35 ans)', age: 35 },
  { id: 'patient_b', label: 'Patient B (Enfant, 4 ans)', age: 4 },
  { id: 'patient_c', label: 'Patient C (CMU/C2S)', age: 52 },
] as const;

export default function BillingDemoPage() {
  const [acts, setActs] = useState<string[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useFiscalPrediction(acts, {
    patientId: patientId ?? undefined,
    enabled: acts.length > 0,
  });

  const addConsultation = () => setActs((prev) => [...prev, 'C']);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <h1 className="text-xl font-semibold mb-2">
        Réacteur Fiscal (Billing as Code)
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Moteur d’inférence contextuelle — le backend déduit la tarification à
        partir du patient (ex. majoration enfant si &lt; 6 ans). Aucune logique
        côté front.
      </p>

      <section className="mb-6">
        <label className="block text-sm text-zinc-500 mb-2">
          Contexte patient
        </label>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setPatientId(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              patientId === null
                ? 'bg-zinc-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Aucun
          </button>
          {DEMO_PATIENTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPatientId(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                patientId === p.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          Patient B (4 ans) + consultation → 31,50 €. Patient C (CMU) → 0 € à payer.
        </p>
      </section>

      <section className="mb-6">
        <label className="block text-sm text-zinc-500 mb-2">
          Actes en cours
        </label>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            type="button"
            onClick={addConsultation}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm"
          >
            Ajouter Consultation
          </button>
          {acts.length > 0 && (
            <span className="text-zinc-400 text-sm">
              Codes : {acts.join(', ')}
            </span>
          )}
        </div>
      </section>

      {isLoading && (
        <p className="text-zinc-500 text-sm">Calcul en cours…</p>
      )}
      {isError && (
        <div className="p-3 bg-red-900/30 border border-red-600 text-red-200 rounded mb-4">
          Erreur : {error?.message ?? 'API indisponible'}
        </div>
      )}
      {!isLoading && !isError && data && (
        <section className="p-4 rounded-lg bg-zinc-900 border border-zinc-700 max-w-md">
          <p className="text-sm text-zinc-500 mb-1">Total facturation</p>
          <p className="text-2xl font-bold text-emerald-400">
            {data.total.toFixed(2)} €
          </p>
          {Array.isArray(data.breakdown) && data.breakdown.length > 0 && (
            <ul className="text-sm text-zinc-300 mt-2 space-y-1">
              {data.breakdown.map((line, i) => (
                <li key={i}>
                  {line.label} : {line.amount.toFixed(2)} €
                  {line.ruleId && (
                    <span className="text-zinc-500 ml-1">({line.ruleId})</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-zinc-500 mt-2">
            AMO : {data.amo?.toFixed(2) ?? '0.00'} € — AMC :{' '}
            {data.amc?.toFixed(2) ?? '0.00'} €
          </p>
          <p className="text-sm font-medium mt-2 text-amber-400">
            À payer par le patient : {data.amount_patient?.toFixed(2) ?? '0.00'} €
          </p>
          {data.message && (
            <p className="text-xs text-emerald-400/90 mt-2">{data.message}</p>
          )}
          {data.patient_context && (
            <p className="text-xs text-zinc-500 mt-1">
              Contexte : {data.patient_context.patientId}, {data.patient_context.age} ans
              {data.patient_context.coverage === 1 && ' — CMU/C2S'}
            </p>
          )}
        </section>
      )}
      {!isLoading && !isError && !data && acts.length === 0 && (
        <p className="text-zinc-500 text-sm">
          Choisis un patient (optionnel) puis « Ajouter Consultation ». B (4 ans) → 31,50 € ;
          C (CMU) → 0 € à payer ; adulte ou aucun → 26,50 €.
        </p>
      )}
    </div>
  );
}
