import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Users, Activity, DollarSign, BookOpen, Inbox, TrendingUp, Shield, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { api.get('/admin/dashboard').then(r => setData(r.data)).finally(() => setLoading(false)); }, []);

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:80}}><div className="spinner" style={{width:32,height:32,borderWidth:3}}/></div>;

  const { stats, recentUsers, recentTransactions, recentTickets, monthlyData } = data;

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#1a3a2a', sub: `${stats.pendingUsers} pending` },
    { label: 'Total Assets', value: `$${(stats.totalAssets||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`, icon: DollarSign, color: '#7a5a1a', sub: `${stats.totalAccounts} accounts` },
    { label: 'Total Transactions', value: stats.totalTransactions, icon: Activity, color: '#1a2a4a', sub: `$${(stats.totalDeposits||0).toFixed(0)} deposited` },
    { label: 'Active Loans', value: stats.activeLoans, icon: BookOpen, color: '#4a1a2a', sub: `${stats.pendingLoans} pending` },
    { label: 'Open Tickets', value: stats.openTickets, icon: Inbox, color: '#2a3a1a', sub: 'Need attention' },
    { label: 'Total Transfers', value: `$${(stats.totalTransfers||0).toFixed(0)}`, icon: TrendingUp, color: '#1a3a4a', sub: 'Total volume' },
  ];

  const txnTypeColor = { deposit: '#2d5a3d', withdrawal: '#8a2020', transfer: '#1a4a7a', loan_payment: '#7a5a1a' };

  return (
    <div className="admin-dashboard page-enter">
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>CoastalTrust Bank — Management Console</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:12,color:'var(--text-light)'}}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#4ade80',display:'block'}}/>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="admin-stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className="admin-stat-card" style={{'--card-color': card.color}}>
            <div className="admin-stat-icon"><card.icon size={20}/></div>
            <div className="admin-stat-content">
              <p className="admin-stat-label">{card.label}</p>
              <p className="admin-stat-value">{card.value}</p>
              <p className="admin-stat-sub">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="admin-charts-grid">
        <div className="card">
          <div className="card-header"><h3>Monthly Transaction Volume</h3></div>
          <div className="card-body" style={{paddingTop:8}}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[...monthlyData].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'var(--text-light)'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'var(--text-light)'}} axisLine={false} tickLine={false} tickFormatter={v => `$${v>=1000?(v/1000).toFixed(0)+'k':v}`}/>
                <Tooltip contentStyle={{borderRadius:8,border:'1px solid var(--border)',fontSize:13}} formatter={v => [`$${v.toFixed(2)}`]}/>
                <Bar dataKey="deposits" fill="#2d5a3d" name="Deposits" radius={[4,4,0,0]}/>
                <Bar dataKey="withdrawals" fill="#c8a96e" name="Withdrawals" radius={[4,4,0,0]}/>
                <Bar dataKey="transfers" fill="#1a4a7a" name="Transfers" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>Transaction Count Trend</h3></div>
          <div className="card-body" style={{paddingTop:8}}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={[...monthlyData].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'var(--text-light)'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'var(--text-light)'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{borderRadius:8,border:'1px solid var(--border)',fontSize:13}}/>
                <Line type="monotone" dataKey="count" stroke="#c8a96e" strokeWidth={2} dot={{fill:'#c8a96e',r:4}} name="Transactions"/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Data Grid */}
      <div className="admin-data-grid">
        {/* Recent Users */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Registrations</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/users')}>View All <ChevronRight size={13}/></button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>User</th><th>Status</th><th>KYC</th><th>Joined</th></tr></thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id} style={{cursor:'pointer'}} onClick={() => navigate(`/admin/users/${u.id}`)}>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'var(--forest)',color:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <div>
                          <p style={{fontWeight:500,fontSize:13}}>{u.first_name} {u.last_name}</p>
                          <p style={{fontSize:11,color:'var(--text-light)'}}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge badge-${u.status==='active'?'success':u.status==='pending'?'warning':'error'}`}>{u.status}</span></td>
                    <td><span className={`badge badge-${u.kyc_status==='approved'?'success':u.kyc_status==='pending'?'warning':'info'}`}>{u.kyc_status}</span></td>
                    <td style={{fontSize:12,color:'var(--text-light)'}}>{format(new Date(u.created_at),'MMM d')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Transactions</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/transactions')}>View All <ChevronRight size={13}/></button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>User</th><th>Type</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>
                {recentTransactions.map(t => (
                  <tr key={t.id}>
                    <td style={{fontSize:13}}>{t.first_name} {t.last_name}</td>
                    <td>
                      <span className="badge" style={{background:txnTypeColor[t.type]+'20',color:txnTypeColor[t.type]||'var(--text-mid)',textTransform:'capitalize'}}>
                        {t.type?.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td style={{fontWeight:600,fontSize:14}}>${t.amount.toFixed(2)}</td>
                    <td style={{fontSize:12,color:'var(--text-light)'}}>{format(new Date(t.created_at),'MMM d, HH:mm')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Open Tickets */}
        <div className="card">
          <div className="card-header">
            <h3>Open Support Tickets</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/tickets')}>View All <ChevronRight size={13}/></button>
          </div>
          {recentTickets.length === 0 ? (
            <div style={{padding:24,textAlign:'center',color:'var(--text-light)',fontSize:13}}>No open tickets ✓</div>
          ) : (
            recentTickets.map(t => (
              <div key={t.id} style={{padding:'12px 20px',borderBottom:'1px solid var(--border)',cursor:'pointer'}} onClick={() => navigate(`/admin/tickets`)}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontSize:11,fontFamily:'monospace',color:'var(--text-light)'}}>#{t.ticket_number}</span>
                  <span className={`badge badge-${t.priority==='urgent'?'error':t.priority==='high'?'warning':'info'}`}>{t.priority}</span>
                </div>
                <p style={{fontWeight:500,fontSize:13,marginTop:4}}>{t.subject}</p>
                <p style={{fontSize:12,color:'var(--text-light)',marginTop:2}}>{t.email} · {t.category}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
