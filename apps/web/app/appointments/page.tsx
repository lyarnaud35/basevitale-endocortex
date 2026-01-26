'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '../hooks/useApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AppointmentsPage() {
  const [doctorId, setDoctorId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [viewMode, setViewMode] = useState<'doctor' | 'patient'>('doctor');

  const {
    data: appointments,
    isLoading,
    error,
    refetch,
  } = useApi<any[]>(
    viewMode === 'doctor' && doctorId
      ? `/appointments/doctors/${doctorId}`
      : viewMode === 'patient' && patientId
      ? `/appointments/patients/${patientId}?upcomingOnly=true`
      : '',
    {
      enabled:
        (viewMode === 'doctor' && !!doctorId) ||
        (viewMode === 'patient' && !!patientId),
    },
  );

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
          Agenda de Rendez-vous
        </h1>

        {/* Sélecteur de vue */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setViewMode('doctor')}
              className={`px-4 py-2 rounded-md ${
                viewMode === 'doctor'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Planning Médecin
            </button>
            <button
              onClick={() => setViewMode('patient')}
              className={`px-4 py-2 rounded-md ${
                viewMode === 'patient'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Rendez-vous Patient
            </button>
          </div>

          {viewMode === 'doctor' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Médecin
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ID Médecin"
                />
                <button
                  onClick={() => refetch()}
                  disabled={!doctorId || isLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Chargement...' : 'Charger Planning'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Patient
              </label>
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
                  {isLoading ? 'Chargement...' : 'Charger Rendez-vous'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Liste des rendez-vous */}
        {appointments && appointments.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              {viewMode === 'doctor' ? 'Planning' : 'Rendez-vous'} ({appointments.length})
            </h2>
            <div className="space-y-4">
              {appointments.map((apt: any) => (
                <div
                  key={apt.id}
                  className={`border-l-4 rounded-lg p-4 ${
                    apt.status === 'CONFIRMED'
                      ? 'border-green-500 bg-green-50'
                      : apt.status === 'CANCELLED'
                      ? 'border-red-500 bg-red-50'
                      : 'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {new Date(apt.startTime).toLocaleString('fr-FR')}
                      </h3>
                      {viewMode === 'doctor' && apt.patient && (
                        <p className="text-gray-700 mt-1">
                          Patient: {apt.patient.firstName} {apt.patient.lastName}
                        </p>
                      )}
                      {viewMode === 'patient' && (
                        <p className="text-gray-700 mt-1">
                          Médecin: {apt.doctorName || apt.doctorId}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        Type: {apt.appointmentType} • Durée: {apt.duration} min
                      </p>
                      {apt.location && (
                        <p className="text-sm text-gray-600">
                          Lieu: {apt.location}
                        </p>
                      )}
                      <p
                        className={`text-sm font-semibold mt-2 ${
                          apt.status === 'CONFIRMED'
                            ? 'text-green-700'
                            : apt.status === 'CANCELLED'
                            ? 'text-red-700'
                            : 'text-blue-700'
                        }`}
                      >
                        Statut: {apt.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {appointments && appointments.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <p className="text-gray-500">Aucun rendez-vous trouvé</p>
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
