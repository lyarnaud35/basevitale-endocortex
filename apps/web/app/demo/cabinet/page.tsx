'use client';

import { useState, useEffect } from 'react';
import { useConsultationScanner, setBaseUrl } from '@basevitale/ghost-sdk';

/**
 * SHOWROOM CABINET – Preuve de vie du Cerveau Unifié (C+ et B+).
 *
 * Scénarios :
 * - Crash Pénicilline : BLOCKED (mots-clés).
 * - Paracétamol : patient démo allergique → taper "Prescription Doliprane" ou "Prescription Efferalgan" → ROUGE (graphe).
 */
const SCENARIO_CRASH =
  "Patient présente une forte fièvre et des courbatures. Prescription de Pénicilline alors qu'il est allergique connu.";

const SCENARIO_PARACETAMOL = 'Prescription Doliprane';
const DEMO_PATIENT_PARACETAMOL_ID = 'demo-patient-paracetamol';

const SCENARIO_AUGMENTIN = 'Prescription Augmentin';
const DEMO_PATIENT_CLAVULANIQUE_ID = 'demo-patient-clavulanique';

export default function CabinetShowroom() {
  const [text, setText] = useState('');
  const [patientId, setPatientId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const apiUrl =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
      'http://localhost:3000';
    setBaseUrl(apiUrl);
  }, []);

  const { securityState, suggestions, isScanning, error } =
    useConsultationScanner(text, { enabled: true, patientId });

  const loadCrashScenario = () => {
    setPatientId(undefined);
    setText(SCENARIO_CRASH);
  };

  const loadParacetamolScenario = () => {
    setPatientId(DEMO_PATIENT_PARACETAMOL_ID);
    setText(SCENARIO_PARACETAMOL);
  };

  const loadAugmentinScenario = () => {
    setPatientId(DEMO_PATIENT_CLAVULANIQUE_ID);
    setText(SCENARIO_AUGMENTIN);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-2">
        Showroom Cabinet – Cerveau Unifié (C+ & B+)
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Saisie médecin → après 500 ms de pause, analyse parallèle Gardien + Stratège.
      </p>

      <label className="block text-sm font-medium mb-2">
        Zone de Saisie Médecin
      </label>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex: Patient 50 ans, fièvre, toux. Prescription : Amoxicilline."
        className="w-full h-32 p-3 border rounded-lg mb-4 resize-y"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={loadCrashScenario}
          className="px-3 py-1.5 text-sm bg-amber-100 border border-amber-400 text-amber-800 rounded hover:bg-amber-200"
        >
          Scénario Pénicilline
        </button>
        <button
          type="button"
          onClick={loadParacetamolScenario}
          className="px-3 py-1.5 text-sm bg-rose-100 border border-rose-400 text-rose-800 rounded hover:bg-rose-200"
        >
          Scénario Paracétamol (Doliprane / Efferalgan)
        </button>
        <button
          type="button"
          onClick={loadAugmentinScenario}
          className="px-3 py-1.5 text-sm bg-violet-100 border border-violet-400 text-violet-800 rounded hover:bg-violet-200"
        >
          Scénario Augmentin (allergie Acide clavulanique)
        </button>
        {patientId && (
          <span className="text-xs text-gray-500">
            Patient : {patientId}
            {patientId === DEMO_PATIENT_CLAVULANIQUE_ID && ' — Augmentin → ROUGE'}
            {patientId === DEMO_PATIENT_PARACETAMOL_ID && ' — Doliprane / Efferalgan → ROUGE'}
            {patientId === 'scenario-jean-peuplu' && ' — Amoxicilline → ROUGE'}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm" role="alert">
          {error.message ?? String(error)}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gauche : Sécurité (C+) */}
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold text-sm text-gray-700 mb-2">
            Sécurité (Gardien C+)
          </h2>
          <SecurityBadge status={securityState} isScanning={isScanning} />
        </div>

        {/* Droite : Stratège (B+) */}
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold text-sm text-gray-700 mb-2">
            Codes CIM-10 (Stratège B+)
          </h2>
          <CodingSuggestions suggestions={suggestions} isScanning={isScanning} />
        </div>
      </div>
    </div>
  );
}

function SecurityBadge({
  status,
  isScanning,
}: {
  status: 'SAFE' | 'BLOCKED' | 'UNKNOWN';
  isScanning: boolean;
}) {
  const styles = {
    SAFE: 'bg-green-500 text-white',
    BLOCKED: 'bg-red-600 text-white',
    UNKNOWN: 'bg-gray-400 text-white',
  };
  const labels = {
    SAFE: 'OK – Prescription autorisée',
    BLOCKED: 'BLOQUÉ – Alerte sécurité',
    UNKNOWN: isScanning ? 'Analyse…' : '—',
  };
  return (
    <div
      className={`inline-block px-4 py-3 rounded-lg font-medium ${styles[status]}`}
      role="status"
    >
      {labels[status]}
    </div>
  );
}

function CodingSuggestions({
  suggestions,
  isScanning,
}: {
  suggestions: Array<{ code: string; label: string; confidence: number }>;
  isScanning: boolean;
}) {
  if (isScanning) {
    return (
      <p className="text-sm text-gray-500 italic">Chargement des suggestions…</p>
    );
  }
  if (suggestions.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        Aucun code suggéré pour ce contexte.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {suggestions.map((s, i) => (
        <li
          key={`${s.code}-${i}`}
          className="flex flex-col gap-0.5 p-2 rounded bg-gray-50 border border-gray-200"
        >
          <span className="font-mono text-sm font-medium text-gray-800">
            {s.code}
          </span>
          <span className="text-sm text-gray-600">{s.label}</span>
          <span className="text-xs text-gray-500">
            Confiance : {Math.round(s.confidence * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}
