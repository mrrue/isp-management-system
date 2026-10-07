import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCall, setActiveCall] = useState(null); // { ticket_id, from_user_id, from_user_name, isIncoming, offer, stream }
  const socketRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling backup

    // WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      const token = localStorage.getItem('isp_auth_token');
      if (token) {
        ws.send(JSON.stringify({ type: 'auth', token }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        // Voice call request incoming
        if (msg.type === 'call_request' && msg.from_user_id !== user.id) {
          setActiveCall({
            isIncoming: true,
            ticket_id: msg.ticket_id,
            from_user_id: msg.from_user_id,
            from_user_name: msg.from_user_name
          });
        }

        if (msg.type === 'call_hangup') {
          setActiveCall(null);
        }

        // New notification broadcast
        if (msg.type === 'notification') {
          fetchNotifications();
        }
      } catch (e) {}
    };

    return () => {
      clearInterval(interval);
      if (ws.readyState === 1 || ws.readyState === 0) {
        ws.close();
      }
    };
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(prev - 1, 0));
    } catch (e) {}
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) {}
  };

  const sendWebSocketMessage = (data) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      socket: socketRef.current,
      sendWebSocketMessage,
      activeCall,
      setActiveCall
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
