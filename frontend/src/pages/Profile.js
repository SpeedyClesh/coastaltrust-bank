import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Shield, Upload, Lock, Camera, CheckCircle, Clock } from 'lucide-react';
import './Profile.css';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const avatarRef = useRef(null);
  const docRef = useRef(null);

  const [form, setForm] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    zipCode: user?.zip_code || '',
    country: user?.country || 'United States',
  });

  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/profile', form);
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) return toast.error('Passwords do not match');
    if (passForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.put('/auth/change-password', passForm);
      toast.success('Password changed successfully');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      await api.post('/auth/upload-avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      toast.success('Profile photo updated');
    } catch { toast.error('Upload failed'); }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('document', file);
    try {
      await api.post('/auth/upload-document', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      toast.success('Document submitted for review');
    } catch { toast.error('Upload failed'); }
  };

  const tabs = ['personal', 'security', 'kyc'];

  const kycBadge = () => {
    const s = user?.kyc_status;
    if (s === 'approved') return <span className="badge badge-success"><CheckCircle size={12}/>&nbsp;Verified</span>;
    if (s === 'submitted') return <span className="badge badge-warning"><Clock size={12}/>&nbsp;Under Review</span>;
    return <span className="badge badge-error">Not Verified</span>;
  };

  return (
    <div className="profile-page page-enter">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information and security settings</p>
      </div>

      {/* Profile Hero */}
      <div className="profile-hero card">
        <div className="card-body">
          <div className="profile-hero-content">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                {user?.profile_image
                  ? <img src={`http://localhost:5000${user.profile_image}`} alt="profile"/>
                  : <span>{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
                }
              </div>
              <button className="avatar-upload-btn" onClick={() => avatarRef.current?.click()}>
                <Camera size={14}/>
              </button>
              <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarUpload}/>
            </div>
            <div className="profile-hero-info">
              <h2>{user?.first_name} {user?.last_name}</h2>
              <p>{user?.email}</p>
              <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
                <span className={`badge badge-${user?.status === 'active' ? 'success' : 'warning'}`}>
                  {user?.status === 'active' ? '✓ Active Account' : '⏳ Pending Verification'}
                </span>
                {kycBadge()}
                {user?.role === 'admin' && <span className="badge badge-info">Administrator</span>}
              </div>
            </div>
            <div className="profile-hero-stats">
              <div className="profile-stat">
                <span>Account Number</span>
                <strong>{user?.account_number}</strong>
              </div>
              <div className="profile-stat">
                <span>Member Since</span>
                <strong>{user?.created_at ? new Date(user.created_at).getFullYear() : '—'}</strong>
              </div>
              <div className="profile-stat">
                <span>Last Login</span>
                <strong>{user?.last_login ? new Date(user.last_login).toLocaleDateString() : 'First Login'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {tabs.map(t => (
          <button key={t} className={`profile-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t === 'personal' && <><User size={15}/> Personal Info</>}
            {t === 'security' && <><Lock size={15}/> Security</>}
            {t === 'kyc' && <><Shield size={15}/> KYC & Verification</>}
          </button>
        ))}
      </div>

      {/* Personal Info Tab */}
      {activeTab === 'personal' && (
        <div className="card">
          <div className="card-header"><h3>Personal Information</h3></div>
          <div className="card-body">
            <form onSubmit={handleUpdate}>
              <div className="profile-form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({...f, firstName: e.target.value}))} required/>
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({...f, lastName: e.target.value}))} required/>
                </div>
                <div className="form-group">
                  <label><Mail size={14}/> Email Address</label>
                  <input value={user?.email} disabled style={{background:'var(--cream)',cursor:'not-allowed'}}/>
                  <p style={{fontSize:11,color:'var(--text-light)',marginTop:4}}>Contact support to change email</p>
                </div>
                <div className="form-group">
                  <label><Phone size={14}/> Phone Number</label>
                  <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}/>
                </div>
                <div className="form-group" style={{gridColumn:'span 2'}}>
                  <label><MapPin size={14}/> Street Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input value={form.city} onChange={e => setForm(f => ({...f, city: e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input value={form.state} onChange={e => setForm(f => ({...f, state: e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label>ZIP Code</label>
                  <input value={form.zipCode} onChange={e => setForm(f => ({...f, zipCode: e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input value={form.country} onChange={e => setForm(f => ({...f, country: e.target.value}))}/>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner"/>&nbsp;Saving...</> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card">
          <div className="card-header"><h3>Change Password</h3></div>
          <div className="card-body">
            <form onSubmit={handlePasswordChange} style={{maxWidth:480}}>
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" value={passForm.currentPassword} onChange={e => setPassForm(f => ({...f, currentPassword: e.target.value}))} required/>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={passForm.newPassword} onChange={e => setPassForm(f => ({...f, newPassword: e.target.value}))} required/>
                <p style={{fontSize:11,color:'var(--text-light)',marginTop:4}}>Min 8 characters with uppercase, number and special character</p>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={passForm.confirmPassword} onChange={e => setPassForm(f => ({...f, confirmPassword: e.target.value}))} required/>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner"/>&nbsp;Updating...</> : <><Lock size={14}/>&nbsp;Update Password</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          <div className="card">
            <div className="card-header"><h3>KYC Verification Status</h3>{kycBadge()}</div>
            <div className="card-body">
              <div className="kyc-steps">
                {[
                  { label: 'Account Registration', done: true, desc: 'Basic information submitted' },
                  { label: 'Email Verification', done: !!user?.email_verified, desc: 'Verify your email address' },
                  { label: 'Document Submission', done: ['submitted','approved'].includes(user?.kyc_status), desc: 'Upload government-issued ID' },
                  { label: 'Account Approval', done: user?.status === 'active', desc: 'Admin review and approval' },
                ].map((step, i) => (
                  <div key={i} className={`kyc-step ${step.done ? 'done' : ''}`}>
                    <div className={`kyc-step-icon ${step.done ? 'done' : ''}`}>
                      {step.done ? '✓' : i + 1}
                    </div>
                    <div>
                      <p style={{fontWeight:600,fontSize:14}}>{step.label}</p>
                      <p style={{fontSize:12,color:'var(--text-light)',marginTop:2}}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3>Upload Identity Document</h3></div>
            <div className="card-body">
              <p style={{fontSize:14,color:'var(--text-mid)',marginBottom:20}}>
                Please upload a clear photo or scan of your government-issued ID (passport, driver's license, or national ID card).
              </p>
              <div className="upload-zone" onClick={() => docRef.current?.click()}>
                <input ref={docRef} type="file" accept="image/*,.pdf" style={{display:'none'}} onChange={handleDocUpload}/>
                <Upload size={32} style={{opacity:0.4,display:'block',margin:'0 auto 12px'}}/>
                <p style={{fontWeight:600,color:'var(--text-dark)'}}>Click to Upload Document</p>
                <p style={{fontSize:13,color:'var(--text-light)',marginTop:4}}>JPG, PNG, or PDF — Max 5MB</p>
                {user?.id_document && <p style={{marginTop:12,fontSize:13,color:'var(--success)'}}>✓ Document already uploaded</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
