import { useState } from 'react';
import {
  useAttendanceRecords,
  useAttendanceStatistics,
  useDeleteAttendanceRecord,
} from '../hooks/useAttendance';
import type {
  AttendanceRecord,
  AttendanceFilters,
  AttendanceStatus,
} from '@/types/attendance.types';

export default function AttendancePage() {
  const [filters, setFilters] = useState<AttendanceFilters>({});
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const { data: recordsData, isLoading, error } = useAttendanceRecords(filters);
  const { data: statsData } = useAttendanceStatistics();
  const deleteMutation = useDeleteAttendanceRecord();

  const records = recordsData || [];
  const stats = statsData || { totalRecords: 0, present: 0, absent: 0, late: 0 };
  const selected = records.find((r: AttendanceRecord) => r.id === selectedRecordId);

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'Aanwezig';
      case 'late': return 'Te laat';
      case 'absent': return 'Afwezig';
      case 'half-day': return 'Halve dag';
      case 'on-leave': return 'Met verlof';
      default: return status;
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'half-day': return 'bg-blue-100 text-blue-800';
      case 'on-leave': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-600">Laden...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800">
        Fout bij laden van aanwezigheidsgegevens: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Aanwezigheid</h1>
          <p className="text-sm text-gray-600">Aanwezigheidsregistratie en statistieken.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            onClick={() => {
              // TODO: Open manual registration modal
              alert('Handmatige registratie - implementatie pending');
            }}
          >
            Handmatige registratie
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Totaal records</div>
          <div className="text-2xl font-semibold text-gray-900">{stats.totalRecords}</div>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Aanwezig</div>
          <div className="text-2xl font-semibold text-green-600">{stats.present}</div>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Afwezig</div>
          <div className="text-2xl font-semibold text-red-600">{stats.absent}</div>
        </div>
        <div className="rounded border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">Te laat</div>
          <div className="text-2xl font-semibold text-yellow-600">{stats.late}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <input
            type="text"
            placeholder="Zoek op werknemer"
            className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <input
            type="date"
            className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            value={filters.startDate || ''}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <input
            type="date"
            className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            value={filters.endDate || ''}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
          <select
            className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as AttendanceStatus })}
          >
            <option value="">Alle statussen</option>
            <option value="present">Aanwezig</option>
            <option value="late">Te laat</option>
            <option value="absent">Afwezig</option>
            <option value="half-day">Halve dag</option>
            <option value="on-leave">Met verlof</option>
          </select>
          <button
            className="rounded bg-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-300"
            onClick={() => setFilters({})}
          >
            Filters wissen
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden rounded border border-gray-200 bg-white">
          {records.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              Geen aanwezigheidsrecords gevonden.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Werknemer</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Datum</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">In</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Uit</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Uren</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {records.map((record: AttendanceRecord) => (
                  <tr
                    key={record.id}
                    className={`cursor-pointer hover:bg-gray-50 ${selectedRecordId === record.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedRecordId(record.id)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">{record.employeeName || 'Unknown'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.clockInTime || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.clockOutTime || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.totalHoursWorked.toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Details Panel */}
        <div className="rounded border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900">Details</h3>
          {selected ? (
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <div className="font-semibold">{selected.employeeName}</div>
              <div>Datum: {selected.date}</div>
              <div>Tijd: {selected.clockInTime || '-'} - {selected.clockOutTime || '-'}</div>
              <div>Uren: {selected.totalHoursWorked.toFixed(1)}</div>
              <div>Status: {getStatusLabel(selected.status)}</div>
              {selected.notes && (
                <div className="border-t pt-2 mt-2">
                  <div className="font-medium">Notities:</div>
                  <div className="text-gray-600">{selected.notes}</div>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t mt-2">
                <button
                  className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  onClick={() => {
                    // TODO: Open edit modal
                    alert('Corrigeer in/uit - implementatie pending');
                  }}
                >
                  Corrigeer in/uit
                </button>
                <button
                  className="rounded bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  onClick={() => {
                    if (confirm('Weet je zeker dat je dit record wilt verwijderen?')) {
                      deleteMutation.mutate(selected.id);
                      setSelectedRecordId(null);
                    }
                  }}
                >
                  Verwijderen
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-600">Selecteer een record om details te zien.</p>
          )}
        </div>
      </div>
    </div>
  );
}

