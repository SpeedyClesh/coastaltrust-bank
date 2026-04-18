import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Mail, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch { toast.error('An error occurred'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand"><span className="auth-logo-icon">⚓</span><div><h1 className="auth-brand-name">CoastalTrust</h1><p className="auth-brand-sub">PRIVATE BANKING</p></div></div>
        <div className="auth-hero"><h2>Forgot your password?</h2><p>No worries. Enter your email and we'll send you a secure reset link.</p></div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={56} color="var(--success)" style={{ display: 'block', margin: '0 auto 20px' }} />
              <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--forest)', marginBottom: 12 }}>Check Your Email</h2>
              <p style={{ color: 'var(--text-mid)', marginBottom: 24 }}>If an account with {email} exists, we've sent a password reset link. Check your inbox and spam folder.</p>
              <Link to="/login" className="btn btn-primary btn-full">Back to Login</Link>
            </div>
          ) : (
            <>
              <div className="auth-card-header">
                <h2>Reset Password</h2>
                <p>Enter your email to receive a reset link</p>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-icon-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                  {loading ? <><span className="spinner" />&nbsp;Sending...</> : 'Send Reset Link'}
                </button>
              </form>
              <p className="auth-switch"><Link to="/login" className="auth-link">← Back to Login</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match');
    if (form.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: form.newPassword });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed. Link may have expired.'); }
    finally { setLoading(false); }
  };

  if (!token) return (
    <div className="auth-page">
      <div className="auth-right" style={{ width: '100%' }}>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--error)' }}>Invalid Reset Link</h2>
          <p style={{ color: 'var(--text-mid)', margin: '12px 0 24px' }}>This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn btn-primary btn-full">Request New Link</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand"><span className="auth-logo-icon">⚓</span><div><h1 className="auth-brand-name">CoastalTrust</h1><p className="auth-brand-sub">PRIVATE BANKING</p></div></div>
        <div className="auth-hero"><h2>Create a new password.</h2><p>Choose a strong password to keep your account secure.</p></div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header"><h2>New Password</h2><p>Enter and confirm your new password</p></div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input type={showPass ? 'text' : 'password'} value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min 8 characters" required />
                <button type="button" className="input-icon-right" onClick={() => setShowPass(!showPass)}>{showPass ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="input-icon-wrapper">
                <Lock size={16} className="input-icon" />
                <input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="Repeat new password" required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" />&nbsp;Resetting...</> : '🔒 Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
