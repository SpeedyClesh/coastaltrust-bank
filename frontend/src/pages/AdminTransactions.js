import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, Shield } from 'lucide-react';

export function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30, ...(typeFilter && { type: typeFilter }) });
      const { data } = await api.get(`/admin/transactions?${params}`);
      setTransactions(data.transactions);
      setTotal(data.total);
    } finally { setLoading(false); }
  }, [page, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const isCredit = (t) => ['deposit', 'credit', 'loan_disbursement', 'admin_deposit'].includes(t);
  const typeColors = { deposit: '#2d5a3d', withdrawal: '#8a2020', transfer: '#1a4a7a', loan_payment: '#7a5a1a', loan_disbursement: '#2d5a3d', admin_deposit: '#5a1a7a' };

  return (
    <div style={{ maxWidth: 1200 }} className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26 }}>Transaction Monitor</h1>
        <p style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 4 }}>{total} total transactions across all accounts</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['', 'All'], ['deposit', 'Deposits'], ['withdrawal', 'Withdrawals'], ['transfer', 'Transfers'], ['loan_payment', 'Loan Payments'], ['admin_deposit', 'Admin Credits']].map(([val, label]) => (
            <button key={val} className={`btn btn-sm ${typeFilter === val ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTypeFilter(val); setPage(1); }}>{label}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead><tr><th>User</th><th>Type</th><th>Description</th><th>Date</th><th>Reference</th><th>Status</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id}>
                      <td>
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{t.first_name} {t.last_name}</p>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: (typeColors[t.type] || '#555') + '18', color: typeColors[t.type] || 'var(--text-mid)', textTransform: 'capitalize' }}>
                          {t.type?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ maxWidth: 200, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-mid)' }}>{t.description || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{format(new Date(t.created_at), 'MMM d, yyyy HH:mm')}</td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-light)' }}>{t.transaction_ref}</td>
                      <td><span className={`badge badge-${t.status === 'completed' ? 'success' : 'warning'}`}>{t.status}</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                          {isCredit(t.type) ? <ArrowDownLeft size={13} color="var(--success)" /> : <ArrowUpRight size={13} color="var(--error)" />}
                          <span style={{ fontWeight: 700, color: isCredit(t.type) ? 'var(--success)' : 'var(--error)', fontSize: 14 }}>
                            {isCredit(t.type) ? '+' : '-'}${t.amount.toFixed(2)}
                          </span>
                        </div>
                        {t.fee > 0 && <p style={{ fontSize: 10, color: 'var(--text-light)', textAlign: 'right' }}>+${t.fee.toFixed(2)} fee</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-light)' }}>Page {page} · {total} total</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="btn btn-secondary btn-sm" disabled={page * 30 >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/audit-logs?page=${page}&limit=50`);
      setLogs(data.logs);
      setTotal(data.total);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const actionColors = {
    USER_LOGIN: 'info', USER_REGISTER: 'success', TRANSFER: 'warning',
    ADMIN_DEPOSIT: 'success', UPDATE_USER_STATUS: 'info', UPDATE_LOAN: 'info',
    LOAN_APPLY: 'warning', PASSWORD_CHANGE: 'warning', PROFILE_UPDATE: 'gray',
  };

  return (
    <div style={{ maxWidth: 1200 }} className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={28} color="var(--forest)" />
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26 }}>Audit Logs</h1>
            <p style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 2 }}>{total} security events recorded</p>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead><tr><th>Action</th><th>User</th><th>Resource</th><th>IP Address</th><th>Timestamp</th></tr></thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <span className={`badge badge-${actionColors[log.action] || 'gray'}`} style={{ fontSize: 11 }}>{log.action}</span>
                      </td>
                      <td>
                        {log.first_name ? (
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600 }}>{log.first_name} {log.last_name}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-light)' }}>{log.email}</p>
                          </div>
                        ) : <span style={{ color: 'var(--text-light)', fontSize: 13 }}>System</span>}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-mid)', textTransform: 'capitalize' }}>
                        {log.resource}{log.resource_id && <span style={{ fontSize: 11, color: 'var(--text-light)', display: 'block' }}>{log.resource_id?.slice(0, 12)}...</span>}
                      </td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-light)' }}>{log.ip_address}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-light)' }}>Page {page} · {total} total events</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                <button className="btn btn-secondary btn-sm" disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
