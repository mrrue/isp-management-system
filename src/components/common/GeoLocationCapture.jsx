import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function GeoLocationCapture({ onLocation, onPermissionDenied }) {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      if (onPermissionDenied) onPermissionDenied(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const locData = {
          lat: parseFloat(latitude.toFixed(6)),
          lng: parseFloat(longitude.toFixed(6)),
          accuracy: Math.round(accuracy)
        };
        setCoords(locData);
        setLoading(false);
        if (onLocation) onLocation(locData);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setError('Location permission denied or unavailable.');
        setLoading(false);
        if (onPermissionDenied) onPermissionDenied(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="w-full max-w-xs text-xs">
      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 animate-pulse">
          <MapPin className="w-4 h-4 text-sky-500 animate-bounce" />
          <span>Acquiring GPS location...</span>
        </div>
      ) : coords ? (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold">GPS Location Locked</p>
              <p className="text-[10px] text-emerald-700">{coords.lat}, {coords.lng} (±{coords.accuracy}m)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchLocation}
            className="text-[11px] font-semibold text-emerald-700 hover:underline"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Location Unavailable</p>
            <p className="text-[10px] text-amber-700">Will record without GPS coordinates.</p>
          </div>
          <button
            type="button"
            onClick={fetchLocation}
            className="text-[11px] font-semibold text-amber-800 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
