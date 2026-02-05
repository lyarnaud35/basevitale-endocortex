'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MedicalScribe, type ConsultationAnalysis } from '@basevitale/scribe-ui';

const PATIENT_ID = 'patient_test_123';
const BACKEND_URL = typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';
const TOKEN = process.env.NEXT_PUBLIC_SCRIBE_TOKEN ?? 'test-token';

/**
 * Testbed : <MedicalScribe /> (flux dictée → correction → validation).
 * Contrat strict : token, patientId, backendUrl, theme?.
 */
export default function ScribePage() {
  const router = useRouter();

  const handleComplete = (_data: ConsultationAnalysis) => {
    router.push('/');
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Scribe</h1>
          <Link href="/scribe/test" className="text-sm text-blue-600 hover:underline">
            → Test (Tracer Bullet)
          </Link>
        </div>
      </div>
      <main className="container mx-auto px-4 py-6">
        <MedicalScribe
          token={TOKEN}
          patientId={PATIENT_ID}
          backendUrl={BACKEND_URL}
          theme="light"
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </main>
    </div>
  );
}
