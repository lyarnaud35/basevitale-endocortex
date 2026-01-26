'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '../hooks/useApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function DPIPage() {
  const [patientId, setPatientId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: dpiData,
    isLoading,
    error,
    refetch,
  } = useApi<any>(
    patientId ? `/dpi/patients/${patientId}` : '',
    {
      enabled: !!patientId,
    },
  );

  const {
    data: searchResults,
    refetch: searchRefetch,
  } = useApi<any>(
    patientId && searchQuery ? `/dpi/patients/${patientId}/search?q=${encodeURIComponent(searchQuery)}` : '',
    {
      enabled: !!patientId && !!searchQuery,
    },
  );

  const handleSearch = () => {
    if (patientId && searchQuery) {
      searchRefetch();
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
          DPI - Dossier Patient Informatisé
        </h1>

        {/* Recherche Patient */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Accéder au DPI</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ID Patient"
            />
            <button
              onClick={() => refetch()}
              disabled={!patientId || isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Chargement...' : 'Charger DPI'}
            </button>
          </div>
        </div>

        {/* Recherche dans le DPI */}
        {dpiData && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Recherche dans le DPI</h2>
            <div className="flex gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Rechercher dans les documents..."
              />
              <button
                onClick={handleSearch}
                className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700"
              >
                Rechercher
              </button>
            </div>
          </div>
        )}

        {/* Résultats de recherche */}
        {searchResults && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Résultats de recherche ({searchResults.totalResults || 0})
            </h2>
            <div className="space-y-4">
              {searchResults.documents?.map((doc: any) => (
                <div key={doc.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-semibold">{doc.title}</h3>
                  <p className="text-sm text-gray-600">
                    Type: {doc.documentType} • {new Date(doc.documentDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Résumé DPI */}
        {dpiData?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Documents</h3>
              <p className="text-3xl font-bold text-blue-600">
                {dpiData.summary.totalDocuments}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Comptes Rendus</h3>
              <p className="text-3xl font-bold text-green-600">
                {dpiData.summary.totalReports}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Résultats Labo</h3>
              <p className="text-3xl font-bold text-purple-600">
                {dpiData.summary.totalLabResults}
              </p>
            </div>
          </div>
        )}

        {/* Documents */}
        {dpiData?.dpi?.documents && dpiData.dpi.documents.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Documents Médicaux</h2>
            <div className="space-y-4">
              {dpiData.dpi.documents.map((doc: any) => (
                <div key={doc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{doc.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Type: {doc.documentType} •{' '}
                        {new Date(doc.documentDate).toLocaleDateString('fr-FR')}
                      </p>
                      {doc.rawContent && (
                        <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                          {doc.rawContent}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">Erreur: {String(error)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
