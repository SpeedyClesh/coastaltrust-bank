import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Send, MessageCircle, ChevronDown, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import './Support.css';

const CATEGORIES = ['General Inquiry','Account Issue','Transaction Problem','Loan Query','Technical Support','Fraud Report','Card Issue','Other'];

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyMsg, setReplyMsg] = useState('');
  const messagesEndRef = useRef(null);

  const [form, setForm] = useState({ name: `${user?.first_name||''} ${user?.last_name||''}`.trim(), email: user?.email||'', subject: '', message: '', category: 'General Inquiry', priority: 'medium' });

  useEffect(() => { loadTickets(); }, []);
  useEffect(() => { if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({behavior:'smooth'}); }, [ticketMessages]);

  const loadTickets = async () => {
    if (!user) return;
    try { const { data } = await api.get('/support/tickets'); setTickets(data); }
    catch {}
  };

  const openTicket = async (ticket) => {
    setActiveTicket(ticket);
    try {
      const { data } = await api.get(`/support/tickets/${ticket.ticket_number}`);
      setTicketMessages(data.messages || []);
    } catch {}
  };

  const submitTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/support/tickets', form);
      toast.success(`Ticket #${data.ticketNumber} submitted!`);
      setShowNewTicket(false);
      setForm(f => ({...f, subject: '', message: '', category: 'General Inquiry', priority: 'medium'}));
      loadTickets();
    } catch (err) { toast.error('Failed to submit ticket'); }
    finally { setSubmitting(false); }
  };

  const sendReply = async () => {
    if (!replyMsg.trim()) return;
    try {
      await api.post(`/support/tickets/${activeTicket.ticket_number}/reply`, { message: replyMsg });
      setTicketMessages(m => [...m, { id: Date.now(), sender_type: 'user', message: replyMsg, created_at: new Date().toISOString() }]);
      setReplyMsg('');
    } catch { toast.error('Failed to send reply'); }
  };

  const statusIcon = (s) => {
    if (s === 'open') return <span className="badge badge-warning"><Clock size={11}/>&nbsp;Open</span>;
    if (s === 'in_progress') return <span className="badge badge-info">In Progress</span>;
    if (s === 'resolved') return <span className="badge badge-success"><CheckCircle size={11}/>&nbsp;Resolved</span>;
    return <span className="badge badge-gray">{s}</span>;
  };

  return (
    <div className="support-page page-enter">
      <div className="page-header">
        <div><h1>Support Center</h1><p>We're here to help — 24/7</p></div>
        <button className="btn btn-primary" onClick={() => setShowNewTicket(!showNewTicket)}>
          {showNewTicket ? 'Cancel' : '+ New Ticket'}
        </button>
      </div>

      {/* New Ticket Form */}
      {showNewTicket && (
        <div className="card" style={{marginBottom:24}}>
          <div className="card-header"><h3>Submit a Support Ticket</h3></div>
          <div className="card-body">
            <form onSubmit={submitTicket}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                <div className="form-group">
                  <label>Your Name</label>
                  <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required/>
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required/>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f=>({...f,priority:e.target.value}))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group" style={{gridColumn:'span 2'}}>
                  <label>Subject</label>
                  <input value={form.subject} onChange={e => setForm(f=>({...f,subject:e.target.value}))} placeholder="Brief subject" required/>
                </div>
                <div className="form-group" style={{gridColumn:'span 2'}}>
                  <label>Message</label>
                  <textarea rows={5} value={form.message} onChange={e => setForm(f=>({...f,message:e.target.value}))} placeholder="Describe your issue in detail..." required style={{resize:'vertical'}}/>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><span className="spinner"/>&nbsp;Submitting...</> : <><Send size={14}/>&nbsp;Submit Ticket</>}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="support-layout">
        {/* Tickets List */}
        <div className="tickets-list card">
          <div className="card-header"><h3>My Tickets ({tickets.length})</h3></div>
          {tickets.length === 0 ? (
            <div style={{padding:40,textAlign:'center',color:'var(--text-light)'}}>
              <MessageCircle size={40} style={{opacity:0.2,display:'block',margin:'0 auto 12px'}}/>
              <p>No tickets yet</p>
            </div>
          ) : (
            tickets.map(t => (
              <div key={t.id} className={`ticket-item ${activeTicket?.id === t.id ? 'active' : ''}`} onClick={() => openTicket(t)}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,fontFamily:'monospace',color:'var(--text-light)'}}>#{t.ticket_number}</span>
                  {statusIcon(t.status)}
                </div>
                <p style={{fontWeight:600,fontSize:14,color:'var(--text-dark)'}}>{t.subject}</p>
                <p style={{fontSize:12,color:'var(--text-light)',marginTop:4}}>{t.category} · {format(new Date(t.created_at),'MMM d, yyyy')}</p>
              </div>
            ))
          )}
        </div>

        {/* Ticket Messages */}
        {activeTicket ? (
          <div className="ticket-chat card">
            <div className="card-header">
              <div>
                <h3>{activeTicket.subject}</h3>
                <p style={{fontSize:12,color:'var(--text-light)'}}>#{activeTicket.ticket_number} · {activeTicket.category}</p>
              </div>
              {statusIcon(activeTicket.status)}
            </div>
            <div className="chat-messages">
              {ticketMessages.length === 0 && (
                <div style={{textAlign:'center',padding:40,color:'var(--text-light)'}}>
                  <p>Ticket submitted. Awaiting response...</p>
                </div>
              )}
              {ticketMessages.map(m => (
                <div key={m.id} className={`chat-message ${m.sender_type === 'user' ? 'sent' : 'received'}`}>
                  <div className="message-bubble">
                    <p className="message-sender">{m.sender_type === 'admin' ? '🏦 CoastalTrust Support' : 'You'}</p>
                    <p className="message-text">{m.message}</p>
                    <p className="message-time">{format(new Date(m.created_at),'MMM d, HH:mm')}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef}/>
            </div>
            {activeTicket.status !== 'resolved' && (
              <div className="chat-input">
                <input value={replyMsg} onChange={e => setReplyMsg(e.target.value)} placeholder="Type your reply..." onKeyDown={e => e.key === 'Enter' && sendReply()}/>
                <button className="btn btn-primary btn-sm" onClick={sendReply} disabled={!replyMsg.trim()}>
                  <Send size={14}/>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="ticket-chat card" style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{textAlign:'center',color:'var(--text-light)'}}>
              <MessageCircle size={48} style={{opacity:0.2,display:'block',margin:'0 auto 16px'}}/>
              <p>Select a ticket to view conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat Widget */}
      <div className="chat-widget">
        <button className="chat-widget-toggle" onClick={() => setChatOpen(!chatOpen)}>
          {chatOpen ? <ChevronDown size={22}/> : <MessageCircle size={22}/>}
          {!chatOpen && <span className="chat-widget-label">Live Chat</span>}
        </button>
        {chatOpen && (
          <div className="chat-widget-panel">
            <div className="chat-widget-header">
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:22}}>⚓</span>
                <div>
                  <p style={{fontWeight:700,color:'var(--white)',fontSize:14}}>CoastalTrust Support</p>
                  <p style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>Typically replies in minutes</p>
                </div>
              </div>
              <span style={{width:8,height:8,borderRadius:'50%',background:'#4ade80',display:'block',boxShadow:'0 0 6px rgba(74,222,128,0.6)'}}/>
            </div>
            <div className="chat-widget-body">
              <div className="widget-message received">
                <div className="message-bubble">
                  <p className="message-text">👋 Hello! Welcome to CoastalTrust Support. How can we help you today?</p>
                </div>
              </div>
            </div>
            <div className="chat-widget-footer">
              <button className="btn btn-primary btn-full btn-sm" onClick={() => { setChatOpen(false); setShowNewTicket(true); }}>
                <MessageCircle size={14}/> Create Support Ticket
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
