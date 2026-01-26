'use client';

import { useState } from 'react';
import Link from 'next/link';
import KnowledgeGraphVisualizer from '../../components/KnowledgeGraphVisualizer';
import { useApi } from '../hooks/useApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function KnowledgeGraphPage() {
  const [consultationId, setConsultationId] = useState('');

  const {
    data: graphData,
    isLoading,
    error,
    refetch,
  } = useApi<{ nodes: any[]; relations: any[] }>(
    consultationId ? `/knowledge-graph/consultations/${consultationId}/graph` : '',
    {
      enabled: !!consultationId,
    },
  );

  const handleLoadGraph = () => {
    if (consultationId) {
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          ← Retour à l'accueil
        </Link>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Knowledge Graph - Visualisation
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Charger un Graphe de Connaissances
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Consultation *
              </label>
              <input
                type="text"
                value={consultationId}
                onChange={(e) => setConsultationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="consultation123"
              />
            </div>

            <button
              onClick={handleLoadGraph}
              disabled={!consultationId || isLoading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Chargement...' : 'Charger le Graphe'}
            </button>
          </div>
        </div>

        {/* Visualisation */}
        {graphData?.nodes && graphData.nodes.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Visualisation du Graphe ({graphData.nodes.length} nœuds, {graphData.relations?.length || 0} relations)
            </h2>
            <KnowledgeGraphVisualizer
              nodes={graphData.nodes.map((node: any) => ({
                id: node.id,
                label: node.label,
                nodeType: node.nodeType,
                confidence: node.confidence,
              }))}
              relations={graphData.relations?.map((rel: any) => ({
                sourceNodeId: rel.sourceNodeId,
                targetNodeId: rel.targetNodeId,
                relationType: rel.relationType,
              })) || []}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800">Erreur: {String(error)}</p>
          </div>
        )}

        {/* Informations */}
        {graphData && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Détails du Graphe</h2>
            <details className="mb-4">
              <summary className="cursor-pointer text-lg font-medium text-gray-700 mb-2">
                Voir les données brutes
              </summary>
              <pre className="bg-gray-50 rounded-md p-4 overflow-auto text-sm mt-2">
                {JSON.stringify(graphData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
