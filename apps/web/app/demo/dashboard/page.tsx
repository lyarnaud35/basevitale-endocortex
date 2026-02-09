'use client';

import { useGetPatientDashboardState } from '@basevitale/ghost-sdk';

const DEFAULT_PATIENT_ID = 'patient-dashboard-test';

/**
 * GHOST PROTOCOL - Test de flux "Raw" (Dumb Terminal).
 * Affiche la vérité nue : ce que le Backend envoie, rien d'autre.
 */
export default function DashboardPage() {
  const { data, isLoading, isError, error } = useGetPatientDashboardState(DEFAULT_PATIENT_ID);

  if (isLoading) {
    return (
      <div className="p-10 text-blue-500">
        Chargement du Cerveau…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-red-500 border border-red-500 bg-red-50 rounded-lg">
        <h2 className="font-bold">Échec de la connexion nerveuse</h2>
        <pre className="mt-2 text-sm overflow-auto">{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">État du Système (Mode Ghost)</h1>
      <p className="text-sm text-gray-500">Patient: {DEFAULT_PATIENT_ID}</p>

      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto max-h-96">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>

      {/* Si tu vois des données ici, la chaîne Backend → SDK → React est complète */}
    </div>
  );
}
