import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { format } from 'date-fns';
import { Search, Filter, Download, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import './TransactionHistory.css';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ type: '', startDate: '', endDate: '', search: '' });
  const limit = 20;

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit, ...filters });
      const { data } = await api.get(`/transactions?${params}`);
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const txnColors = { deposit: 'success', credit: 'success', loan_disbursement: 'success', transfer: 'info', withdrawal: 'error', loan_payment: 'warning' };

  const isCredit = (t) => ['deposit','credit','loan_disbursement'].includes(t);

  const exportCSV = () => {
    const rows = [['Date','Type','Description','Amount','Reference','Status']];
    transactions.forEach(t => rows.push([format(new Date(t.created_at),'yyyy-MM-dd'),t.type,t.description||'',t.amount,t.transaction_ref,t.status]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'coastaltrust-transactions.csv'; a.click();
  };

  return (
    <div className="transactions-page page-enter">
      <div className="page-header">
        <div><h1>Transaction History</h1><p>{total} total transactions</p></div>
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}><Download size={14}/> Export CSV</button>
      </div>

      {/* Filters */}
      <div className="filters-bar card">
        <div className="card-body" style={{padding:'16px 20px',display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative',flex:2,minWidth:180}}>
            <Search size={15} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text-light)'}}/>
            <input style={{paddingLeft:34,width:'100%',padding:'9px 12px 9px 34px',border:'1.5px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:14}} placeholder="Search transactions..." value={filters.search} onChange={e => setFilters(f => ({...f,search:e.target.value}))}/>
          </div>
          <select style={{padding:'9px 12px',border:'1.5px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:14,color:'var(--text-mid)'}} value={filters.type} onChange={e => { setFilters(f => ({...f,type:e.target.value})); setPage(1); }}>
            <option value="">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="transfer">Transfers</option>
            <option value="loan_payment">Loan Payments</option>
            <option value="loan_disbursement">Loan Disbursements</option>
          </select>
          <input type="date" style={{padding:'9px 12px',border:'1.5px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:14}} value={filters.startDate} onChange={e => setFilters(f => ({...f,startDate:e.target.value}))}/>
          <input type="date" style={{padding:'9px 12px',border:'1.5px solid var(--border)',borderRadius:'var(--radius-sm)',fontSize:14}} value={filters.endDate} onChange={e => setFilters(f => ({...f,endDate:e.target.value}))}/>
          {(filters.type || filters.startDate || filters.endDate) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({type:'',startDate:'',endDate:'',search:''}); setPage(1); }}>Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{marginTop:16}}>
        {loading ? (
          <div style={{display:'flex',justifyContent:'center',padding:60}}><div className="spinner" style={{width:28,height:28,borderWidth:3}}/></div>
        ) : transactions.length === 0 ? (
          <div style={{textAlign:'center',padding:60,color:'var(--text-light)'}}>
            <Filter size={40} style={{opacity:0.2,display:'block',margin:'0 auto 12px'}}/>
            <p>No transactions found</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Date & Time</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th style={{textAlign:'right'}}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span className={`txn-dot ${txnColors[t.type] || 'gray'}`}/>
                          <span style={{fontSize:13,fontWeight:500,textTransform:'capitalize'}}>{t.type.replace(/_/g,' ')}</span>
                        </div>
                      </td>
                      <td style={{maxWidth:200}}>
                        <p style={{fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.description || '—'}</p>
                        {t.recipient_name && <p style={{fontSize:11,color:'var(--text-light)'}}>To: {t.recipient_name}</p>}
                      </td>
                      <td>
                        <p style={{fontSize:13}}>{format(new Date(t.created_at),'MMM d, yyyy')}</p>
                        <p style={{fontSize:11,color:'var(--text-light)'}}>{format(new Date(t.created_at),'HH:mm')}</p>
                      </td>
                      <td>
                        <span style={{fontSize:11,fontFamily:'monospace',color:'var(--text-light)',background:'var(--cream)',padding:'2px 6px',borderRadius:4}}>{t.transaction_ref}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${t.status === 'completed' ? 'success' : t.status === 'pending' ? 'warning' : 'error'}`}>{t.status}</span>
                      </td>
                      <td style={{textAlign:'right'}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:4}}>
                          {isCredit(t.type) ? <ArrowDownLeft size={14} color="var(--success)"/> : <ArrowUpRight size={14} color="var(--error)"/>}
                          <span style={{fontWeight:600,fontSize:14,color:isCredit(t.type)?'var(--success)':'var(--error)'}}>
                            {isCredit(t.type)?'+':'-'}${t.amount.toFixed(2)}
                          </span>
                        </div>
                        {t.fee > 0 && <p style={{fontSize:11,color:'var(--text-light)'}}>+${t.fee.toFixed(2)} fee</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderTop:'1px solid var(--border)'}}>
              <span style={{fontSize:13,color:'var(--text-light)'}}>Showing {((page-1)*limit)+1}–{Math.min(page*limit,total)} of {total}</span>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-secondary btn-sm" disabled={page===1} onClick={() => setPage(p => p-1)}>← Prev</button>
                <button className="btn btn-secondary btn-sm" disabled={page*limit>=total} onClick={() => setPage(p => p+1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
