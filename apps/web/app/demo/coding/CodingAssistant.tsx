'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useCodingMachine } from '../hooks/useCodingMachine';
import type { CodingStrategistWsState } from '@basevitale/shared';

const DEBOUNCE_MS = 500;

export interface CodingAssistantProps {
  /** Texte courant (ex. sortie Scribe) ; déclenche l’analyse après debounce. */
  currentText?: string;
}

/** Rendu strictement piloté par state.value (Server-Driven UI). */
function IdleView() {
  return <span className="text-zinc-500 text-sm">Prêt.</span>;
}

function AnalyzingView() {
  return (
    <div className="flex items-center gap-2 text-zinc-400 text-sm">
      <span className="inline-block w-4 h-4 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
      <span>Analyse IA…</span>
    </div>
  );
}

function SilentView() {
  return (
    <span
      className="text-zinc-600 text-xs inline-flex items-center gap-1"
      title="IA en veille — Confiance faible"
    >
      <span className="opacity-60" aria-hidden>👁‍🗨</span>
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const isHigh = pct > 80;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full transition-all ${isHigh ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs tabular-nums shrink-0 ${isHigh ? 'text-emerald-400' : 'text-amber-400'}`}>
        {pct}%
      </span>
    </div>
  );
}

function SuggestingView({ context }: { context: CodingStrategistWsState['context'] }) {
  const suggestions = context?.suggestions ?? [];
  if (suggestions.length === 0) return null;
  return (
    <ul className="space-y-2">
      {suggestions.map((s, i) => (
        <li
          key={`${s.code}-${i}`}
          className="flex flex-col gap-1.5 p-3 rounded-lg bg-zinc-800/80 border border-zinc-700"
        >
          <span className="font-mono text-emerald-300 text-sm font-medium">{s.code}</span>
          <span className="text-zinc-300 text-sm">{s.label}</span>
          <ConfidenceBar confidence={s.confidence} />
        </li>
      ))}
    </ul>
  );
}

export function CodingAssistant({ currentText = '' }: CodingAssistantProps) {
  const { state, analyzeText, error } = useCodingMachine();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runAnalyze = useCallback(
    (text: string) => {
      const t = text?.trim();
      if (t) analyzeText(t);
    },
    [analyzeText]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!currentText?.trim()) {
      debounceRef.current = null;
      return;
    }
    debounceRef.current = setTimeout(() => {
      runAnalyze(currentText);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [currentText, runAnalyze]);

  const value = state?.value ?? 'IDLE';
  const context = state?.context;

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-amber-400 text-sm" role="alert">
          {error}
        </p>
      )}
      {/* Rendu strict selon l’état envoyé par le serveur — pas de logique métier côté client. */}
      {value === 'IDLE' && <IdleView />}
      {value === 'ANALYZING' && <AnalyzingView />}
      {value === 'SILENT' && <SilentView />}
      {value === 'SUGGESTING' && context && <SuggestingView context={context} />}
    </div>
  );
}
