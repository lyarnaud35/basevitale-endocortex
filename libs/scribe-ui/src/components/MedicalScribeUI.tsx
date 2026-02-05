'use client';

import React from 'react';
import type { UseScribeLogicReturn } from '../hooks/useScribeLogic';
import { IntelligencePanel } from './IntelligencePanel';
import { cn, scribeId } from '../utils/cn';

export type ScribeTheme = 'light' | 'dark';

export interface MedicalScribeUIProps {
  /** Résultat du hook useScribeLogic (logique headless). */
  logic: UseScribeLogicReturn;
  /** Thème visuel. Défaut: light. */
  theme?: ScribeTheme;
  /** Afficher le panneau Intelligence. Défaut: true. */
  showIntelligence?: boolean;
  /** ClassName racine (fusionnée avec cn). */
  className?: string;
}

const themeClasses = {
  light: {
    root: 'bv-scribe-light',
    card: 'border-slate-200 bg-white text-slate-900',
    cardMuted: 'bg-slate-50 border-slate-200 text-slate-800',
    input: 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400',
    buttonPrimary: 'bg-blue-600 text-white hover:bg-blue-700',
    buttonSecondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
    buttonSuccess: 'bg-emerald-600 text-white hover:bg-emerald-700',
    error: 'border-red-200 bg-red-50 text-red-800',
    errorStrong: 'border-red-400 bg-red-100 text-red-900',
    label: 'text-slate-600',
    heading: 'text-slate-800',
  },
  dark: {
    root: 'bv-scribe-dark',
    card: 'border-slate-600 bg-slate-800 text-slate-100',
    cardMuted: 'bg-slate-700/50 border-slate-600 text-slate-200',
    input: 'border-slate-500 bg-slate-700 text-slate-100 placeholder-slate-400',
    buttonPrimary: 'bg-blue-600 text-white hover:bg-blue-500',
    buttonSecondary: 'bg-slate-600 text-slate-200 hover:bg-slate-500',
    buttonSuccess: 'bg-emerald-600 text-white hover:bg-emerald-500',
    error: 'border-red-800 bg-red-900/30 text-red-200',
    errorStrong: 'border-red-700 bg-red-900/50 text-red-100',
    label: 'text-slate-400',
    heading: 'text-slate-100',
  },
};

/**
 * UI présentational du Medical Scribe.
 * Reçoit toute la logique depuis useScribeLogic ; zéro état local métier.
 * Utilise cn() et scribeId() pour isolation des styles et des IDs.
 */
