'use client';

import { useState } from 'react';
import { formatApiError, API_BASE } from '../../../lib/api/client';

/**
 * Page de Test - Module Scribe
 * 
 * Page minimaliste pour valider le flux Scribe
 * Envoie une requête POST /scribe/analyze et affiche le résultat
 */
export default function ScribeTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulateConsultation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const textBrut = 'Patient tousse, fièvre 39, douleur gorge';

    try {
      const response = await fetch(`${API_BASE}/scribe/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          text: textBrut,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Erreur HTTP ${response.status}`,
        }));
        const err = new Error(
          errorData.message || errorData.error || 'Erreur lors de l\'analyse',
        ) as Error & { status?: number; data?: unknown };
        err.status = response.status;
        err.data = errorData;
        throw err;
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      // Gestion spécifique des erreurs de connexion réseau
      let errorMessage: string;
      
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = `❌ Erreur de connexion : Impossible de se connecter à ${API_BASE}\n\n` +
          `Vérifiez que :\n` +
          `• Le serveur backend est démarré (port 3000)\n` +
          `• L'URL de l'API est correcte : ${API_BASE}\n` +
          `• CORS est configuré sur le backend\n` +
          `• Aucun firewall ne bloque la connexion`;
      } else if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
        errorMessage = `❌ Erreur réseau : ${err.message}\n\n` +
          `Impossible de joindre le serveur à ${API_BASE}`;
      } else {
        errorMessage = formatApiError(err);
      }
      
      setError(errorMessage);
      console.error('❌ Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Test Scribe - Page Minimaliste
          </h1>
          <p className="text-gray-600 mb-6">
            Valide le flux POST /api/scribe/analyze avec un texte brut. Le JSON affiché est identique à la réponse du{' '}
            <code className="bg-gray-100 px-1 rounded">curl</code> (Front ↔ Back, CORS, réseau).
          </p>

          {/* Bouton de simulation */}
          <div className="mb-6">
            <button
              onClick={handleSimulateConsultation}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Analyse IA en cours...' : 'SIMULER CONSULTATION'}
            </button>
          </div>

          {/* Texte brut utilisé */}
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-2">
              Texte brut envoyé :
            </h2>
            <div className="bg-gray-100 p-3 rounded-md border border-gray-300">
              <p className="text-sm text-gray-800 font-mono">
                "Patient tousse, fièvre 39, douleur gorge"
              </p>
            </div>
          </div>

          {/* État de chargement */}
          {loading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" aria-hidden />
                <p className="text-blue-800">
                  Analyse IA en cours (peut prendre jusqu&apos;à 5 min en local, premier appel)…
                </p>
              </div>
            </div>
          )}

          {/* Affichage des erreurs */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800 mb-2">Erreur :</h3>
              <pre className="text-red-700 whitespace-pre-wrap text-sm">{error}</pre>
              {(error.includes('connexion') || error.includes('réseau')) && (
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-xs text-red-600 mb-2">💡 Solutions possibles :</p>
                  <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
                    <li>Vérifier que le backend est démarré : <code className="bg-red-100 px-1 rounded">npm run dev:api</code></li>
                    <li>Vérifier que l&apos;API est accessible : <code className="bg-red-100 px-1 rounded">{API_BASE}/scribe/health</code></li>
                    <li>Vérifier la variable d'environnement : <code className="bg-red-100 px-1 rounded">NEXT_PUBLIC_API_URL</code></li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Affichage du résultat JSON brut */}
          {result && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-700 mb-2">
                Résultat JSON brut :
              </h2>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-auto border border-gray-700 text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {/* Informations de debug */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Informations de configuration :</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• URL API : <code className="bg-gray-100 px-1 rounded">{API_BASE}</code></li>
              <li>• Endpoint : <code className="bg-gray-100 px-1 rounded">POST /scribe/analyze</code></li>
              <li>• Mode AI : Vérifie <code className="bg-gray-100 px-1 rounded">AI_MODE</code> via ConfigService</li>
              <li>• Mode MOCK : Génère réponse statique + Sauvegarde Postgres</li>
              <li>• Validation : ConsultationSchema (Zod)</li>
            </ul>
            
            {/* Bouton de test de connexion */}
            <div className="mt-4">
              <button
                onClick={async () => {
                  try {
                    const healthResponse = await fetch(`${API_BASE}/scribe/health`);
                    if (healthResponse.ok) {
                      const healthData = await healthResponse.json();
                      alert(`✅ Backend accessible !\n\n${JSON.stringify(healthData, null, 2)}`);
                    } else {
                      alert(`⚠️ Backend répond mais avec erreur : ${healthResponse.status}`);
                    }
                  } catch (err: any) {
                    alert(`❌ Backend non accessible :\n${err.message}\n\nVérifiez que le serveur est démarré sur ${API_BASE}`);
                  }
                }}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                🔍 Tester la connexion backend
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
