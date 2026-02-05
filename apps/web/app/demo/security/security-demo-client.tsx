'use client';

import { useState, useEffect, useCallback } from 'react';

type SecurityMachineState = {
  value: string;
  context?: {
    currentDrug: string | null;
    riskLevel: string;
    blockReason: string | null;
    auditTrail?: string | null;
  };
  updatedAt: string;
};

const defaultContext = {
  currentDrug: null as string | null,
  riskLevel: 'NONE',
  blockReason: null as string | null,
  auditTrail: null as string | null,
};

function normalizeState(data: unknown): SecurityMachineState {
  if (data && typeof data === 'object' && 'value' in data) {
    const d = data as Record<string, unknown>;
    return {
      value: String(d.value ?? 'IDLE'),
      context: (d.context && typeof d.context === 'object'
        ? { ...defaultContext, ...(d.context as object) }
        : defaultContext) as SecurityMachineState['context'],
      updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
    };
  }
  return {
    value: 'IDLE',
    context: defaultContext as SecurityMachineState['context'],
    updatedAt: new Date().toISOString(),
  };
}

const getApiBase = () => (typeof window !== 'undefined' ? '' : '');

const MIN_JUSTIFICATION_LENGTH = 10;

export default function SecurityDemoClient() {
  const [drug, setDrug] = useState('');
  const [justification, setJustification] = useState('');
  const [state, setState] = useState<SecurityMachineState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${getApiBase()}/api/ghost-security/state`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data != null) setState(normalizeState(data));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur réseau');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const url = `${getApiBase() || ''}/api/ghost-security/stream`;
    const es = new EventSource(url);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setState(normalizeState(data));
      } catch (_) {}
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  const handleCheck = async () => {
    if (!drug.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/ghost-security/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CHECK_DRUG',
          payload: { drug: drug.trim() },
        }),
      });
      const data = await res.json();
      if (res.ok) setState(normalizeState(data));
      else setError(data?.message || `HTTP ${res.status}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setJustification('');
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/ghost-security/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'RESET', payload: {} }),
      });
      const data = await res.json();
      if (res.ok) setState(normalizeState(data));
    } finally {
      setLoading(false);
    }
  };

  const handleForcePrescription = async () => {
    const j = justification.trim();
    if (j.length < MIN_JUSTIFICATION_LENGTH) {
      setError(`La justification doit contenir au moins ${MIN_JUSTIFICATION_LENGTH} caractères.`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/api/ghost-security/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'REQUEST_OVERRIDE',
          payload: { justification: j },
        }),
      });
      const data = await res.json();
      if (res.ok) setState(normalizeState(data));
      else {
        const errMsg = (data?.errors && Array.isArray(data.errors) && data.errors[0]?.message)
          ? data.errors[0].message
          : data?.message || `HTTP ${res.status}`;
        setError(errMsg);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  const context = state?.context;
  const isLocked = state?.value === 'LOCKED';
  const isOverrideApproved = state?.value === 'OVERRIDE_APPROVED';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <h1 className="text-xl font-semibold mb-2">Le Gardien Silencieux — Security Machine</h1>
      <p className="text-zinc-400 text-sm mb-6">
        SEMAINE 2 : Test harness. Saisis un médicament et clique sur Vérifier. Patient Zéro est
        allergique à l&apos;amoxicilline → LOCKED.
      </p>

      <section className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-zinc-500">Nom du médicament</span>
          <input
            type="text"
            value={drug}
            onChange={(e) => setDrug(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            placeholder="ex. Amoxicilline"
            className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 w-64"
          />
        </label>
        <button
          type="button"
          onClick={handleCheck}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Vérification…' : 'Vérifier'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-300 text-sm hover:bg-zinc-800"
        >
          Reset
        </button>
      </section>

      {error && (
        <p className="mb-4 text-amber-400 text-sm" role="alert">
          {error}
        </p>
      )}

      {isLocked && (
        <section className="mb-6 p-4 rounded-lg border border-amber-800/50 bg-amber-950/20">
          <div className="text-sm text-amber-200 mb-2">Dérogation (Outpass) — Preuve de conscience</div>
          <label className="flex flex-col gap-1 mb-3">
            <span className="text-xs text-zinc-500">Justification médicale (min. 10 caractères)</span>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="ex. Urgence vitale, bénéfice &gt; risque"
              rows={3}
              className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 w-full max-w-md"
            />
          </label>
          <button
            type="button"
            onClick={handleForcePrescription}
            disabled={loading || justification.trim().length < MIN_JUSTIFICATION_LENGTH}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            FORCER LA PRESCRIPTION
          </button>
        </section>
      )}

      {isOverrideApproved && (
        <p className="mb-4 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-200 text-sm">
          Prescription forcée avec succès (Audit enregistré).
        </p>
      )}

      {state && (
        <>
          <div className="mb-2 text-sm text-zinc-500">
            État : <span className="font-mono text-emerald-400">{state.value}</span>
            {context?.blockReason && (
              <span className="ml-2 text-amber-400">— {context.blockReason}</span>
            )}
          </div>
          <pre className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 overflow-auto max-h-80">
            {JSON.stringify(state, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
