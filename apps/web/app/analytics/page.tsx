'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '../hooks/useApi';

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  const {
    data: metrics,
    isLoading,
    error,
    refetch,
  } = useApi<any>('/metrics', {
    enabled: true,
  });

  const {
    data: health,
  } = useApi<any>('/health', {
    enabled: true,
  });

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
          Dashboard Analytics
        </h1>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex gap-4">
            {(['today', 'week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-md ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range === 'today' ? "Aujourd'hui" :
                 range === 'week' ? '7 jours' :
                 range === 'month' ? '30 jours' :
                 'Année'}
              </button>
            ))}
          </div>
        </div>

        {/* Health Status */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className={`rounded-lg shadow-lg p-6 ${
              health.database?.status === 'healthy' ? 'bg-green-50 border-2 border-green-500' :
              health.database?.status === 'degraded' ? 'bg-yellow-50 border-2 border-yellow-500' :
              'bg-red-50 border-2 border-red-500'
            }`}>
              <h3 className="text-lg font-semibold mb-2">Base de Données</h3>
              <p className={`text-2xl font-bold ${
                health.database?.status === 'healthy' ? 'text-green-600' :
                health.database?.status === 'degraded' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {health.database?.status?.toUpperCase() || 'UNKNOWN'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Latence: {health.database?.latency || 'N/A'}ms
              </p>
            </div>

            <div className={`rounded-lg shadow-lg p-6 ${
              health.redis?.status === 'healthy' ? 'bg-green-50 border-2 border-green-500' :
              health.redis?.status === 'degraded' ? 'bg-yellow-50 border-2 border-yellow-500' :
              'bg-red-50 border-2 border-red-500'
            }`}>
              <h3 className="text-lg font-semibold mb-2">Cache Redis</h3>
              <p className={`text-2xl font-bold ${
                health.redis?.status === 'healthy' ? 'text-green-600' :
                health.redis?.status === 'degraded' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {health.redis?.status?.toUpperCase() || 'UNKNOWN'}
              </p>
            </div>

            <div className={`rounded-lg shadow-lg p-6 ${
              health.api?.status === 'healthy' ? 'bg-green-50 border-2 border-green-500' :
              'bg-red-50 border-2 border-red-500'
            }`}>
              <h3 className="text-lg font-semibold mb-2">API</h3>
              <p className={`text-2xl font-bold ${
                health.api?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {health.api?.status?.toUpperCase() || 'UNKNOWN'}
              </p>
            </div>
          </div>
        )}

        {/* Métriques */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Requêtes Total</h3>
              <p className="text-3xl font-bold text-blue-600">
                {metrics.counters?.['api.requests.total'] || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Patients Créés</h3>
              <p className="text-3xl font-bold text-green-600">
                {metrics.counters?.['identity.patients.created'] || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Extractions IA</h3>
              <p className="text-3xl font-bold text-purple-600">
                {(metrics.counters?.['scribe.extractions.mock'] || 0) +
                 (metrics.counters?.['scribe.extractions.cloud'] || 0) +
                 (metrics.counters?.['scribe.extractions.local'] || 0)}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Rendez-vous</h3>
              <p className="text-3xl font-bold text-orange-600">
                {metrics.counters?.['appointments.created'] || 0}
              </p>
            </div>
          </div>
        )}

        {/* Graphiques (placeholder) */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Évolution des Métriques</h2>
          <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
            <p className="text-gray-500">
              Graphiques d'évolution à implémenter (Chart.js / Recharts)
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
            <p className="text-red-800">Erreur: {String(error)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
