import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, AlertCircle } from 'lucide-react';

export default function CameraCapture({ onCapture, onPermissionDenied }) {
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      setStream(mediaStream);
      setHasPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setHasPermission(false);
      setError('Camera access denied or not available.');
      if (onPermissionDenied) onPermissionDenied(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const takeSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL('image/jpeg', 0.85);
    setPhoto(base64Data);
    if (onCapture) onCapture(base64Data);
  };

  const retakeSelfie = () => {
    setPhoto(null);
    if (onCapture) onCapture(null);
  };

  return (
    <div className="flex flex-col items-center w-full">
      <canvas ref={canvasRef} className="hidden" />

      {photo ? (
        <div className="relative w-full max-w-xs rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md">
          <img src={photo} alt="Captured Selfie" className="w-full h-56 object-cover" />
          <div className="absolute top-2 right-2 bg-emerald-600 text-white p-1 rounded-full shadow-sm">
            <Check className="w-4 h-4" />
          </div>
          <button
            type="button"
            onClick={retakeSelfie}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold rounded-full flex items-center gap-1 backdrop-blur-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retake Photo
          </button>
        </div>
      ) : hasPermission ? (
        <div className="relative w-full max-w-xs rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-inner flex flex-col items-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-56 object-cover transform -scale-x-100"
          />
          <button
            type="button"
            onClick={takeSelfie}
            className="my-3 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-full flex items-center gap-2 shadow-md hover:scale-105 transition-all"
          >
            <Camera className="w-4 h-4" /> Capture Selfie
          </button>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2 max-w-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Camera Unavailable / Denied</p>
            <p className="mt-0.5 text-amber-700">Attendance will be marked with camera permission recorded as unavailable.</p>
          </div>
        </div>
      )}
    </div>
  );
}
