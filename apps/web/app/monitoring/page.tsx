'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWebSocket } from '../hooks/useWebSocket';

export default function MonitoringPage() {
  const { isConnected, subscribeMonitoring, on } = useWebSocket();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [codeRouge, setCodeRouge] = useState<any | null>(null);
  const [patientId, setPatientId] = useState('');

  useEffect(() => {
    if (!isConnected) return;

    // S'abonner au monitoring global
    subscribeMonitoring();

    // Écouter les alertes
    const unsubscribeAlert = on('alert', (alert: any) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 50)); // Garder les 50 dernières
    });

    // Écouter les codes rouges
    const unsubscribeCodeRouge = on('code-rouge', (code: any) => {
      setCodeRouge(code);
      setAlerts((prev) => [
        { ...code, type: 'CRITICAL', timestamp: code.timestamp },
        ...prev,
      ].slice(0, 50));
    });

    // Écouter les mises à jour de données
    const unsubscribeUpdate = on('data-update', (update: any) => {
      console.log('Data update received:', update);
    });

    return () => {
      unsubscribeAlert();
      unsubscribeCodeRouge();
      unsubscribeUpdate();
    };
  }, [isConnected, subscribeMonitoring, on]);

  const handleSubscribePatient = () => {
    if (patientId && isConnected) {
      subscribeMonitoring(patientId);
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

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Monitoring Temps Réel
          </h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connecté' : 'Déconnecté'}
            </span>
          </div>
        </div>

        {/* Code Rouge */}
        {codeRouge && (
          <div className="bg-red-600 text-white rounded-lg shadow-lg p-6 mb-8 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">CODE ROUGE</h2>
                <p className="text-xl">{codeRouge.location}</p>
                <p className="text-lg mt-2">{codeRouge.reason}</p>
                <p className="text-sm mt-4 opacity-90">
                  {new Date(codeRouge.timestamp).toLocaleString('fr-FR')}
                </p>
              </div>
              <button
                onClick={() => setCodeRouge(null)}
                className="bg-white text-red-600 px-4 py-2 rounded-md font-semibold hover:bg-gray-100"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Subscription Patient */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Surveiller un Patient
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ID Patient"
            />
            <button
              onClick={handleSubscribePatient}
              disabled={!patientId || !isConnected}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Surveiller
            </button>
          </div>
        </div>

        {/* Alertes */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">
            Alertes ({alerts.length})
          </h2>

          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Aucune alerte pour le moment
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-md border-l-4 ${
                    alert.type === 'CRITICAL'
                      ? 'bg-red-50 border-red-500'
                      : alert.type === 'WARNING'
                      ? 'bg-yellow-50 border-yellow-500'
                      : 'bg-blue-50 border-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {alert.message}
                      </p>
                      {alert.patientId && (
                        <p className="text-sm text-gray-600 mt-1">
                          Patient: {alert.patientId}
                        </p>
                      )}
                      {alert.location && (
                        <p className="text-sm text-gray-600">
                          Location: {alert.location}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
