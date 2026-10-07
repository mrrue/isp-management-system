import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Wrench,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Camera,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import CallButton from '../../components/common/CallButton';

export default function TechnicianPortal() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('active'); // 'active' or 'completed'

  const fetchMyTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tickets', { my_tickets: 'true', limit: 100 });
      setTickets(res.data || []);
    } catch (e) {
      console.error('Failed to load my tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  const activeTickets = tickets.filter(t => !['Resolved', 'Completed', 'Cancelled'].includes(t.status));
  const completedTickets = tickets.filter(t => ['Resolved', 'Completed'].includes(t.status));
  const displayed = filterTab === 'active' ? activeTickets : completedTickets;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Mobile-Friendly Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" /> My Field Jobs
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Technician: {user?.full_name}</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterTab('active')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filterTab === 'active' ? 'bg-white shadow-xs text-sky-700 font-bold' : 'text-slate-600'}`}
          >
            Pending ({activeTickets.length})
          </button>
          <button
            onClick={() => setFilterTab('completed')}
            className={`px-3 py-1.5 rounded-lg transition-all ${filterTab === 'completed' ? 'bg-white shadow-xs text-sky-700 font-bold' : 'text-slate-600'}`}
          >
            Done ({completedTickets.length})
          </button>
        </div>
      </div>

      {/* Tickets List Cards */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading assigned jobs...</div>
      ) : displayed.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
          {filterTab === 'active' ? 'Great job! No pending jobs assigned.' : 'No completed jobs yet.'}
        </div>
      ) : (
        displayed.map(ticket => (
          <div
            key={ticket.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3 hover:border-sky-300 transition-all"
          >
            {/* Ticket Header */}
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-sky-700">{ticket.ticket_number}</span>
              <div className="flex items-center gap-1.5">
                <Badge variant={ticket.priority === 'Urgent' || ticket.priority === 'High' ? 'danger' : 'default'} size="sm">
                  {ticket.priority}
                </Badge>
                <Badge size="sm">{ticket.status}</Badge>
              </div>
            </div>

            {/* Customer Details & Quick Call */}
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-900">{ticket.customer_name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">{ticket.customer_phone}</span>
                <CallButton phone={ticket.customer_phone} size="xs" label="Call Customer" />
              </div>
              <div className="flex items-start gap-1.5 text-xs text-slate-600 pt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{ticket.customer_address}</span>
              </div>
            </div>

            {/* Issue Preview */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <p className="font-semibold text-slate-800">{ticket.category}</p>
              <p className="text-slate-600 mt-0.5">{ticket.description}</p>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {ticket.message_count > 0 && (
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-sky-500" /> {ticket.message_count} notes</span>
                )}
                {ticket.attachment_count > 0 && (
                  <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5 text-amber-500" /> {ticket.attachment_count} photos</span>
                )}
              </div>

              <Link
                to={`/helpdesk/tickets/${ticket.id}`}
                className="inline-flex items-center gap-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                <span>Open Job</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
