import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarCheck,
  UserCheck,
  Clock,
  MapPin,
  Camera,
  AlertCircle,
  CheckCircle,
  Phone
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import CallButton from '../../components/common/CallButton';

export default function AttendanceDashboard() {
  const [data, setData] = useState({ stats: {}, records: [] });
  const [loading, setLoading] = useState(true);

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/today');
      setData(res);
    } catch (e) {
      console.error('Failed to load today attendance:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const { stats, records } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" /> Today's Staff Attendance Live Board
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <button
          onClick={fetchTodayAttendance}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          Refresh Board
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Staff</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats?.total_employees || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Currently Clocked In</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats?.clocked_in || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Late Arrivals</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats?.late || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Not Clocked In</span>
          <p className="text-2xl font-black text-rose-600 mt-1">{stats?.not_clocked_in || 0}</p>
        </div>
      </div>

      {/* Live Staff Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Today's Employee Status Roster</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Employee</th>
                <th className="py-2.5 px-4">Designation</th>
                <th className="py-2.5 px-4">Clock In Time</th>
                <th className="py-2.5 px-4">Clock Out Time</th>
                <th className="py-2.5 px-4">Hours</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Selfie / GPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">Loading roster...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">No active employees found.</td>
                </tr>
              ) : (
                records.map(r => (
                  <tr key={r.employee_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{r.employee_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-500 text-[11px]">{r.phone}</span>
                        <CallButton phone={r.phone} size="xs" label="" />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{r.designation || 'Staff'}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {r.clock_in_time || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {r.clock_out_time || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {r.hours_worked > 0 ? `${r.hours_worked} hrs` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge size="sm">{r.status}</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.clock_in_selfie && (
                          <a
                            href={r.clock_in_selfie}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs"
                            title="View Clock In Selfie"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {r.clock_in_lat && (
                          <a
                            href={`https://maps.google.com/?q=${r.clock_in_lat},${r.clock_in_lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs"
                            title="View GPS on Map"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
