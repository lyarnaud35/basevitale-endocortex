'use client';

import { setBaseUrl, useDrugSearch, formatDrugPrice, formatDrugRefundRate } from '@basevitale/ghost-sdk';
import { ScenarioSelector } from '../components/ScenarioSelector';
import { useState } from 'react';

const API_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : '';
setBaseUrl(API_BASE);

export default function DrugSearchDemoPage() {
  const [patientId, setPatientId] = useState<string | undefined>('scenario-jean-peuplu');

  const { search, results, isLoading, error, debouncedQuery } = useDrugSearch();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-10 font-sans">
      <h1 className="text-2xl font-semibold mb-2">
        Moteur de Recherche Médicament (index drugSearch)
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Recherche Full-Text type Google (ex. Doliplane → Doliprane, Paracéta → Doliprane). &lt; 50ms.
      </p>

      <div className="mb-6 max-w-md">
        <ScenarioSelector value={patientId} onChange={setPatientId} />
      </div>
      <p className="text-zinc-500 text-xs mb-2">Patient (affiché pour cohérence UI — sécurité/packs sur autre endpoint)</p>

      <input
        type="text"
        placeholder="Tapez &quot;Doli&quot; ou &quot;Paracéta&quot;..."
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
            key={`${drug.code}-${index}`}
            className="flex flex-col border-b border-zinc-700 pb-3"
          >
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-zinc-100 font-medium">{drug.label}</span>
              <span className="bg-zinc-600 text-zinc-300 px-2 py-0.5 rounded text-xs font-medium">
                {drug.forme || '—'}
              </span>
            </div>
            <p className="text-zinc-500 text-xs mt-0.5">CIS {drug.code}</p>
            {drug.substances && drug.substances.length > 0 && (
              <p className="text-zinc-500 text-sm mt-1">
                Contient : {drug.substances.join(', ')}
              </p>
            )}
            <p className="text-zinc-500 text-xs mt-1">
              {formatDrugPrice(drug.price)} · {formatDrugRefundRate(drug.refundRate)}
            </p>
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
