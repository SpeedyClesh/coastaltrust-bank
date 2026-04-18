import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { ArrowLeftRight, CheckCircle, AlertCircle, Building2, User } from 'lucide-react';
import './TransactionPages.css';

// ===================== TRANSFER PAGE =====================
export function Transfer() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [transferType, setTransferType] = useState('internal');
  const [form, setForm] = useState({ fromAccountId: '', toAccountNumber: '', amount: '', description: '', recipientName: '', recipientBank: '', recipientRouting: '' });

  useEffect(() => {
    api.get('/accounts').then(r => setAccounts(r.data));
    api.get('/beneficiaries').then(r => setBeneficiaries(r.data));
  }, []);

  const fromAcc = accounts.find(a => a.id === form.fromAccountId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fromAccountId) return toast.error('Select source account');
    if (!form.toAccountNumber) return toast.error('Enter destination account');
    if (!form.amount || form.amount <= 0) return toast.error('Enter valid amount');
    if (form.amount > (fromAcc?.available_balance || 0)) return toast.error('Insufficient funds');
    setLoading(true);
    try {
      const { data } = await api.post('/transactions/transfer', { ...form, transferType });
      setSuccess(data);
      toast.success('Transfer successful!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="txn-page page-enter">
      <div className="txn-success-card">
        <CheckCircle size={64} color="var(--success)"/>
        <h2>Transfer Successful!</h2>
        <p>Your transfer of <strong>${parseFloat(form.amount).toFixed(2)}</strong> has been processed.</p>
        <div className="success-details">
          <div className="success-row"><span>Reference</span><strong>{success.ref}</strong></div>
          <div className="success-row"><span>New Balance</span><strong>${parseFloat(success.newBalance).toFixed(2)}</strong></div>
        </div>
        <div style={{display:'flex',gap:12,marginTop:24}}>
          <button className="btn btn-secondary" onClick={() => { setSuccess(null); setForm({fromAccountId:'',toAccountNumber:'',amount:'',description:'',recipientName:'',recipientBank:'',recipientRouting:''}); }}>New Transfer</button>
          <button className="btn btn-primary" onClick={() => navigate('/transactions')}>View Transactions</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="txn-page page-enter">
      <div className="txn-header">
        <div><h1>Transfer Funds</h1><p>Send money to accounts securely</p></div>
      </div>

      <div className="txn-layout">
        <div className="txn-form-card card">
          <div className="card-body">
            {/* Transfer Type */}
            <div className="transfer-type-toggle">
              <button className={`type-btn ${transferType === 'internal' ? 'active' : ''}`} onClick={() => setTransferType('internal')}>
                <User size={16}/> Internal Transfer
              </button>
              <button className={`type-btn ${transferType === 'wire' ? 'active' : ''}`} onClick={() => setTransferType('wire')}>
                <Building2 size={16}/> Wire Transfer
              </button>
            </div>

            {transferType === 'wire' && (
              <div className="info-banner"><AlertCircle size={14}/> Wire transfers have a $25.00 fee and may take 1-2 business days.</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>From Account</label>
                <select value={form.fromAccountId} onChange={e => setForm({...form, fromAccountId: e.target.value})} required>
                  <option value="">Select account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.account_type === 'checking' ? 'Checking' : 'Savings'} — ••••{a.account_number.slice(-4)} (Balance: ${a.available_balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {beneficiaries.length > 0 && (
                <div className="form-group">
                  <label>Quick Select Beneficiary</label>
                  <select onChange={e => { const b = beneficiaries.find(b => b.id === e.target.value); if (b) setForm(f => ({...f, toAccountNumber: b.account_number, recipientName: b.name, recipientBank: b.bank_name, recipientRouting: b.routing_number || ''})); }}>
                    <option value="">Select from saved beneficiaries...</option>
                    {beneficiaries.map(b => <option key={b.id} value={b.id}>{b.nickname || b.name} — {b.bank_name}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Destination Account Number</label>
                <input value={form.toAccountNumber} onChange={e => setForm({...form, toAccountNumber: e.target.value})} placeholder="Enter account number" required/>
              </div>

              {transferType === 'wire' && (
                <>
                  <div className="form-group">
                    <label>Recipient Name</label>
                    <input value={form.recipientName} onChange={e => setForm({...form, recipientName: e.target.value})} placeholder="Full name on account" required/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                    <div className="form-group">
                      <label>Recipient Bank</label>
                      <input value={form.recipientBank} onChange={e => setForm({...form, recipientBank: e.target.value})} placeholder="Bank name"/>
                    </div>
                    <div className="form-group">
                      <label>Routing Number</label>
                      <input value={form.recipientRouting} onChange={e => setForm({...form, recipientRouting: e.target.value})} placeholder="9-digit routing"/>
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Amount</label>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" className="amount-input" required/>
                </div>
                {fromAcc && <p style={{fontSize:12,color:'var(--text-light)',marginTop:4}}>Available: ${fromAcc.available_balance.toFixed(2)}</p>}
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What is this transfer for?"/>
              </div>

              {form.amount && fromAcc && (
                <div className="transfer-summary">
                  <div className="summary-row"><span>Transfer Amount</span><strong>${parseFloat(form.amount || 0).toFixed(2)}</strong></div>
                  <div className="summary-row"><span>Wire Fee</span><strong>{transferType === 'wire' ? '$25.00' : 'Free'}</strong></div>
                  <div className="summary-row total"><span>Total Deducted</span><strong>${(parseFloat(form.amount || 0) + (transferType === 'wire' ? 25 : 0)).toFixed(2)}</strong></div>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{marginTop:16}}>
                {loading ? <><span className="spinner"/>&nbsp;Processing...</> : <><ArrowLeftRight size={18}/>&nbsp;Send Transfer</>}
              </button>
            </form>
          </div>
        </div>

        <div className="txn-info-panel">
          <div className="card">
            <div className="card-header"><h3>Transfer Info</h3></div>
            <div className="card-body">
              {[
                { label: 'Internal Transfer', desc: 'Instant, between CoastalTrust accounts', fee: 'Free' },
                { label: 'Wire Transfer', desc: '1-2 business days', fee: '$25.00' },
              ].map((t, i) => (
                <div key={i} style={{padding:'12px 0',borderBottom:i<1?'1px solid var(--border)':'none'}}>
                  <p style={{fontWeight:600,fontSize:14,marginBottom:4}}>{t.label}</p>
                  <p style={{fontSize:13,color:'var(--text-mid)',marginBottom:4}}>{t.desc}</p>
                  <span className="badge badge-info">Fee: {t.fee}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== DEPOSIT PAGE =====================
export function Deposit() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ accountId: '', amount: '', method: 'ACH', description: '' });

  useEffect(() => { api.get('/accounts').then(r => setAccounts(r.data)); }, []);

  const methods = ['ACH Transfer', 'Wire Transfer', 'Check Deposit', 'Mobile Deposit', 'Cash Deposit'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) return toast.error('Enter valid amount');
    setLoading(true);
    try {
      const { data } = await api.post('/transactions/deposit', form);
      setSuccess(data);
      toast.success('Deposit successful!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="txn-page page-enter">
      <div className="txn-success-card">
        <CheckCircle size={64} color="var(--success)"/>
        <h2>Deposit Successful!</h2>
        <p>Your deposit of <strong>${parseFloat(form.amount).toFixed(2)}</strong> has been credited.</p>
        <div className="success-details">
          <div className="success-row"><span>Reference</span><strong>{success.ref}</strong></div>
          <div className="success-row"><span>New Balance</span><strong>${parseFloat(success.newBalance).toFixed(2)}</strong></div>
        </div>
        <div style={{display:'flex',gap:12,marginTop:24}}>
          <button className="btn btn-secondary" onClick={() => { setSuccess(null); setForm({accountId:'',amount:'',method:'ACH',description:''}); }}>New Deposit</button>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="txn-page page-enter">
      <div className="txn-header"><h1>Make a Deposit</h1><p>Fund your CoastalTrust account</p></div>
      <div className="txn-layout">
        <div className="txn-form-card card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Deposit To</label>
                <select value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})} required>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_type === 'checking' ? 'Checking' : 'Savings'} — ••••{a.account_number.slice(-4)} (${a.balance.toFixed(2)})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Deposit Method</label>
                <div className="method-grid">
                  {methods.map(m => (
                    <button key={m} type="button" className={`method-btn ${form.method === m ? 'active' : ''}`} onClick={() => setForm({...form, method: m})}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" className="amount-input" required/>
                </div>
              </div>
              <div className="form-group">
                <label>Note (optional)</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Reference note"/>
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <><span className="spinner"/>&nbsp;Processing...</> : '💰 Confirm Deposit'}
              </button>
            </form>
          </div>
        </div>
        <div className="txn-info-panel">
          <div className="card">
            <div className="card-header"><h3>Deposit Info</h3></div>
            <div className="card-body">
              <p style={{fontSize:13,color:'var(--text-mid)',lineHeight:1.7}}>Deposits are processed and reflected immediately in your account. For demo purposes, all deposit methods are instant.</p>
              <div style={{marginTop:16,padding:12,background:'var(--success-bg)',borderRadius:'var(--radius-sm)',fontSize:13,color:'var(--success)'}}>
                ✅ Funds available immediately
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== WITHDRAW PAGE =====================
export function Withdraw() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [form, setForm] = useState({ accountId: '', amount: '', method: 'ATM', description: '' });

  useEffect(() => { api.get('/accounts').then(r => setAccounts(r.data)); }, []);

  const fromAcc = accounts.find(a => a.id === form.accountId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) return toast.error('Enter valid amount');
    if (fromAcc && form.amount > fromAcc.available_balance) return toast.error('Insufficient funds');
    setLoading(true);
    try {
      const { data } = await api.post('/transactions/withdrawal', form);
      setSuccess(data);
      toast.success('Withdrawal processed!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="txn-page page-enter">
      <div className="txn-success-card">
        <CheckCircle size={64} color="var(--success)"/>
        <h2>Withdrawal Processed!</h2>
        <p>Your withdrawal of <strong>${parseFloat(form.amount).toFixed(2)}</strong> has been processed.</p>
        <div className="success-details">
          <div className="success-row"><span>Reference</span><strong>{success.ref}</strong></div>
          <div className="success-row"><span>Remaining Balance</span><strong>${parseFloat(success.newBalance).toFixed(2)}</strong></div>
        </div>
        <div style={{display:'flex',gap:12,marginTop:24}}>
          <button className="btn btn-secondary" onClick={() => { setSuccess(null); setForm({accountId:'',amount:'',method:'ATM',description:''}); }}>New Withdrawal</button>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Dashboard</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="txn-page page-enter">
      <div className="txn-header"><h1>Withdraw Funds</h1><p>Withdraw from your account</p></div>
      <div className="txn-layout">
        <div className="txn-form-card card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>From Account</label>
                <select value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})} required>
                  <option value="">Select account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_type === 'checking' ? 'Checking' : 'Savings'} — ••••{a.account_number.slice(-4)} (Available: ${a.available_balance.toFixed(2)})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Withdrawal Method</label>
                <div className="method-grid">
                  {['ATM', 'Bank Counter', 'ACH Transfer', 'Check'].map(m => (
                    <button key={m} type="button" className={`method-btn ${form.method === m ? 'active' : ''}`} onClick={() => setForm({...form, method: m})}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0.00" className="amount-input" required/>
                </div>
                {fromAcc && (
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                    <span style={{fontSize:12,color:'var(--text-light)'}}>Available: ${fromAcc.available_balance.toFixed(2)}</span>
                    <button type="button" style={{background:'none',border:'none',fontSize:12,color:'var(--forest-mid)',fontWeight:500}} onClick={() => setForm(f => ({...f, amount: fromAcc.available_balance}))}>Max</button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Reference (optional)</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Purpose of withdrawal"/>
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <><span className="spinner"/>&nbsp;Processing...</> : '💸 Confirm Withdrawal'}
              </button>
            </form>
          </div>
        </div>
        <div className="txn-info-panel">
          <div className="card">
            <div className="card-header"><h3>Daily Limits</h3></div>
            <div className="card-body">
              {[{label:'ATM Withdrawal',limit:'$2,500/day'},{label:'ACH Transfer',limit:'$10,000/day'},{label:'Bank Counter',limit:'$50,000/day'}].map((l,i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i<2?'1px solid var(--border)':'none',fontSize:13}}>
                  <span style={{color:'var(--text-mid)'}}>{l.label}</span>
                  <strong style={{color:'var(--text-dark)'}}>{l.limit}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
