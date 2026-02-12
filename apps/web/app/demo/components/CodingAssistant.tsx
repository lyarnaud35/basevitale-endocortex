'use client';

import { useState, useCallback } from 'react';
import { useCodingAssistant, type CodingSuggestion } from '../../hooks/useCodingAssistant';

/** Panneau Module B+ – Saisie symptômes + affichage des suggestions CIM-10 (Orchestrateur). */
export function CodingAssistant() {
  const { suggestions, loading, error, analyzeSymptoms } = useCodingAssistant();
  const [text, setText] = useState('');
  const [submittedText, setSubmittedText] = useState('');

  const handleSubmit = useCallback(() => {
    const t = text.trim();
    if (t) {
      setSubmittedText(t);
      analyzeSymptoms(t);
    }
  }, [text, analyzeSymptoms]);

  const showEmptyState = !loading && suggestions.length === 0 && submittedText !== '';

  return (
    <div className="p-6 border rounded-lg shadow-sm bg-white space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-semibold text-lg">Module B+ – Codage symptômes (Stratège)</h3>
        <span
          className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 border border-amber-300"
          title="Réponses simulées ; pas encore d’IA réelle"
        >
          MOCK MODE
        </span>
      </div>
      <p className="text-sm text-gray-500">
        Saisissez une description (ex. fièvre, toux, grippe) pour obtenir des suggestions CIM-10 (mock).
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (submittedText) setSubmittedText('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Ex: Le patient présente une toux sèche et de la fièvre..."
          className="flex-1 p-2 border rounded"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyse…' : 'Suggérer codes'}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {showEmptyState && (
        <p className="text-sm text-gray-500 italic">
          Aucun code détecté pour ce contexte.
        </p>
      )}
      {suggestions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Suggestions CIM-10</h4>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((s: CodingSuggestion, i: number) => (
              <li
                key={`${s.code}-${i}`}
                className="inline-flex flex-col gap-0.5 p-3 rounded-lg bg-indigo-50 border border-indigo-200 min-w-[180px]"
              >
                <span className="font-mono text-indigo-700 font-semibold text-sm">{s.code}</span>
                <span className="text-gray-700 text-sm">{s.label}</span>
                <span className="text-xs text-indigo-600">
                  Confiance : {Math.round(s.confidence * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
