'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { formatApiError, API_BASE } from '../../lib/api/client';
import { ConsultationSchema, Consultation } from '@basevitale/shared';

type AnalysisStep = 'idle' | 'sending' | 'analyzing' | 'done';

/**
 * Page Scribe - Frontend réactif
 *
 * - Connexion backend : POST /scribe/process-dictation
 * - États de chargement (envoi → analyse IA) avec feedback visuel
 * - Affichage JSON structuré (symptômes, diagnostics, médicaments) pour validation
 */
export default function ScribePage() {
  const [originalText, setOriginalText] = useState('');
  const [patientId, setPatientId] = useState('patient_test_123');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [scribeHealth, setScribeHealth] = useState<'ok' | 'degraded' | 'unhealthy' | null>(null);
  const [drafts, setDrafts] = useState<Array<{ id: string; patientId: string; status: string; createdAt: string }>>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [showJsonView, setShowJsonView] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Consultation structurée (depuis l'IA ou modifiée par le médecin)
  const [consultation, setConsultation] = useState<Consultation | null>(null);

  // Formulaire avec react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<Consultation>({
    resolver: zodResolver(ConsultationSchema),
    defaultValues: {
      patientId: '',
      transcript: '',
      symptoms: [],
      diagnosis: [],
      medications: [],
    },
  });

  // Surveiller les changements du formulaire
  const formData = watch();

  // Synchroniser consultation avec formData quand formData change (avec debounce pour éviter trop de re-renders)
  // Optimisation : utiliser useMemo pour éviter les re-renders inutiles
  const debouncedFormData = useMemo(() => {
    if (!formData || !formData.patientId || !formData.symptoms || formData.symptoms.length === 0) {
      return null;
    }
    return formData;
  }, [formData]);

  useEffect(() => {
    if (debouncedFormData) {
      const timer = setTimeout(() => {
        setConsultation(debouncedFormData);
        setHasUnsavedChanges(true);
      }, 150); // Augmenté à 150ms pour réduire les updates
      return () => clearTimeout(timer);
    }
  }, [debouncedFormData]);

  // Texte de dictée pré-écrit pour test
  const sampleTexts = useMemo(() => [
    'Patient présente fièvre modérée à 38.5°C, toux sèche persistante, maux de tête et fatigue depuis 3 jours. Tension artérielle 130/85, fréquence cardiaque 85 bpm. Diagnostic suspecté : grippe saisonnière. Prescription : Paracétamol 500mg, 3 fois par jour pendant 7 jours.',
    'Patient se plaint de nausées, vomissements et douleurs abdominales. Pas de fièvre. Diagnostic suspecté : gastro-entérite. Prescription : Gaviscon, 10ml après chaque repas pendant 5 jours.',
    'Patient avec mal de gorge, congestion nasale et légère fièvre. Diagnostic suspecté : rhume. Prescription : Doliprane 1000mg en cas de fièvre, Strepsils pour la gorge.',
  ], []);

  // Auto-hide success message after 5s (avec animation fade-out)
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-hide error message after 10s (plus long pour les erreurs critiques)
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Santé du module Scribe (optionnel, non bloquant)
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/scribe/health`)
      .then((r) => {
        if (!r.ok) {
          if (!cancelled) setScribeHealth('unhealthy');
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (cancelled || !d) return;
        const payload = d?.data ?? d;
        const s = payload.status;
        if (s === 'healthy') setScribeHealth('ok');
        else if (s === 'degraded') setScribeHealth('degraded');
        else setScribeHealth('unhealthy');
      })
      .catch(() => {
        if (!cancelled) setScribeHealth('unhealthy');
      });
    return () => { cancelled = true; };
  }, []);

  const fetchDrafts = useCallback(async () => {
    setDraftsLoading(true);
    try {
      const params = new URLSearchParams();
      if (patientId.trim()) params.set('patientId', patientId.trim());
      params.set('limit', '10');
      const r = await fetch(`${API_BASE}/scribe/drafts?${params}`, {
        headers: { Authorization: 'Bearer test-token' },
      });
      if (!r.ok) {
        setDrafts([]);
        return [];
      }
      const json = await r.json();
      const items = json?.data?.items ?? [];
      setDrafts(items);
      return items;
    } catch (err) {
      console.error('Error fetching drafts:', err);
      setDrafts([]);
      return [];
    } finally {
      setDraftsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const loadDraft = useCallback(async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/scribe/draft/${id}`, {
        headers: { Authorization: 'Bearer test-token' },
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        const err = new Error(data?.message ?? data?.error ?? 'Erreur') as Error & {
          status?: number;
          data?: unknown;
        };
        err.status = r.status;
        err.data = data;
        throw err;
      }
      const json = await r.json();
      const payload = json?.data ?? json;
      const d = payload.draft;
      const c = payload.consultation as {
        patientId?: string;
        transcript?: string;
        symptoms?: string[];
        diagnosis?: Array<{ code: string; label: string; confidence: number }>;
        medications?: Array<{ name: string; dosage: string; duration: string }>;
      } | null;
      if (d) setDraftId(d.id);
      if (c) {
        setConsultation(c);
        reset(c);
        setOriginalText(c.transcript ?? '');
        if (c.patientId) setPatientId(c.patientId);
      }
      setSuccessMessage('✅ Brouillon chargé avec succès');
    } catch (err: unknown) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Validation en temps réel (utilise les erreurs de react-hook-form)
  const validationErrors = useMemo(() => {
    if (Object.keys(errors).length === 0) return null;
    
    const errorMessages: string[] = [];
    
    if (errors.symptoms) {
      errorMessages.push('Au moins un symptôme est requis');
    }
    
    if (errors.diagnosis) {
      errorMessages.push('Au moins un diagnostic est requis');
    }

    if (errors.medications) {
      errorMessages.push('Les médicaments doivent être valides');
    }

    return errorMessages.length > 0 ? errorMessages : null;
  }, [errors]);

  const handleSimulateDictation = useCallback(async () => {
    if (!originalText.trim()) {
      setError('Veuillez entrer un texte ou sélectionner un exemple');
      return;
    }
    if (originalText.length > 50000) {
      setError('Le texte est trop long (maximum 50000 caractères)');
      return;
    }
    if (!patientId.trim()) {
      setError('Veuillez entrer un Patient ID');
      return;
    }
    if (patientId.length > 100) {
      setError('Le Patient ID est trop long (maximum 100 caractères)');
      return;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setHasUnsavedChanges(false);
    setConsultation(null);
    setDraftId(null);
    setAnalysisStep('sending');

    const toAnalyzing = window.setTimeout(() => {
      setAnalysisStep('analyzing');
    }, 400);

    try {
      // Utiliser process-dictation qui crée directement un draft
      const response = await fetch(`${API_BASE}/scribe/process-dictation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({ 
          text: originalText,
          patientId: patientId.trim(),
        }),
        signal,
      });

      clearTimeout(toAnalyzing);
      setAnalysisStep('done');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Erreur HTTP ' + response.status,
        }));
        const err = new Error(
          errorData.message || errorData.error || 'Erreur lors du traitement',
        ) as Error & { status?: number; data?: unknown };
        err.status = response.status;
        err.data = errorData;
        throw err;
      }

      const data = await response.json();
      // Le backend retourne { success: true, draft: { id, ... }, consultation }
      const payload = data?.data ?? data;
      const draft = payload.draft;
      const consultation = payload.consultation;
      
      if (!draft || !draft.id) {
        throw new Error('Réponse invalide du serveur : draftId manquant');
      }
      
      if (!consultation || !consultation.symptoms) {
        throw new Error('Réponse invalide du serveur : consultation manquante');
      }
      
      // Réinitialiser le formulaire avec les données de la consultation
      reset(consultation);
      setConsultation(consultation);
      setDraftId(draft.id);
      setSuccessMessage('✅ Analyse terminée avec succès !');
      
      // Rediriger vers la page d'édition du draft
      console.log(`🔍 [handleSimulateDictation] Redirection vers /scribe/${draft.id}`);
      window.location.href = `/scribe/${draft.id}`;
    } catch (err: unknown) {
      clearTimeout(toAnalyzing);
      if (err instanceof Error && err.name === 'AbortError') {
        setAnalysisStep('idle');
        return;
      }
      setAnalysisStep('idle');
      setError(formatApiError(err));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [originalText, patientId, fetchDrafts, reset]);

  const handleSaveDraft = useCallback(async (data?: Consultation) => {
    const dataToSave = data || formData;
    if (!draftId || !dataToSave) {
      setError('Aucun draft à sauvegarder');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/scribe/draft/${draftId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          structuredData: dataToSave,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur HTTP ' + response.status }));
        throw new Error(errorData.message || errorData.error || 'Erreur lors de la sauvegarde');
      }

      const result = await response.json();
      const savedConsultation = result.consultation || result.data?.consultation || dataToSave;
      setConsultation(savedConsultation);
      setSuccessMessage('✅ Draft sauvegardé avec succès !');
      setHasUnsavedChanges(false);
      reset(savedConsultation, { keepDirty: false });
    } catch (err: unknown) {
      setError(formatApiError(err));
      setSuccessMessage(null);
    } finally {
      setSaving(false);
    }
  }, [draftId, formData, reset]);

  const handleValidateDraft = useCallback(async (data?: Consultation) => {
    const dataToValidate = data || formData;
    if (!draftId || !dataToValidate) {
      setError('Aucun draft à valider');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Sauvegarder d'abord les dernières modifications
      await handleSaveDraft(dataToValidate);

      // 2. Valider le draft
      const response = await fetch(`${API_BASE}/scribe/draft/${draftId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Erreur HTTP ' + response.status,
        }));
        const err = new Error(
          errorData.message || errorData.error || 'Erreur lors de la validation',
        ) as Error & { status?: number; data?: unknown };
        err.status = response.status;
        err.data = errorData;
        throw err;
      }

      const result = await response.json();
      const payload = result?.data ?? result;
      setSuccessMessage(`✅ Dossier validé avec succès ! ${payload.nodesCreated ?? 0} nœuds créés, ${payload.neo4jRelationsCreated ?? 0} relations Neo4j`);
      fetchDrafts();
    } catch (err: unknown) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [draftId, formData, handleSaveDraft, fetchDrafts]);

  const handleAddSymptom = useCallback(() => {
    const currentSymptoms = watch('symptoms') || [];
    setValue('symptoms', [...currentSymptoms, ''], { shouldDirty: true });
    setHasUnsavedChanges(true);
  }, [watch, setValue]);

  const handleRemoveSymptom = useCallback((index: number) => {
    const currentSymptoms = watch('symptoms') || [];
    setValue('symptoms', currentSymptoms.filter((_, i) => i !== index), { shouldDirty: true });
    setHasUnsavedChanges(true);
  }, [watch, setValue]);

  const handleUpdateSymptom = useCallback((index: number, value: string) => {
    const currentSymptoms = watch('symptoms') || [];
    const newSymptoms = [...currentSymptoms];
    newSymptoms[index] = value;
    setValue('symptoms', newSymptoms, { shouldDirty: true });
    setHasUnsavedChanges(true);
  }, [watch, setValue]);

  const handleAddDiagnosis = useCallback(() => {
    const currentDiagnosis = formData.diagnosis || [];
    setValue('diagnosis', [...currentDiagnosis, { code: '', label: '', confidence: 0.5 }], { shouldDirty: true });
    setHasUnsavedChanges(true);
  }, [formData.diagnosis, setValue]);

  const handleRemoveDiagnosis = useCallback((index: number) => {
    const currentDiagnosis = formData.diagnosis || [];
    setValue('diagnosis', currentDiagnosis.filter((_, i) => i !== index), { shouldDirty: true });
    setHasUnsavedChanges(true);
  }, [formData.diagnosis, setValue]);

  const handleUpdateDiagnosis = useCallback((index: number, field: string, value: string | number) => {
    const currentDiagnosis = formData.diagnosis || [];
    const newDiagnosis = [...currentDiagnosis];
    newDiagnosis[index] = { ...newDiagnosis[index], [field]: value };
    setValue('diagnosis', newDiagnosis, { shouldDirty: true });
    setHasUnsavedChanges(true);
  }, [formData.diagnosis, setValue]);

  const handleAddMedication = useCallback(() => {
    const currentMedications = formData.medications || [];
    setValue('medications', [...currentMedications, { name: '', dosage: '', duration: '' }], { shouldDirty: true });
    setHasUnsavedChanges(true);
  }, [formData.medications, setValue]);

  const handleRemoveMedication = useCallback((index: number) => {
    const currentMedications = formData.medications || [];
    setValue('medications', currentMedications.filter((_, i) => i !== index), { shouldDirty: true });
    setHasUnsavedChanges(true);
  }, [formData.medications, setValue]);

  const handleUpdateMedication = useCallback((index: number, field: string, value: string) => {
    const currentMedications = formData.medications || [];
    const newMedications = [...currentMedications];
    newMedications[index] = { ...newMedications[index], [field]: value };
    setValue('medications', newMedications, { shouldDirty: true });
    setHasUnsavedChanges(true);
  }, [formData.medications, setValue]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Module S - Scribe (Phase D)
          </h1>
          <p className="text-gray-600 mb-2">
            Interface médecin : Analyse et correction de consultations
            {scribeHealth === 'ok' && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                • Module OK
              </span>
            )}
            {scribeHealth === 'degraded' && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                • Module dégradé
              </span>
            )}
            {scribeHealth === 'unhealthy' && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                • Module indisponible
              </span>
            )}
          </p>
          <p className="text-sm text-gray-500">
            <Link href="/scribe/test" className="text-blue-600 hover:underline">
              → Page test (Tracer Bullet) — SIMULER CONSULTATION
            </Link>
          </p>
          {hasUnsavedChanges && (
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
              ⚠️ Modifications non sauvegardées
            </div>
          )}
        </div>

        {/* Messages de feedback */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-md shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-auto inline-flex text-red-400 hover:text-red-600"
                aria-label="Fermer l'erreur"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-md shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="ml-auto inline-flex text-green-400 hover:text-green-600"
                aria-label="Fermer le message de succès"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Section de dictée */}
        <div className="mb-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Saisie de la dictée</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient ID
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="patient_test_123"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Texte de la consultation
            </label>
            <textarea
              value={originalText}
              onChange={(e) => setOriginalText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Saisissez ou collez le texte de la consultation..."
            />
            <p className="mt-1 text-sm text-gray-500">
              {originalText.length} / 50000 caractères
            </p>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Exemples de textes :</p>
            <div className="flex flex-wrap gap-2">
              {sampleTexts.map((text, index) => (
                <button
                  key={index}
                  onClick={() => setOriginalText(text)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Exemple {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Mes brouillons</p>
              <button
                type="button"
                onClick={fetchDrafts}
                disabled={draftsLoading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {draftsLoading ? '…' : 'Rafraîchir'}
              </button>
            </div>
            {drafts.length > 0 ? (
              <ul className="border border-gray-200 rounded-md divide-y divide-gray-200 max-h-32 overflow-y-auto">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-gray-700">
                      {d.patientId} · {d.status} · {new Date(d.createdAt).toLocaleString('fr-FR')}
                    </span>
                    <Link
                      href={`/scribe/${d.id}`}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                    >
                      Éditer
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun brouillon.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSimulateDictation}
              disabled={loading || !originalText.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Analyse en cours…' : 'Analyser'}
            </button>
            {loading && (
              <>
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                >
                  Annuler
                </button>
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-hidden />
                  {analysisStep === 'sending' && 'Envoi du texte…'}
                  {analysisStep === 'analyzing' && "Analyse IA en cours… (peut prendre jusqu'à 5 min en local)"}
                  {analysisStep === 'done' && 'Extraction terminée'}
                </span>
              </>
            )}
          </div>
          {loading && !consultation && (
            <p className="mt-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
              L&apos;IA peut être lente selon le mode (MOCK / LOCAL / CLOUD). Patientez ou annulez si besoin.
            </p>
          )}
        </div>

        {/* Skeleton pendant chargement (sans consultation encore) */}
        {loading && !consultation && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded w-full" />
                <div className="h-10 bg-gray-200 rounded w-full" />
                <div className="h-10 bg-gray-200 rounded w-5/6" />
              </div>
            </div>
          </div>
        )}

        {/* Interface Split View - Vérité */}
        {consultation && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-280px)]">
            {/* Colonne gauche : Transcription brute (Source) */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900">Source</h2>
                <p className="text-sm text-gray-500 mt-1">Transcription brute de la consultation</p>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <textarea
                  readOnly
                  value={formData.transcript || consultation?.transcript || originalText}
                  className="w-full h-full resize-none border-0 bg-transparent text-sm text-gray-700 leading-relaxed focus:outline-none font-mono"
                  style={{ minHeight: '100%' }}
                />
              </div>
            </div>

            {/* Colonne droite : Données structurées (Structure) */}
            <form
              onSubmit={handleSubmit(handleValidateDraft)}
              className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Structure</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Données structurées extraites
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                      {(formData.symptoms?.length || 0)} symptôme{(formData.symptoms?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                      {(formData.diagnosis?.length || 0)} diagnostic{(formData.diagnosis?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                      {(formData.medications?.length || 0)} médicament{(formData.medications?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    {isDirty && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 shadow-sm animate-pulse">
                        Modifications non sauvegardées
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Validation errors */}
                {validationErrors && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-2">Erreurs de validation :</p>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Symptômes - Badges */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-base font-semibold text-gray-900">
                      Symptômes
                    </label>
                    <button
                      onClick={handleAddSymptom}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <span className="text-lg">+</span> Ajouter
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(formData.symptoms || []).map((symptom, index) => (
                      <div
                        key={index}
                        className="group relative inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-sm text-blue-800 hover:bg-blue-100 transition-colors"
                      >
                        <input
                          type="text"
                          {...register(`symptoms.${index}` as const)}
                          onChange={(e) => handleUpdateSymptom(index, e.target.value)}
                          className="bg-transparent border-0 focus:outline-none focus:ring-0 text-blue-800 min-w-[120px] max-w-[200px]"
                          placeholder="Symptôme"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSymptom(index)}
                          className="text-blue-600 hover:text-red-600 transition-colors text-xs font-bold"
                          aria-label="Supprimer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Diagnostics - Cards avec barre de progression colorée */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-base font-semibold text-gray-900">
                      Diagnostics
                    </label>
                    <button
                      onClick={handleAddDiagnosis}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <span className="text-lg">+</span> Ajouter
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(formData.diagnosis || []).map((diag, index) => {
                      const confidencePercent = Math.round((diag?.confidence || 0) * 100);
                      const confidenceColor = confidencePercent >= 80 ? 'bg-green-500' : 'bg-orange-500';
                      return (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                        >
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Code CIM-10</label>
                              <input
                                type="text"
                                {...register(`diagnosis.${index}.code` as const)}
                                onChange={(e) => handleUpdateDiagnosis(index, 'code', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="J11.1"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Libellé</label>
                              <input
                                type="text"
                                {...register(`diagnosis.${index}.label` as const)}
                                onChange={(e) => handleUpdateDiagnosis(index, 'label', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Grippe saisonnière"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-xs text-gray-500 whitespace-nowrap">Confiance :</label>
                            <div className="flex-1 min-w-[100px]">
                              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${confidenceColor} transition-all duration-300`}
                                  style={{ width: `${confidencePercent}%` }}
                                  role="progressbar"
                                  aria-valuenow={confidencePercent}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                />
                              </div>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max="1"
                              step="0.01"
                              {...register(`diagnosis.${index}.confidence` as const, { valueAsNumber: true })}
                              onChange={(e) => handleUpdateDiagnosis(index, 'confidence', parseFloat(e.target.value))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center"
                            />
                            <span className="text-sm font-medium text-gray-700 min-w-[40px]">
                              {confidencePercent}%
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDiagnosis(index)}
                              className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors text-sm font-medium"
                              aria-label="Supprimer"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Médicaments - Tableau/Cards */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-base font-semibold text-gray-900">
                      Médicaments
                    </label>
                    <button
                      onClick={handleAddMedication}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <span className="text-lg">+</span> Ajouter
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(formData.medications || []).map((med, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                      >
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Nom</label>
                            <input
                              type="text"
                              value={med.name}
                              onChange={(e) => handleUpdateMedication(index, 'name', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="Doliprane"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Dosage</label>
                            <input
                              type="text"
                              value={med.dosage}
                              onChange={(e) => handleUpdateMedication(index, 'dosage', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="1000mg"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Durée</label>
                            <input
                              type="text"
                              value={med.duration}
                              onChange={(e) => handleUpdateMedication(index, 'duration', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder="7 jours"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => handleRemoveMedication(index)}
                            className="px-3 py-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors text-sm font-medium"
                            aria-label="Supprimer"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer avec boutons d'action */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowJsonView((v) => !v)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    {showJsonView ? 'Masquer JSON' : 'Vue JSON'}
                  </button>
                <button
                  type="button"
                  onClick={() => handleSaveDraft()}
                  disabled={saving || !isDirty || !draftId}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                  title={!draftId ? 'Aucun draft à sauvegarder' : !isDirty ? 'Aucune modification' : 'Sauvegarder les modifications'}
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sauvegarde…
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Sauvegarder
                    </>
                  )}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading || !draftId || !!validationErrors || isDirty}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                title={!draftId ? 'Aucun draft à valider' : isDirty ? 'Veuillez sauvegarder avant de valider' : validationErrors ? 'Corrigez les erreurs de validation' : 'Valider le draft'}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validation…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Valider
                  </>
                )}
              </button>
              </div>

              {/* Vue JSON (optionnelle) */}
              {showJsonView && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 max-h-64 overflow-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
