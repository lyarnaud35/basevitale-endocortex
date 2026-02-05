'use client';

import { useGhostScribe } from '../hooks/use-ghost-scribe';
import { ScribeStatus } from '../../components/scribe/ScribeStatus';
import { LiveTranscript } from '../../components/scribe/LiveTranscript';
import { ScribeControls } from '../../components/scribe/ScribeControls';

/**
 * Contenu de la démo Ghost Scribe — uniquement rendu côté client (pas de SSR).
 * Évite tout mismatch d'hydratation (machineState.updatedAt, etc.).
 */
export default function GhostScribeDemoClient() {
  const {
    state,
    context,
    send,
    isConnected,
    lastError,
    machineState,
  } = useGhostScribe({
    sessionId: 'default',
    baseUrl: '',
    reconnect: true,
    reconnectDelayMs: 3000,
    debug: true,
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <h1 className="text-xl font-semibold mb-2">Ghost Scribe — Neuro-Link</h1>
      <p className="text-zinc-400 text-sm mb-6">
        UI State-Driven : état synchronisé via SSE, contrôles pilotés par la machine.
      </p>

      <section className="mb-6">
        <ScribeStatus isConnected={isConnected} machineState={state} />
        {lastError && (
          <p className="text-amber-400 text-sm mt-2" role="alert">
            {lastError}
          </p>
        )}
      </section>

      <section className="mb-6 p-4 rounded-lg bg-zinc-900 border border-zinc-800">
        <div className="text-sm text-zinc-500 mb-2">Contexte</div>
        <div className="text-sm font-mono text-zinc-300">
          patientId: {context.patientId || '—'} · status: {context.status}
        </div>
      </section>

      <section className="mb-6">
        <LiveTranscript
          text={context.transcript}
          isRecording={state === 'RECORDING'}
        />
      </section>

      <section className="mb-6">
        <ScribeControls
          state={state}
          send={send}
          transcriptForStop={context.transcript}
          patientId={context.patientId || 'patient-123'}
        />
      </section>

      <section className="mb-6">
        <div className="text-sm text-zinc-500 mb-2">Charge cognitive (context)</div>
        <pre
          className="p-4 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 overflow-auto max-h-64"
          data-testid="debug-payload"
        >
          {JSON.stringify(context, null, 2)}
        </pre>
      </section>

      <section className="mb-6">
        <div className="text-sm text-zinc-500 mb-2">Machine State (value + updatedAt)</div>
        <pre className="p-4 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 overflow-auto max-h-48">
          {JSON.stringify(machineState, null, 2)}
        </pre>
      </section>
    </div>
  );
}
