import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/shared/Layout';
import './styles/global.css';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import { ForgotPassword, ResetPassword } from './pages/PasswordPages';

// User pages
import Dashboard from './pages/Dashboard';
import { Transfer, Deposit, Withdraw } from './pages/TransactionPages';
import Transactions from './pages/Transactions';
import Loans from './pages/Loans';
import Profile from './pages/Profile';
import Support from './pages/Support';
import { Beneficiaries, Cards } from './pages/BeneficiariesAndCards';

// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminLoans from './pages/AdminLoans';
import AdminTickets from './pages/AdminTickets';
import { AdminTransactions, AdminAuditLogs } from './pages/AdminTransactions';

// Route guards
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, background: 'var(--cream)' }}>
      <div style={{ fontSize: 40 }}>⚓</div>
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-light)', fontSize: 14 }}>Loading CoastalTrust...</p>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* User routes */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="transfer" element={<Transfer />} />
        <Route path="deposit" element={<Deposit />} />
        <Route path="withdraw" element={<Withdraw />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="loans" element={<Loans />} />
        <Route path="cards" element={<Cards />} />
        <Route path="beneficiaries" element={<Beneficiaries />} />
        <Route path="profile" element={<Profile />} />
        <Route path="support" element={<Support />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="loans" element={<AdminLoans />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="audit" element={<AdminAuditLogs />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// Simple admin settings page
function AdminSettings() {
  return (
    <div style={{ maxWidth: 700 }} className="page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 26 }}>Bank Settings</h1>
        <p style={{ fontSize: 14, color: 'var(--text-light)', marginTop: 4 }}>CoastalTrust Bank configuration</p>
      </div>
      <div className="card">
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}><h3>Bank Information</h3></div>
        <div style={{ padding: 24 }}>
          {[
            ['Bank Name', 'CoastalTrust Bank, N.A.'],
            ['Headquarters', '100 Brickell Ave, Miami, FL 33131'],
            ['Routing Number', '067000000'],
            ['SWIFT Code', 'CTBKUS33'],
            ['FDIC Certificate', '#59245'],
            ['Operating Hours', '24/7 Online Banking'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-mid)' }}>{k}</span>
              <strong style={{ color: 'var(--text-dark)' }}>{v}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}><h3>Interest Rates</h3></div>
        <div style={{ padding: 24 }}>
          {[
            ['Savings Account APY', '4.50%'], ['Checking Account', '0.00%'],
            ['Personal Loan APR', '8.50%'], ['Auto Loan APR', '6.50%'],
            ['Home Loan APR', '4.50%'], ['Business Loan APR', '9.50%'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-mid)' }}>{k}</span>
              <strong style={{ color: 'var(--forest)' }}>{v}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--white)',
              color: 'var(--text-dark)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontSize: 14,
              boxShadow: 'var(--shadow-md)',
            },
            success: { iconTheme: { primary: 'var(--success)', secondary: 'white' } },
            error: { iconTheme: { primary: 'var(--error)', secondary: 'white' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
