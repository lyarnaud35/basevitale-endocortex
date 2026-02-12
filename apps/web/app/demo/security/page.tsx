'use client';

import { useState } from 'react';
import { useSecurityGuard } from '../../hooks/useSecurityGuard';

export default function SecurityShowroom() {
  const {
    status,
    checkPrescription,
    requestOverride,
    canSubmit,
    isLocked,
    data,
    connectionStatus,
    isLoading,
    sessionId,
  } = useSecurityGuard();

  const [drugInput, setDrugInput] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const getStatusColor = () => {
    switch (status) {
      case 'SECURE':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'LOCKED':
        return 'bg-red-100 border-red-500 text-red-700';
      case 'OVERRIDE_PENDING':
        return 'bg-orange-100 border-orange-500 text-orange-700';
      case 'ANALYZING':
        return 'bg-blue-100 border-blue-500 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-700';
    }
  };

  return (
    <div className="p-10 max-w-2xl mx-auto font-mono">
      <h1 className="text-2xl font-bold mb-6">🛡️ LE GARDIEN (Security Module)</h1>

      {connectionStatus === 'error' && (
        <div className="mb-4 p-3 bg-red-100 border border-red-500 text-red-700 rounded">
          Hors ligne – Vérifiez que l’API tourne sur le port 3000.
        </div>
      )}
      {sessionId && (
        <p className="text-xs text-gray-500 mb-4" suppressHydrationWarning>
          Session : {sessionId}
        </p>
      )}

      {/* ZONE D'ÉTAT - LE CERVEAU */}
      <div className={`border-l-4 p-4 mb-8 ${getStatusColor()}`}>
        <h2 className="font-bold text-lg">
          ÉTAT DU SYSTÈME : {isLoading ? '…' : status ?? 'IDLE'}
        </h2>
        {data?.context?.blockReason && (
          <p className="mt-2 font-bold">⛔ RAISON DU BLOCAGE : {data.context.blockReason}</p>
        )}
        <p className="text-sm mt-2 opacity-75">
          Permission de soumettre (canSubmit) : {canSubmit ? '✅ OUI' : '❌ NON'}
        </p>
      </div>

      {/* ZONE DE TEST - LA SIMULATION */}
      <div className="space-y-6">
        <div className="border p-4 rounded shadow-sm bg-white">
          <label className="block text-sm font-bold mb-2">Test de Prescription</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={drugInput}
              onChange={(e) => setDrugInput(e.target.value)}
              placeholder="Ex: Pénicilline (déclenche l'alerte)"
              className="border p-2 flex-1 rounded"
            />
            <button
              onClick={() => checkPrescription({ drugId: drugInput })}
              disabled={connectionStatus !== 'connected'}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              VÉRIFIER
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * Tape &quot;Pénicilline&quot; ou &quot;Amoxicilline&quot; pour simuler une allergie grave.
          </p>
        </div>

        {/* ZONE D'URGENCE - LE "BREAK GLASS" */}
        {isLocked && (
          <div className="border border-red-200 bg-red-50 p-4 rounded animate-pulse">
            <h3 className="text-red-800 font-bold mb-2">🚨 PROTOCOLE DE DÉROGATION REQUIS</h3>
            <p className="text-sm mb-3">
              Le système a verrouillé la prescription. Justification obligatoire.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Raison clinique (ex: Urgence vitale)"
                className="border p-2 flex-1 rounded"
              />
              <button
                onClick={() => requestOverride({ reason: overrideReason })}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-bold"
              >
                FORCER LE SYSTÈME
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
