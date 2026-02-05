'use client';

import React, { useState, useCallback, useRef } from 'react';
import type { ScribeConfig } from '../config';
import type { ConsultationAnalysis, ConsultationData } from '../types/consultation-result';
import { processDictation, validateDraftAlt, patchDraft, formatApiError } from '../api/scribe-client';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

function apiBaseFromConfig(cfg: ScribeConfig): string {
  const u = cfg.apiBaseUrl.replace(/\/$/, '');
  return u.endsWith('/api') ? u : `${u}/api`;
}

type Phase = 'input' | 'analyzing' | 'correction' | 'validating';

export interface PrescriptionRow {
  drug: string;
  dosage: string;
  duration: string;
}

export interface BillingRow {
  code: string;
  label: string;
  confidence: number;
}

export interface MedicalScribeWorkflowProps {
  config: ScribeConfig;
  patientId: string;
  onComplete: (data: ConsultationAnalysis) => void;
  onCancel: () => void;
  className?: string;
}

function consultationToPrescription(c: ConsultationData): PrescriptionRow[] {
  const pr = (c?.prescription ?? []).filter(Boolean);
  if (pr.length) {
    return pr.map((p) => ({
      drug: String(p?.drug ?? '').trim() || '—',
      dosage: String(p?.dosage ?? '').trim(),
      duration: String(p?.duration ?? '').trim(),
    }));
  }
  const meds = (c?.medications ?? []).filter(Boolean);
  return meds.map((m) => ({
    drug: String(m?.name ?? '').trim() || '—',
    dosage: String(m?.dosage ?? '').trim(),
    duration: String(m?.duration ?? '').trim(),
  }));
}

function consultationToBilling(c: ConsultationData): BillingRow[] {
  const bc = (c?.billingCodes ?? []).filter(Boolean);
  return bc.map((b) => ({
    code: String(b?.code ?? '').trim() || '—',
    label: String(b?.label ?? '').trim() || '—',
    confidence: typeof b?.confidence === 'number' ? b.confidence : 0.9,
  }));
}

