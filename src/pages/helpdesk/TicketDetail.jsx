import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  ArrowLeft,
  Phone,
  User,
  MapPin,
  LifeBuoy,
  Clock,
  Send,
  Paperclip,
  PhoneCall,
  CheckCircle,
  Wrench,
  Camera,
  History,
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import CallButton from '../../components/common/CallButton';
import Modal from '../../components/common/Modal';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { socket, sendWebSocketMessage, setActiveCall } = useNotifications();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chat message input
  const [newMessage, setNewMessage] = useState('');
  const [chatFile, setChatFile] = useState(null);
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Worklog Form State
  const [isWorklogModalOpen, setIsWorklogModalOpen] = useState(false);
  const [worklogData, setWorklogData] = useState({
    arrival_time: '',
    departure_time: '',
    fault_found: '',
    work_performed: '',
    parts_used: '',
    customer_comments: '',
    technician_notes: '',
    resolution: '',
    status: 'Resolved'
  });

  // Multiple Photos Upload State
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const photoInputRef = useRef(null);

  const fetchTicketDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tickets/${id}`);
      setTicket(res.ticket);
      setMessages(res.messages || []);
      setAttachments(res.attachments || []);
      setCustomerHistory(res.customer_history || []);

      setWorklogData({
        arrival_time: res.ticket.arrival_time || '',
        departure_time: res.ticket.departure_time || '',
        fault_found: res.ticket.fault_found || '',
        work_performed: res.ticket.work_performed || '',
        parts_used: res.ticket.parts_used || '',
        customer_comments: res.ticket.customer_comments || '',
        technician_notes: res.ticket.technician_notes || '',
        resolution: res.ticket.resolution || '',
        status: res.ticket.status
      });
    } catch (err) {
      alert('Failed to load ticket.');
      navigate('/helpdesk/tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaster = async () => {
    try {
      const uRes = await api.get('/users', { is_active: true });
      setUsers(uRes || []);
      const sRes = await api.get('/settings');
      if (sRes.ticket_statuses) setStatuses(sRes.ticket_statuses);
    } catch (e) {}
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchMaster();
  }, [id]);

  // Join ticket room on WebSocket for live chat & voice calling
  useEffect(() => {
    if (!socket || !ticket) return;

    sendWebSocketMessage({ type: 'join_ticket', ticket_id: ticket.id });

    const handleWsMessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_ticket_message' && msg.ticket_id === ticket.id) {
          setMessages(prev => [...prev, msg]);
          scrollToBottom();
        }
      } catch (e) {}
    };

    socket.addEventListener('message', handleWsMessage);

    return () => {
      sendWebSocketMessage({ type: 'leave_ticket', ticket_id: ticket.id });
      socket.removeEventListener('message', handleWsMessage);
    };
  }, [socket, ticket]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !chatFile) return;

    try {
      const formData = new FormData();
      formData.append('message', newMessage.trim());
      if (chatFile) {
        formData.append('attachment', chatFile);
      }

      const res = await api.post(`/tickets/${id}/messages`, formData);

      // Broadcast to socket room
      sendWebSocketMessage({
        type: 'ticket_message',
        ticket_id: ticket.id,
        message: newMessage.trim(),
        attachment_url: res.attachment_url,
        attachment_name: chatFile?.name || null
      });

      setNewMessage('');
      setChatFile(null);
      fetchTicketDetails();
      scrollToBottom();
    } catch (err) {
      alert('Failed to send message.');
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      await api.put(`/tickets/${id}`, { status: newStatus });
      setTicket(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleAssignTechnician = async (techId) => {
    try {
      await api.put(`/tickets/${id}`, { assigned_to: techId || null, status: techId ? 'Assigned' : 'New' });
      fetchTicketDetails();
    } catch (err) {
      alert('Failed to reassign ticket.');
    }
  };

  const handleSaveWorklog = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/tickets/${id}/worklog`, worklogData);
      setIsWorklogModalOpen(false);
      fetchTicketDetails();
    } catch (err) {
      alert('Failed to save work log.');
    }
  };

  const handleUploadPhotos = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      await api.post(`/tickets/${id}/attachments`, formData);
      fetchTicketDetails();
    } catch (err) {
      alert('Failed to upload photos.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const startVoiceCall = () => {
    const targetId = ticket.assigned_to === user.id ? ticket.created_by : ticket.assigned_to;
    if (!targetId) {
      alert('No assigned technician or manager available to call on this ticket.');
      return;
    }

    setActiveCall({
      isIncoming: false,
      ticket_id: ticket.id,
      target_user_id: targetId,
      target_user_name: ticket.assigned_to === user.id ? ticket.created_by_name : ticket.technician_name
    });
  };

  if (loading || !ticket) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading complaint ticket...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            to="/helpdesk/tickets"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-slate-900">{ticket.ticket_number}</h1>
              <Badge>{ticket.status}</Badge>
              <Badge variant={ticket.priority === 'Urgent' || ticket.priority === 'High' ? 'danger' : 'default'} size="sm">
                {ticket.priority}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged on {new Date(ticket.created_at).toLocaleString()} by <span className="font-semibold text-slate-700">{ticket.created_by_name || 'Staff'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* In-ticket Voice Call Button */}
          <button
            onClick={startVoiceCall}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            title="Start Browser Voice Call"
          >
            <PhoneCall className="w-3.5 h-3.5" /> Voice Call
          </button>

          {/* Record Work Log Button */}
          <button
            onClick={() => setIsWorklogModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" /> Record Work Log
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Ticket Information, Photos & Chat */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Issue Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Details</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{ticket.customer_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-slate-700">{ticket.customer_phone}</span>
                  <CallButton phone={ticket.customer_phone} size="xs" label="" />
                </div>
                <p className="text-xs text-slate-500 mt-1">{ticket.customer_address}</p>
              </div>

              {ticket.customer_id && (
                <Link
                  to={`/billing/customers/${ticket.customer_id}`}
                  className="text-xs font-semibold text-sky-600 hover:underline shrink-0"
                >
                  View Full Profile &rarr;
                </Link>
              )}
            </div>

            {/* Complaint Description */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Complaint Category</span>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{ticket.category}</p>
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                {ticket.description}
              </div>
            </div>

            {/* Work Log Summary if completed/recorded */}
            {(ticket.work_performed || ticket.resolution) && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                <p className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Resolution & Work Log
                </p>
                {ticket.technician_name && (
                  <p className="text-emerald-800"><span className="font-semibold">Technician:</span> {ticket.technician_name}</p>
                )}
                {ticket.arrival_time && (
                  <p className="text-emerald-800"><span className="font-semibold">Visit Time:</span> {ticket.arrival_time} to {ticket.departure_time}</p>
                )}
                {ticket.fault_found && (
                  <p className="text-emerald-800"><span className="font-semibold">Fault Found:</span> {ticket.fault_found}</p>
                )}
                {ticket.work_performed && (
                  <p className="text-emerald-800"><span className="font-semibold">Work Performed:</span> {ticket.work_performed}</p>
                )}
                {ticket.parts_used && (
                  <p className="text-emerald-800"><span className="font-semibold">Materials/Parts:</span> {ticket.parts_used}</p>
                )}
                {ticket.resolution && (
                  <p className="text-emerald-900 font-semibold"><span className="font-bold">Final Resolution:</span> {ticket.resolution}</p>
                )}
              </div>
            )}
          </div>

          {/* Photo & File Attachments */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-600" /> Work Photos & Attachments ({attachments.length})
              </h3>
              <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <span>Upload Photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleUploadPhotos}
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No photos uploaded yet for this ticket.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {attachments.map(a => (
                  <div key={a.id} className="group relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-square">
                    {a.file_type && a.file_type.includes('image') ? (
                      <img src={a.file_path} alt={a.file_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-500">
                        <Paperclip className="w-6 h-6 mb-1" />
                        <span className="text-[10px] truncate max-w-full">{a.file_name}</span>
                      </div>
                    )}
                    <a
                      href={a.file_path}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold backdrop-blur-2xs transition-opacity"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In-Ticket Messaging Chat */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-96">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Internal Ticket Messaging</h3>
              <span className="text-[10px] text-slate-400">Live communication with technician</span>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-400">No messages yet. Send a note or photo update below.</p>
              ) : (
                messages.map((m, idx) => {
                  const isMe = m.sender_id === user.id;
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-slate-600">{m.sender_name}</span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs max-w-xs sm:max-w-md ${
                          isMe ? 'bg-sky-600 text-white rounded-tr-xs' : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                        }`}
                      >
                        {m.message && <p className="whitespace-pre-line">{m.message}</p>}
                        {m.attachment_url && (
                          <div className="mt-2">
                            <a href={m.attachment_url} target="_blank" rel="noreferrer" className="underline font-semibold text-[11px] flex items-center gap-1">
                              <Paperclip className="w-3 h-3" /> {m.attachment_name || 'View Attachment'}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <label className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer rounded-lg hover:bg-slate-100">
                <Paperclip className="w-4 h-4" />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => setChatFile(e.target.files[0] || null)}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={chatFile ? `File attached: ${chatFile.name}` : "Type message or update..."}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              <button
                type="submit"
                className="p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: Ticket Assignment, Status & Customer Previous History */}
        <div className="space-y-6">
          {/* Status & Assignment Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Ticket Workflow</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={ticket.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white"
              >
                {statuses.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Technician</label>
              <select
                value={ticket.assigned_to || ''}
                onChange={(e) => handleAssignTechnician(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                ))}
              </select>
            </div>

            {ticket.technician_phone && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Tech Contact:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800">{ticket.technician_phone}</span>
                  <CallButton phone={ticket.technician_phone} size="xs" label="" />
                </div>
              </div>
            )}
          </div>

          {/* Customer Previous History Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-sky-600" /> Previous Complaint History ({customerHistory.length})
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              {customerHistory.length === 0 ? (
                <p className="text-slate-400 py-2">No prior complaints on record.</p>
              ) : (
                customerHistory.map(h => (
                  <div key={h.id} className="py-2.5">
                    <div className="flex justify-between items-center">
                      <Link to={`/helpdesk/tickets/${h.id}`} className="font-mono font-bold text-sky-600 hover:underline">
                        {h.ticket_number}
                      </Link>
                      <Badge size="sm">{h.status}</Badge>
                    </div>
                    <p className="font-semibold text-slate-800 mt-1">{h.category}</p>
                    <p className="text-[11px] text-slate-500 truncate">{h.description}</p>
                    {h.resolution && (
                      <p className="text-[10px] text-emerald-700 mt-0.5 italic">Resolved: {h.resolution}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RECORD WORK LOG MODAL */}
      <Modal
        isOpen={isWorklogModalOpen}
        onClose={() => setIsWorklogModalOpen(false)}
        title="Record Technician Work Log & Completion"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveWorklog} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Arrival Time</label>
              <input
                type="text"
                value={worklogData.arrival_time}
                onChange={(e) => setWorklogData({ ...worklogData, arrival_time: e.target.value })}
                placeholder="e.g. 11:30 AM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Time</label>
              <input
                type="text"
                value={worklogData.departure_time}
                onChange={(e) => setWorklogData({ ...worklogData, departure_time: e.target.value })}
                placeholder="e.g. 12:45 PM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fault Found</label>
            <input
              type="text"
              value={worklogData.fault_found}
              onChange={(e) => setWorklogData({ ...worklogData, fault_found: e.target.value })}
              placeholder="e.g. Core fiber cable cut outside gate, connector broken"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Performed</label>
            <textarea
              rows="2"
              value={worklogData.work_performed}
              onChange={(e) => setWorklogData({ ...worklogData, work_performed: e.target.value })}
              placeholder="e.g. Respliced fiber core with fusion splicer, tested optical power (-19.2 dBm)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Parts / Materials Used</label>
            <input
              type="text"
              value={worklogData.parts_used}
              onChange={(e) => setWorklogData({ ...worklogData, parts_used: e.target.value })}
              placeholder="e.g. 1 SC-APC Fast Connector, 20m drop wire"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Final Resolution Details</label>
            <input
              type="text"
              value={worklogData.resolution}
              onChange={(e) => setWorklogData({ ...worklogData, resolution: e.target.value })}
              placeholder="e.g. Internet and optical power restored, verified speed at 20Mbps"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Update Ticket Status</label>
            <select
              value={worklogData.status}
              onChange={(e) => setWorklogData({ ...worklogData, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
            >
              <option value="Resolved">Resolved</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Parts">Waiting for Parts</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsWorklogModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs"
            >
              Save Work Log
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
