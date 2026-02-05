import React from 'react';
import type { ScribeConfig } from '../config';
import { DEFAULT_API_BASE } from '../config';
import { ScribeTestView } from './ScribeTestView';

export interface MedicalScribeProps {
  /** Identifiant patient fourni par l'Host (externalPatientId). */
  patientId?: string;
  /** Callback quand un draft est créé (ex. navigation Host). */
  onDraftCreated?: (draftId: string) => void;
  /** Callback retour (ex. liste des drafts). */
  onBack?: () => void;
  /** Callback après validation du draft. */
  onValidated?: () => void;
  /** Mode : dictation | edit | test. Par défaut test (sandbox). */
  mode?: 'dictation' | 'edit' | 'test';
  /** ID du draft en mode édition. */
  draftId?: string;
  /** Config API. Si absent, utilise DEFAULT_API_BASE + token test. */
  config?: Partial<ScribeConfig>;
  /** ClassName racine. */
  className?: string;
}

function defaultConfig(overrides?: Partial<ScribeConfig>): ScribeConfig {
  return {
    apiBaseUrl: overrides?.apiBaseUrl ?? DEFAULT_API_BASE,
    getToken: overrides?.getToken,
  };
}

/**
 * MedicalScribe – Widget principal du module Scribe.
 * Symbiote Protocol : logique dans libs/scribe-ui, portable (React pur), sans Next.js.
 */
export function MedicalScribe({
  patientId,
  mode = 'test',
  draftId,
  config: configOverrides,
  className = '',
  onBack,
  onValidated,
}: MedicalScribeProps) {
  const config = defaultConfig(configOverrides);

  if (mode === 'test') {
    return (
      <div className={className}>
        <ScribeTestView config={config} onCrystallized={onValidated} />
      </div>
    );
  }

  if (mode === 'edit' && draftId) {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 p-6 ${className}`}>
        <h2 className="text-lg font-semibold text-amber-900">Édition draft (mode edit)</h2>
        <p className="mt-2 text-sm text-amber-800">
          Draft <code className="bg-amber-100 px-1 rounded">{draftId}</code> · Vue édition en cours
          de migration. Utilisez <strong>mode=test</strong> pour la démo.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 px-4 py-2 text-sm font-medium text-amber-900 bg-white border border-amber-300 rounded-md hover:bg-amber-100"
          >
            ← Retour
          </button>
        )}
      </div>
    );
  }

  if (mode === 'dictation') {
    return (
      <div className={`rounded-lg border border-blue-200 bg-blue-50 p-6 ${className}`}>
        <h2 className="text-lg font-semibold text-blue-900">Dictée (mode dictation)</h2>
        <p className="mt-2 text-sm text-blue-800">
          {patientId && <>Patient : <code className="bg-blue-100 px-1 rounded">{patientId}</code></>}
          {' · '}
          Vue dictation en cours de migration. Utilisez <strong>mode=test</strong> pour la démo.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 px-4 py-2 text-sm font-medium text-blue-900 bg-white border border-blue-300 rounded-md hover:bg-blue-100"
          >
            ← Retour
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-6 ${className}`}>
      <p className="text-sm text-gray-600">MedicalScribe · mode={mode} · Aucune vue associée.</p>
    </div>
  );
}

export default MedicalScribe;
