import React, { useState } from 'react';
import { rentEasyApi } from '../services/rentEasyApi';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  KeyRound,
  Cloud,
  User,
  X,
  Check
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@renteasy.app');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Google Account Registration & Login Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const existingGoogleSession = rentEasyApi.getGoogleDriveSession();
  const hasExistingGoogleAccount = existingGoogleSession && existingGoogleSession.isConnected && existingGoogleSession.email;

  const [googleEmail, setGoogleEmail] = useState(existingGoogleSession?.email || '');
  const [googleName, setGoogleName] = useState(existingGoogleSession?.name || '');
  const [googleAutoBackup, setGoogleAutoBackup] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleQuickLogin = (demoEmail: string = 'admin@renteasy.app', demoPass: string = 'admin123') => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      localStorage.setItem('renteasy_auth_token', 'true');
      localStorage.setItem('renteasy_logged_in_email', demoEmail);
      sessionStorage.removeItem('renteasy_explicit_logout');
      onLoginSuccess();
    }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    setTimeout(() => {
      const isValid = rentEasyApi.verifyLogin(email, password);
      if (isValid) {
        if (rememberMe) {
          localStorage.setItem('renteasy_auth_token', 'true');
          localStorage.setItem('renteasy_logged_in_email', email);
        } else {
          sessionStorage.setItem('renteasy_auth_token', 'true');
        }
        sessionStorage.removeItem('renteasy_explicit_logout');
        onLoginSuccess();
      } else {
        setErrorMsg('Invalid login credentials. Please use the default credentials below or continue with Google.');
        setIsLoading(false);
      }
    }, 300);
  };

  // Google Sign In / Account Creation Handler
  const handleGoogleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) {
      alert('Please enter a valid Google Account email address.');
      return;
    }

    setIsGoogleLoading(true);
    setTimeout(() => {
      rentEasyApi.createUserWithGoogle(googleEmail, googleName || googleEmail.split('@')[0]);
      if (!googleAutoBackup) {
        rentEasyApi.updateGoogleDriveAutoBackup(false);
      }
      setIsGoogleLoading(false);
      setShowGoogleModal(false);
      onLoginSuccess();
    }, 350);
  };

  const handleContinueWithExistingGoogle = () => {
    if (!existingGoogleSession || !existingGoogleSession.email) return;
    setIsGoogleLoading(true);
    setTimeout(() => {
      rentEasyApi.createUserWithGoogle(existingGoogleSession.email, existingGoogleSession.name);
      setIsGoogleLoading(false);
      setShowGoogleModal(false);
      onLoginSuccess();
    }, 300);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #080c14 70%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: '#f8fafc',
        fontFamily: 'var(--font-sans)',
        position: 'relative'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(17, 24, 39, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '36px 32px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        {/* App Logo & Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
              marginBottom: '14px'
            }}
          >
            <Building2 size={30} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: 0 }}>
            RentEasy Landlord OS
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Property management with continuous Google Drive auto-backup
          </p>
        </div>

        {/* 1. Google Account Action Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              if (hasExistingGoogleAccount) {
                handleContinueWithExistingGoogle();
              } else {
                setShowGoogleModal(true);
              }
            }}
            disabled={isGoogleLoading}
            style={{
              background: '#ffffff',
              color: '#1f2937',
              border: 'none',
              borderRadius: '12px',
              padding: '13px 18px',
              fontSize: '0.92rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <GoogleIcon size={20} />
            <span>
              {hasExistingGoogleAccount
                ? `Continue as ${existingGoogleSession.name || existingGoogleSession.email}`
                : 'Sign in / Create User with Google'}
            </span>
          </button>

          {!hasExistingGoogleAccount && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.72rem', color: '#a5b4fc' }}>
              <Cloud size={13} color="#4285F4" />
              <span>Includes automatic continuous backup to your Google Drive</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              or sign in with password
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '0.825rem',
              color: '#fb7185',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Lock size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Traditional Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email / Username */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={14} color="var(--primary)" /> Username or Email Address
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. admin@renteasy.app"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={14} color="var(--primary)" /> Landlord Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem'
                }}
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Remember Me */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--primary)' }}
              />
              Remember on this phone / PC
            </label>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{
              padding: '12px',
              fontSize: '0.92rem',
              fontWeight: 700,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '2px'
            }}
          >
            {isLoading ? (
              <span>Logging in...</span>
            ) : (
              <>
                <span>Sign In to Landlord OS</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Quick-Fill Credentials Card */}
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <KeyRound size={13} /> Default Credentials
            </span>
            <span className="badge badge-paid" style={{ fontSize: '0.65rem' }}>
              Ready to Use
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('admin@renteasy.app', 'admin123')}
            style={{ width: '100%', fontSize: '0.82rem', fontWeight: 700, justifyContent: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.25)', border: '1px solid var(--primary)', marginTop: '2px' }}
          >
            <Sparkles size={14} color="var(--primary)" /> 1-Tap Auto-Login as Admin
          </button>
        </div>

        {/* Security badge footer */}
        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Encrypted Landlord Session • Real-time Sync & Auto-Drive Backup</span>
        </div>
      </div>

      {/* Google User Creation & Sign-In Modal */}
      {showGoogleModal && (
        <div className="modal-backdrop" onClick={() => setShowGoogleModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '440px', background: '#0f172a', border: '1px solid rgba(99, 102, 241, 0.3)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <GoogleIcon size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                    Create User with Google
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Continuous Google Drive auto-backup enabled
                  </p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowGoogleModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGoogleSubmit}>
              <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} color="#4285F4" /> Google Account Email
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. yourname@gmail.com"
                    value={googleEmail}
                    onChange={e => setGoogleEmail(e.target.value)}
                    required
                    autoFocus
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Used to sign in and automatically store backups in Google Drive.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} color="#4285F4" /> Your Full Name (Landlord Profile)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mohammed Hussain"
                    value={googleName}
                    onChange={e => setGoogleName(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Your avatar logo and receipts will dynamically display these initials.
                  </span>
                </div>

                {/* Auto Backup Toggle */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(66, 133, 244, 0.1)',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <input
                    type="checkbox"
                    id="chk-auto-backup"
                    checked={googleAutoBackup}
                    onChange={e => setGoogleAutoBackup(e.target.checked)}
                    style={{ accentColor: '#4285F4', marginTop: '3px' }}
                  />
                  <label htmlFor="chk-auto-backup" style={{ fontSize: '0.78rem', color: '#e2e8f0', cursor: 'pointer', lineHeight: 1.4 }}>
                    <strong style={{ color: '#93c5fd' }}>Continuous Auto-Backup to Google Drive:</strong>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginTop: '2px' }}>
                      Automatically archives a full snapshot whenever you add properties, record payments, or update records.
                    </div>
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowGoogleModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isGoogleLoading}
                  style={{
                    background: 'linear-gradient(135deg, #4285F4 0%, #1a73e8 100%)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 700
                  }}
                >
                  <GoogleIcon size={16} />
                  <span>{isGoogleLoading ? 'Creating User...' : 'Create Account & Sign In'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
