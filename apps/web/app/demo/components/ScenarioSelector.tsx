'use client';

import { SCENARIO_OPTIONS } from '../scenarios';

export interface ScenarioSelectorProps {
  value: string | undefined;
  onChange: (patientId: string | undefined) => void;
  label?: string;
  className?: string;
}

/**
 * Sélecteur de scénario patient pour le Showroom (Touch & Feel).
 * Stocke l’ID patient (ex. scenario-jean-peuplu) pour que DrugSearch, PrescriptionGuard, etc. l’utilisent.
 */
export function ScenarioSelector({ value, onChange, label = 'Patient (scénario)', className = '' }: ScenarioSelectorProps) {
  return (
    <div className={className}>
      <label htmlFor="scenario-select" className="block text-sm font-medium text-zinc-300 mb-1">
        {label}
      </label>
      <select
        id="scenario-select"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? undefined : v);
        }}
        className="w-full max-w-sm border border-zinc-600 rounded-lg px-3 py-2 bg-zinc-900 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/50"
        aria-describedby="scenario-description"
      >
        {SCENARIO_OPTIONS.map((opt) => (
          <option key={opt.id || 'none'} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {value && (
        <p id="scenario-description" className="mt-1 text-xs text-zinc-500">
          {SCENARIO_OPTIONS.find((o) => o.id === value)?.description}
        </p>
      )}
    </div>
  );
}
