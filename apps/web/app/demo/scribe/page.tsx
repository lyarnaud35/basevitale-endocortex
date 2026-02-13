'use client';

import Link from 'next/link';
import { MedicalScribe } from '@basevitale/scribe-ui';

const BACKEND_URL =
  typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';
const TOKEN = process.env.NEXT_PUBLIC_SCRIBE_TOKEN ?? 'test-token';

/**
 * Démo Scribe – Donnée patient structurée (flux dictée → correction → validation).
 * Cohérent avec /demo/billing et /demo/drugs (preuves visuelles).
 */
export default function DemoScribePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/demo"
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          ← Démo
        </Link>
      </div>
      <h1 className="text-2xl font-semibold mb-1">Scribe (Patient / Graphe)</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Flux dictée → analyse → validation. Les données patient remontent du Backend (Mock/DB). Même composant que <code className="bg-zinc-800 px-1 rounded">/scribe</code>.
      </p>
      <main className="max-w-4xl">
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
          <MedicalScribe
            token={TOKEN}
            patientId="scenario-jean-peuplu"
            backendUrl={BACKEND_URL}
            theme="dark"
            onComplete={() => {}}
            onCancel={() => {}}
          />
        </div>
      </main>
    </div>
  );
}
