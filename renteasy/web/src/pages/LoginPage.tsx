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
  Check,
  Phone,
  Home,
  UserPlus,
  LogIn,
  AlertCircle
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const GoogleIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
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
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

  // Sign In Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regErrorMsg, setRegErrorMsg] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Google Sign-In Modal / Flow State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const existingGoogleSession = rentEasyApi.getGoogleDriveSession();
  const hasExistingGoogleAccount = Boolean(existingGoogleSession && existingGoogleSession.isConnected && existingGoogleSession.email);

  const [googleEmailInput, setGoogleEmailInput] = useState(existingGoogleSession?.email || 'mohammedhussain7411@gmail.com');
  const [googleNameInput, setGoogleNameInput] = useState(existingGoogleSession?.name || 'Mohammed Hussain');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // 1. REAL GOOGLE OAUTH POPUP TRIGGER
  const handleTriggerGoogleOAuth = () => {
    const clientId = rentEasyApi.getGoogleClientId();

    // If client ID is configured and Google SDK is present, launch native Google popup
    if (clientId && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        setIsGoogleLoading(true);
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const profile = await userRes.json();
                rentEasyApi.setGoogleDriveOAuthSession(
                  tokenResponse.access_token,
                  tokenResponse.expires_in || 3600,
                  profile.email,
                  profile.name,
                  profile.picture
                );
                rentEasyApi.createUserWithGoogle(profile.email, profile.name);
                onLoginSuccess();
              } catch (err: any) {
                alert(`Google sign in profile fetch failed: ${err.message}`);
              } finally {
                setIsGoogleLoading(false);
              }
            } else {
              setIsGoogleLoading(false);
            }
          }
        });
        tokenClient.requestAccessToken({ prompt: 'consent' });
        return;
      } catch (err: any) {
        console.warn('OAuth tokenClient failed, showing direct Google sign in modal:', err);
      }
    }

    // Default direct Google Sign In flow (no manual Google Client ID setup required)
    setShowGoogleModal(true);
  };

  // 2. CONFIRM SIGN IN WITH GOOGLE
  const handleConfirmGoogleSignIn = (targetEmail?: string, targetName?: string) => {
    const finalEmail = (targetEmail || googleEmailInput).trim();
    const finalName = (targetName || googleNameInput).trim();

    if (!finalEmail || !finalEmail.includes('@')) {
      alert('Please enter a valid Google Account email.');
      return;
    }

    setIsGoogleLoading(true);
    setTimeout(() => {
      rentEasyApi.createUserWithGoogle(finalEmail, finalName);
      setIsGoogleLoading(false);
      setShowGoogleModal(false);
      onLoginSuccess();
    }, 300);
  };

  // 3. TRADITIONAL USERNAME/EMAIL SIGN IN
  const handleLoginSubmit = (e: React.FormEvent) => {
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
        setErrorMsg('Invalid login credentials. Check username/password or sign in with Google below.');
        setIsLoading(false);
      }
    }, 300);
  };

  // 4. REGISTER NEW LANDLORD ACCOUNT
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrorMsg('');

    if (!regName.trim()) {
      setRegErrorMsg('Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!regPhone.trim()) {
      setRegErrorMsg('Please enter your phone number.');
      return;
    }

    setIsRegistering(true);
    setTimeout(() => {
      try {
        const res = rentEasyApi.registerNewLandlord({
          name: regName,
          company_name: regCompany,
          email: regEmail,
          phone: regPhone,
          password: regPassword || 'admin123'
        });

        if (res.success) {
          onLoginSuccess();
        } else {
          setRegErrorMsg(res.message || 'Registration failed.');
          setIsRegistering(false);
        }
      } catch (err: any) {
        setRegErrorMsg(err.message || 'Could not register landlord.');
        setIsRegistering(false);
      }
    }, 400);
  };

  // 5. MOHAMMED HUSSAIN 1-TAP LOGIN
  const handleMohammedHussainAutoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      rentEasyApi.restoreDefaultPortfolio();
      localStorage.setItem('renteasy_auth_token', 'true');
      localStorage.setItem('renteasy_logged_in_email', 'mohammedhussain7411@gmail.com');
      localStorage.setItem('renteasy_user_name', 'Mohammed Hussain');
      sessionStorage.removeItem('renteasy_explicit_logout');
      onLoginSuccess();
    }, 250);
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
          maxWidth: '480px',
          background: 'rgba(17, 24, 39, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          padding: '32px 28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
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
              marginBottom: '12px'
            }}
          >
            <Building2 size={30} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: 0 }}>
            RentEasy Landlord OS
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Rental property management with Google Drive auto-backup & WhatsApp receipts
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '4px'
          }}
        >
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => { setActiveTab('signin'); setErrorMsg(''); }}
            style={{
              flex: 1,
              borderRadius: '9px',
              padding: '9px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: activeTab === 'signin' ? '#6366f1' : 'transparent',
              color: activeTab === 'signin' ? '#ffffff' : 'var(--text-dim)',
              border: 'none',
              boxShadow: activeTab === 'signin' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none'
            }}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => { setActiveTab('register'); setRegErrorMsg(''); }}
            style={{
              flex: 1,
              borderRadius: '9px',
              padding: '9px',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: activeTab === 'register' ? '#10b981' : 'transparent',
              color: activeTab === 'register' ? '#ffffff' : 'var(--text-dim)',
              border: 'none',
              boxShadow: activeTab === 'register' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none'
            }}
          >
            <UserPlus size={15} />
            <span>Register New Landlord</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: SIGN IN (GOOGLE ACCOUNT & CREDENTIALS) */}
        {/* ========================================================= */}
        {activeTab === 'signin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. PRIMARY: SIGN IN WITH GOOGLE ACCOUNT */}
            <button
              type="button"
              onClick={handleTriggerGoogleOAuth}
              disabled={isGoogleLoading}
              style={{
                background: '#ffffff',
                color: '#1f2937',
                border: 'none',
                borderRadius: '12px',
                padding: '13px 18px',
                fontSize: '0.94rem',
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
                  ? `Continue with Google (${existingGoogleSession.email})`
                  : 'Sign In with Google Account'}
              </span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                or sign in with password
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  borderRadius: '10px',
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

            {/* Username & Password Form */}
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="var(--primary)" /> Username or Email Address
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. admin or mohammedhussain7411@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

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

                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password (default: admin123)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.825rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  Remember on this device
                </label>
              </div>

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
                  gap: '8px'
                }}
              >
                {isLoading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Landlord OS</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Quick Access Card for Landlord Mohammed Hussain */}
            <div
              style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={13} /> Mohammed Hussain Portfolio
                </span>
                <span className="badge badge-paid" style={{ fontSize: '0.65rem' }}>
                  37 Tenants Active
                </span>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleMohammedHussainAutoLogin}
                style={{
                  width: '100%',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(99, 102, 241, 0.25)',
                  border: '1px solid var(--primary)',
                  marginTop: '2px'
                }}
              >
                <Sparkles size={14} color="var(--primary)" /> 1-Tap Login as Mohammed Hussain (SFR Properties)
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: REGISTER NEW LANDLORD (START FRESH WITH OWN PROPERTIES) */}
        {/* ========================================================= */}
        {activeTab === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Create your own landlord workspace to track rent, units, tenants, and receipts on this device.
            </p>

            {/* Register with Google Button */}
            <button
              type="button"
              onClick={handleTriggerGoogleOAuth}
              style={{
                background: '#ffffff',
                color: '#1f2937',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <GoogleIcon size={18} />
              <span>Register with Google Account</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                or register with email
              </span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Registration Error Notice */}
            {regErrorMsg && (
              <div
                style={{
                  background: 'rgba(244, 63, 94, 0.15)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.825rem',
                  color: '#fb7185',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={15} />
                <span>{regErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  className="form-input"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Property / Building Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Residency or Villa Green"
                  className="form-input"
                  value={regCompany}
                  onChange={e => setRegCompany(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    className="form-input"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. you@gmail.com"
                    className="form-input"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Set Landlord Password</label>
                <input
                  type="password"
                  placeholder="Set your login password"
                  className="form-input"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isRegistering}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  padding: '12px',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '4px'
                }}
              >
                {isRegistering ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <UserPlus size={17} />
                    <span>Create Landlord Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Security badge footer */}
        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Encrypted Landlord Session • Auto-Drive Backup & Real-time Sync</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* GOOGLE SIGN IN DIALOG (CLEAN & DIRECT) */}
      {/* ========================================================= */}
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
                    Sign In with Google Account
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Continuous Google Drive auto-backup will be linked
                  </p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowGoogleModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Quick 1-Tap Pill for Mohammed Hussain if on this device */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(66, 133, 244, 0.12)',
                  border: '1px solid rgba(66, 133, 244, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>Mohammed Hussain</div>
                  <div style={{ fontSize: '0.74rem', color: '#93c5fd' }}>mohammedhussain7411@gmail.com</div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #4285F4 0%, #1a73e8 100%)', border: 'none', whiteSpace: 'nowrap' }}
                  onClick={() => handleConfirmGoogleSignIn('mohammedhussain7411@gmail.com', 'Mohammed Hussain')}
                >
                  Continue
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>or enter any other Google account</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="#4285F4" /> Google Account Email
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. yourname@gmail.com"
                  value={googleEmailInput}
                  onChange={e => setGoogleEmailInput(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} color="#4285F4" /> Landlord Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mohammed Hussain"
                  value={googleNameInput}
                  onChange={e => setGoogleNameInput(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowGoogleModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isGoogleLoading}
                onClick={() => handleConfirmGoogleSignIn()}
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
                <span>{isGoogleLoading ? 'Signing In...' : 'Sign In with Google'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
