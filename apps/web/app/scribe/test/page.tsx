'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MedicalScribe, type ConsultationAnalysis } from '@basevitale/scribe-ui';

const DEFAULT_PATIENT = 'patient_demo_phase3';
const BACKEND_URL = typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';
const TOKEN = process.env.NEXT_PUBLIC_SCRIBE_TOKEN ?? 'test-token';

function ScribeTestContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId')?.trim() || DEFAULT_PATIENT;

  const handleComplete = (data: ConsultationAnalysis) => {
    if (typeof window !== 'undefined') {
      window.alert(`Consultation validée\n\nDraft: ${data.draftId}\n\nVoir /cabinet-demo pour la Fiche Résultat.`);
    }
  };

  const handleCancel = () => {
    if (typeof window !== 'undefined') window.history.back();
  };

  return (
    <MedicalScribe
      token={TOKEN}
      patientId={patientId}
      backendUrl={BACKEND_URL}
      theme="light"
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}

/**
 * Testbed : <MedicalScribe /> Golden Master.
 * ?patientId=patient_alert_demo → panneau Intelligence avec alertes.
 */
export default function ScribeTestPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Chargement…</div>}>
      <ScribeTestContent />
    </Suspense>
  );
}
