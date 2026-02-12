'use client';

import type { CodingStrategistWsState } from '@basevitale/shared';

export type CodingAssistantWidgetProps = {
  machineState?: CodingStrategistWsState | null;
  isLoading?: boolean;
};

/**
 * Widget "Marionnette" – N'affiche rien si le backend dit shouldDisplay === false (Silence Attentionnel).
 * Le parent doit fournir machineState et isLoading (via useCodingAssistant).
 */
export function CodingAssistantWidget({ machineState, isLoading }: CodingAssistantWidgetProps) {

  if (isLoading) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm text-blue-700">
        Connexion au Cortex...
      </div>
    );
  }

  if (!machineState?.shouldDisplay) {
    return null;
  }

  const suggestions = machineState.context?.suggestions ?? [];
  const bestConfidence =
    suggestions.length > 0
      ? Math.max(...suggestions.map((s) => s.confidence ?? 0), 0)
      : 0;

  return (
    <div className="animate-in rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-lg">
      <h3 className="font-bold text-blue-800">
        Suggestion ({Math.round(bestConfidence * 100)}%)
      </h3>
      {machineState.value === 'SUGGESTING' && suggestions.length > 0 && (
        <ul className="mt-2 space-y-1">
          {suggestions.map((item) => (
            <li
              key={item.code}
              className="inline-block rounded bg-blue-200 px-2 py-0.5 text-sm font-medium text-blue-900"
            >
              {item.code} – {item.label}
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="mt-2 text-sm text-blue-600 underline hover:no-underline"
      >
        Valider ce codage
      </button>
    </div>
  );
}
