'use client';

import { useState } from 'react';
import {
  setBaseUrl,
  usePrescriptionSession,
  usePatientPrescriptionHistory,
} from '@basevitale/ghost-sdk';

const API_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : '';
setBaseUrl(API_BASE);

/** CIS réels BDPM : Doliprane 1000 mg comprimé / Efferalgan 1000 mg comprimé effervescent (tous deux paracétamol) */
const CIS_DOLIPRANE = '60234100';
const CIS_EFFERALGAN = '61574554';

const PATIENT_TEST = 'patient-test-1';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function PrescriptionTestPage() {
  const [validatedId, setValidatedId] = useState<string | null>(null);
  const {
    draft,
    safetyReport,
    isLoading,
    addDrug,
    removeDrug,
    validatePrescriptionAsync,
    isChecking,
    isValidating,
  } = usePrescriptionSession(PATIENT_TEST);
  const { prescriptions, isLoading: historyLoading } =
    usePatientPrescriptionHistory(PATIENT_TEST);

  const canValidate =
    draft.length > 0 && safetyReport.status !== 'CRITICAL';
  const handleValidate = async () => {
    if (!canValidate) return;
    setValidatedId(null);
    try {
      const { prescriptionId } = await validatePrescriptionAsync();
      setValidatedId(prescriptionId);
    } catch (e) {
      console.error(e);
      setValidatedId('ERROR');
    }
  };

  const statusColor =
    safetyReport.status === 'CRITICAL'
      ? 'bg-red-100 border-red-500 text-red-800'
      : safetyReport.status === 'WARNING'
        ? 'bg-amber-100 border-amber-500 text-amber-800'
        : 'bg-green-100 border-green-500 text-green-800';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-10 font-sans max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">
        Test Matrix Check – Brouillon d&apos;ordonnance
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Ajoute Doliprane puis Efferalgan : les deux contiennent du paracétamol → le backend doit renvoyer <strong>CRITICAL</strong> (doublon de molécule).
      </p>

      {/* Feu tricolore */}
      <div className={`border-l-4 p-4 mb-8 rounded-r ${statusColor}`}>
        <h2 className="font-bold text-lg">
          Sécurité globale : {isLoading || isChecking ? '…' : safetyReport.status}
        </h2>
        {safetyReport.duplicateMolecules?.length > 0 && (
          <ul className="mt-2 list-disc list-inside text-sm">
            {safetyReport.duplicateMolecules.map((dup, i) => (
              <li key={i}>
                Doublon molécule <strong>{dup.moleculeName}</strong> entre{' '}
                {dup.drugNames?.join(', ')}
              </li>
            ))}
          </ul>
        )}
        {safetyReport.allergyConflicts?.length > 0 && (
          <ul className="mt-2 list-disc list-inside text-sm">
            {safetyReport.allergyConflicts.map((c, i) => (
              <li key={i}>{c.reason}</li>
            ))}
          </ul>
        )}
        {safetyReport.alerts?.length > 0 && (
          <p className="mt-2 text-sm">{safetyReport.alerts.join(' ')}</p>
        )}
      </div>

      {/* Boutons test */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          type="button"
          onClick={() => addDrug({ cisId: CIS_DOLIPRANE, posology: '1 cp x 3/j' })}
          disabled={isChecking}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          A – Ajouter Doliprane 1000 mg
        </button>
        <button
          type="button"
          onClick={() => addDrug({ cisId: CIS_EFFERALGAN, posology: '1 cp effervescent si douleur' })}
          disabled={isChecking}
          className="bg-violet-600 text-white px-4 py-2 rounded hover:bg-violet-700 disabled:opacity-50"
        >
          B – Ajouter Efferalgan 1000 mg
        </button>
      </div>
      {isChecking && (
        <p className="text-amber-400 text-sm mb-4">Matrix Check en cours…</p>
      )}

      {/* Validation (cristallisation) */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleValidate}
          disabled={!canValidate || isValidating}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isValidating ? 'Validation…' : 'IMPRIMER & VALIDER'}
        </button>
        <p className="text-zinc-500 text-xs mt-2">
          Désactivé si brouillon vide ou sécurité CRITICAL. Grave l’ordonnance dans le graphe Neo4j et vide le brouillon.
        </p>
        {validatedId && validatedId !== 'ERROR' && (
          <p className="mt-2 text-emerald-400 text-sm">
            Ordonnance cristallisée dans le graphe : <code className="bg-zinc-800 px-1 rounded">{validatedId}</code>
          </p>
        )}
        {validatedId === 'ERROR' && (
          <p className="mt-2 text-red-400 text-sm">Erreur lors de la validation (brouillon vide ou CRITICAL ?).</p>
        )}
      </div>

      {/* Liste du brouillon */}
      <div className="border border-zinc-700 rounded-lg p-4 mb-8">
        <h3 className="font-semibold mb-2">Brouillon ({draft.length} ligne(s))</h3>
        {draft.length === 0 ? (
          <p className="text-zinc-500 text-sm">Vide. Cliquez sur A puis B pour déclencher l’alerte doublon.</p>
        ) : (
          <ul className="space-y-2">
            {draft.map((item) => (
              <li
                key={item.cisId}
                className="flex justify-between items-center text-sm border-b border-zinc-700 pb-2 last:border-0"
              >
                <span>
                  {item.name || item.cisId} {item.posology && `– ${item.posology}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeDrug(item.cisId)}
                  className="text-red-400 hover:underline"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Historique médical (ordonnances validées) – boucle de rétroaction */}
      <div className="border border-zinc-600 rounded-lg p-4 bg-zinc-900/50">
        <h3 className="font-semibold mb-2 text-zinc-200">
          Historique médical (5 dernières ordonnances)
        </h3>
        <p className="text-zinc-500 text-xs mb-3">
          Après validation, l’ordonnance apparaît ici. Rafraîchissement automatique.
        </p>
        {historyLoading ? (
          <p className="text-zinc-500 text-sm">Chargement…</p>
        ) : prescriptions.length === 0 ? (
          <p className="text-zinc-500 text-sm">
            Aucune ordonnance validée. Validez un brouillon pour la voir apparaître.
          </p>
        ) : (
          <ul className="space-y-3">
            {prescriptions.map((rx) => (
              <li
                key={rx.id}
                className="border border-zinc-700 rounded p-3 text-sm"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-zinc-300 font-medium">
                    {formatDate(rx.date)}
                  </span>
                  <span className="text-emerald-400 text-xs uppercase">
                    {rx.status}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-zinc-400">
                  {rx.drugs.map((d, i) => (
                    <li key={`${rx.id}-${i}`}>
                      {d.name || d.cisId}
                      {d.posologie && (
                        <span className="text-zinc-500"> – {d.posologie}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
