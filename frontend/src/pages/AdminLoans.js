import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Eye, X, DollarSign } from 'lucide-react';

const LOAN_TYPES = { personal: '👤', auto: '🚗', home: '🏠', business: '🏢', student: '🎓' };

export default function AdminLoans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { loan, type: 'approve'|'reject' }
  const [notes, setNotes] = useState('');
  const [approvedAmount, setApprovedAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const { data } = await api.get(`/admin/loans${params}`);
      setLoans(data);
    } catch { toast.error('Failed to load loans'); }
    finally { setLoading(false); }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const payload = actionModal.type === 'approve'
        ? { status: 'active', approvedAmount: parseFloat(approvedAmount) || actionModal.loan.amount, notes }
        : { status: 'rejected', notes };
      await api.put(`/admin/loans/${actionModal.loan.id}`, payload);
      toast.success(`Loan ${actionModal.type === 'approve' ? 'approved' : 'rejected'} successfully`);
      setActionModal(null);
      setNotes('');
      setApprovedAmount('');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setProcessing(false); }
  };

  const statusBadge = (s) => {
    const cfg = { active: ['success', 'Active'], pending: ['warning', 'Pending'], rejected: ['error', 'Rejected'], paid_off: ['gray', 'Paid Off'] };
    const [color, label] = cfg[s] || ['gray', s];
    return <span className={`badge badge-${color}`}>{label}</span>;
  };

  const totalPending = loans.filter(l => l.status === 'pending').length;
  const totalActive = loans.filter(l => l.status === 'active').reduce((s, l) => s + (l.outstanding_balance || 0), 0);

  return (
    <div style={{ maxWidth: 1100 }} className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div><h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26 }}>Loan Management</h1><p style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 4 }}>{loans.length} total applications</p></div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Pending Review', value: totalPending, color: 'var(--warning)', bg: 'var(--warning-bg)' },
          { label: 'Active Loans Outstanding', value: `$${totalActive.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: 'var(--error)', bg: 'var(--error-bg)' },
          { label: 'Total Applications', value: loans.length, color: 'var(--info)', bg: 'var(--info-bg)' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 'var(--radius)', padding: '16px 20px', border: `1px solid ${s.color}30` }}>
            <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: s.color, marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 20px', display: 'flex', gap: 8 }}>
          {['', 'pending', 'active', 'rejected', 'paid_off'].map(s => (
            <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)} style={{ textTransform: 'capitalize' }}>
              {s || 'All'} {s === 'pending' && totalPending > 0 && <span style={{ background: '#e74c3c', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>{totalPending}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
        ) : loans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-light)' }}><DollarSign size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 12px' }} /><p>No loans found</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Applicant</th><th>Type</th><th>Amount</th><th>Term</th><th>Rate</th><th>Monthly</th><th>Outstanding</th><th>Status</th><th>Applied</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loans.map(loan => (
                  <tr key={loan.id}>
                    <td>
                      <p style={{ fontWeight: 600, fontSize: 13 }}>{loan.first_name} {loan.last_name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-light)' }}>{loan.email}</p>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        {LOAN_TYPES[loan.loan_type] || '💰'} <span style={{ textTransform: 'capitalize' }}>{loan.loan_type}</span>
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>${(loan.approved_amount || loan.amount).toLocaleString()}</td>
                    <td style={{ fontSize: 13 }}>{loan.term_months}mo</td>
                    <td style={{ fontSize: 13 }}>{loan.interest_rate}%</td>
                    <td style={{ fontSize: 13 }}>${loan.monthly_payment?.toFixed(2)}</td>
                    <td style={{ fontWeight: 600, color: loan.outstanding_balance > 0 ? 'var(--error)' : 'var(--success)' }}>
                      {loan.outstanding_balance != null ? `$${loan.outstanding_balance.toFixed(2)}` : '—'}
                    </td>
                    <td>{statusBadge(loan.status)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{format(new Date(loan.applied_at), 'MMM d, yyyy')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedLoan(loan)} title="View"><Eye size={13} /></button>
                        {loan.status === 'pending' && (
                          <>
                            <button className="btn btn-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}
                              onClick={() => { setActionModal({ loan, type: 'approve' }); setApprovedAmount(loan.amount); }} title="Approve">
                              <CheckCircle size={13} />
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => setActionModal({ loan, type: 'reject' })} title="Reject">
                              <XCircle size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setSelectedLoan(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--white)', zIndex: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>Loan Details — #{selectedLoan.loan_number}</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setSelectedLoan(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: 'var(--cream)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <p style={{ fontWeight: 700, fontSize: 16 }}>{selectedLoan.first_name} {selectedLoan.last_name}</p>
                <p style={{ color: 'var(--text-light)', fontSize: 13 }}>{selectedLoan.email}</p>
                <div style={{ marginTop: 8 }}>{statusBadge(selectedLoan.status)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  ['Loan Number', selectedLoan.loan_number], ['Loan Type', selectedLoan.loan_type],
                  ['Requested Amount', `$${selectedLoan.amount.toLocaleString()}`], ['Approved Amount', selectedLoan.approved_amount ? `$${selectedLoan.approved_amount.toLocaleString()}` : 'Pending'],
                  ['Interest Rate', `${selectedLoan.interest_rate}% APR`], ['Term', `${selectedLoan.term_months} months`],
                  ['Monthly Payment', `$${selectedLoan.monthly_payment?.toFixed(2)}`], ['Total Payable', `$${selectedLoan.total_payable?.toFixed(2)}`],
                  ['Amount Paid', `$${selectedLoan.amount_paid?.toFixed(2)}`], ['Outstanding', `$${selectedLoan.outstanding_balance?.toFixed(2)}`],
                  ['Purpose', selectedLoan.purpose || '—'], ['Collateral', selectedLoan.collateral || 'None'],
                ].map(([k, v], i) => (
                  <div key={i} style={{ background: 'var(--cream)', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ fontSize: 11, color: 'var(--text-light)', marginBottom: 3 }}>{k}</p>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{v}</p>
                  </div>
                ))}
              </div>
              {selectedLoan.status === 'pending' && (
                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button className="btn btn-sm" style={{ flex: 1, background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}
                    onClick={() => { setActionModal({ loan: selectedLoan, type: 'approve' }); setApprovedAmount(selectedLoan.amount); setSelectedLoan(null); }}>
                    <CheckCircle size={14} /> Approve Loan
                  </button>
                  <button className="btn btn-sm btn-danger" style={{ flex: 1 }}
                    onClick={() => { setActionModal({ loan: selectedLoan, type: 'reject' }); setSelectedLoan(null); }}>
                    <XCircle size={14} /> Reject Loan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => e.target === e.currentTarget && setActionModal(null)}>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 420, padding: 32, boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: 8, color: actionModal.type === 'approve' ? 'var(--success)' : 'var(--error)' }}>
              {actionModal.type === 'approve' ? '✅ Approve Loan' : '❌ Reject Loan'}
            </h2>
            <p style={{ color: 'var(--text-mid)', fontSize: 14, marginBottom: 20 }}>
              {actionModal.type === 'approve' ? 'Funds will be credited to the user\'s checking account immediately.' : 'The applicant will be notified of the rejection.'}
            </p>
            <div style={{ background: 'var(--cream)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <p style={{ fontWeight: 600 }}>{actionModal.loan.first_name} {actionModal.loan.last_name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>{actionModal.loan.loan_type} loan · Applied ${actionModal.loan.amount.toLocaleString()}</p>
            </div>
            {actionModal.type === 'approve' && (
              <div className="form-group">
                <label>Approved Amount ($)</label>
                <input type="number" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} min="1" max={actionModal.loan.amount} step="100" />
              </div>
            )}
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={actionModal.type === 'approve' ? 'Approval notes...' : 'Reason for rejection...'} style={{ resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setActionModal(null)}>Cancel</button>
              <button className={`btn ${actionModal.type === 'approve' ? 'btn-primary' : 'btn-danger'}`} style={{ flex: 2 }} onClick={handleAction} disabled={processing}>
                {processing ? <><span className="spinner" />&nbsp;Processing...</> : actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
