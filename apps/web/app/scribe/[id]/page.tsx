'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

/**
 * Édition draft – Non implémentée dans le Golden Master.
 * Utiliser /cabinet-demo pour le flux complet (dictée → correction → validation).
 */
export default function ScribeEditPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params?.id as string;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Édition draft</h1>
          <button
            type="button"
            onClick={() => router.push('/scribe')}
            className="text-sm text-gray-700 hover:underline"
          >
            ← Retour
          </button>
        </div>
      </div>
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-2">Mode édition (hors Golden Master)</h2>
          <p className="text-sm text-amber-800 mb-4">
            Le widget <strong>MedicalScribe</strong> Golden Master gère le flux dictée → correction → validation.
            L’édition d’un draft existant (<code className="bg-amber-100 px-1 rounded">{draftId}</code>) n’est pas
            encore exposée.
          </p>
          <p className="text-sm text-amber-700 mb-4">
            Utilisez <Link href="/cabinet-demo" className="text-amber-900 font-medium underline">Cabinet POC</Link> pour
            le flux complet.
          </p>
          <button
            type="button"
            onClick={() => router.push('/scribe')}
            className="px-4 py-2 text-sm font-medium text-amber-900 bg-white border border-amber-300 rounded-md hover:bg-amber-100"
          >
            → Scribe (dictée)
          </button>
        </div>
      </main>
    </div>
  );
}
