import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarCheck,
  Camera,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  LogOut,
  LogIn
} from 'lucide-react';
import CameraCapture from '../../components/common/CameraCapture';
import GeoLocationCapture from '../../components/common/GeoLocationCapture';
import Badge from '../../components/common/Badge';

export default function ClockInOut() {
  const { user } = useAuth();
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Clock in/out form data
  const [selfie, setSelfie] = useState(null);
  const [location, setLocation] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [notes, setNotes] = useState('');

  const fetchMyStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/my-status');
      setStatusData(res);
    } catch (e) {
      console.error('Failed to load attendance status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyStatus();
  }, []);

  const handleClockIn = async () => {
    setActionLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await api.post('/attendance/clock-in', {
        selfie,
        lat: location?.lat || null,
        lng: location?.lng || null,
        permission_denied: permissionDenied,
        notes: notes.trim() || null
      });
      setMsg(res.message);
      setSelfie(null);
      setNotes('');
      fetchMyStatus();
    } catch (err) {
      setError(err.message || 'Clock in failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await api.post('/attendance/clock-out', {
        selfie,
        lat: location?.lat || null,
        lng: location?.lng || null,
        permission_denied: permissionDenied,
        notes: notes.trim() || null
      });
      setMsg(res.message);
      setSelfie(null);
      setNotes('');
      fetchMyStatus();
    } catch (err) {
      setError(err.message || 'Clock out failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Checking attendance status...</div>;
  }

  const isClockedIn = statusData?.is_clocked_in;
  const isClockedOut = statusData?.is_clocked_out;
  const record = statusData?.record;

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-center">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-2">
          <CalendarCheck className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Staff Attendance</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        {/* Current User Status Banner */}
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">{user?.full_name}</span>
          {isClockedOut ? (
            <Badge variant="default">Completed Today</Badge>
          ) : isClockedIn ? (
            <Badge variant="success">Currently Clocked In ({record?.clock_in_time})</Badge>
          ) : (
            <Badge variant="warning">Not Clocked In</Badge>
          )}
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Clock Action Card */}
      {!isClockedOut ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 flex flex-col items-center">
          {/* Step 1: Selfie Camera */}
          <div className="w-full flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-sky-600" /> 1. Verification Selfie
            </span>
            <CameraCapture
              onCapture={(data) => setSelfie(data)}
              onPermissionDenied={() => setPermissionDenied(true)}
            />
          </div>

          {/* Step 2: GPS Location */}
          <div className="w-full flex flex-col items-center pt-3 border-t border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" /> 2. Location Confirmation
            </span>
            <GeoLocationCapture
              onLocation={(loc) => setLocation(loc)}
              onPermissionDenied={() => setPermissionDenied(true)}
            />
          </div>

          {/* Optional Notes */}
          <div className="w-full">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes (e.g. Field visit PECHS)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Clock In / Out Buttons */}
          <div className="w-full pt-2">
            {!isClockedIn ? (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={actionLoading}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50"
              >
                <LogIn className="w-5 h-5" />
                <span>CONFIRM CLOCK IN</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClockOut}
                disabled={actionLoading}
                className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-98 disabled:opacity-50"
              >
                <LogOut className="w-5 h-5" />
                <span>CONFIRM CLOCK OUT</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Shift Completed for Today</h3>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
            <p>Clocked In: <span className="font-bold">{record?.clock_in_time}</span></p>
            <p>Clocked Out: <span className="font-bold">{record?.clock_out_time}</span></p>
            <p className="font-semibold text-emerald-700">Total Hours Worked: {record?.hours_worked} hrs</p>
          </div>
        </div>
      )}
    </div>
  );
}
