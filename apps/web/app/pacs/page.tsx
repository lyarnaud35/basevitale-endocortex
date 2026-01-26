'use client';

import { useState } from 'react';
import Link from 'next/link';
import DicomViewer from '../../components/DicomViewer';

export default function PACSPage() {
  const [studyId, setStudyId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

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
          PACS - Visionneuse DICOM
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contrôles */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Recherche</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Study ID
                  </label>
                  <input
                    type="text"
                    value={studyId}
                    onChange={(e) => setStudyId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={() => {
                    // TODO: Charger l'image depuis MinIO
                    setImageUrl(`/api/pacs/studies/${studyId}/image`);
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Charger l'Image
                </button>
              </div>
            </div>
          </div>

          {/* Visionneuse */}
          <div className="lg:col-span-2">
            <DicomViewer imageUrl={imageUrl} studyId={studyId} />
          </div>
        </div>
      </div>
    </div>
  );
}
