import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Users, CreditCard, Shield, Wifi } from 'lucide-react';
import { format } from 'date-fns';

export function Beneficiaries() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', accountNumber: '', bankName: '', routingNumber: '', email: '', nickname: '' });

  useEffect(() => { api.get('/beneficiaries').then(r => setBeneficiaries(r.data)).finally(() => setLoading(false)); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/beneficiaries', form);
      toast.success('Beneficiary added!');
      setShowForm(false);
      setForm({ name: '', accountNumber: '', bankName: '', routingNumber: '', email: '', nickname: '' });
      const { data } = await api.get('/beneficiaries');
      setBeneficiaries(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add'); }
    finally { setSubmitting(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this beneficiary?')) return;
    try {
      await api.delete(`/beneficiaries/${id}`);
      setBeneficiaries(b => b.filter(x => x.id !== id));
      toast.success('Beneficiary removed');
    } catch { toast.error('Failed to remove'); }
  };

  return (
    <div style={{ maxWidth: 900 }} className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26 }}>Saved Beneficiaries</h1>
          <p style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 4 }}>Manage your saved transfer recipients</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : <><Plus size={15} /> Add Beneficiary</>}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}><h3 style={{ fontSize: 17 }}>New Beneficiary</h3></div>
          <div style={{ padding: 24 }}>
            <form onSubmit={submit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                {[
                  ['Full Name', 'name', 'John Doe', 'text', true],
                  ['Nickname', 'nickname', 'e.g. Dad, Business', 'text', false],
                  ['Account Number', 'accountNumber', 'Enter account number', 'text', true],
                  ['Bank Name', 'bankName', 'e.g. Chase Bank', 'text', true],
                  ['Routing Number', 'routingNumber', '9-digit routing number', 'text', false],
                  ['Email (optional)', 'email', 'recipient@email.com', 'email', false],
                ].map(([label, key, placeholder, type, required]) => (
                  <div key={key} className="form-group">
                    <label>{label}</label>
                    <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} required={required} />
                  </div>
                ))}
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? <><span className="spinner" />&nbsp;Adding...</> : 'Save Beneficiary'}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
      ) : beneficiaries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <Users size={48} style={{ opacity: 0.15, display: 'block', margin: '0 auto 16px', color: 'var(--forest)' }} />
          <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>No beneficiaries yet</h3>
          <p style={{ color: 'var(--text-light)', fontSize: 14, marginBottom: 20 }}>Save frequent recipients for faster transfers</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Add First Beneficiary</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
          {beneficiaries.map(b => (
            <div key={b.id} className="card" style={{ transition: 'all 0.2s' }}>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--forest)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                    {b.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {b.is_internal === 1 && <span className="badge badge-success" style={{ fontSize: 10 }}>Internal</span>}
                    <button className="btn btn-sm btn-danger" style={{ padding: '4px 8px' }} onClick={() => remove(b.id)}><Trash2 size={13} /></button>
                  </div>
                </div>
                <h4 style={{ fontWeight: 700, fontSize: 15 }}>{b.nickname || b.name}</h4>
                {b.nickname && <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{b.name}</p>}
                <p style={{ fontSize: 13, color: 'var(--text-mid)', marginTop: 6 }}>{b.bank_name}</p>
                <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-light)', marginTop: 2 }}>••••{b.account_number.slice(-4)}</p>
                {b.routing_number && <p style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 2 }}>Routing: {b.routing_number}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Cards() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get('/accounts').then(r => setAccounts(r.data)).finally(() => setLoading(false)); }, []);

  const cardGradients = [
    'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 100%)',
    'linear-gradient(135deg, #7a5a1a 0%, #c8a96e 100%)',
    'linear-gradient(135deg, #1a2a4a 0%, #2d4a8a 100%)',
  ];

  const generateMockCard = (account, index) => ({
    number: `**** **** **** ${(1234 + index * 1111).toString().slice(-4)}`,
    expiry: `0${(index + 4) % 9 + 1}/${26 + index}`,
    type: index === 0 ? 'VISA' : 'Mastercard',
    variant: account.account_type === 'savings' ? 'debit' : 'debit',
    gradient: cardGradients[index % cardGradients.length],
    textColor: index === 1 ? 'var(--forest)' : 'white',
    goldColor: index === 1 ? 'var(--forest)' : 'var(--gold)',
  });

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>;

  return (
    <div style={{ maxWidth: 900 }} className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26 }}>My Cards</h1>
        <p style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 4 }}>Manage your debit and credit cards</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 24, marginBottom: 32 }}>
        {accounts.map((account, i) => {
          const card = generateMockCard(account, i);
          return (
            <div key={account.id} style={{ background: card.gradient, borderRadius: 20, padding: 28, color: card.textColor, position: 'relative', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.2)', minHeight: 200 }}>
              {/* Background pattern */}
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -60, left: -20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

              {/* Card top */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, position: 'relative' }}>
                <span style={{ fontSize: 22, filter: 'drop-shadow(0 0 8px rgba(200,169,110,0.4))' }}>⚓</span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, opacity: 0.6, letterSpacing: '2px', textTransform: 'uppercase' }}>CoastalTrust</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: card.goldColor }}>{card.type}</p>
                </div>
              </div>

              {/* Chip */}
              <div style={{ width: 44, height: 34, background: 'rgba(200,169,110,0.7)', borderRadius: 6, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 2, padding: 4 }}>
                {[0, 1, 2, 3].map(n => <div key={n} style={{ background: 'rgba(200,169,110,0.5)', borderRadius: 2 }} />)}
              </div>

              {/* Wifi icon */}
              <Wifi size={16} style={{ position: 'absolute', top: 100, right: 28, opacity: 0.5, transform: 'rotate(90deg)' }} />

              {/* Card number */}
              <p style={{ fontFamily: 'monospace', fontSize: 16, letterSpacing: '3px', marginBottom: 16, fontWeight: 600, opacity: 0.9 }}>{card.number}</p>

              {/* Card bottom */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <p style={{ fontSize: 9, opacity: 0.5, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>Card Holder</p>
                  <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: '1px' }}>COASTALTRUST BANK</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 9, opacity: 0.5, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>Expires</p>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{card.expiry}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}><h3 style={{ fontSize: 16 }}>Card Controls</h3></div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Contactless Payments', enabled: true },
              { label: 'Online Transactions', enabled: true },
              { label: 'International Use', enabled: false },
              { label: 'ATM Withdrawals', enabled: true },
            ].map((ctrl, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 14, color: 'var(--text-dark)' }}>{ctrl.label}</span>
                <div style={{ width: 40, height: 22, borderRadius: 11, background: ctrl.enabled ? 'var(--success)' : 'var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: ctrl.enabled ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}><h3 style={{ fontSize: 16 }}>Security & Limits</h3></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'var(--success-bg)', borderRadius: 10, marginBottom: 16 }}>
              <Shield size={20} color="var(--success)" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>Card Protected</p>
                <p style={{ fontSize: 12, color: 'var(--text-mid)' }}>256-bit encryption active</p>
              </div>
            </div>
            {[
              { label: 'Daily ATM Limit', value: '$2,500' },
              { label: 'Daily Purchase Limit', value: '$10,000' },
              { label: 'Online Limit', value: '$5,000' },
              { label: 'International Limit', value: 'Disabled' },
            ].map((l, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                <span style={{ color: 'var(--text-mid)' }}>{l.label}</span>
                <strong>{l.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
