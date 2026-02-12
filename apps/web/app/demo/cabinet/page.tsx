'use client';

import { useState, useEffect } from 'react';
import { useConsultationScanner, setBaseUrl } from '@basevitale/ghost-sdk';

/**
 * SHOWROOM CABINET – Preuve de vie du Cerveau Unifié (C+ et B+).
 *
 * Scénarios de test (à reproduire manuellement ou via "Charger Scénario Crash") :
 * 1. "Patient 50 ans, fièvre, toux. Prescription : Amoxicilline."
 *    → Attendu : Alerte C+ (BLOCKED si allergie) + Codes B+ (ex. R50.9, R05, J11).
 * 2. "Patient présente une forte fièvre et des courbatures. Prescription de Pénicilline alors qu'il est allergique connu."
 *    → Attendu : BLOCKED (rouge) + suggestions selon symptômes.
 * 3. "Doliprane pour céphalée."
 *    → Attendu : SAFE (vert) + code G43.9 ou similaire selon mock.
 */
const SCENARIO_CRASH =
  "Patient présente une forte fièvre et des courbatures. Prescription de Pénicilline alors qu'il est allergique connu.";

export default function CabinetShowroom() {
  const [text, setText] = useState('');

  useEffect(() => {
    const apiUrl =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
      'http://localhost:3000';
    setBaseUrl(apiUrl);
  }, []);

  const { securityState, suggestions, isScanning, error } =
    useConsultationScanner(text, { enabled: true });

  const loadCrashScenario = () => setText(SCENARIO_CRASH);

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

      <div className="mb-4">
        <button
          type="button"
          onClick={loadCrashScenario}
          className="px-3 py-1.5 text-sm bg-amber-100 border border-amber-400 text-amber-800 rounded hover:bg-amber-200"
        >
          Charger Scénario Crash
        </button>
        <span className="ml-2 text-xs text-gray-500">
          (remplit la zone avec le scénario allergie Pénicilline)
        </span>
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