export function MedicalScribeWorkflow({
  config,
  patientId,
  onComplete,
  onCancel,
  className = '',
}: MedicalScribeWorkflowProps) {
  const apiBase = apiBaseFromConfig(config);
  const speech = useSpeechRecognition('fr-FR');

  const [phase, setPhase] = useState<Phase>('input');
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [prescription, setPrescription] = useState<PrescriptionRow[]>([]);
  const [billingCodes, setBillingCodes] = useState<BillingRow[]>([]);
  const [validating, setValidating] = useState(false);
  const editedRef = useRef(false);

  const displayTranscript = speech.supported
    ? (speech.transcript + (speech.interimTranscript ? ` ${speech.interimTranscript}` : '')).trim()
    : '';
  const textToAnalyze = speech.supported ? (speech.transcript || textInput).trim() : textInput.trim();
  const canAnalyze = textToAnalyze.length > 0;

  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) {
      setError('Saisissez ou dictez le texte de la consultation.');
      return;
    }
    const text = textToAnalyze;
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setPhase('analyzing');
    try {
      const res = await processDictation(config, { text, patientId });
      const data = (res as { data?: { draft?: { id: string }; draftId?: string; consultation?: ConsultationData } }).data ?? res;
      const id = (data as { draft?: { id: string }; draftId?: string }).draft?.id ?? (data as { draftId?: string }).draftId;
      const cons = (data as { consultation?: ConsultationData }).consultation ?? null;
      if (!id || !cons) {
        setError('Réponse API invalide (draftId ou consultation manquant).');
        setPhase('input');
        return;
      }
      setDraftId(id);
      setConsultation(cons);
      setPrescription(consultationToPrescription(cons));
      setBillingCodes(consultationToBilling(cons));
      editedRef.current = false;
      setPhase('correction');
    } catch (err: unknown) {
      const e = err as Error & { message?: string };
      let msg: string;
      if (e.name === 'TypeError' && e.message?.includes('fetch')) {
        msg = `Connexion impossible : vérifiez le backend (${apiBase}/scribe/health).`;
      } else if (e.message?.includes('NetworkError') || e.message?.includes('Failed to fetch')) {
        msg = `Réseau : ${e.message}`;
      } else {
        msg = formatApiError(err);
      }
      setError(msg);
      setPhase('input');
    } finally {
      setLoading(false);
    }
  }, [config, patientId, apiBase, textToAnalyze, canAnalyze]);

  const handleValidate = useCallback(async () => {
    if (!draftId || !consultation) return;
    setValidating(true);
    setError(null);
    setErrorStatus(null);
    setPhase('validating');
    try {
      let payload: ConsultationData = consultation;
      if (editedRef.current) {
        const pr = prescription
          .filter((p) => (p.drug !== '—' && p.drug.trim()) || p.dosage.trim() || p.duration.trim())
          .map((p) => ({
            drug: (p.drug === '—' ? '' : p.drug.trim()) || '—',
            dosage: p.dosage.trim(),
            duration: p.duration.trim(),
          }));
        const bc = billingCodes
          .filter((b) => ((b.code !== '—' && b.code.trim()) || (b.label !== '—' && b.label.trim())))
          .map((b) => ({
            code: (b.code === '—' ? '' : b.code.trim()) || '—',
            label: (b.label === '—' ? '' : b.label.trim()) || '—',
            confidence: b.confidence,
          }));
        const updated: ConsultationData = {
          ...consultation,
          prescription: pr.length ? pr : consultation.prescription ?? [],
          billingCodes: bc.length ? bc : consultation.billingCodes ?? [],
        };
        await patchDraft(config, draftId, updated);
        payload = updated;
      }
      await validateDraftAlt(config, draftId);
      onComplete({ draftId, consultation: payload });
      setDraftId(null);
      setConsultation(null);
      setPrescription([]);
      setBillingCodes([]);
      setTextInput('');
      editedRef.current = false;
      if (speech.supported) speech.reset();
      setPhase('input');
    } catch (err: unknown) {
      const apiErr = err as Error & { status?: number };
      setError(apiErr instanceof Error ? apiErr.message : formatApiError(err));
      setErrorStatus(apiErr?.status ?? null);
    } finally {
      setValidating(false);
      setPhase('correction');
    }
  }, [config, draftId, consultation, prescription, billingCodes, onComplete, speech]);

  const updatePrescription = useCallback((i: number, field: keyof PrescriptionRow, value: string) => {
    setPrescription((prev) => {
      const next = [...prev];
      if (!next[i]) return prev;
      next[i] = { ...next[i], [field]: value };
      editedRef.current = true;
      return next;
    });
  }, []);

  const addPrescriptionRow = useCallback(() => {
    setPrescription((prev) => [...prev, { drug: '', dosage: '', duration: '' }]);
    editedRef.current = true;
  }, []);

  const removePrescriptionRow = useCallback((i: number) => {
    setPrescription((prev) => prev.filter((_, j) => j !== i));
    editedRef.current = true;
  }, []);

  const updateBilling = useCallback((i: number, field: keyof BillingRow, value: string | number) => {
    setBillingCodes((prev) => {
      const next = [...prev];
      if (!next[i]) return prev;
      next[i] = { ...next[i], [field]: value };
      editedRef.current = true;
      return next;
    });
  }, []);

  const addBillingRow = useCallback(() => {
    setBillingCodes((prev) => [...prev, { code: '', label: '', confidence: 0.9 }]);
    editedRef.current = true;
  }, []);

  const removeBillingRow = useCallback((i: number) => {
    setBillingCodes((prev) => prev.filter((_, j) => j !== i));
    editedRef.current = true;
  }, []);

  const handleCancel = useCallback(() => {
    if (speech.supported && speech.isListening) speech.stop();
    setPhase('input');
    setError(null);
    setErrorStatus(null);
    setDraftId(null);
    setConsultation(null);
    setPrescription([]);
    setBillingCodes([]);
    setTextInput('');
    onCancel();
  }, [onCancel, speech]);

  const symptoms = (consultation?.symptoms ?? []).filter(Boolean);
  const diagnosis = (consultation?.diagnosis ?? []).filter(Boolean);

  return (
    <div className={`space-y-4 ${className}`}>
      {phase === 'input' && (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">Dictée / Transcription</h2>
            {speech.supported && (
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={speech.isListening ? speech.stop : speech.start}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-800 hover:bg-slate-200"
                >
                  {speech.isListening ? '⏹ Arrêter le micro' : '🎤 Démarrer le micro'}
                </button>
                {speech.isListening && (
                  <span className="text-sm text-amber-600">Enregistrement en cours…</span>
                )}
              </div>
            )}
            <div className="mb-2 text-sm text-slate-600">
              {speech.supported
                ? 'Parlez ou complétez au clavier. Le texte s’affiche en direct (streaming).'
                : 'Micro non supporté : saisissez le texte de la consultation.'}
            </div>
            <textarea
              value={speech.supported ? textInput : (textInput || displayTranscript)}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ex. Le patient présente une toux sèche depuis 3 jours. Je prescris du sirop Toplexil."
              rows={5}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400"
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
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !canAnalyze}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Analyse en cours…' : 'Analyser'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-200 text-slate-800 hover:bg-slate-300"
            >
              Annuler
            </button>
          </div>
        </>
      )}

      {phase === 'analyzing' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" aria-hidden />
            <p className="text-blue-800 font-medium">Analyse IA en cours (CLOUD ~5–30 s, LOCAL jusqu’à 5 min)…</p>
          </div>
        </div>
      )}

      {phase === 'correction' && consultation && (
        <>
          {error && (
            <div
              role="alert"
              className={`rounded-lg border p-4 ${
                errorStatus === 400
                  ? 'border-red-400 bg-red-100'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              {errorStatus === 400 && (
                <p className="text-sm font-semibold text-red-900 mb-1">Interdiction critique</p>
              )}
              <p className="text-sm text-red-800">{error}</p>
              {errorStatus === 400 && (
                <p className="mt-2 text-xs text-red-700">
                  Corrigez l’ordonnance puis recliquez sur Valider.
                </p>
              )}
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">Correction / validation</h2>
            <div>
              <h3 className="text-xs font-medium text-slate-600 mb-1">Symptômes</h3>
              <p className="text-sm text-slate-800">{symptoms.length ? symptoms.join(', ') : '—'}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-slate-600 mb-1">Diagnostics</h3>
              <p className="text-sm text-slate-800">
                {diagnosis.length
                  ? diagnosis.map((d) => `${d?.label ?? d?.code ?? '—'} (${d?.code ?? '—'})`).join(' ; ')
                  : '—'}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-slate-600 mb-2">Ordonnance (éditable)</h3>
              <ul className="space-y-2">
                {prescription.map((row, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      value={row.drug}
                      onChange={(e) => updatePrescription(i, 'drug', e.target.value)}
                      placeholder="Médicament"
                      className="flex-1 min-w-[120px] rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <input
                      value={row.dosage}
                      onChange={(e) => updatePrescription(i, 'dosage', e.target.value)}
                      placeholder="Dosage"
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <input
                      value={row.duration}
                      onChange={(e) => updatePrescription(i, 'duration', e.target.value)}
                      placeholder="Durée"
                      className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
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
              <h3 className="text-xs font-medium text-slate-600 mb-2">Codes actes (éditables)</h3>
              <ul className="space-y-2">
                {billingCodes.map((row, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      value={row.code}
                      onChange={(e) => updateBilling(i, 'code', e.target.value)}
                      placeholder="Code"
                      className="w-28 rounded border border-slate-300 px-2 py-1 text-sm font-mono"
                    />
                    <input
                      value={row.label}
                      onChange={(e) => updateBilling(i, 'label', e.target.value)}
                      placeholder="Libellé"
                      className="flex-1 min-w-[140px] rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={row.confidence}
                      onChange={(e) => updateBilling(i, 'confidence', parseFloat(e.target.value) || 0)}
                      className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
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
              type="button"
              onClick={handleValidate}
              disabled={validating}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {validating ? 'Validation…' : 'Valider'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-slate-200 text-slate-800 hover:bg-slate-300"
            >
              Annuler
            </button>
          </div>
        </>
      )}

      {phase === 'validating' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" aria-hidden />
            <p className="text-emerald-800 font-medium">Gravure Neo4j et finalisation…</p>
          </div>
        </div>
      )}

      {error && phase === 'input' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
          <p className="mt-2 text-xs text-red-600">
            API : <code className="bg-red-100 px-1 rounded">{apiBase}</code>
          </p>
        </div>
      )}
    </div>
  );
}
