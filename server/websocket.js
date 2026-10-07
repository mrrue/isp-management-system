const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./middleware/auth');
const { db } = require('./db');

function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Map(); // userId -> Set of ws connections
  const ticketRooms = new Map(); // ticketId -> Set of ws connections

  wss.on('connection', (ws, req) => {
    let currentUser = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        // AUTHENTICATION ON SOCKET
        if (data.type === 'auth') {
          try {
            const decoded = jwt.verify(data.token, JWT_SECRET);
            const user = db.prepare('SELECT id, username, full_name, role FROM users WHERE id = ?').get(decoded.id);
            if (user) {
              currentUser = user;
              ws.user = user;

              if (!clients.has(user.id)) {
                clients.set(user.id, new Set());
              }
              clients.get(user.id).add(ws);

              ws.send(JSON.stringify({ type: 'auth_success', user: { id: user.id, name: user.full_name } }));
            }
          } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'WebSocket auth failed.' }));
          }
          return;
        }

        if (!currentUser) return;

        // JOIN TICKET ROOM FOR LIVE CHAT & WEBRTC CALL
        if (data.type === 'join_ticket') {
          const { ticket_id } = data;
          if (!ticketRooms.has(ticket_id)) {
            ticketRooms.set(ticket_id, new Set());
          }
          ticketRooms.get(ticket_id).add(ws);
          ws.ticketId = ticket_id;
          return;
        }

        // LEAVE TICKET ROOM
        if (data.type === 'leave_ticket') {
          const { ticket_id } = data;
          if (ticketRooms.has(ticket_id)) {
            ticketRooms.get(ticket_id).delete(ws);
          }
          ws.ticketId = null;
          return;
        }

        // TICKET CHAT MESSAGE BROADCAST
        if (data.type === 'ticket_message') {
          const { ticket_id, message, attachment_url, attachment_name } = data;
          const room = ticketRooms.get(ticket_id);
          if (room) {
            const payload = JSON.stringify({
              type: 'new_ticket_message',
              ticket_id,
              message,
              attachment_url,
              attachment_name,
              sender_id: currentUser.id,
              sender_name: currentUser.full_name,
              sender_role: currentUser.role,
              created_at: new Date().toISOString()
            });
            room.forEach(client => {
              if (client.readyState === 1) client.send(payload);
            });
          }
          return;
        }

        // WEBRTC SIGNALING FOR IN-TICKET VOICE CALL
        if (['call_offer', 'call_answer', 'ice_candidate', 'call_hangup', 'call_request', 'call_rejected'].includes(data.type)) {
          const { ticket_id, target_user_id } = data;

          if (target_user_id && clients.has(target_user_id)) {
            const targetSockets = clients.get(target_user_id);
            const msg = JSON.stringify({
              ...data,
              from_user_id: currentUser.id,
              from_user_name: currentUser.full_name
            });
            targetSockets.forEach(targetWs => {
              if (targetWs.readyState === 1) targetWs.send(msg);
            });
          } else if (ticket_id && ticketRooms.has(ticket_id)) {
            // Broadcast signaling to other participants in ticket room
            const room = ticketRooms.get(ticket_id);
            const msg = JSON.stringify({
              ...data,
              from_user_id: currentUser.id,
              from_user_name: currentUser.full_name
            });
            room.forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(msg);
              }
            });
          }
          return;
        }

      } catch (err) {
        console.error('WS message handling error:', err);
      }
    });

    ws.on('close', () => {
      if (currentUser && clients.has(currentUser.id)) {
        clients.get(currentUser.id).delete(ws);
        if (clients.get(currentUser.id).size === 0) {
          clients.delete(currentUser.id);
        }
      }
      if (ws.ticketId && ticketRooms.has(ws.ticketId)) {
        ticketRooms.get(ws.ticketId).delete(ws);
      }
    });
  });

  return wss;
}

module.exports = {
  setupWebSocketServer
};
