'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MedicalScribe, type ConsultationAnalysis, type ConsultationData } from '@basevitale/scribe-ui';

/** Backend URL (proxifié /api vers NestJS 3001 en dev). */
const BACKEND_URL = typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';
const TOKEN = process.env.NEXT_PUBLIC_SCRIBE_TOKEN ?? 'test-token';

type Screen = 'list' | 'dictation' | 'result';

const PATIENTS = [
  { id: 'patient_michu', label: 'Mme Michu – Cardio' },
  { id: 'patient_dupont', label: 'M. Dupont – Rhume' },
  { id: 'patient_martin', label: 'M. Martin – Dermatologie' },
] as const;

function suggestBillingSimulated(consultation: ConsultationData | undefined): {
  cim10: string;
  ccam: string;
  label: string;
}[] {
  const diag = consultation?.diagnosis?.[0];
  const code = diag?.code ?? 'Z00.0';
  const label = diag?.label ?? 'Consultation';
  return [
    { cim10: code, ccam: 'HBLT001', label: `Consultation – ${label}` },
    { cim10: code, ccam: 'HBMD001', label: 'Examen clinique' },
  ];
}

/**
 * Fiche Résultat – Affichage du JSON reçu après onComplete (responsabilité de l'hôte).
 */
function FicheResultat({
  data,
  patientLabel,
}: {
  data: ConsultationAnalysis;
  patientLabel?: string;
}) {
  const { consultation, draftId } = data;
  const prescription = (consultation?.prescription ?? []).filter(Boolean);
  const meds = (consultation?.medications ?? []).filter(Boolean);
  const ordonnanceItems = (
    prescription.length
      ? prescription.map((p) => ({
          name: String(p?.drug ?? '').trim() || '—',
          dosage: String(p?.dosage ?? '').trim(),
          duration: String(p?.duration ?? '').trim(),
        }))
      : meds.map((m) => ({
          name: String(m?.name ?? '').trim() || '—',
          dosage: String(m?.dosage ?? '').trim(),
          duration: String(m?.duration ?? '').trim(),
        }))
  ).filter((o) => o.name !== '—' || o.dosage || o.duration);
  const billingCodes = (consultation?.billingCodes ?? []).filter(Boolean);
  const suggestedSimulated = suggestBillingSimulated(consultation);
  const symptoms = (consultation?.symptoms ?? []).filter(Boolean);
  const diagnosis = (consultation?.diagnosis ?? []).filter(Boolean);

  const synthèse = [
    symptoms.length ? `Patient présentant ${symptoms.join(', ')}.` : null,
    diagnosis.length
      ? `Diagnostics : ${diagnosis.map((d) => `${d?.label ?? d?.code ?? '—'} (${d?.code ?? '—'})`).join(' ; ')}.`
      : null,
    ordonnanceItems.length
      ? `Traitement : ${ordonnanceItems.map((o) => `${o.name} ${o.dosage} ${o.duration}`.trim()).join(', ')}.`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  const codesSource = billingCodes.length ? billingCodes : suggestedSimulated;
  const useSimulated = billingCodes.length === 0 && suggestedSimulated.length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Fiche Résultat</h2>
        {patientLabel && (
          <p className="text-sm text-slate-600 mb-2">Patient : {patientLabel}</p>
        )}
        <p className="text-xs text-slate-500 mb-4">
          Draft <code className="bg-slate-100 px-1 rounded">{draftId}</code>
        </p>

        <section className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Ordonnance – Médicaments</h3>
          {ordonnanceItems.length ? (
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-800">
              {ordonnanceItems.map((o, i) => (
                <li key={i}>
                  <strong>{o.name}</strong>
                  {o.dosage && ` · ${o.dosage}`}
                  {o.duration && ` · ${o.duration}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Aucun médicament prescrit.</p>
          )}
        </section>

        <section className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Synthèse – Dossier</h3>
          <p className="text-sm text-slate-800">{synthèse || '—'}</p>
        </section>

        <section>
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            Codes actes {useSimulated ? '(simulés)' : 'extraits'}
          </h3>
          {codesSource.length ? (
            <ul className="space-y-2 text-sm">
              {billingCodes.length
                ? billingCodes.map((b, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-800">
                      <span className="font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                        {b.code ?? '—'}
                      </span>
                      <span>{b.label ?? '—'}</span>
                      {typeof b.confidence === 'number' && (
                        <span className="text-slate-500">
                          ({Math.round((b.confidence ?? 0) * 100)}%)
                        </span>
                      )}
                    </li>
                  ))
                : suggestedSimulated.map((s, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-800">
                      <span className="font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                        {s.ccam}
                      </span>
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{s.cim10}</span>
                      <span>{s.label}</span>
                    </li>
                  ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Aucun code acte extrait.</p>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Page Cabinet – Simulation de l'app hôte (Ben).
 * Responsabilités : liste patients, bouton Nouvelle Consultation, afficher le widget, afficher le JSON après onComplete.
 */
export default function CabinetDemoPage() {
  const [screen, setScreen] = useState<Screen>('list');
  const [selectedPatient, setSelectedPatient] = useState<(typeof PATIENTS)[number] | null>(null);
  const [resultData, setResultData] = useState<ConsultationAnalysis | null>(null);

  const handleNewConsultation = (p: (typeof PATIENTS)[number]) => {
    setSelectedPatient(p);
    setResultData(null);
    setScreen('dictation');
  };

  const handleComplete = (data: ConsultationAnalysis) => {
    setResultData(data);
    setScreen('result');
  };

  const handleCancel = () => {
    setScreen('list');
    setSelectedPatient(null);
    setResultData(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">POC Cabinet – Démo</h1>
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
            ← Accueil
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {screen === 'list' && (
          <div className="space-y-4">
            <p className="text-slate-600">
              Sélectionnez un patient pour démarrer une consultation. Dictez, corrigez si besoin, validez.
              La Fiche Résultat s’affiche après validation.
            </p>
            <ul className="space-y-2">
              {PATIENTS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleNewConsultation(p)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-left shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-900">{p.label}</span>
                    <span className="ml-2 text-slate-500 text-sm">({p.id})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {screen === 'dictation' && selectedPatient && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleCancel}
                className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
              >
                ← Nouvelle consultation
              </button>
              <span className="text-sm text-slate-500">{selectedPatient.label}</span>
            </div>
            <MedicalScribe
              token={TOKEN}
              patientId={selectedPatient.id}
              backendUrl={BACKEND_URL}
              onComplete={handleComplete}
              onCancel={handleCancel}
            />
          </div>
        )}

        {screen === 'result' && resultData && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
            >
              ← Nouvelle consultation
            </button>
            <FicheResultat data={resultData} patientLabel={selectedPatient?.label} />
          </div>
        )}
      </main>
    </div>
  );
}
