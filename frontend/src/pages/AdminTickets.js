import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { X, Send, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function AdminTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [resolution, setResolution] = useState('');
  const [processing, setProcessing] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/admin/tickets${params}`);
      setTickets(data);
    } finally { setLoading(false); }
  };

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setResolution(ticket.resolution || '');
    try {
      const { data } = await api.get(`/admin/tickets/${ticket.id}`);
      setMessages(data.messages || []);
    } catch { toast.error('Failed to load messages'); }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setProcessing(true);
    try {
      await api.put(`/admin/tickets/${selectedTicket.id}`, { replyMessage: reply, status: selectedTicket.status });
      setMessages(m => [...m, { id: Date.now(), sender_type: 'admin', message: reply, created_at: new Date().toISOString() }]);
      setReply('');
      toast.success('Reply sent');
    } catch { toast.error('Failed to send reply'); }
    finally { setProcessing(false); }
  };

  const updateTicketStatus = async (status) => {
    if (!selectedTicket) return;
    setProcessing(true);
    try {
      await api.put(`/admin/tickets/${selectedTicket.id}`, { status, resolution });
      setSelectedTicket(t => ({ ...t, status }));
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status } : t));
      toast.success(`Ticket marked as ${status}`);
    } catch { toast.error('Update failed'); }
    finally { setProcessing(false); }
  };

  const priorityBadge = (p) => {
    const cfg = { urgent: 'error', high: 'warning', medium: 'info', low: 'gray' };
    return <span className={`badge badge-${cfg[p] || 'gray'}`}>{p}</span>;
  };

  const statusIcon = (s) => {
    if (s === 'open') return <span className="badge badge-warning"><Clock size={11} />&nbsp;Open</span>;
    if (s === 'in_progress') return <span className="badge badge-info">In Progress</span>;
    if (s === 'resolved') return <span className="badge badge-success"><CheckCircle size={11} />&nbsp;Resolved</span>;
    return <span className="badge badge-gray">{s}</span>;
  };

  const openCount = tickets.filter(t => t.status === 'open').length;

  return (
    <div style={{ maxWidth: 1200 }} className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26 }}>Support Tickets</h1>
        <p style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 4 }}>{tickets.length} total · {openCount} open</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['', 'All'], ['open', 'Open'], ['in_progress', 'In Progress'], ['resolved', 'Resolved']].map(([val, label]) => (
          <button key={val} className={`btn btn-sm ${statusFilter === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setStatusFilter(val)}>
            {label} {val === 'open' && openCount > 0 && <span style={{ background: '#e74c3c', color: 'white', borderRadius: 10, padding: '0 5px', fontSize: 10, marginLeft: 4 }}>{openCount}</span>}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, height: 620 }}>
        {/* Tickets list */}
        <div className="card" style={{ overflow: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} /></div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-light)' }}>
              <CheckCircle size={36} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
              <p>No tickets found</p>
            </div>
          ) : tickets.map(t => (
            <div key={t.id}
              style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedTicket?.id === t.id ? 'rgba(45,90,61,0.06)' : 'white', borderLeft: selectedTicket?.id === t.id ? '3px solid var(--forest-mid)' : '3px solid transparent', transition: 'all 0.15s' }}
              onClick={() => openTicket(t)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-light)' }}>#{t.ticket_number}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {priorityBadge(t.priority)}
                  {statusIcon(t.status)}
                </div>
              </div>
              <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
              <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>{t.name} · {t.category}</p>
              <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>{format(new Date(t.created_at), 'MMM d, yyyy HH:mm')}</p>
            </div>
          ))}
        </div>

        {/* Ticket detail / chat */}
        {selectedTicket ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Ticket header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{selectedTicket.subject}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2 }}>
                    From: <strong>{selectedTicket.name}</strong> ({selectedTicket.email}) · #{selectedTicket.ticket_number}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {statusIcon(selectedTicket.status)}
                  {selectedTicket.status !== 'resolved' && (
                    <>
                      <button className="btn btn-sm" style={{ background: 'var(--info-bg)', color: 'var(--info)', border: '1px solid var(--info)30', fontSize: 12 }}
                        onClick={() => updateTicketStatus('in_progress')} disabled={processing}>In Progress</button>
                      <button className="btn btn-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)30', fontSize: 12 }}
                        onClick={() => updateTicketStatus('resolved')} disabled={processing}><CheckCircle size={12} /> Resolve</button>
                    </>
                  )}
                </div>
              </div>
              {/* Original message */}
              <div style={{ marginTop: 12, background: 'var(--cream)', borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Original Message</p>
                <p style={{ fontSize: 13, color: 'var(--text-dark)', lineHeight: 1.6 }}>{selectedTicket.message}</p>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: 16, background: 'var(--cream)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)', fontSize: 13 }}>No replies yet</div>
              )}
              {messages.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_type === 'admin' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '72%', padding: '10px 14px', borderRadius: 12,
                    background: m.sender_type === 'admin' ? 'var(--forest)' : 'white',
                    color: m.sender_type === 'admin' ? 'white' : 'var(--text-dark)',
                    border: m.sender_type === 'user' ? '1px solid var(--border)' : 'none',
                    borderBottomRightRadius: m.sender_type === 'admin' ? 4 : 12,
                    borderBottomLeftRadius: m.sender_type === 'user' ? 4 : 12,
                  }}>
                    <p style={{ fontSize: 11, opacity: 0.6, marginBottom: 4, fontWeight: 600 }}>
                      {m.sender_type === 'admin' ? '🏦 Support Agent' : selectedTicket.name}
                    </p>
                    <p style={{ fontSize: 13, lineHeight: 1.5 }}>{m.message}</p>
                    <p style={{ fontSize: 10, opacity: 0.5, marginTop: 4, textAlign: 'right' }}>{format(new Date(m.created_at), 'MMM d, HH:mm')}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Resolution + Reply */}
            {selectedTicket.status !== 'resolved' && (
              <div style={{ padding: 12, borderTop: '1px solid var(--border)', background: 'var(--white)' }}>
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <input style={{ fontSize: 13 }} value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Resolution notes (optional)..." />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ flex: 1, padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14 }}
                    value={reply} onChange={e => setReply(e.target.value)} placeholder="Type reply to customer..."
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()} />
                  <button className="btn btn-primary" onClick={sendReply} disabled={!reply.trim() || processing}>
                    {processing ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-light)' }}>
              <AlertCircle size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 16px' }} />
              <p>Select a ticket to view and respond</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
