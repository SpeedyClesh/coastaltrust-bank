import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Search, Eye, CheckCircle, XCircle, DollarSign, User, X, AlertCircle, Shield } from 'lucide-react';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [depositModal, setDepositModal] = useState(null);
  const [depositForm, setDepositForm] = useState({ accountId: '', amount: '', description: '' });
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, ...(search && { search }), ...(statusFilter && { status: statusFilter }) });
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users);
      setTotal(data.total);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const loadUserDetail = async (userId) => {
    try {
      const { data } = await api.get(`/admin/users/${userId}`);
      setUserDetail(data);
      setSelectedUser(userId);
    } catch { toast.error('Failed to load user'); }
  };

  const updateStatus = async (userId, status, kycStatus) => {
    setProcessing(true);
    try {
      await api.put(`/admin/users/${userId}/status`, { status, kycStatus });
      toast.success('User status updated');
      load();
      if (userDetail?.id === userId) loadUserDetail(userId);
    } catch { toast.error('Update failed'); }
    finally { setProcessing(false); }
  };

  const doDeposit = async () => {
    if (!depositForm.accountId || !depositForm.amount) return toast.error('Fill all fields');
    setProcessing(true);
    try {
      const { data } = await api.post('/admin/deposit', { userId: depositModal.id, ...depositForm });
      toast.success(`$${depositForm.amount} added! New balance: $${data.newBalance.toFixed(2)}`);
      setDepositModal(null);
      setDepositForm({ accountId: '', amount: '', description: '' });
      load();
      if (userDetail?.id === depositModal.id) loadUserDetail(depositModal.id);
    } catch (err) { toast.error(err.response?.data?.message || 'Deposit failed'); }
    finally { setProcessing(false); }
  };

  const statusBadge = (s) => {
    const map = { active: 'success', pending: 'warning', suspended: 'error' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  const kycBadge = (s) => {
    const map = { approved: 'success', submitted: 'info', pending: 'warning', rejected: 'error' };
    return <span className={`badge badge-${map[s] || 'gray'}`}>{s}</span>;
  };

  return (
    <div style={{ maxWidth: 1200 }} className="page-enter">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div><h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26 }}>User Management</h1><p style={{ color: 'var(--text-light)', fontSize: 14, marginTop: 4 }}>{total} registered users</p></div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 2, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} />
            <input style={{ paddingLeft: 34, width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14 }}
              placeholder="Search by name, email, account..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select style={{ padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 14 }}
            value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>User</th><th>Account #</th><th>Status</th><th>KYC</th><th>Joined</th><th>Last Login</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--forest)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 14 }}>{u.first_name} {u.last_name}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-mid)' }}>{u.account_number}</td>
                      <td>{statusBadge(u.status)}</td>
                      <td>{kycBadge(u.kyc_status)}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{format(new Date(u.created_at), 'MMM d, yyyy')}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{u.last_login ? format(new Date(u.last_login), 'MMM d, HH:mm') : 'Never'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => loadUserDetail(u.id)} title="View"><Eye size={13} /></button>
                          {u.status === 'pending' && (
                            <button className="btn btn-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}
                              onClick={() => updateStatus(u.id, 'active', 'approved')} title="Approve" disabled={processing}>
                              <CheckCircle size={13} />
                            </button>
                          )}
                          {u.status === 'active' && (
                            <button className="btn btn-sm btn-danger" onClick={() => updateStatus(u.id, 'suspended')} title="Suspend" disabled={processing}>
                              <XCircle size={13} />
                            </button>
                          )}
                          {u.status === 'suspended' && (
                            <button className="btn btn-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)' }}
                              onClick={() => updateStatus(u.id, 'active')} title="Reactivate" disabled={processing}>
                              <CheckCircle size={13} />
                            </button>
                          )}
                          <button className="btn btn-sm" style={{ background: 'var(--gold-pale)', color: 'var(--warning)', border: '1px solid var(--gold)' }}
                            onClick={() => setDepositModal(u)} title="Add Funds">
                            <DollarSign size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-light)' }}>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="btn btn-secondary btn-sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && userDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedUser(null); }}>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 680, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--white)', zIndex: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>User Details</h2>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }} onClick={() => setSelectedUser(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: 24 }}>
              {/* User header */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, padding: 16, background: 'var(--cream)', borderRadius: 'var(--radius)' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--forest)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
                  {userDetail.first_name?.[0]}{userDetail.last_name?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18 }}>{userDetail.first_name} {userDetail.last_name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)' }}>{userDetail.email} · {userDetail.phone}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {statusBadge(userDetail.status)}
                    {kycBadge(userDetail.kyc_status)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {userDetail.status === 'pending' && <button className="btn btn-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', fontSize: 12 }} onClick={() => updateStatus(userDetail.id, 'active', 'approved')} disabled={processing}><CheckCircle size={13} /> Approve</button>}
                  {userDetail.status === 'active' && <button className="btn btn-sm btn-danger" onClick={() => updateStatus(userDetail.id, 'suspended')} disabled={processing}><XCircle size={13} /> Suspend</button>}
                  {userDetail.status === 'suspended' && <button className="btn btn-sm" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success)', fontSize: 12 }} onClick={() => updateStatus(userDetail.id, 'active')} disabled={processing}><CheckCircle size={13} /> Reactivate</button>}
                  <button className="btn btn-sm btn-gold" onClick={() => { setDepositModal(userDetail); }} ><DollarSign size={13} /> Add Funds</button>
                </div>
              </div>

              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Account Number', value: userDetail.account_number },
                  { label: 'Date of Birth', value: userDetail.date_of_birth || '—' },
                  { label: 'Address', value: [userDetail.address, userDetail.city, userDetail.state, userDetail.zip_code].filter(Boolean).join(', ') || '—' },
                  { label: 'Country', value: userDetail.country || '—' },
                  { label: 'Member Since', value: format(new Date(userDetail.created_at), 'MMM d, yyyy') },
                  { label: 'Last Login', value: userDetail.last_login ? format(new Date(userDetail.last_login), 'MMM d, yyyy HH:mm') : 'Never' },
                ].map((item, i) => (
                  <div key={i} style={{ background: 'var(--cream)', borderRadius: 8, padding: 12 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{item.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-dark)' }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Accounts */}
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, marginBottom: 12 }}>Accounts</h4>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {userDetail.accounts?.map(acc => (
                  <div key={acc.id} style={{ flex: 1, minWidth: 160, background: 'var(--forest)', borderRadius: 12, padding: 16, color: 'white' }}>
                    <p style={{ fontSize: 12, opacity: 0.7, textTransform: 'capitalize' }}>{acc.account_type}</p>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 700, color: 'var(--gold)', margin: '4px 0' }}>${acc.balance.toFixed(2)}</p>
                    <p style={{ fontSize: 11, opacity: 0.5 }}>••••{acc.account_number.slice(-4)}</p>
                  </div>
                ))}
              </div>

              {/* Recent transactions */}
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: 16, marginBottom: 12 }}>Recent Transactions</h4>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                {userDetail.transactions?.length === 0 ? (
                  <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-light)', fontSize: 13 }}>No transactions</p>
                ) : userDetail.transactions?.slice(0, 8).map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <div>
                      <p style={{ fontWeight: 500, textTransform: 'capitalize' }}>{t.type?.replace(/_/g, ' ')}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-light)' }}>{t.transaction_ref} · {format(new Date(t.created_at), 'MMM d, HH:mm')}</p>
                    </div>
                    <span style={{ fontWeight: 700, color: ['deposit', 'credit', 'loan_disbursement'].includes(t.type) ? 'var(--success)' : 'var(--error)' }}>
                      {['deposit', 'credit', 'loan_disbursement'].includes(t.type) ? '+' : '-'}${t.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {depositModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setDepositModal(null); }}>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 440, padding: 32, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--forest)' }}>Add Funds to Account</h2>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setDepositModal(null)}><X size={20} /></button>
            </div>
            <div style={{ background: 'var(--cream)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
              <p style={{ fontWeight: 600 }}>{depositModal.first_name} {depositModal.last_name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-light)' }}>{depositModal.email}</p>
            </div>
            <div className="form-group">
              <label>Select Account</label>
              <select value={depositForm.accountId} onChange={e => setDepositForm(f => ({ ...f, accountId: e.target.value }))}>
                <option value="">Choose account...</option>
                {(userDetail?.id === depositModal.id ? userDetail.accounts : []).map(a => (
                  <option key={a.id} value={a.id}>{a.account_type} — ••••{a.account_number.slice(-4)} (${a.balance.toFixed(2)})</option>
                ))}
                {userDetail?.id !== depositModal.id && <option value="load">Loading...</option>}
              </select>
              {!userDetail || userDetail.id !== depositModal.id ? (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => loadUserDetail(depositModal.id)}>Load Account Info</button>
              ) : null}
            </div>
            <div className="form-group">
              <label>Amount (USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: 18, color: 'var(--text-mid)' }}>$</span>
                <input type="number" min="1" step="0.01" style={{ paddingLeft: 28, fontSize: 20, fontWeight: 700 }} value={depositForm.amount} onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={depositForm.description} onChange={e => setDepositForm(f => ({ ...f, description: e.target.value }))} placeholder="Admin deposit, bonus, etc." />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDepositModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={doDeposit} disabled={processing || !depositForm.accountId || !depositForm.amount}>
                {processing ? <><span className="spinner" />&nbsp;Processing...</> : <><DollarSign size={15} />&nbsp;Add Funds</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
