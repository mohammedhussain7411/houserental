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
  Smartphone
} from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@renteasy.app');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleFillCredentials = (demoEmail: string, demoPass: string) => {
    handleQuickLogin(demoEmail, demoPass);
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
        setErrorMsg('Invalid login credentials. Please use the default credentials below.');
        setIsLoading(false);
      }
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
        fontFamily: 'var(--font-sans)'
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
          gap: '24px'
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
              marginBottom: '16px'
            }}
          >
            <Building2 size={30} color="#ffffff" />
          </div>

          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: 0 }}>
            RentEasy Landlord OS
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Sign in to manage your houses, collections & digital receipts
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              borderRadius: '12px',
              padding: '12px 14px',
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
              autoFocus
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
              padding: '13px',
              fontSize: '0.95rem',
              fontWeight: 700,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '4px'
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

        {/* Demo Quick-Fill Credentials Card */}
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <KeyRound size={13} /> Default Landlord Credentials
            </span>
            <span className="badge badge-paid" style={{ fontSize: '0.65rem' }}>
              Ready to Use
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
            <div
              style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' }}
              onClick={() => handleQuickLogin('admin@renteasy.app', 'admin123')}
              title="Click to sign in with this email"
            >
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Username / Email</div>
              <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>admin@renteasy.app</strong>
            </div>

            <div
              style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' }}
              onClick={() => handleQuickLogin('admin@renteasy.app', 'admin123')}
              title="Click to sign in with this password"
            >
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Password</div>
              <strong style={{ color: '#34d399', fontFamily: 'var(--font-mono)' }}>admin123</strong>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleQuickLogin('admin@renteasy.app', 'admin123')}
            style={{ width: '100%', fontSize: '0.82rem', fontWeight: 700, justifyContent: 'center', gap: '6px', background: 'rgba(99, 102, 241, 0.25)', border: '1px solid var(--primary)' }}
          >
            <Sparkles size={14} color="var(--primary)" /> 1-Tap Auto-Login &amp; Enter Dashboard
          </button>
        </div>

        {/* Security badge footer */}
        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#10b981" />
          <span>Encrypted Landlord Session • Standalone Mobile PWA</span>
        </div>
      </div>
    </div>
  );
};
