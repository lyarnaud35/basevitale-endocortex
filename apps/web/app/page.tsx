'use client';

import Link from 'next/link';
import { MedicalScribe } from '@basevitale/scribe-ui';

/**
 * Sandbox BaseVitale – Full Stack Run (Étape 1).
 * Props codées en dur pour le test : organes Backend (Docker + NestJS) + Frontend communiquent.
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">BaseVitale Sandbox – Full Stack Run</h1>
          <nav className="flex gap-4">
            <Link href="/cabinet-demo" className="text-sm text-blue-600 hover:underline">
              Cabinet POC
            </Link>
            <Link href="/scribe/test" className="text-sm text-blue-600 hover:underline">
              Scribe Test
            </Link>
            <Link href="/scribe" className="text-sm text-blue-600 hover:underline">
              Scribe
            </Link>
          </nav>
        </div>
      </div>
      <main className="container mx-auto px-4 py-6">
        <MedicalScribe
          token={process.env.NEXT_PUBLIC_SCRIBE_TOKEN ?? 'test-token'}
          patientId="test-patient-123"
          backendUrl={typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:3000/api'}
          onComplete={(data) =>
            console.log('SUCCESS - DONNÉES REÇUES POUR BEN:', data)
          }
        />
      </main>
    </div>
  );
}
