'use client';

import { useState, useCallback } from 'react';
import {
  useGetPatientDashboardState,
  getGetPatientDashboardStateQueryKey,
} from '@basevitale/ghost-sdk';
import { useQueryClient } from '@tanstack/react-query';
import type { GhostDashboardState } from './ghost-types';
import { SecurityMonitor } from './components/SecurityMonitor';
import { PatientTimeline } from './components/PatientTimeline';
import { CodingSuggestions } from './components/CodingSuggestions';
import { CodingAssistantWidget } from './components/CodingAssistantWidget';
import { StratègeInput } from './components/StrategistInput';

const DEFAULT_PATIENT_ID = 'patient-dashboard-test';

/**
 * GHOST PROTOCOL - Cockpit (Projection du JSON en UI).
 * Lecture via SDK, écriture via POST /api/oracle/:id/start et override.
 * Les composants sont anémiques : ils ne font qu'afficher l'état reçu.
 */
export default function DashboardPage() {
  const queryClient = useQueryClient();
  const {
    data: apiResponse,
    isLoading: loadingState,
    isError,
    error,
    refetch: refreshState,
  } = useGetPatientDashboardState(DEFAULT_PATIENT_ID);

  const [loadingStart, setLoadingStart] = useState(false);

  const startMachine = async () => {
    setLoadingStart(true);
    try {
      const res = await fetch(`/api/oracle/${DEFAULT_PATIENT_ID}/start`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(res.statusText || 'Start failed');
      const refetch = refreshState;
      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: getGetPatientDashboardStateQueryKey(DEFAULT_PATIENT_ID),
        });
        void refetch();
      }, 1000);
    } catch (e) {
      console.error("Erreur d'allumage", e);
    } finally {
      setLoadingStart(false);
    }
  };

  const sendGhostEvent = useCallback(
    async (eventType: string, payload: Record<string, unknown> = {}) => {
      const res = await fetch('/api/ghost/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machineId: 'security',
          eventType,
          payload: { patientId: DEFAULT_PATIENT_ID, ...payload },
        }),
      });
      if (!res.ok) throw new Error(res.statusText || 'Ghost event failed');
      await res.json();
      queryClient.invalidateQueries({
        queryKey: getGetPatientDashboardStateQueryKey(DEFAULT_PATIENT_ID),
      });
      await refreshState();
    },
    [queryClient, refreshState],
  );

  const handleOverride = useCallback(async () => {
    try {
      await sendGhostEvent('OVERRIDE_REQUEST', {
        reason: 'Urgence Clinique Immédiate',
      });
    } catch (e) {
      console.error('Erreur override', e);
    }
  }, [sendGhostEvent]);

  const handleValidatePrescription = useCallback(async () => {
    try {
      await sendGhostEvent('VALIDATE_PRESCRIPTION');
    } catch (e) {
      console.error('Erreur validation ordonnance', e);
    }
  }, [sendGhostEvent]);

  const handleReset = useCallback(async () => {
    try {
      await sendGhostEvent('RESET');
    } catch (e) {
      console.error('Erreur reset', e);
    }
  }, [sendGhostEvent]);

  const payload = apiResponse?.data as GhostDashboardState | undefined;
  const isReady = payload?.oracle?.state === 'READY';
  const loading = loadingState || loadingStart;

  if (isError) {
    return (
      <div className="p-10 text-red-500 border border-red-500 bg-red-50 rounded-lg">
        <h2 className="font-bold">Échec de la connexion nerveuse</h2>
        <pre className="mt-2 text-sm overflow-auto">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      {/* HEADER DE COMMANDE */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            GHOST PROTOCOL{' '}
            <span className="text-xs bg-black text-white px-2 py-1 rounded ml-2">
              v115
            </span>
          </h1>
          <p className="text-sm text-gray-500">
            Orchestrateur Neuro-Symbiotique · Patient: {DEFAULT_PATIENT_ID}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refreshState()}
            disabled={loadingState}
            className="text-sm text-gray-600 hover:text-black underline disabled:opacity-50"
          >
            Rafraîchir
          </button>
          <button
            onClick={startMachine}
            disabled={loading}
            className={`px-6 py-2 rounded font-bold transition-all ${
              loading ? 'bg-gray-300' : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {loadingStart ? 'INITIALISATION...' : '▶ Lancer la Séquence'}
          </button>
        </div>
      </div>

      {/* ZONE D'AFFICHAGE */}
      {!isReady ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
          <p>Le système est en attente (IDLE).</p>
          <p className="text-sm">
            Cliquez sur &quot;Lancer la Séquence&quot; pour activer l&apos;Oracle.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* COLONNE GAUCHE : Sécurité & Codage (1/3) */}
          <div className="col-span-12 md:col-span-4 space-y-6">
            <SecurityMonitor
              status={payload.security.status}
              reasons={payload.security.blocking_reasons}
              allowed_actions={payload.security.allowed_actions}
              active_override={payload.security.active_override}
              confirmation_message={payload.security.confirmation_message}
              onOverride={handleOverride}
              onValidatePrescription={handleValidatePrescription}
              onReset={handleReset}
            />
            <CodingSuggestions suggestions={payload.coding.suggestions} />
            {/* Stratège (Semaine 3) : envoyer texte → le widget apparaît si SUGGESTING (ex. "Grippe"), disparaît si SILENT (ex. "fatigue") */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-600">
                Lab Cortex – Stratège
              </h3>
              <StratègeInput />
              <CodingAssistantWidget />
            </div>
          </div>

          {/* COLONNE DROITE : Timeline (2/3) */}
          <div className="col-span-12 md:col-span-8">
            <PatientTimeline
              events={payload.oracle.data?.timeline ?? []}
            />
          </div>
        </div>
      )}
    </div>
  );
}
