'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '../hooks/useApi';

export default function InventoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const {
    data: stockItems,
    isLoading,
    error,
    refetch,
  } = useApi<any[]>(
    `/inventory/items${selectedCategory ? `?category=${selectedCategory}` : ''}`,
    {
      enabled: true,
    },
  );

  const {
    data: alerts,
    refetch: refetchAlerts,
  } = useApi<any[]>('/inventory/alerts', {
    enabled: true,
  });

  const criticalAlerts = alerts?.filter((a: any) => a.severity === 'CRITICAL') || [];
  const highAlerts = alerts?.filter((a: any) => a.severity === 'HIGH') || [];

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
          Gestion des Stocks
        </h1>

        {/* Alertes critiques */}
        {criticalAlerts.length > 0 && (
          <div className="bg-red-600 text-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">
              ⚠️ Alertes Critiques ({criticalAlerts.length})
            </h2>
            <div className="space-y-2">
              {criticalAlerts.slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="bg-red-700 rounded p-3">
                  <p className="font-semibold">{alert.message}</p>
                  <p className="text-sm opacity-90">
                    {alert.stockItem?.name} • Stock: {alert.stockItem?.currentQuantity}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alertes */}
        {alerts && alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              Alertes de Stock ({alerts.length})
            </h2>
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  className={`border-l-4 p-4 rounded ${
                    alert.severity === 'CRITICAL'
                      ? 'border-red-500 bg-red-50'
                      : alert.severity === 'HIGH'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-yellow-500 bg-yellow-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{alert.message}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {alert.stockItem?.name} (SKU: {alert.stockItem?.sku})
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-red-200 text-red-800'
                          : alert.severity === 'HIGH'
                          ? 'bg-orange-200 text-orange-800'
                          : 'bg-yellow-200 text-yellow-800'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Stock Disponible</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Toutes les catégories</option>
              <option value="MEDICATION">Médicaments</option>
              <option value="MEDICAL_SUPPLY">Fournitures médicales</option>
              <option value="EQUIPMENT">Équipement</option>
              <option value="CONSUMABLE">Consommables</option>
            </select>
          </div>
        </div>

        {/* Liste des stocks */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : stockItems && stockItems.length > 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stockItems.map((item: any) => (
                <div
                  key={item.id}
                  className={`border-2 rounded-lg p-4 ${
                    item.currentQuantity <= item.minQuantity
                      ? 'border-red-500 bg-red-50'
                      : item.currentQuantity <= item.minQuantity * 1.5
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-green-500 bg-green-50'
                  }`}
                >
                  <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">SKU: {item.sku}</p>
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Stock actuel:</span>
                      <span
                        className={`font-bold text-lg ${
                          item.currentQuantity <= item.minQuantity
                            ? 'text-red-600'
                            : item.currentQuantity <= item.minQuantity * 1.5
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {item.currentQuantity} {item.unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-600">
                      <span>Seuil minimum:</span>
                      <span>{item.minQuantity} {item.unit}</span>
                    </div>
                    {item.maxQuantity && (
                      <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                        <span>Stock maximum:</span>
                        <span>{item.maxQuantity} {item.unit}</span>
                      </div>
                    )}
                  </div>
                  {item.alerts && item.alerts.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-red-600 font-semibold">
                        ⚠️ {item.alerts[0].message}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-500">Aucun article en stock</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
            <p className="text-red-800">Erreur: {String(error)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
