import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, User } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export default function WebRTCCallModal() {
  const { activeCall, setActiveCall, sendWebSocketMessage, socket } = useNotifications();
  const { user } = useAuth();

  const [callState, setCallState] = useState('idle'); // 'ringing', 'connecting', 'connected', 'ended'
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnRef = useRef(null);
  const timerRef = useRef(null);

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (!activeCall) {
      cleanupCall();
      return;
    }

    if (activeCall.isIncoming) {
      setCallState('ringing');
    } else {
      startOutgoingCall();
    }
  }, [activeCall]);

  // Handle incoming signaling messages from websocket
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'call_answer' && peerConnRef.current) {
          await peerConnRef.current.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          setCallState('connected');
          startTimer();
        }

        if (msg.type === 'call_offer' && activeCall?.isIncoming) {
          // Handled on accept
        }

        if (msg.type === 'ice_candidate' && peerConnRef.current) {
          try {
            await peerConnRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch (e) {}
        }

        if (msg.type === 'call_rejected' || msg.type === 'call_hangup') {
          cleanupCall();
        }
      } catch (e) {}
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, activeCall]);

  const startOutgoingCall = async () => {
    try {
      setCallState('connecting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWebSocketMessage({
            type: 'ice_candidate',
            ticket_id: activeCall.ticket_id,
            target_user_id: activeCall.target_user_id,
            candidate: event.candidate
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendWebSocketMessage({
        type: 'call_request',
        ticket_id: activeCall.ticket_id,
        target_user_id: activeCall.target_user_id,
        offer
      });
    } catch (err) {
      console.warn('Microphone permission or WebRTC error:', err);
      alert('Could not access microphone for voice call. Check browser permissions.');
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    try {
      setCallState('connecting');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(rtcConfig);
      peerConnRef.current = pc;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWebSocketMessage({
            type: 'ice_candidate',
            ticket_id: activeCall.ticket_id,
            target_user_id: activeCall.from_user_id,
            candidate: event.candidate
          });
        }
      };

      if (activeCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(activeCall.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        sendWebSocketMessage({
          type: 'call_answer',
          ticket_id: activeCall.ticket_id,
          target_user_id: activeCall.from_user_id,
          sdp: answer
        });
      }

      setCallState('connected');
      startTimer();
    } catch (err) {
      console.warn('Microphone error:', err);
      alert('Microphone access required to accept call.');
      cleanupCall();
    }
  };

  const rejectCall = () => {
    sendWebSocketMessage({
      type: 'call_rejected',
      ticket_id: activeCall?.ticket_id,
      target_user_id: activeCall?.from_user_id
    });
    cleanupCall();
  };

  const hangUp = () => {
    sendWebSocketMessage({
      type: 'call_hangup',
      ticket_id: activeCall?.ticket_id,
      target_user_id: activeCall?.target_user_id || activeCall?.from_user_id
    });
    cleanupCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const startTimer = () => {
    setCallDuration(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const cleanupCall = () => {
    clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnRef.current) {
      peerConnRef.current.close();
      peerConnRef.current = null;
    }
    setCallDuration(0);
    setIsMuted(false);
    setActiveCall(null);
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!activeCall) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-5 w-80 border border-slate-700 flex flex-col items-center">
        <audio ref={remoteAudioRef} autoPlay />

        {/* Status Header */}
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-sky-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          {callState === 'ringing' ? 'Incoming Voice Call' : callState === 'connecting' ? 'Connecting Call...' : 'Voice Call in Progress'}
        </div>

        {/* User Avatar */}
        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-sky-500/40 flex items-center justify-center mb-3 text-sky-300">
          <User className="w-8 h-8" />
        </div>

        <h4 className="font-bold text-base text-slate-100 text-center">
          {activeCall.from_user_name || activeCall.target_user_name || 'Staff / Technician'}
        </h4>
        <p className="text-xs text-slate-400 mb-4">Ticket #{activeCall.ticket_id}</p>

        {callState === 'connected' && (
          <p className="text-sm font-mono text-emerald-400 font-semibold mb-4">
            {formatDuration(callDuration)}
          </p>
        )}

        {/* Action Controls */}
        {callState === 'ringing' ? (
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={rejectCall}
              className="p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all transform hover:scale-105 shadow-lg shadow-rose-600/30"
              title="Decline"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
            <button
              onClick={acceptCall}
              className="p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full transition-all transform hover:scale-105 shadow-lg shadow-emerald-600/30 animate-pulse"
              title="Accept Call"
            >
              <Phone className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={hangUp}
              className="p-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-all shadow-lg shadow-rose-600/30"
              title="End Call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
