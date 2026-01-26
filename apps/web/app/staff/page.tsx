'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApi } from '../hooks/useApi';

export default function StaffPage() {
  const [staffMemberId, setStaffMemberId] = useState('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
  );

  const {
    data: schedule,
    isLoading,
    error,
    refetch,
  } = useApi<any>(
    staffMemberId
      ? `/staff/members/${staffMemberId}/schedule?startDate=${startDate}&endDate=${endDate}`
      : '',
    {
      enabled: !!staffMemberId,
    },
  );

  const {
    data: staffMembers,
    refetch: refetchStaff,
  } = useApi<any[]>('/staff/members', {
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
          ERP RH - Gestion des Équipes
        </h1>

        {/* Sélection membre */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Planning du Personnel</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Membre du personnel
              </label>
              <select
                value={staffMemberId}
                onChange={(e) => setStaffMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner...</option>
                {staffMembers?.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.firstName} {member.lastName} ({member.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => refetch()}
                disabled={!staffMemberId || isLoading}
                className="w-full bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Chargement...' : 'Charger Planning'}
              </button>
            </div>
          </div>
        </div>

        {/* Résumé */}
        {schedule?.summary && (
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Shifts</h3>
              <p className="text-3xl font-bold text-blue-600">
                {schedule.summary.totalShifts}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Congés</h3>
              <p className="text-3xl font-bold text-orange-600">
                {schedule.summary.totalLeaves}
              </p>
            </div>
          </div>
        )}

        {/* Shifts */}
        {schedule?.shifts && schedule.shifts.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Shifts Programmés</h2>
            <div className="space-y-4">
              {schedule.shifts.map((shift: any) => (
                <div
                  key={shift.id}
                  className="border-l-4 border-blue-500 pl-4 py-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {new Date(shift.startTime).toLocaleString('fr-FR')} -{' '}
                        {new Date(shift.endTime).toLocaleTimeString('fr-FR')}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Type: {shift.shiftType} • Lieu: {shift.location || 'N/A'}
                      </p>
                      <p
                        className={`text-sm font-semibold mt-2 ${
                          shift.status === 'CONFIRMED'
                            ? 'text-green-700'
                            : 'text-blue-700'
                        }`}
                      >
                        Statut: {shift.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Congés */}
        {schedule?.leaves && schedule.leaves.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Congés</h2>
            <div className="space-y-4">
              {schedule.leaves.map((leave: any) => (
                <div
                  key={leave.id}
                  className="border-l-4 border-orange-500 pl-4 py-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {new Date(leave.startDate).toLocaleDateString('fr-FR')} -{' '}
                        {new Date(leave.endDate).toLocaleDateString('fr-FR')}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Type: {leave.leaveType} • Raison: {leave.reason || 'N/A'}
                      </p>
                      <p
                        className={`text-sm font-semibold mt-2 ${
                          leave.status === 'APPROVED'
                            ? 'text-green-700'
                            : leave.status === 'REJECTED'
                            ? 'text-red-700'
                            : 'text-orange-700'
                        }`}
                      >
                        Statut: {leave.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
