'use client';

export interface ScribeStatusProps {
  isConnected: boolean;
  machineState: string;
}

/**
 * Indicateur de statut (connexion + état machine).
 * Composant dumb : affichage uniquement.
 */
export function ScribeStatus({ isConnected, machineState }: ScribeStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: isConnected ? '#22c55e' : '#ef4444' }}
        title={isConnected ? 'SSE connecté' : 'SSE déconnecté'}
        aria-hidden
      />
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        {machineState}
      </span>
    </div>
  );
}
