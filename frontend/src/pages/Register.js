import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { User, Mail, Lock, Phone, MapPin, Eye, EyeOff, CheckCircle } from 'lucide-react';
import './Auth.css';

const steps = ['Personal Info', 'Address', 'Security'];

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '',
    address: '', city: '', state: '', zipCode: '', country: 'United States',
    password: '', confirmPassword: '', ssnLast4: '',
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({...f, [k]: v})); setErrors(e => ({...e, [k]: ''})); };

  const validateStep = () => {
    const e = {};
    if (step === 0) {
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim()) e.lastName = 'Required';
      if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Invalid email';
      if (!form.phone.trim()) e.phone = 'Required';
      if (!form.dateOfBirth) e.dateOfBirth = 'Required';
      const age = (new Date() - new Date(form.dateOfBirth)) / (1000*60*60*24*365);
      if (age < 18) e.dateOfBirth = 'Must be 18 or older';
    }
    if (step === 1) {
      if (!form.address.trim()) e.address = 'Required';
      if (!form.city.trim()) e.city = 'Required';
      if (!form.state.trim()) e.state = 'Required';
      if (!form.zipCode.trim()) e.zipCode = 'Required';
    }
    if (step === 2) {
      if (form.password.length < 8) e.password = 'At least 8 characters';
      if (!/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(form.password)) e.password = 'Must include uppercase, number, and special character';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
      if (!form.ssnLast4.match(/^\d{4}$/)) e.ssnLast4 = 'Enter last 4 digits of SSN';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s + 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);
    try {
      await api.post('/auth/register', form);
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand"><span className="auth-logo-icon">⚓</span><div><h1 className="auth-brand-name">CoastalTrust</h1><p className="auth-brand-sub">PRIVATE BANKING</p></div></div>
        <div className="auth-hero"><h2>Welcome to CoastalTrust.</h2><p>Your offshore banking journey begins here. We'll have your account verified shortly.</p></div>
      </div>
      <div className="auth-right">
        <div className="auth-card" style={{textAlign:'center'}}>
          <CheckCircle size={64} color="var(--success)" style={{margin:'0 auto 24px'}}/>
          <h2 style={{fontFamily:'var(--font-serif)',color:'var(--forest)',marginBottom:12}}>Application Submitted!</h2>
          <p style={{color:'var(--text-mid)',marginBottom:32,lineHeight:1.7}}>Your account application has been received. Our team will verify your information within 1–2 business days. You'll receive an email once approved.</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-full">Go to Login</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand"><span className="auth-logo-icon">⚓</span><div><h1 className="auth-brand-name">CoastalTrust</h1><p className="auth-brand-sub">PRIVATE BANKING</p></div></div>
        <div className="auth-hero">
          <h2>Open your account today.</h2>
          <p>Join thousands of clients who trust CoastalTrust Bank for secure, private offshore banking solutions from Florida.</p>
        </div>
        <div className="auth-features">
          <div className="auth-feature"><span>🔐</span><p>KYC Verified</p></div>
          <div className="auth-feature"><span>💳</span><p>Debit & Credit Cards</p></div>
          <div className="auth-feature"><span>💸</span><p>Wire Transfers</p></div>
          <div className="auth-feature"><span>📊</span><p>Loan Services</p></div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card" style={{maxWidth:520}}>
          <div className="auth-card-header">
            <h2>Create Account</h2>
            <p>Step {step + 1} of {steps.length}: {steps[step]}</p>
          </div>

          <div className="step-indicator">
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div className={`step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                  <div className="step-num">{i < step ? '✓' : i + 1}</div>
                  <span className="hide-mobile" style={{fontSize:12,color:i===step?'var(--forest)':'var(--text-light)'}}>{s}</span>
                </div>
                {i < steps.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`}/>}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={step === 2 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
            {step === 0 && (
              <div className="register-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="John" className={errors.firstName ? 'error' : ''}/>
                  {errors.firstName && <p className="error-msg">{errors.firstName}</p>}
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Doe" className={errors.lastName ? 'error' : ''}/>
                  {errors.lastName && <p className="error-msg">{errors.lastName}</p>}
                </div>
                <div className="form-group col-span-2">
                  <label>Email Address</label>
                  <div className="input-icon-wrapper">
                    <Mail size={16} className="input-icon"/>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@example.com" className={errors.email ? 'error' : ''}/>
                  </div>
                  {errors.email && <p className="error-msg">{errors.email}</p>}
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <div className="input-icon-wrapper">
                    <Phone size={16} className="input-icon"/>
                    <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (850) 555-0100" className={errors.phone ? 'error' : ''}/>
                  </div>
                  {errors.phone && <p className="error-msg">{errors.phone}</p>}
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={errors.dateOfBirth ? 'error' : ''}/>
                  {errors.dateOfBirth && <p className="error-msg">{errors.dateOfBirth}</p>}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="register-grid">
                <div className="form-group col-span-2">
                  <label>Street Address</label>
                  <div className="input-icon-wrapper">
                    <MapPin size={16} className="input-icon"/>
                    <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Ocean Drive" className={errors.address ? 'error' : ''}/>
                  </div>
                  {errors.address && <p className="error-msg">{errors.address}</p>}
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Miami" className={errors.city ? 'error' : ''}/>
                  {errors.city && <p className="error-msg">{errors.city}</p>}
                </div>
                <div className="form-group">
                  <label>State</label>
                  <select value={form.state} onChange={e => set('state', e.target.value)} className={errors.state ? 'error' : ''}>
                    <option value="">Select State</option>
                    {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && <p className="error-msg">{errors.state}</p>}
                </div>
                <div className="form-group">
                  <label>ZIP Code</label>
                  <input value={form.zipCode} onChange={e => set('zipCode', e.target.value)} placeholder="33101" className={errors.zipCode ? 'error' : ''}/>
                  {errors.zipCode && <p className="error-msg">{errors.zipCode}</p>}
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <select value={form.country} onChange={e => set('country', e.target.value)}>
                    <option>United States</option><option>United Kingdom</option><option>Canada</option><option>Germany</option><option>France</option><option>Nigeria</option><option>Other</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="register-grid">
                <div className="form-group col-span-2">
                  <label>Password</label>
                  <div className="input-icon-wrapper">
                    <Lock size={16} className="input-icon"/>
                    <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 chars, uppercase, number, symbol" className={errors.password ? 'error' : ''}/>
                    <button type="button" className="input-icon-right" onClick={() => setShowPass(!showPass)}>
                      {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {errors.password && <p className="error-msg">{errors.password}</p>}
                </div>
                <div className="form-group col-span-2">
                  <label>Confirm Password</label>
                  <div className="input-icon-wrapper">
                    <Lock size={16} className="input-icon"/>
                    <input type="password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Repeat password" className={errors.confirmPassword ? 'error' : ''}/>
                  </div>
                  {errors.confirmPassword && <p className="error-msg">{errors.confirmPassword}</p>}
                </div>
                <div className="form-group col-span-2">
                  <label>Last 4 digits of SSN / National ID</label>
                  <input maxLength={4} value={form.ssnLast4} onChange={e => set('ssnLast4', e.target.value.replace(/\D/g,''))} placeholder="XXXX" className={errors.ssnLast4 ? 'error' : ''}/>
                  {errors.ssnLast4 && <p className="error-msg">{errors.ssnLast4}</p>}
                  <p style={{fontSize:11,color:'var(--text-light)',marginTop:4}}>🔒 Encrypted and securely stored</p>
                </div>
                <div className="form-group col-span-2">
                  <label style={{display:'flex',alignItems:'flex-start',gap:8,cursor:'pointer'}}>
                    <input type="checkbox" required style={{marginTop:3,width:'auto'}}/>
                    <span style={{fontSize:13,color:'var(--text-mid)'}}>I agree to CoastalTrust Bank's <a href="#" className="auth-link">Terms of Service</a> and <a href="#" className="auth-link">Privacy Policy</a></span>
                  </label>
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:12,marginTop:8}}>
              {step > 0 && (
                <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={() => setStep(s => s - 1)}>
                  ← Back
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{flex:2}} disabled={loading}>
                {loading ? <><span className="spinner"/>&nbsp;Processing...</> : step < 2 ? 'Continue →' : 'Create Account'}
              </button>
            </div>
          </form>

          <p className="auth-switch" style={{marginTop:20}}>
            Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
