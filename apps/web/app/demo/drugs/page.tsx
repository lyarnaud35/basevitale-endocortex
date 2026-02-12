'use client';

import { useState, useMemo } from 'react';
import { setBaseUrl, useDrugSearch } from '@basevitale/ghost-sdk';

// Vide = requêtes en relatif (/api/…) → Next proxy vers API_BACKEND_URL (défaut 3001). Sinon URL explicite (ex. API sur 3000).
const API_BASE = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
  ? process.env.NEXT_PUBLIC_API_URL
  : '';
setBaseUrl(API_BASE);

export default function DrugsDemoPage() {
  const [query, setQuery] = useState('Doliprane');

  const { data: drugsRaw, isLoading, isError, error } = useDrugSearch(query, { limit: 30 });
  const drugs = useMemo(() => Array.isArray(drugsRaw) ? drugsRaw : [], [drugsRaw]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <h1 className="text-xl font-semibold mb-2">Médicaments BDPM (Deep Roots)</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Recherche dans l’ontologie Neo4j — données ANSM. Saisis un nom (ex. Doliprane, Amoxicilline).
      </p>

      <section className="mb-6">
        <label className="block text-sm text-zinc-500 mb-2">Recherche par dénomination</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ex. Doliprane"
          className="w-full max-w-md px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
        />
      </section>

      {isLoading && <p className="text-zinc-500 text-sm">Chargement…</p>}
      {isError && (
        <div className="p-3 bg-red-900/30 border border-red-600 text-red-200 rounded mb-4">
          <strong>Erreur :</strong> {error?.message ?? 'API indisponible'}.
          <p className="mt-2 text-sm">Vérifie que l’API Nest tourne sur le port indiqué dans <code className="bg-zinc-800 px-1 rounded">NEXT_PUBLIC_API_URL</code> (ex. <code className="bg-zinc-800 px-1 rounded">PORT=3001 npm run dev:api</code> si l’URL est http://localhost:3001).</p>
        </div>
      )}

      {!isLoading && !isError && (
        <section>
          <p className="text-sm text-zinc-500 mb-2">
            {drugs.length} spécialité(s) trouvée(s) — Code CIS, Dénomination, Forme
          </p>
          <ul className="space-y-2 max-w-3xl">
            {drugs.length === 0 ? (
              <li className="text-zinc-500 space-y-2">
                <span>Aucun résultat pour « {query} ».</span>
                <ul className="list-disc list-inside mt-2 text-zinc-400 text-sm">
                  <li>L’API doit tourner sur le port de <code className="bg-zinc-800 px-1 rounded">NEXT_PUBLIC_API_URL</code> (dans .env). Ex. si c’est http://localhost:3001 → <code className="bg-zinc-800 px-1 rounded">PORT=3001 npm run dev:api</code>.</li>
                  <li>Neo4j doit être démarré (Docker) et la base remplie : <code className="bg-zinc-800 px-1 rounded">npm run ingest:bdpm</code> à la racine.</li>
                  <li>Redémarre l’API après une modif du code (ex. correctif LIMIT Neo4j).</li>
                </ul>
              </li>
            ) : (
              drugs.map((d) => (
                <li
                  key={d.cis}
                  className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm"
                >
                  <span className="font-mono text-emerald-400">{d.cis}</span>
                  {' — '}
                  <span className="font-medium">{d.denomination}</span>
                  {d.formePharmaceutique && (
                    <span className="text-zinc-500"> — {d.formePharmaceutique}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
