'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * DicomViewer
 * 
 * Composant pour visualiser les images DICOM avec Cornerstone.js
 * 
 * Note: Cornerstone.js sera installé et configuré dans une prochaine étape
 * Pour l'instant, placeholder avec interface prête
 * 
 * Version BaseVitale V112
 */
interface DicomViewerProps {
  imageUrl?: string;
  studyId?: string;
  seriesId?: string;
  instanceId?: string;
}

export default function DicomViewer({
  imageUrl,
  studyId,
  seriesId,
  instanceId,
}: DicomViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Initialiser Cornerstone.js une fois installé
    // const element = canvasRef.current;
    // if (element && imageUrl) {
    //   cornerstone.enable(element);
    //   cornerstone.loadImage(imageUrl).then((image) => {
    //     cornerstone.displayImage(element, image);
    //   });
    // }
  }, [imageUrl]);

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Visionneuse DICOM</h3>
        <div className="flex gap-2">
          <button className="bg-gray-700 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
            Zoom +
          </button>
          <button className="bg-gray-700 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
            Zoom -
          </button>
          <button className="bg-gray-700 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900 text-red-200 p-4 rounded mb-4">
          {error}
        </div>
      )}

      <div className="relative bg-black rounded overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-auto max-h-[600px] cursor-move"
          style={{ display: loading ? 'none' : 'block' }}
        />
        {loading && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Chargement de l'image DICOM...
          </div>
        )}
        {!imageUrl && !loading && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Aucune image DICOM chargée
          </div>
        )}
      </div>

      {studyId && (
        <div className="mt-4 text-sm text-gray-400">
          <p>Study: {studyId}</p>
          {seriesId && <p>Series: {seriesId}</p>}
          {instanceId && <p>Instance: {instanceId}</p>}
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-900 rounded text-blue-200 text-sm">
        <p className="font-semibold mb-2">⚠️ Cornerstone.js à installer</p>
        <p>
          Ce composant est prêt pour l'intégration Cornerstone.js. Installez{' '}
          <code className="bg-blue-800 px-1 rounded">
            cornerstone-core, cornerstone-tools, cornerstone-wado-image-loader
          </code>{' '}
          pour activer la visualisation DICOM complète.
        </p>
      </div>
    </div>
  );
}
