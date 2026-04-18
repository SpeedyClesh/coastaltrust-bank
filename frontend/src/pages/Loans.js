import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircle, Clock, XCircle, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import './Loans.css';

const LOAN_TYPES = [
  { value: 'personal', label: 'Personal Loan', rate: 8.5, icon: '👤', max: 50000 },
  { value: 'auto', label: 'Auto Loan', rate: 6.5, icon: '🚗', max: 100000 },
  { value: 'home', label: 'Home Loan', rate: 4.5, icon: '🏠', max: 500000 },
  { value: 'business', label: 'Business Loan', rate: 9.5, icon: '🏢', max: 250000 },
  { value: 'student', label: 'Student Loan', rate: 5.5, icon: '🎓', max: 80000 },
];

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [showPayment, setShowPayment] = useState(null);
  const [expandedLoan, setExpandedLoan] = useState(null);
  const [applying, setApplying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payAccountId, setPayAccountId] = useState('');

  const [form, setForm] = useState({ loanType: 'personal', amount: '', termMonths: 36, purpose: '', collateral: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [l, a] = await Promise.all([api.get('/loans'), api.get('/accounts')]);
      setLoans(l.data);
      setAccounts(a.data);
    } finally { setLoading(false); }
  };

  const selectedType = LOAN_TYPES.find(t => t.value === form.loanType);
  const monthlyRate = selectedType ? selectedType.rate / 100 / 12 : 0;
  const monthlyPayment = form.amount && form.termMonths
    ? (parseFloat(form.amount) * (monthlyRate * Math.pow(1 + monthlyRate, form.termMonths)) / (Math.pow(1 + monthlyRate, form.termMonths) - 1))
    : 0;
  const totalPayable = monthlyPayment * form.termMonths;

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    try {
      await api.post('/loans/apply', form);
      toast.success('Loan application submitted!');
      setShowApply(false);
      setForm({ loanType: 'personal', amount: '', termMonths: 36, purpose: '', collateral: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Application failed'); }
    finally { setApplying(false); }
  };

  const handlePayment = async (loanId) => {
    if (!payAmount || !payAccountId) return toast.error('Select account and enter amount');
    setPaying(true);
    try {
      await api.post(`/loans/${loanId}/payment`, { accountId: payAccountId, amount: parseFloat(payAmount) });
      toast.success('Payment processed!');
      setShowPayment(null);
      setPayAmount('');
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Payment failed'); }
    finally { setPaying(false); }
  };

  const statusIcon = (s) => {
    if (s === 'active') return <span className="badge badge-success"><CheckCircle size={11}/>&nbsp;Active</span>;
    if (s === 'pending') return <span className="badge badge-warning"><Clock size={11}/>&nbsp;Pending</span>;
    if (s === 'rejected') return <span className="badge badge-error"><XCircle size={11}/>&nbsp;Rejected</span>;
    if (s === 'paid_off') return <span className="badge badge-gray">✓ Paid Off</span>;
    return <span className="badge badge-gray">{s}</span>;
  };

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><div className="spinner" style={{width:32,height:32,borderWidth:3}}/></div>;

  return (
    <div className="loans-page page-enter">
      <div className="page-header">
        <div><h1>Loan Services</h1><p>Apply for loans and manage repayments</p></div>
        <button className="btn btn-primary" onClick={() => setShowApply(!showApply)}>
          {showApply ? 'Cancel' : '+ Apply for Loan'}
        </button>
      </div>

      {/* Rates Banner */}
      <div className="rates-banner">
        {LOAN_TYPES.map(t => (
          <div key={t.value} className="rate-item">
            <span className="rate-icon">{t.icon}</span>
            <div>
              <p className="rate-name">{t.label}</p>
              <p className="rate-value">From {t.rate}% APR</p>
            </div>
          </div>
        ))}
      </div>

      {/* Apply Form */}
      {showApply && (
        <div className="card loan-apply-card">
          <div className="card-header"><h3>Loan Application</h3></div>
          <div className="card-body">
            <form onSubmit={handleApply}>
              <div className="loan-type-grid">
                {LOAN_TYPES.map(t => (
                  <button key={t.value} type="button"
                    className={`loan-type-btn ${form.loanType === t.value ? 'active' : ''}`}
                    onClick={() => setForm(f => ({...f, loanType: t.value}))}>
                    <span>{t.icon}</span>
                    <strong>{t.label}</strong>
                    <span>{t.rate}% APR</span>
                  </button>
                ))}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:20}}>
                <div className="form-group">
                  <label>Loan Amount ($)</label>
                  <div className="amount-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input type="number" min="1000" max={selectedType?.max} step="100" value={form.amount}
                      onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                      placeholder={`Up to $${selectedType?.max?.toLocaleString()}`} className="amount-input" required/>
                  </div>
                </div>
                <div className="form-group">
                  <label>Repayment Term</label>
                  <select value={form.termMonths} onChange={e => setForm(f => ({...f, termMonths: parseInt(e.target.value)}))}>
                    {[6,12,24,36,48,60,84,120].map(m => <option key={m} value={m}>{m} months ({(m/12).toFixed(1)} yrs)</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Purpose</label>
                  <input value={form.purpose} onChange={e => setForm(f => ({...f, purpose: e.target.value}))} placeholder="Brief description of loan purpose" required/>
                </div>
                <div className="form-group">
                  <label>Collateral (if any)</label>
                  <input value={form.collateral} onChange={e => setForm(f => ({...f, collateral: e.target.value}))} placeholder="e.g., Vehicle, Property"/>
                </div>
              </div>

              {form.amount > 0 && (
                <div className="loan-calc">
                  <div className="calc-item"><span>Monthly Payment</span><strong>${monthlyPayment.toFixed(2)}</strong></div>
                  <div className="calc-item"><span>Interest Rate</span><strong>{selectedType?.rate}% APR</strong></div>
                  <div className="calc-item"><span>Total Repayable</span><strong>${totalPayable.toFixed(2)}</strong></div>
                  <div className="calc-item"><span>Total Interest</span><strong>${(totalPayable - parseFloat(form.amount || 0)).toFixed(2)}</strong></div>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg" disabled={applying} style={{marginTop:16}}>
                {applying ? <><span className="spinner"/>&nbsp;Submitting...</> : 'Submit Application'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Loans List */}
      {loans.length === 0 ? (
        <div className="empty-state card">
          <div className="card-body" style={{textAlign:'center',padding:60}}>
            <DollarSign size={48} style={{opacity:0.2,display:'block',margin:'0 auto 16px'}}/>
            <h3 style={{fontFamily:'var(--font-serif)',color:'var(--text-dark)',marginBottom:8}}>No Loan Applications</h3>
            <p style={{color:'var(--text-light)',marginBottom:20}}>Apply for a loan to get started</p>
            <button className="btn btn-primary" onClick={() => setShowApply(true)}>Apply Now</button>
          </div>
        </div>
      ) : (
        <div className="loans-list">
          {loans.map(loan => (
            <div key={loan.id} className="loan-card card">
              <div className="loan-card-header" onClick={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}>
                <div className="loan-info">
                  <div className="loan-type-badge">{LOAN_TYPES.find(t => t.value === loan.loan_type)?.icon || '💰'}</div>
                  <div>
                    <h4>{LOAN_TYPES.find(t => t.value === loan.loan_type)?.label || loan.loan_type}</h4>
                    <p style={{fontSize:12,color:'var(--text-light)'}}>#{loan.loan_number} · Applied {format(new Date(loan.applied_at), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:16}}>
                  <div style={{textAlign:'right'}}>
                    <p style={{fontWeight:700,fontSize:18,fontFamily:'var(--font-serif)'}}>${(loan.approved_amount || loan.amount).toLocaleString()}</p>
                    {statusIcon(loan.status)}
                  </div>
                  {expandedLoan === loan.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                </div>
              </div>

              {expandedLoan === loan.id && (
                <div className="loan-details">
                  <div className="loan-details-grid">
                    <div className="detail-item"><span>Loan Amount</span><strong>${(loan.approved_amount || loan.amount).toLocaleString()}</strong></div>
                    <div className="detail-item"><span>Interest Rate</span><strong>{loan.interest_rate}% APR</strong></div>
                    <div className="detail-item"><span>Term</span><strong>{loan.term_months} months</strong></div>
                    <div className="detail-item"><span>Monthly Payment</span><strong>${loan.monthly_payment?.toFixed(2) || '—'}</strong></div>
                    <div className="detail-item"><span>Amount Paid</span><strong>${loan.amount_paid?.toFixed(2)}</strong></div>
                    <div className="detail-item"><span>Outstanding</span><strong style={{color:'var(--error)'}}>${loan.outstanding_balance?.toFixed(2)}</strong></div>
                  </div>

                  {loan.status === 'active' && loan.outstanding_balance > 0 && (
                    <div style={{marginTop:16}}>
                      {showPayment === loan.id ? (
                        <div className="payment-form">
                          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                            <select style={{flex:1,padding:'10px 12px',border:'1.5px solid var(--border)',borderRadius:8}} value={payAccountId} onChange={e => setPayAccountId(e.target.value)}>
                              <option value="">Select account</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_type} (${a.available_balance.toFixed(2)})</option>)}
                            </select>
                            <input type="number" style={{flex:1,padding:'10px 12px',border:'1.5px solid var(--border)',borderRadius:8}} placeholder={`Payment (min $${loan.monthly_payment?.toFixed(2)})`} value={payAmount} onChange={e => setPayAmount(e.target.value)} min={loan.monthly_payment} max={loan.outstanding_balance}/>
                          </div>
                          <div style={{display:'flex',gap:8,marginTop:8}}>
                            <button className="btn btn-primary btn-sm" onClick={() => handlePayment(loan.id)} disabled={paying}>{paying ? 'Processing...' : 'Make Payment'}</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowPayment(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button className="btn btn-gold btn-sm" onClick={() => setShowPayment(loan.id)}>
                          💳 Make Payment
                        </button>
                      )}
                    </div>
                  )}

                  {loan.purpose && <p style={{marginTop:12,fontSize:13,color:'var(--text-mid)'}}>Purpose: {loan.purpose}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
