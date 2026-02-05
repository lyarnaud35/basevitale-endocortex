'use client';

import type { ScribeState } from '@basevitale/shared';
import type { ScribeEventType } from '../../app/hooks/use-ghost-scribe';

type ScribeEventPayloadMap = {
  START: { patientId: string };
  STOP: { transcript: string };
  UPDATE_TEXT: { text: string };
  RESET: Record<string, never>;
  CONFIRM: { structuredData?: Record<string, unknown> };
};

export interface ScribeControlsProps {
  state: ScribeState;
  send: <T extends ScribeEventType>(
    type: T,
    payload?: ScribeEventPayloadMap[T]
  ) => Promise<void>;
  /** Transcript actuel pour le payload STOP (obligatoire en RECORDING) */
  transcriptForStop?: string;
  /** PatientId pour le payload START (obligatoire en IDLE) */
  patientId?: string;
}

/**
 * Contrôles pilotés par l'état de la machine.
 * Un seul bouton (ou groupe) par état logique ; aucun bouton disabled.
 * Composant dumb : rendu conditionnel strict sur state.
 */
export function ScribeControls({
  state,
  send,
  transcriptForStop = '',
  patientId = 'default',
}: ScribeControlsProps) {
  switch (state) {
    case 'INITIALIZING':
      return (
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm">
          <span
            className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"
            aria-hidden
          />
          Chargement du profil…
        </div>
      );

    case 'IDLE':
      return (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => send('START', { patientId })}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Démarrer l'écoute
          </button>
        </div>
      );

    case 'RECORDING':
      return (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              send('STOP', {
                transcript: transcriptForStop.trim() || '(vide)',
              })
            }
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Arrêter
          </button>
        </div>
      );

    case 'PROCESSING':
      return (
        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm">
          <span
            className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"
            aria-hidden
          />
          Analyse en cours…
        </div>
      );

    case 'REVIEW':
      return (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => send('CONFIRM')}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Valider
          </button>
          <button
            type="button"
            onClick={() => send('RESET')}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
          >
            Rejeter / Reset
          </button>
        </div>
      );

    case 'SAVED':
      return (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => send('RESET')}
            className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
          >
            Nouvelle consultation
          </button>
        </div>
      );

    default:
      return null;
  }
}
