'use client';

import { useState } from 'react';
import { useDoctorBrain } from '../../hooks/useDoctorBrain';

/**
 * Cockpit – Réaction en chaîne globale (Module O).
 * 1. Je tape "Pénicilline" → Prescrire
 * 2. L'Orchestrateur reçoit l'ordre
 * 3. Il demande à la Sécurité
 * 4. La Sécurité dit NON → état BLOCKED_BY_SECURITY
 * 5. Tout l'écran passe en mode alerte (pas juste un widget).
 */
export default function CockpitPage() {
  const { state, feedback, loading, lastResult, brainState, brainMessage, actions } = useDoctorBrain();
  const [drugInput, setDrugInput] = useState('');

  const isBlocked = state === 'BLOCKED_BY_SECURITY' || brainState === 'BLOCKED';
  const blockReason =
    lastResult?.securityDetails?.context?.blockReason ??
    lastResult?.securityData?.context?.blockReason ??
    '';

  return (
    <div
      className={`min-h-screen p-8 transition-colors ${
        isBlocked ? 'bg-red-50' : state === 'IN_PROGRESS' ? 'bg-blue-50/50' : 'bg-gray-50'
      }`}
    >
      <div className="max-w-2xl mx-auto font-mono">
        <h1 className="text-2xl font-bold mb-2">🧠 COCKPIT – Cerveau Central (Module O)</h1>
        <p className="text-sm text-gray-600 mb-8">
          Un seul hook : <code className="bg-gray-200 px-1 rounded">useDoctorBrain()</code>. Prescrire déclenche Sécurité → état global.
        </p>

        {/* État global – réaction de tout l'écran */}
        <div
          className={`border-l-4 p-6 mb-8 rounded-r shadow ${
            isBlocked
              ? 'bg-red-100 border-red-600 text-red-900'
              : state === 'IN_PROGRESS' || brainState === 'SECURE'
                ? 'bg-blue-100 border-blue-600 text-blue-900'
                : 'bg-white border-gray-400 text-gray-800'
          }`}
        >
          <h2 className="font-bold text-lg mb-2">
            ÉTAT GLOBAL : {loading ? '…' : brainState ?? state}
          </h2>
          <p className="text-sm mb-2">{loading ? 'Vérification…' : brainMessage || feedback || '—'}</p>
          {isBlocked && blockReason && (
            <p className="mt-3 font-bold text-red-800">⛔ RAISON DU BLOCAGE : {blockReason}</p>
          )}
        </div>

        {/* Zone de test */}
        <div className="bg-white border rounded-lg p-6 shadow">
          <label className="block text-sm font-bold mb-2">Intention PRESCRIBE</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={drugInput}
              onChange={(e) => setDrugInput(e.target.value)}
              placeholder="Ex: Pénicilline (bloqué) ou Doliprane (autorisé)"
              className="border p-2 flex-1 rounded"
            />
            <button
              onClick={() => actions.prescribe(drugInput)}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '…' : 'PRESCRIRE'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Pénicilline / Amoxicilline → blocage sécurité. Doliprane → validé.
          </p>
          <button
            onClick={() => actions.reset()}
            disabled={loading}
            className="mt-4 text-sm text-gray-600 hover:text-gray-800 underline disabled:opacity-50"
          >
            Nouvelle consultation (reset état)
          </button>
        </div>
      </div>
    </div>
  );
}
