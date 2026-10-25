import React, { useState } from 'react';
import {
  Smartphone,
  X,
  QrCode,
  Download,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
  Terminal,
  Layers,
  Sparkles,
  ArrowRight,
  Globe,
  FileText
} from 'lucide-react';

interface MobileInstallModalProps {
  onClose: () => void;
}

export const MobileInstallModal: React.FC<MobileInstallModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'instant' | 'apk' | 'playstore' | 'ios'>('instant');
  const [copied, setCopied] = useState<boolean>(false);
  const localNetworkUrl =
    typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? `${window.location.origin}/`
      : 'http://192.168.0.104:5174/';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(localNetworkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadManifestBundle = () => {
    const bundleContent = JSON.stringify({
      appName: 'RentEasy',
      package: 'com.renteasy.landlord',
      webUrl: localNetworkUrl,
      manifest: {
        short_name: 'RentEasy',
        name: 'RentEasy — House Rent Collection & Reminder App',
        start_url: '/',
        display: 'standalone',
        theme_color: '#6366f1',
        background_color: '#080c14'
      },
      instructions: [
        '1. To build a standalone APK, visit https://www.pwabuilder.com',
        `2. Enter your live URL: ${localNetworkUrl}`,
        '3. Click Package for Android -> Generate APK'
      ]
    }, null, 2);

    const blob = new Blob([bundleContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RentEasy_Android_APK_Config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '720px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)'
              }}
            >
              <Smartphone size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="card-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                  Install RentEasy on Mobile / APK
                </h3>
                <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>
                  Android & iOS
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Run RentEasy directly as a native mobile app on your smartphone
              </p>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose} title="Close Modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0 24px',
            gap: '8px',
            background: 'rgba(0,0,0,0.1)'
          }}
        >
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'instant' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'instant' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'instant' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 600
            }}
            onClick={() => setActiveTab('instant')}
          >
            <Zap size={15} color={activeTab === 'instant' ? 'var(--primary)' : 'currentColor'} />
            Instant Install (WebAPK)
          </button>

          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'apk' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'apk' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'apk' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 600
            }}
            onClick={() => setActiveTab('apk')}
          >
            <Download size={15} color={activeTab === 'apk' ? '#10b981' : 'currentColor'} />
            Build .APK File
          </button>

          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'playstore' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'playstore' ? '2px solid #06b6d4' : '2px solid transparent',
              color: activeTab === 'playstore' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 600
            }}
            onClick={() => setActiveTab('playstore')}
          >
            <Globe size={15} color={activeTab === 'playstore' ? '#06b6d4' : 'currentColor'} />
            Google Play Store Guide
          </button>

          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'ios' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'ios' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'ios' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 600
            }}
            onClick={() => setActiveTab('ios')}
          >
            <Layers size={15} color={activeTab === 'ios' ? '#38bdf8' : 'currentColor'} />
            iPhone / iOS Setup
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '24px', maxHeight: '68vh', overflowY: 'auto' }}>
          {/* TAB 1: INSTANT INSTALL (WEBAPK) */}
          {activeTab === 'instant' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Highlight Banner */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                  }}
                >
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#fff' }}>
                    Recommended: 100% Native WebAPK Installation
                  </h4>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Google Play Services automatically installs RentEasy as an official Android app on your phone with an app icon in your app drawer. No manual sideloading required!
                  </p>
                </div>
              </div>

              {/* Mobile URL Box */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Step 1: Open this URL on your Android Phone (Connected to same Wi-Fi)
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={localNetworkUrl}
                    className="form-input"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      color: '#60a5fa',
                      background: 'rgba(0,0,0,0.3)'
                    }}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={handleCopyUrl}
                    style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copied ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Step by step guide */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                    1
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>Open in Chrome</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                    Type or paste <code>{localNetworkUrl}</code> into Google Chrome on your Android phone.
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                    2
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>Tap "Install app"</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                    Tap the <strong>"Install RentEasy app"</strong> prompt, or tap the three dots (<strong>⋮</strong>) &gt; <strong>"Install app"</strong>.
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#f59e0b', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                    3
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>Launch from Home Screen</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                    The RentEasy icon appears on your Android home screen and opens full-screen without address bars!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUILD STANDALONE .APK FILE */}
          {activeTab === 'apk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Generate Standalone Android .APK
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  If you need a physical <code>.apk</code> installer file to share via WhatsApp, USB drive, or email, use one of these two methods:
                </p>
              </div>

              {/* Method A: PWABuilder (Fastest, 30s) */}
              <div
                style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                      Method 1: Instant Cloud APK via PWABuilder (Recommended)
                    </h5>
                  </div>
                  <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>Free • 30 Seconds</span>
                </div>

                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Microsoft's PWABuilder packages your RentEasy manifest, icons, and code into an installable Android APK file automatically.
                </p>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <a
                    href="https://www.pwabuilder.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Open PWABuilder</span>
                    <ExternalLink size={14} />
                  </a>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleDownloadManifestBundle}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} />
                    <span>Download APK Config Bundle</span>
                  </button>
                </div>
              </div>

              {/* Method B: Expo Cloud EAS Build */}
              <div
                style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Terminal size={16} color="#60a5fa" />
                    <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                      Method 2: Expo Cloud EAS Build (For Developers)
                    </h5>
                  </div>
                  <span className="badge" style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', fontSize: '0.7rem' }}>
                    React Native
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  We have pre-configured <code>app.json</code> and <code>eas.json</code> with <code>"buildType": "apk"</code> in <code>renteasy/mobile</code>. Run this command in your terminal:
                </p>

                <div
                  style={{
                    background: '#040711',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    color: '#34d399',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <code>npx eas-cli build -p android --profile preview</code>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '4px 8px' }}
                    onClick={() => {
                      navigator.clipboard.writeText('npx eas-cli build -p android --profile preview');
                      alert('Command copied to clipboard!');
                    }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Expo builds the <code>.apk</code> in the cloud and gives you a direct link to download it to your phone.
                </div>
              </div>
            </div>
          )}

          {/* TAB: GOOGLE PLAY STORE PUBLISHING GUIDE */}
          {activeTab === 'playstore' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={18} color="#06b6d4" />
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                    How to Publish RentEasy on Google Play Store
                  </h4>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  A step-by-step roadmap to publish your application to the official Google Play Store.
                </p>
              </div>

              {/* Requirement Alert */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <ShieldCheck size={20} color="#06b6d4" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                  <strong style={{ color: '#fff' }}>Important Google Rule:</strong> Google Play Store requires an{' '}
                  <strong style={{ color: '#38bdf8' }}>Android App Bundle (.aab)</strong> instead of a standard .apk file, along with a verified Google Developer account and a live Privacy Policy.
                </div>
              </div>

              {/* Stage 1: Google Play Console Account */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#06b6d4', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                      1
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                      Register Google Play Console Account
                    </span>
                  </div>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    $25 One-Time Fee
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Go to the Google Play Console signup page. Pay the one-time $25 registration fee and verify your identity with a Government ID (e.g. PAN card / Passport).
                </p>
                <div>
                  <a
                    href="https://play.google.com/console/signup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Open Google Play Console</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Stage 2: Build the .AAB App Bundle */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                    2
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    Build Production Android App Bundle (.aab)
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  We have configured <code>eas.json</code> with <code>"buildType": "app-bundle"</code> and package <code>com.renteasy.landlord</code>. Run this command in terminal:
                </p>
                <div
                  style={{
                    background: '#040711',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    color: '#34d399',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <code>npx eas-cli build -p android --profile production</code>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '4px 8px' }}
                    onClick={() => {
                      navigator.clipboard.writeText('npx eas-cli build -p android --profile production');
                      alert('Command copied to clipboard!');
                    }}
                  >
                    <Copy size={13} />
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  *Or using PWABuilder: upload your manifest and choose <strong>"Google Play Store (.aab)"</strong>.
                </div>
              </div>

              {/* Stage 3: Mandatory Privacy Policy */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                      3
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                      Mandatory Privacy Policy URL
                    </span>
                  </div>
                  <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>Ready & Included</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Google Play strictly requires a live Privacy Policy URL. We have created a compliant privacy policy for RentEasy:
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <a
                    href="/privacy.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FileText size={14} />
                    <span>View Privacy Policy</span>
                    <ExternalLink size={13} />
                  </a>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const url = `${window.location.origin}/privacy.html`;
                      navigator.clipboard.writeText(url);
                      alert(`Privacy Policy URL copied: ${url}`);
                    }}
                  >
                    <Copy size={13} /> Copy Policy URL
                  </button>
                </div>
              </div>

              {/* Stage 4: Store Listing Metadata */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#f59e0b', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                    4
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    Google Play Store Listing Copy & Text
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>App Name (Max 30 chars):</span>
                      <div style={{ fontWeight: 600, color: '#fff' }}>RentEasy — House Rent Manager</div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText('RentEasy — House Rent Manager');
                        alert('Copied app name!');
                      }}
                    >
                      <Copy size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>Short Description (Max 80 chars):</span>
                      <div style={{ fontWeight: 600, color: '#fff' }}>Landlord rent tracker, automated WhatsApp reminders, and digital receipts.</div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText('Landlord rent tracker, automated WhatsApp reminders, and digital receipts.');
                        alert('Copied short description!');
                      }}
                    >
                      <Copy size={12} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>Category & Tags:</span>
                      <div style={{ fontWeight: 600, color: '#fff' }}>Business &bull; Real Estate &bull; Finance</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 5: Upload & Review */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ec4899', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                  5
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    Upload .AAB and Submit for Review
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Under <strong>Production</strong> or <strong>Closed Testing</strong> in Google Play Console, click <strong>Create New Release</strong> and drag in your generated <code>.aab</code> bundle. Click <strong>Review and Rollout</strong>. Google typically approves apps in 2 to 5 business days!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IOS / IPHONE */}
          {activeTab === 'ios' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Install on iPhone & iPad (Safari)
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Apple allows any web application to install as a native standalone app without the App Store:
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#38bdf8', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#fff' }}>
                    Open <strong>Safari</strong> on your iPhone and visit: <code style={{ color: '#38bdf8' }}>{localNetworkUrl}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#38bdf8', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#fff' }}>
                    Tap the <strong>Share</strong> button (the square with an arrow pointing upward at the bottom of Safari).
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#38bdf8', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#fff' }}>
                    Scroll down and tap <strong>"Add to Home Screen"</strong>, then tap <strong>Add</strong> in the top-right corner.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>Standalone PWA & WebAPK Verified</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
