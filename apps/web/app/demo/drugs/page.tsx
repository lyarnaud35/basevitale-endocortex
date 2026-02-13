'use client';

import { useState } from 'react';
import { setBaseUrl, useDrugSearch } from '@basevitale/ghost-sdk';
import { ScenarioSelector } from '../components/ScenarioSelector';

const API_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : '';
setBaseUrl(API_BASE);

export default function DrugSearchDemoPage() {
  const [patientId, setPatientId] = useState<string | undefined>('scenario-jean-peuplu');

  const { search, results, isLoading, error, debouncedQuery } = useDrugSearch({
    limit: 30,
    includeMolecules: true,
    patientId,
    includePacks: true,
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-10 font-sans">
      <h1 className="text-2xl font-semibold mb-2">
        Moteur de Recherche Médicament (SYNAPSE v201)
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Recherche fuzzy (ex. Doliplane → Doliprane). Avec un patient : statut sécurité (OK / BLOQUÉ) et Packs (prix).
      </p>

      <div className="mb-6 max-w-md">
        <ScenarioSelector value={patientId} onChange={setPatientId} />
      </div>

      <input
        type="text"
        placeholder="Tapez &quot;Doli&quot; ou &quot;Amoxi&quot;..."
        onChange={(e) => search(e.target.value)}
        className="w-full max-w-xl border border-zinc-600 rounded-lg px-3 py-2 bg-zinc-900 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
      />

      {isLoading && (
        <p className="mt-4 text-zinc-500 text-sm">Recherche en cours…</p>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-600 text-red-200 rounded-lg">
          <strong>Erreur :</strong> {error.message}
        </div>
      )}

      <ul className="mt-6 space-y-3 max-w-3xl">
        {results.map((drug, index) => (
          <li
            key={`${drug.id}-${drug.type ?? 'Brand'}-${index}`}
            className="flex flex-col border-b border-zinc-700 pb-3"
          >
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-zinc-100 font-medium">{drug.label}</span>
              <div className="flex items-center gap-2">
                {(drug.safety || patientId) && (
                  <span
                    className={
                      drug.safety?.status === 'BLOCKED'
                        ? 'bg-red-600 text-white px-2 py-0.5 rounded text-xs font-medium'
                        : drug.safety?.status === 'WARNING'
                          ? 'bg-amber-600 text-white px-2 py-0.5 rounded text-xs font-medium'
                          : drug.safety?.status === 'SAFE'
                            ? 'bg-emerald-600/80 text-white px-2 py-0.5 rounded text-xs font-medium'
                            : 'bg-zinc-600 text-zinc-300 px-2 py-0.5 rounded text-xs font-medium'
                    }
                  >
                    {drug.safety?.status === 'BLOCKED'
                      ? 'BLOQUÉ'
                      : drug.safety?.status === 'WARNING'
                        ? 'ATTENTION'
                        : drug.safety?.status === 'SAFE'
                          ? 'OK'
                          : patientId
                            ? '…'
                            : null}
                  </span>
                )}
                <span
                  className={
                    drug.type === 'Brand'
                      ? 'bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs font-medium'
                      : 'bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-xs font-medium'
                  }
                >
                  {drug.type === 'Brand' ? 'Marque' : 'Générique'}
                </span>
              </div>
            </div>
            {drug.safety?.status === 'BLOCKED' && drug.safety.reason && (
              <p className="text-red-400 text-sm mt-1">{drug.safety.reason}</p>
            )}
            {drug.molecules && drug.molecules.length > 0 && (
              <p className="text-zinc-500 text-sm mt-1">
                Contient : {drug.molecules.map((m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`).join(', ')}
              </p>
            )}
            {drug.packs && drug.packs.length > 0 && (
              <p className="text-zinc-500 text-xs mt-1">
                Packs : {drug.packs.slice(0, 3).map((p) => `${p.cip13}${p.prix != null ? ` · ${p.prix}€` : ''}`).join(' · ')}
                {drug.packs.length > 3 && ` (+${drug.packs.length - 3})`}
              </p>
            )}
          </li>
        ))}
      </ul>

      {!isLoading && !error && results.length === 0 && (
        <p className="mt-6 text-zinc-500 text-sm">
          {debouncedQuery.trim().length >= 3
            ? `Aucun résultat pour « ${debouncedQuery} ».`
            : 'Saisis au moins 3 caractères pour lancer une recherche.'}
        </p>
      )}
    </div>
  );
}
