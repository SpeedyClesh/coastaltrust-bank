import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, TrendingUp, Eye, EyeOff, Plus, CreditCard, AlertCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import './Dashboard.css';

const COLORS = ['#2d5a3d', '#c8a96e', '#1a4a7a', '#8a3a5a'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [accs, txns, lns] = await Promise.all([
        api.get('/accounts'),
        api.get('/transactions?limit=10'),
        api.get('/loans'),
      ]);
      setAccounts(accs.data);
      setTransactions(txns.data.transactions || []);
      setLoans(lns.data);

      // Build chart data from transactions
      const monthMap = {};
      (txns.data.transactions || []).forEach(t => {
        const m = format(new Date(t.created_at), 'MMM dd');
        if (!monthMap[m]) monthMap[m] = { date: m, income: 0, expense: 0 };
        if (['deposit','credit','loan_disbursement'].includes(t.type)) monthMap[m].income += t.amount;
        else monthMap[m].expense += t.amount;
      });
      setChartData(Object.values(monthMap).slice(-7).reverse());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const checking = accounts.find(a => a.account_type === 'checking');
  const savings = accounts.find(a => a.account_type === 'savings');
  const activeLoans = loans.filter(l => l.status === 'active');
  const pendingLoans = loans.filter(l => l.status === 'pending');

  const txnIcon = (type) => {
    if (['deposit','credit','loan_disbursement'].includes(type)) return <span className="txn-icon credit"><ArrowDownLeft size={16}/></span>;
    return <span className="txn-icon debit"><ArrowUpRight size={16}/></span>;
  };

  const txnColor = (type) => ['deposit','credit','loan_disbursement'].includes(type) ? 'credit' : 'debit';

  if (loading) return (
    <div className="dashboard-loading">
      <div className="spinner" style={{width:32,height:32,borderWidth:3}}/>
      <p>Loading your dashboard...</p>
    </div>
  );

  return (
    <div className="dashboard page-enter">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {user?.firstName}! 👋</h1>
          <p>Here's your financial overview for {format(new Date(), 'MMMM d, yyyy')}</p>
        </div>
        {user?.status === 'pending' && (
          <div className="dash-alert">
            <AlertCircle size={16}/>
            Account pending verification — limited access
          </div>
        )}
        {user?.kycStatus === 'pending' && user?.status === 'active' && (
          <button className="btn btn-gold btn-sm" onClick={() => navigate('/profile')}>
            Upload KYC Documents
          </button>
        )}
      </div>

      {/* Balance Hero */}
      <div className="balance-hero">
        <div className="balance-hero-content">
          <div className="balance-main">
            <p className="balance-label">Total Portfolio Balance</p>
            <div className="balance-amount-row">
              <h2 className="balance-amount">
                {hideBalance ? '••••••' : `$${totalBalance.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})}`}
              </h2>
              <button className="hide-balance-btn" onClick={() => setHideBalance(!hideBalance)}>
                {hideBalance ? <Eye size={20}/> : <EyeOff size={20}/>}
              </button>
            </div>
            <p className="balance-sub">Account #{user?.accountNumber}</p>
          </div>
          <div className="balance-actions">
            <button className="balance-action-btn" onClick={() => navigate('/transfer')}>
              <ArrowLeftRight size={20}/>
              <span>Transfer</span>
            </button>
            <button className="balance-action-btn" onClick={() => navigate('/deposit')}>
              <TrendingUp size={20}/>
              <span>Deposit</span>
            </button>
            <button className="balance-action-btn" onClick={() => navigate('/withdraw')}>
              <ArrowDownLeft size={20}/>
              <span>Withdraw</span>
            </button>
          </div>
        </div>
        <div className="balance-hero-bg"/>
      </div>

      {/* Account Cards */}
      <div className="accounts-row">
        {accounts.map((acc, i) => (
          <div key={acc.id} className={`account-card account-card-${i % 3}`}>
            <div className="account-card-top">
              <div>
                <p className="account-type">{acc.account_type === 'checking' ? '💳 Checking' : '💰 Savings'}</p>
                <p className="account-num">••••{acc.account_number.slice(-4)}</p>
              </div>
              <CreditCard size={24} style={{opacity:0.5}}/>
            </div>
            <div className="account-balance">
              {hideBalance ? '••••••' : `$${acc.balance.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})}`}
            </div>
            <div className="account-card-bottom">
              <span className={`badge badge-${acc.status === 'active' ? 'success' : 'warning'}`}>{acc.status}</span>
              {acc.account_type === 'savings' && <span style={{fontSize:11,opacity:0.7}}>APY {(acc.interest_rate * 100).toFixed(1)}%</span>}
            </div>
          </div>
        ))}

        {/* Loan summary card */}
        {activeLoans.length > 0 && (
          <div className="account-card account-card-loan" onClick={() => navigate('/loans')} style={{cursor:'pointer'}}>
            <div className="account-card-top">
              <div>
                <p className="account-type">📋 Active Loans</p>
                <p className="account-num">{activeLoans.length} loan{activeLoans.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="account-balance">
              {hideBalance ? '••••••' : `$${activeLoans.reduce((s,l) => s + l.outstanding_balance, 0).toLocaleString('en-US', {minimumFractionDigits:2})}`}
            </div>
            <div className="account-card-bottom">
              <span className="badge badge-warning">Outstanding</span>
            </div>
          </div>
        )}
      </div>

      {/* Charts + Quick Stats */}
      <div className="dash-grid">
        {/* Chart */}
        <div className="card dash-chart-card">
          <div className="card-header">
            <h3>Activity Overview</h3>
            <span style={{fontSize:13,color:'var(--text-light)'}}>Last 7 transactions</span>
          </div>
          <div className="card-body" style={{paddingTop:8}}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2d5a3d" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2d5a3d" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c8a96e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#c8a96e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                  <XAxis dataKey="date" tick={{fontSize:11,fill:'var(--text-light)'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:'var(--text-light)'}} axisLine={false} tickLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`}/>
                  <Tooltip formatter={(v, n) => [`$${v.toFixed(2)}`, n]} contentStyle={{borderRadius:8,border:'1px solid var(--border)',fontSize:13}}/>
                  <Area type="monotone" dataKey="income" stroke="#2d5a3d" strokeWidth={2} fill="url(#income)" name="Income"/>
                  <Area type="monotone" dataKey="expense" stroke="#c8a96e" strokeWidth={2} fill="url(#expense)" name="Expenses"/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{height:220,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-light)'}}>
                <div style={{textAlign:'center'}}>
                  <TrendingUp size={40} style={{opacity:0.2,display:'block',margin:'0 auto 12px'}}/>
                  <p>No transactions yet</p>
                  <button onClick={() => navigate('/deposit')} className="btn btn-primary btn-sm" style={{marginTop:12}}>Make a Deposit</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions / loans */}
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          {/* Loan alert */}
          {pendingLoans.length > 0 && (
            <div className="card" style={{borderLeft:'4px solid var(--gold)'}}>
              <div className="card-body" style={{padding:16}}>
                <p style={{fontWeight:600,fontSize:14,color:'var(--text-dark)',marginBottom:4}}>⏳ Pending Loan Application</p>
                <p style={{fontSize:13,color:'var(--text-mid)'}}>Your loan application is under review by our team.</p>
                <button onClick={() => navigate('/loans')} className="btn btn-secondary btn-sm" style={{marginTop:12}}>View Status</button>
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="card">
            <div className="card-header"><h3>Quick Stats</h3></div>
            <div className="card-body" style={{padding:'12px 20px'}}>
              {[
                { label: 'Total Transactions', value: transactions.length },
                { label: 'Active Loans', value: activeLoans.length },
                { label: 'Checking Balance', value: `$${(checking?.balance || 0).toFixed(2)}` },
                { label: 'Savings Balance', value: `$${(savings?.balance || 0).toFixed(2)}` },
              ].map((item, i) => (
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:i < 3 ? '1px solid var(--border)' : 'none'}}>
                  <span style={{fontSize:13,color:'var(--text-mid)'}}>{item.label}</span>
                  <span style={{fontSize:14,fontWeight:600,color:'var(--text-dark)'}}>{hideBalance && typeof item.value === 'string' && item.value.startsWith('$') ? '••••' : item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card" style={{marginTop:24}}>
        <div className="card-header">
          <h3>Recent Transactions</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transactions')}>
            View All <ChevronRight size={14}/>
          </button>
        </div>
        {transactions.length === 0 ? (
          <div className="card-body" style={{textAlign:'center',padding:40,color:'var(--text-light)'}}>
            <ArrowLeftRight size={40} style={{opacity:0.2,display:'block',margin:'0 auto 12px'}}/>
            <p>No transactions yet</p>
            <button onClick={() => navigate('/deposit')} className="btn btn-primary btn-sm" style={{marginTop:12}}>
              <Plus size={14}/> Make First Deposit
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th style={{textAlign:'right'}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        {txnIcon(t.type)}
                        <div>
                          <p style={{fontSize:14,fontWeight:500,textTransform:'capitalize'}}>{t.type.replace(/_/g,' ')}</p>
                          <p style={{fontSize:12,color:'var(--text-light)'}}>{t.description?.slice(0,30)}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{fontSize:13,color:'var(--text-mid)'}}>{format(new Date(t.created_at), 'MMM d, yyyy')}</td>
                    <td style={{fontSize:12,fontFamily:'monospace',color:'var(--text-light)'}}>{t.transaction_ref}</td>
                    <td><span className={`badge badge-${t.status === 'completed' ? 'success' : 'warning'}`}>{t.status}</span></td>
                    <td style={{textAlign:'right'}}>
                      <span className={`txn-amount ${txnColor(t.type)}`}>
                        {['deposit','credit','loan_disbursement'].includes(t.type) ? '+' : '-'}${t.amount.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
