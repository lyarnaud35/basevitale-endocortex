import React, { useState } from 'react';
import type { ScribeConfig } from '../config';
import {
  processDictation,
  validateDraftAlt,
  health,
  formatApiError,
} from '../api/scribe-client';

const DEMO_TEXT =
  'Le patient présente une toux sèche depuis 3 jours, pas de fièvre. Je prescris du sirop Toplexil.';
const DEMO_PATIENT_ID = 'patient_demo_phase3';

export interface ScribeTestViewProps {
  config: ScribeConfig;
  /** Callback après cristallisation réussie */
  onCrystallized?: () => void;
}

function apiBaseFromConfig(cfg: ScribeConfig): string {
  const u = cfg.apiBaseUrl.replace(/\/$/, '');
  return u.endsWith('/api') ? u : `${u}/api`;
}

/**
 * Vue Test (tracer bullet) : Dicter → Analyser → Cristalliser. Sans Next.js.
 */
export function ScribeTestView({ config, onCrystallized }: ScribeTestViewProps) {
  const [textBrut, setTextBrut] = useState(DEMO_TEXT);
  const [patientId, setPatientId] = useState(DEMO_PATIENT_ID);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    draft?: { id: string };
    draftId?: string;
    consultation?: {
      symptoms?: string[];
      medications?: Array<{ name?: string }>;
      diagnosis?: Array<{ code?: string; label?: string }>;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crystallizeLoading, setCrystallizeLoading] = useState(false);

  const apiBase = apiBaseFromConfig(config);

  const handleSimulateConsultation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const text = textBrut.trim();
    const pid = patientId.trim();
    if (!text || !pid) {
      setError('Le texte et le patientId sont requis.');
      setLoading(false);
      return;
    }
    try {
      const data = await processDictation(config, { text, patientId: pid });
      setResult(data as typeof result);
    } catch (err: unknown) {
      const e = err as Error & { message?: string };
      let msg: string;
      if (e.name === 'TypeError' && e.message?.includes('fetch')) {
        msg = `❌ Erreur de connexion : Impossible de se connecter à ${apiBase}\n\nVérifiez le backend (npx nx serve api), ${apiBase}/scribe/health, et NEXT_PUBLIC_API_URL.`;
      } else if (e.message?.includes('NetworkError') || e.message?.includes('Failed to fetch')) {
        msg = `❌ Erreur réseau : ${e.message}\n\nImpossible de joindre ${apiBase}`;
      } else {
        msg = formatApiError(err);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const draftId = result?.draft?.id ?? result?.draftId ?? (result?.consultation as { draftId?: string } | undefined)?.draftId;
  const canCrystallize = Boolean(result && draftId);
  const consultation = result?.consultation;
  const hasResultNoDraftId = Boolean(result && !draftId);

  const handleCrystallize = async () => {
    const id = result?.draft?.id ?? result?.draftId ?? (result?.consultation as { draftId?: string } | undefined)?.draftId;
    if (!id) return;
    setCrystallizeLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    try {
      await validateDraftAlt(config, id);
      clearTimeout(timeoutId);
      onCrystallized?.();
      if (typeof window !== 'undefined') {
        window.alert('Succès : Données gravées dans Neo4j. Vérifiez avec la requête Cypher ci‑dessous.');
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Délai dépassé (90 s). Vérifiez Neo4j et l’API.');
      } else {
        setError(err instanceof Error ? err.message : formatApiError(err));
      }
    } finally {
      setCrystallizeLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    try {
      const d = await health(config);
      if (typeof window !== 'undefined') {
        window.alert(`✅ Backend OK\n\n${JSON.stringify(d, null, 2)}`);
      }
    } catch (e: unknown) {
      if (typeof window !== 'undefined') {
        window.alert(`❌ Backend non accessible : ${(e as Error).message}`);
      }
    }
  };

  const cypherVerify = `MATCH (p:Patient {id: "${patientId}"})-[:HAS_CONSULTATION]->(c:Consultation)
OPTIONAL MATCH (c)-[:REVEALS]->(s:Symptom)
WITH p, c, collect(DISTINCT s.name) AS syms
OPTIONAL MATCH (c)-[:PRESCRIBES]->(m:Medication)
RETURN p.id AS patient, c.id AS consultation, syms AS symptoms, collect(DISTINCT m.name) AS medications;`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Test Scribe – Démonstration
          </h1>
          <p className="text-gray-600 mb-6">
            Dicte le texte (éditable), valide → l’IA structure la consultation →
            Symptômes / Médicaments → <strong>Cristalliser</strong> pour graver dans Neo4j.
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Texte à dicter</label>
            <textarea
              value={textBrut}
              onChange={(e) => setTextBrut(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800 font-mono"
              placeholder="Ex. Le patient présente une toux sèche depuis 3 jours..."
            />
            <div className="mt-2 flex items-center gap-4">
              <label className="text-sm text-gray-600">patientId :</label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="flex-1 max-w-xs rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div className="mb-6">
            <button
              type="button"
              onClick={handleSimulateConsultation}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Analyse IA en cours…' : 'DICTER / VALIDER'}
            </button>
          </div>

          {loading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" aria-hidden />
                <p className="text-blue-800">Analyse IA (CLOUD ~5–30 s, LOCAL jusqu’à 5 min)…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800 mb-2">Erreur</h3>
              <pre className="text-red-700 whitespace-pre-wrap text-sm">{error}</pre>
              {(error.includes('connexion') || error.includes('réseau')) && (
                <ul className="mt-2 text-xs text-red-600 list-disc list-inside space-y-1">
                  <li>Backend : <code className="bg-red-100 px-1 rounded">npx nx serve api</code></li>
                  <li>API : <code className="bg-red-100 px-1 rounded">{apiBase}/scribe/health</code></li>
                  <li>Variable : <code className="bg-red-100 px-1 rounded">NEXT_PUBLIC_API_URL</code></li>
                </ul>
              )}
            </div>
          )}

          {result && consultation && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-md">
              <h2 className="text-sm font-semibold text-emerald-900 mb-3">Résultat structuré</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Symptôme(s) :</span>{' '}
                  {Array.isArray(consultation.symptoms) && consultation.symptoms.length > 0
                    ? consultation.symptoms.join(', ')
                    : '—'}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Médicament(s) :</span>{' '}
                  {Array.isArray(consultation.medications) && consultation.medications.length > 0
                    ? consultation.medications.map((m) => m?.name ?? '').filter(Boolean).join(', ')
                    : '—'}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Diagnostic(s) :</span>{' '}
                  {Array.isArray(consultation.diagnosis) && consultation.diagnosis.length > 0
                    ? consultation.diagnosis
                        .map((d) => `${d?.code ?? ''} ${d?.label ?? ''}`.trim())
                        .filter(Boolean)
                        .join(' ; ')
                    : '—'}
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-700 mb-2">Réponse API (JSON)</h2>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto border border-gray-700 text-sm max-h-64">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mb-6">
            {hasResultNoDraftId && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                Analyse sans draftId — impossible de cristalliser. Utilisez DICTER / VALIDER.
              </div>
            )}
            <button
              type="button"
              onClick={handleCrystallize}
              disabled={!canCrystallize || crystallizeLoading}
              className="px-6 py-3 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium enabled:cursor-pointer"
            >
              {crystallizeLoading ? 'Gravure en cours…' : 'CRISTALLISER'}
            </button>
            {canCrystallize && (
              <p className="mt-2 text-xs text-gray-500">
                Draft <code className="bg-gray-100 px-1 rounded">{draftId}</code> · Grave dans Neo4j.
              </p>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Vérifier dans Neo4j</h3>
            <p className="text-sm text-gray-600 mb-2">Après cristallisation, exécutez dans Neo4j Browser :</p>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto text-xs font-mono">
              {cypherVerify}
            </pre>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Configuration</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• API : <code className="bg-gray-100 px-1 rounded">{apiBase}</code></li>
              <li>• <code className="bg-gray-100 px-1 rounded">POST /scribe/process-dictation</code></li>
            </ul>
            <button
              type="button"
              onClick={handleHealthCheck}
              className="mt-3 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              🔍 Tester la connexion backend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScribeTestView;
