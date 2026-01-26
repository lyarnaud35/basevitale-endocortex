'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '../../lib/api/client';

export default function FeedbackPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    entityType: 'CODING',
    entityId: '',
    correction: '',
    originalValue: '',
    correctedValue: '',
  });

  const handleSubmitFeedback = async () => {
    if (!formData.entityId || !formData.correction) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: any = {
        entityType: formData.entityType,
        entityId: formData.entityId,
        correction: formData.correction,
      };

      if (formData.entityType === 'CODING') {
        payload.codingFeedback = {
          originalCode: formData.originalValue,
          correctedCode: formData.correctedValue,
        };
      }

      const response = await fetch(`${API_BASE}/feedback/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la soumission');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
          Module L - Feedback
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Soumettre un Feedback
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type d'Entité *
              </label>
              <select
                value={formData.entityType}
                onChange={(e) =>
                  setFormData({ ...formData, entityType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="CODING">Codage</option>
                <option value="TRANSCRIPTION">Transcription</option>
                <option value="DIAGNOSIS">Diagnostic</option>
                <option value="PRESCRIPTION">Prescription</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID de l'Entité *
              </label>
              <input
                type="text"
                value={formData.entityId}
                onChange={(e) =>
                  setFormData({ ...formData, entityId: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="entity123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correction *
              </label>
              <textarea
                value={formData.correction}
                onChange={(e) =>
                  setFormData({ ...formData, correction: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="Description de la correction..."
              />
            </div>

            {formData.entityType === 'CODING' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code Original
                  </label>
                  <input
                    type="text"
                    value={formData.originalValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        originalValue: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="J11.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code Corrigé
                  </label>
                  <input
                    type="text"
                    value={formData.correctedValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        correctedValue: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="J11.2"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleSubmitFeedback}
              disabled={loading}
              className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Soumission...' : 'Soumettre le Feedback'}
            </button>
          </div>
        </div>

        {/* Résultats */}
        {(result || error) && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Résultats</h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <p className="text-green-800 font-semibold">
                    Feedback soumis avec succès !
                  </p>
                  {result.data?.id && (
                    <p className="text-sm text-green-700 mt-2">
                      ID: {result.data.id}
                    </p>
                  )}
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Voir la réponse complète (JSON)
                  </summary>
                  <pre className="mt-2 bg-gray-50 rounded-md p-4 overflow-auto text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
