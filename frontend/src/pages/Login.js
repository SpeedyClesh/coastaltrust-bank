import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import './Auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="auth-logo-icon">⚓</span>
          <div>
            <h1 className="auth-brand-name">CoastalTrust</h1>
            <p className="auth-brand-sub">PRIVATE BANKING</p>
          </div>
        </div>
        <div className="auth-hero">
          <h2>Your wealth,<br/>protected offshore.</h2>
          <p>Experience the security and prestige of Florida's premier offshore banking institution. Your financial future starts here.</p>
        </div>
        <div className="auth-features">
          <div className="auth-feature"><span>🔒</span><p>256-bit encryption</p></div>
          <div className="auth-feature"><span>🏛️</span><p>FDIC Insured</p></div>
          <div className="auth-feature"><span>🌎</span><p>Global transfers</p></div>
          <div className="auth-feature"><span>📱</span><p>24/7 access</p></div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Sign In</h2>
            <p>Access your CoastalTrust account securely</p>
          </div>

          {error && (
            <div className="auth-alert">
              <AlertCircle size={16}/> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-icon-wrapper">
                <Mail size={16} className="input-icon"/>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon"/>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  required
                />
                <button type="button" className="input-icon-right" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="auth-extras">
              <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <><span className="spinner"/>&nbsp;Signing In...</> : 'Sign In to Account'}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account? <Link to="/register" className="auth-link">Open an Account</Link>
          </p>

          <div className="auth-demo">
            <p>Demo Credentials</p>
            <div className="demo-creds">
              <span>Admin: admin@coastaltrust.com</span>
              <span>Pass: Admin@CoastalTrust2024</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