export function MedicalScribeUI({
  logic,
  theme = 'light',
  showIntelligence = true,
  className,
}: MedicalScribeUIProps) {
  const t = themeClasses[theme];
  const {
    apiBase,
    intelligence,
    phase,
    textInput,
    setTextInput,
    displayTranscript,
    textToAnalyze,
    canAnalyze,
    loading,
    error,
    errorStatus,
    prescription,
    billingCodes,
    validating,
    symptoms,
    diagnosis,
    handleAnalyze,
    handleValidate,
    handleCancel,
    updatePrescription,
    addPrescriptionRow,
    removePrescriptionRow,
    updateBilling,
    addBillingRow,
    removeBillingRow,
    speech,
  } = logic;

  return (
    <div
      id={scribeId('root')}
      role="region"
      aria-label="Scribe médical"
      className={cn(t.root, 'space-y-4', className)}
    >
      {showIntelligence && (
        <div id={scribeId('intelligence')} className="mb-4">
          <IntelligencePanel
            data={intelligence.data}
            loading={intelligence.loading}
            error={intelligence.error}
            disconnected={intelligence.disconnected}
            timelineLimit={3}
          />
        </div>
      )}

      <div id={scribeId('workflow')} className="space-y-4">
        {phase === 'input' && (
          <>
            <div className={cn('rounded-lg border p-4', t.card)}>
              <h2 className={cn('text-sm font-semibold mb-2', t.heading)}>
                Dictée / Transcription
              </h2>
              {speech.supported && (
                <div className="flex items-center gap-2 mb-3">
                  <button
                    id={scribeId('btn-mic')}
                    type="button"
                    onClick={speech.isListening ? speech.stop : speech.start}
                    className={cn('px-4 py-2 rounded-lg text-sm font-medium', t.buttonSecondary)}
                  >
                    {speech.isListening ? '⏹ Arrêter le micro' : '🎤 Démarrer le micro'}
                  </button>
                  {speech.isListening && (
                    <span className="text-sm text-amber-600">Enregistrement en cours…</span>
                  )}
                </div>
              )}
              <p className={cn('mb-2 text-sm', t.label)}>
                {speech.supported
                  ? "Parlez ou complétez au clavier. Le texte s'affiche en direct (streaming)."
                  : 'Micro non supporté : saisissez le texte de la consultation.'}
              </p>
              <textarea
                id={scribeId('input-transcript')}
                value={speech.supported ? textInput : (textInput || displayTranscript)}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ex. Le patient présente une toux sèche depuis 3 jours. Je prescris du sirop Toplexil."
                rows={5}
                className={cn('w-full rounded-lg border px-3 py-2 text-sm', t.input)}
                aria-label="Texte de la consultation"
              />
              {speech.supported && displayTranscript && (
                <div className="mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs font-medium text-emerald-800 mb-1">Streaming (transcription)</p>
                  <p className="text-sm text-emerald-900 whitespace-pre-wrap">{displayTranscript}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                id={scribeId('btn-analyze')}
                type="button"
                onClick={handleAnalyze}
                disabled={loading || !canAnalyze}
                className={cn(
                  'px-5 py-2.5 rounded-lg text-sm font-medium disabled:bg-slate-300 disabled:cursor-not-allowed',
                  t.buttonPrimary,
                )}
              >
                {loading ? 'Analyse en cours…' : 'Analyser'}
              </button>
              <button
                id={scribeId('btn-cancel')}
                type="button"
                onClick={handleCancel}
                className={cn('px-5 py-2.5 rounded-lg text-sm font-medium', t.buttonSecondary)}
              >
                Annuler
              </button>
            </div>
          </>
        )}

        {phase === 'analyzing' && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
            <div className="flex items-center gap-3">
              <div
                className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"
                aria-hidden
              />
              <p className="text-blue-800 font-medium">
                Analyse IA en cours (CLOUD ~5–30 s, LOCAL jusqu'à 5 min)…
              </p>
            </div>
          </div>
        )}

        {phase === 'correction' && logic.consultation && (
          <>
            {error && (
              <div
                id={scribeId('error-box')}
                role="alert"
                className={cn(
                  'rounded-lg border p-4',
                  errorStatus === 400 ? t.errorStrong : t.error,
                )}
              >
                {errorStatus === 400 && (
                  <p className="text-sm font-semibold mb-1">Interdiction critique</p>
                )}
                <p className="text-sm">{error}</p>
                {errorStatus === 400 && (
                  <p className="mt-2 text-xs">Corrigez l'ordonnance puis recliquez sur Valider.</p>
                )}
              </div>
            )}
            <div className={cn('rounded-lg border p-4 space-y-4', t.card)}>
              <h2 className={cn('text-sm font-semibold', t.heading)}>Correction / validation</h2>
              <div>
                <h3 className={cn('text-xs font-medium mb-1', t.label)}>Symptômes</h3>
                <p className="text-sm">{symptoms.length ? symptoms.join(', ') : '—'}</p>
              </div>
              <div>
                <h3 className={cn('text-xs font-medium mb-1', t.label)}>Diagnostics</h3>
                <p className="text-sm">
                  {diagnosis.length
                    ? diagnosis.map((d) => `${d?.label ?? d?.code ?? '—'} (${d?.code ?? '—'})`).join(' ; ')
                    : '—'}
                </p>
              </div>
              <div>
                <h3 className={cn('text-xs font-medium mb-2', t.label)}>Ordonnance (éditable)</h3>
                <ul className="space-y-2">
                  {prescription.map((row, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      <input
                        id={scribeId(`prescription-drug-${i}`)}
                        value={row.drug}
                        onChange={(e) => updatePrescription(i, 'drug', e.target.value)}
                        placeholder="Médicament"
                        className={cn('flex-1 min-w-[120px] rounded border px-2 py-1 text-sm', t.input)}
                      />
                      <input
                        id={scribeId(`prescription-dosage-${i}`)}
                        value={row.dosage}
                        onChange={(e) => updatePrescription(i, 'dosage', e.target.value)}
                        placeholder="Dosage"
                        className={cn('w-24 rounded border px-2 py-1 text-sm', t.input)}
                      />
                      <input
                        id={scribeId(`prescription-duration-${i}`)}
                        value={row.duration}
                        onChange={(e) => updatePrescription(i, 'duration', e.target.value)}
                        placeholder="Durée"
                        className={cn('w-24 rounded border px-2 py-1 text-sm', t.input)}
                      />
                      <button
                        type="button"
                        onClick={() => removePrescriptionRow(i)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Suppr.
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={addPrescriptionRow}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Ajouter un médicament
                </button>
              </div>
              <div>
                <h3 className={cn('text-xs font-medium mb-2', t.label)}>Codes actes (éditables)</h3>
                <ul className="space-y-2">
                  {billingCodes.map((row, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      <input
                        id={scribeId(`billing-code-${i}`)}
                        value={row.code}
                        onChange={(e) => updateBilling(i, 'code', e.target.value)}
                        placeholder="Code"
                        className={cn('w-28 rounded border px-2 py-1 text-sm font-mono', t.input)}
                      />
                      <input
                        id={scribeId(`billing-label-${i}`)}
                        value={row.label}
                        onChange={(e) => updateBilling(i, 'label', e.target.value)}
                        placeholder="Libellé"
                        className={cn('flex-1 min-w-[140px] rounded border px-2 py-1 text-sm', t.input)}
                      />
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.1}
                        value={row.confidence}
                        onChange={(e) => updateBilling(i, 'confidence', parseFloat(e.target.value) || 0)}
                        className={cn('w-16 rounded border px-2 py-1 text-sm', t.input)}
                      />
                      <button
                        type="button"
                        onClick={() => removeBillingRow(i)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Suppr.
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={addBillingRow}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Ajouter un code acte
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                id={scribeId('btn-validate')}
                type="button"
                onClick={handleValidate}
                disabled={validating}
                className={cn(
                  'px-5 py-2.5 rounded-lg text-sm font-medium disabled:bg-slate-300 disabled:cursor-not-allowed',
                  t.buttonSuccess,
                )}
              >
                {validating ? 'Validation…' : 'Valider'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className={cn('px-5 py-2.5 rounded-lg text-sm font-medium', t.buttonSecondary)}
              >
                Annuler
              </button>
            </div>
          </>
        )}

        {phase === 'validating' && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-3">
              <div
                className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"
                aria-hidden
              />
              <p className="text-emerald-800 font-medium">Gravure Neo4j et finalisation…</p>
            </div>
          </div>
        )}

        {error && phase === 'input' && (
          <div className={cn('rounded-lg border p-4', t.error)}>
            <p className="text-sm">{error}</p>
            <p className="mt-2 text-xs">
              API : <code className="bg-red-100 px-1 rounded">{apiBase}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MedicalScribeUI;
