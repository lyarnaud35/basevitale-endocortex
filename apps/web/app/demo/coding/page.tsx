'use client';

import { useState } from 'react';
import { CodingAssistant } from './CodingAssistant';

export default function CodingDemoPage() {
  const [currentText, setCurrentText] = useState('');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <h1 className="text-xl font-semibold mb-2">Le Stratège — Coding Machine (CIM-10)</h1>
      <p className="text-zinc-400 text-sm mb-6">
        SEMAINE 3 : Silence attentionnel. Saisis du texte (ex. &quot;fracture du tibia&quot;, &quot;mal au ventre&quot;) —
        l’IA propose des codes uniquement si la confiance est suffisante.
      </p>

      <section className="mb-6">
        <label className="block text-sm text-zinc-500 mb-2">
          Texte à analyser (sortie Scribe ou saisie test)
        </label>
        <textarea
          value={currentText}
          onChange={(e) => setCurrentText(e.target.value)}
          placeholder="ex. Le patient présente une fracture du tibia droit..."
          rows={4}
          className="w-full max-w-2xl px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
        />
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-sm text-zinc-500">Suggestions CIM-10 (pilotées par le serveur)</span>
        <CodingAssistant currentText={currentText} />
      </section>
    </div>
  );
}
