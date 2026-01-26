'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { formatApiError, API_BASE } from '../../../lib/api/client';
import { ConsultationSchema, Consultation } from '@basevitale/shared';
import { useDebouncedCallback } from '../../../lib/hooks/useDebounce';

/**
 * Page Scribe [id] - Édition d'un Draft
 * 
 * Layout Split-View 50/50:
 * - Gauche: Texte transcrit (read-only)
 * - Droite: Formulaire éditable (Symptômes, Diagnostics, Médicaments)
 * 
 * Utilise React Hook Form avec ConsultationSchema pour la validation.
 */
export default function ScribeEditPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<string>('DRAFT');
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Formulaire avec react-hook-form
  const {
    register,
    handleSubmit,
    watch,
    getValues,
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

  const formData = watch();

  // Charger le draft au montage
  useEffect(() => {
    if (!draftId) return;

    const loadDraft = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE}/scribe/draft/${draftId}`, {
          headers: {
            Authorization: 'Bearer test-token',
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: 'Erreur HTTP ' + response.status,
          }));
          throw new Error(errorData.message || errorData.error || 'Erreur lors du chargement');
        }

        const json = await response.json();
        const payload = json?.data ?? json;
        const draft = payload.draft;
        const consultation = payload.consultation as Consultation | null;

        if (!consultation) {
          throw new Error('Consultation introuvable dans le draft');
        }

        // Initialiser le formulaire avec les données du draft
        reset(consultation);
        setDraftStatus(draft?.status || 'DRAFT');
        setSuccessMessage('✅ Draft chargé avec succès');
        setHasLoaded(true);
      } catch (err: unknown) {
        setError(formatApiError(err));
      } finally {
        setLoading(false);
      }
    };

    loadDraft();
  }, [draftId, reset]);

  // Auto-hide messages (optimisé avec cleanup)
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 10000); // Plus long pour les erreurs critiques
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Handlers pour les symptômes
  const handleAddSymptom = useCallback(() => {
    const currentSymptoms = watch('symptoms') || [];
    setValue('symptoms', [...currentSymptoms, ''], { shouldDirty: true });
  }, [watch, setValue]);

  const handleRemoveSymptom = useCallback(
    (index: number) => {
      const currentSymptoms = watch('symptoms') || [];
      setValue('symptoms', currentSymptoms.filter((_, i) => i !== index), { shouldDirty: true });
    },
    [watch, setValue],
  );

  const handleUpdateSymptom = useCallback(
    (index: number, value: string) => {
      const currentSymptoms = watch('symptoms') || [];
      const newSymptoms = [...currentSymptoms];
      newSymptoms[index] = value;
      setValue('symptoms', newSymptoms, { shouldDirty: true });
    },
    [watch, setValue],
  );

  // Handlers pour les diagnostics
  const handleAddDiagnosis = useCallback(() => {
    const currentDiagnosis = formData.diagnosis || [];
    setValue('diagnosis', [...currentDiagnosis, { code: '', label: '', confidence: 0.5 }], {
      shouldDirty: true,
    });
  }, [formData.diagnosis, setValue]);

  const handleRemoveDiagnosis = useCallback(
    (index: number) => {
      const currentDiagnosis = formData.diagnosis || [];
      setValue('diagnosis', currentDiagnosis.filter((_, i) => i !== index), { shouldDirty: true });
    },
    [formData.diagnosis, setValue],
  );

  const handleUpdateDiagnosis = useCallback(
    (index: number, field: string, value: string | number) => {
      const currentDiagnosis = formData.diagnosis || [];
      const newDiagnosis = [...currentDiagnosis];
      newDiagnosis[index] = { ...newDiagnosis[index], [field]: value };
      setValue('diagnosis', newDiagnosis, { shouldDirty: true });
    },
    [formData.diagnosis, setValue],
  );

  // Handlers pour les médicaments
  const handleAddMedication = useCallback(() => {
    const currentMedications = formData.medications || [];
    setValue('medications', [...currentMedications, { name: '', dosage: '', duration: '' }], {
      shouldDirty: true,
    });
  }, [formData.medications, setValue]);

  const handleRemoveMedication = useCallback(
    (index: number) => {
      const currentMedications = formData.medications || [];
      setValue('medications', currentMedications.filter((_, i) => i !== index), {
        shouldDirty: true,
      });
    },
    [formData.medications, setValue],
  );

  const handleUpdateMedication = useCallback(
    (index: number, field: string, value: string) => {
      const currentMedications = formData.medications || [];
      const newMedications = [...currentMedications];
      newMedications[index] = { ...newMedications[index], [field]: value };
      setValue('medications', newMedications, { shouldDirty: true });
    },
    [formData.medications, setValue],
  );

  const validationErrors = useMemo(() => {
    if (Object.keys(errors).length === 0) return null;
    const errorMessages: string[] = [];
    if (errors.symptoms) errorMessages.push('Au moins un symptôme est requis');
    if (errors.diagnosis) errorMessages.push('Au moins un diagnostic est requis');
    if (errors.patientId) errorMessages.push("L'identifiant du patient est requis");
    if (errors.transcript) errorMessages.push('Le transcript est requis');
    return errorMessages.length > 0 ? errorMessages : null;
  }, [errors]);

  // Sauvegarder les modifications
  const handleSave = useCallback(async () => {
    if (!draftId || !isDirty) return;

    setSaving(true);
    setSaveStatus('saving');
    setError(null);

    try {
      // Obtenir les valeurs actuelles du formulaire (plus fiable que watch())
      const currentValues = getValues();
      
      // Filtrer les symptômes vides (chaînes vides)
      const validSymptoms = (currentValues.symptoms || []).filter((s: string) => s && s.trim().length > 0);
      
      // Filtrer les diagnostics vides (code ou label manquant)
      const validDiagnosis = (currentValues.diagnosis || []).filter(
        (d: any) => d && (d.code?.trim() || d.label?.trim())
      );
      
      // Filtrer les médicaments vides (nom manquant)
      const validMedications = (currentValues.medications || []).filter(
        (m: any) => m && m.name?.trim()
      );

      // Vérifier que toutes les données requises sont présentes
      if (!currentValues.patientId || !currentValues.transcript) {
        throw new Error('Données incomplètes : patientId et transcript sont requis');
      }
      if (validSymptoms.length === 0) {
        throw new Error('Au moins un symptôme est requis');
      }
      if (validDiagnosis.length === 0) {
        throw new Error('Au moins un diagnostic est requis');
      }

      // Construire le payload complet avec les données filtrées
      const payload = {
        structuredData: {
          patientId: currentValues.patientId,
          transcript: currentValues.transcript,
          symptoms: validSymptoms,
          diagnosis: validDiagnosis,
          medications: validMedications,
        },
      };

      // Debug : log du payload avant envoi
      console.log('🔍 [handleSave] Payload sent:', JSON.stringify(payload, null, 2));
      console.log('🔍 [handleSave] Symptoms count:', validSymptoms.length);
      console.log('🔍 [handleSave] Diagnosis count:', validDiagnosis.length);
      console.log('🔍 [handleSave] Medications count:', validMedications.length);

      const response = await fetch(`${API_BASE}/scribe/draft/${draftId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Erreur HTTP ' + response.status,
        }));
        
        // Afficher les erreurs de validation Zod de manière plus claire
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const zodErrors = errorData.errors.map((e: any) => `${e.path?.join('.') || 'unknown'}: ${e.message || e}`).join(', ');
          throw new Error(`Erreurs de validation : ${zodErrors}`);
        }
        
        throw new Error(errorData.message || errorData.error || 'Erreur lors de la sauvegarde');
      }

      const result = await response.json();
      const savedConsultation = result.consultation || result.data?.consultation || currentValues;
      reset(savedConsultation, { keepDirty: false });
      setSuccessMessage('✅ Modifications sauvegardées avec succès');
      setSaveStatus('saved');
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => {
        savedTimeoutRef.current = null;
        setSaveStatus('idle');
      }, 2500);
      console.log('✅ [handleSave] Sauvegarde réussie:', savedConsultation);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : formatApiError(err);
      setError(errorMessage);
      setSaveStatus('idle');
      console.error('❌ [handleSave] Erreur lors de la sauvegarde:', errorMessage);
      setSaving(false);
      return;
    } finally {
      setSaving(false);
    }
  }, [draftId, getValues, isDirty, reset]);

  const debouncedSave = useDebouncedCallback(handleSave, 1000);

  useEffect(() => {
    if (
      !hasLoaded ||
      !isDirty ||
      !draftId ||
      draftStatus === 'VALIDATED' ||
      saving ||
      !!validationErrors
    )
      return;
    debouncedSave();
  }, [
    formData,
    isDirty,
    draftId,
    hasLoaded,
    draftStatus,
    saving,
    !!validationErrors,
    debouncedSave,
  ]);

  useEffect(
    () => () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    },
    [],
  );

  // Valider le draft
  const handleValidate = useCallback(async (data: Consultation) => {
    if (!draftId) return;

    setValidating(true);
    setError(null);

    try {
      // 1. Sauvegarder d'abord les dernières modifications si nécessaire
      if (isDirty) {
        try {
          await handleSave();
        } catch (saveError) {
          // Si la sauvegarde échoue, arrêter la validation
          setError('Échec de la sauvegarde. Veuillez réessayer.');
          setValidating(false);
          return;
        }
      }

      // 2. Valider le draft
      console.log(`🔍 [handleValidate] Appel de validation pour draft ${draftId}`);
      const response = await fetch(`${API_BASE}/scribe/draft/${draftId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });
      
      console.log(`🔍 [handleValidate] Réponse status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: 'Erreur HTTP ' + response.status,
        }));
        throw new Error(errorData.message || errorData.error || 'Erreur lors de la validation');
      }

      const result = await response.json();
      const payload = result?.data ?? result;
      setDraftStatus('VALIDATED');
      setSuccessMessage(
        `✅ Dossier validé avec succès ! ${payload.nodesCreated ?? 0} nœuds créés, ${payload.neo4jRelationsCreated ?? 0} relations Neo4j`,
      );
      
      // Rediriger vers la liste après 2 secondes
      setTimeout(() => {
        router.push('/scribe');
      }, 2000);
    } catch (err: unknown) {
      setError(formatApiError(err));
    } finally {
      setValidating(false);
    }
  }, [draftId, isDirty, handleSave, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du draft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Édition du Draft - {draftId}
              </h1>
              <p className="text-gray-600">
                Interface de correction pour le médecin
                {draftStatus === 'VALIDATED' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    ✓ Validé
                  </span>
                )}
              </p>
            </div>
            <Link
              href="/scribe"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              ← Retour à la liste
            </Link>
          </div>
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

        {/* Layout Split-View 50/50 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Colonne gauche : Texte transcrit (Read-only) */}
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">Transcription</h2>
              <p className="text-sm text-gray-500 mt-1">Texte brut de la consultation (lecture seule)</p>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <textarea
                readOnly
                value={formData.transcript || ''}
                className="w-full h-full resize-none border-0 bg-transparent text-sm text-gray-700 leading-relaxed focus:outline-none font-mono"
                style={{ minHeight: '100%' }}
              />
            </div>
          </div>

          {/* Colonne droite : Formulaire éditable */}
          <form
            onSubmit={handleSubmit(handleValidate)}
            className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Données structurées</h2>
                  <p className="text-sm text-gray-500 mt-1">Correction et validation</p>
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

              {/* Patient ID (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient ID
                </label>
                <input
                  type="text"
                  {...register('patientId')}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                />
              </div>

              {/* Symptômes - Badges */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-base font-semibold text-gray-900">Symptômes</label>
                  <button
                    type="button"
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

              {/* Diagnostics - Cards avec barre de progression */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-base font-semibold text-gray-900">Diagnostics</label>
                  <button
                    type="button"
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
                            onChange={(e) =>
                              handleUpdateDiagnosis(index, 'confidence', parseFloat(e.target.value))
                            }
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

              {/* Médicaments - Cards */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-base font-semibold text-gray-900">Médicaments</label>
                  <button
                    type="button"
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
                            {...register(`medications.${index}.name` as const)}
                            onChange={(e) => handleUpdateMedication(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Doliprane"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Dosage</label>
                          <input
                            type="text"
                            {...register(`medications.${index}.dosage` as const)}
                            onChange={(e) => handleUpdateMedication(index, 'dosage', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="1000mg"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Durée</label>
                          <input
                            type="text"
                            {...register(`medications.${index}.duration` as const)}
                            onChange={(e) => handleUpdateMedication(index, 'duration', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="7 jours"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
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
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !isDirty || draftStatus === 'VALIDATED'}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                  title={!isDirty ? 'Aucune modification' : 'Sauvegarder les modifications'}
                >
                  {saving ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Sauvegarde…
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Sauvegarder
                    </>
                  )}
                </button>
                {saveStatus === 'saving' && (
                  <span className="text-sm text-gray-500">Enregistrement…</span>
                )}
                {saveStatus === 'saved' && (
                  <span className="text-sm font-medium text-green-700">Modifications enregistrées</span>
                )}
              </div>
              <button
                type="submit"
                disabled={validating || !draftId || !!validationErrors || draftStatus === 'VALIDATED'}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                title={
                  !draftId
                    ? 'Aucun draft à valider'
                    : validationErrors
                      ? 'Corrigez les erreurs de validation'
                      : draftStatus === 'VALIDATED'
                        ? 'Déjà validé'
                        : isDirty
                          ? 'Les modifications seront sauvegardées automatiquement avant validation'
                          : 'Valider le draft'
                }
              >
                {validating ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Validation…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Valider
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
