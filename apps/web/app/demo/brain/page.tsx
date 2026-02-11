'use client';

import { useState, useCallback } from 'react';
import { useDoctorBrain } from '../../hooks/useDoctorBrain';

export default function BrainLab() {
  const { brainState, brainMessage, brainDetails, loading, actions } = useDoctorBrain();
  const [inputDrug, setInputDrug] = useState('');
  const [clicked, setClicked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const drug = inputDrug.trim();
    if (!drug) return;
    setError(null);
    setClicked(true);
    try {
      await actions.prescribe(drug);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
    } finally {
      setClicked(false);
    }
  }, [inputDrug, actions]);

  const getStatusColor = () => {
    switch (brainState) {
      case 'SECURE':
        return 'bg-green-100 border-green-500 text-green-700';
      case 'BLOCKED':
        return 'bg-red-100 border-red-500 text-red-700';
      case 'ANALYZING':
        return 'bg-blue-100 border-blue-500 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-500';
    }
  };

  const isAnalyzing = loading || clicked;

  return (
    <div className="p-10 max-w-2xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-6">🧠 Laboratoire : Orchestrateur Contextuel</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-500 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Zone de Simulation */}
        <div className="p-6 border rounded-lg shadow-sm bg-white">
          <label className="block text-sm font-medium mb-2">Simuler une prescription</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputDrug}
              onChange={(e) => setInputDrug(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Ex: Doliprane, Pénicilline..."
              className="flex-1 p-2 border rounded"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isAnalyzing || !inputDrug.trim()}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? 'Analyse…' : 'Soumettre au Cerveau'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            L’API doit tourner (npm run clean-api). Si rien ne change : F12 → Console.
          </p>
        </div>

        {/* Retour du Cerveau (Feedback Loop) */}
        <div
          className={`p-4 border-l-4 rounded ${getStatusColor()} transition-all duration-300`}
        >
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">ÉTAT : {isAnalyzing ? '…' : brainState}</h3>
          </div>
          <p className="mt-2 text-lg">{brainMessage || (isAnalyzing ? 'Vérification…' : 'Prêt.')}</p>

          {/* Affichage des détails techniques (La Boîte de Verre) */}
          {brainDetails && (
            <div className="mt-4 p-3 bg-white/50 rounded text-xs font-mono">
              <strong>Données Brutes du Système Immunitaire :</strong>
              <pre className="mt-1 overflow-auto">
                {JSON.stringify(brainDetails, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
