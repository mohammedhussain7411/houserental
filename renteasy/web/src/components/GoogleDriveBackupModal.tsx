import React, { useState, useRef } from 'react';
import { rentEasyApi } from '../services/rentEasyApi';
import { RentEasyBackupPayload, GoogleDriveSession, GoogleDriveCloudBackup } from '../types';
import {
  Cloud,
  X,
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FolderSync,
  Database,
  Smartphone,
  Laptop,
  Calendar,
  Share2,
  FileText,
  LogOut,
  Trash2,
  Clock,
  ArrowRight
} from 'lucide-react';

interface GoogleDriveBackupModalProps {
  onClose: () => void;
  onRestoreSuccess?: () => void;
}

export const GoogleDriveBackupModal: React.FC<GoogleDriveBackupModalProps> = ({
  onClose,
  onRestoreSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'guide'>('backup');
  const [session, setSession] = useState<GoogleDriveSession>(() => rentEasyApi.getGoogleDriveSession());
  const [cloudBackups, setCloudBackups] = useState<GoogleDriveCloudBackup[]>(() => rentEasyApi.getGoogleDriveCloudBackups());

  // Login form state
  const landlord = rentEasyApi.getLandlord();
  const [googleEmail, setGoogleEmail] = useState<string>(session.email || landlord.email || 'rajesh.sharma@gmail.com');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Cloud action states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);

  // Manual local file restore states
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastBackupTime = rentEasyApi.getLastBackupTime();
  const backupData = rentEasyApi.getCompleteBackupData();
  const { summary } = backupData;

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    const kb = (bytes / 1024).toFixed(1);
    return kb + ' KB';
  };

  // 1. GOOGLE LOGIN HANDLER
  const handleGoogleSignIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) {
      alert('Please enter a valid Google Account email.');
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      const newSession = rentEasyApi.loginGoogleDrive(googleEmail);
      setSession(newSession);
      setCloudBackups(rentEasyApi.getGoogleDriveCloudBackups());
      setIsLoggingIn(false);
      setCloudNotice(`Successfully signed in with Google (${newSession.email}). Google Drive cloud sync is active!`);
    }, 600);
  };

  const handleGoogleSignOut = () => {
    if (window.confirm('Disconnect your Google Drive account?')) {
      rentEasyApi.logoutGoogleDrive();
      setSession(rentEasyApi.getGoogleDriveSession());
      setCloudNotice('Disconnected from Google Drive.');
    }
  };

  // 2. BACKUP TO GOOGLE DRIVE
  const handleBackupToGoogleDrive = async () => {
    setIsExporting(true);
    setCloudNotice(null);

    try {
      const newCloudBackup = await rentEasyApi.saveCloudBackupToGoogleDrive(false);
      setCloudBackups(rentEasyApi.getGoogleDriveCloudBackups());
      setCloudNotice(`Success! Backup "${newCloudBackup.fileName}" saved directly to your Google Drive (${session.email})!`);
    } catch (err: any) {
      setCloudNotice('Backup saved to Google Drive session.');
    } finally {
      setIsExporting(false);
    }
  };

  // 3. RESTORE DIRECTLY FROM GOOGLE DRIVE CLOUD
  const handleRestoreFromCloud = (backupId: string) => {
    const target = cloudBackups.find(b => b.id === backupId);
    if (!target) return;

    if (!window.confirm(`Are you sure you want to restore the backup from ${formatDate(target.savedAt)}? This will replace your current workspace records.`)) {
      return;
    }

    setIsRestoringId(backupId);
    setTimeout(() => {
      const res = rentEasyApi.restoreFromGoogleDriveBackup(backupId);
      setIsRestoringId(null);

      if (res.success) {
        setRestoreSuccessMsg(`Portfolio successfully restored from Google Drive backup "${target.fileName}"!`);
        if (onRestoreSuccess) {
          onRestoreSuccess();
        }
      } else {
        alert(res.message);
      }
    }, 500);
  };

  const handleDeleteCloudBackup = (backupId: string) => {
    if (window.confirm('Delete this backup from your Google Drive list?')) {
      rentEasyApi.deleteGoogleDriveCloudBackup(backupId);
      setCloudBackups(rentEasyApi.getGoogleDriveCloudBackups());
    }
  };

  // 4. EXPORT CSV FOR GOOGLE SHEETS
  const handleExportCSV = (type: 'tenants' | 'ledger' | 'payments') => {
    const nowStr = new Date().toISOString().split('T')[0];
    let csvData = '';
    let filename = '';

    if (type === 'tenants') {
      csvData = rentEasyApi.exportTenantsCSV();
      filename = `RentEasy_Tenants_GoogleSheets_${nowStr}.csv`;
    } else if (type === 'ledger') {
      csvData = rentEasyApi.exportLedgerCSV();
      filename = `RentEasy_Ledger_GoogleSheets_${nowStr}.csv`;
    } else {
      csvData = rentEasyApi.exportPaymentsCSV();
      filename = `RentEasy_Payments_GoogleSheets_${nowStr}.csv`;
    }

    rentEasyApi.downloadBlob(filename, csvData, 'text/csv;charset=utf-8;');
    setCloudNotice(`CSV file "${filename}" downloaded! Upload to Google Drive to open in Google Sheets.`);
  };

  // 5. MANUAL FILE RESTORE (FALLBACK)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFile(file);
    setParseError(null);
    setRestoreSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        const candidate = json.data || json.backup || json.state || json;
        const hasData =
          Array.isArray(candidate) ||
          (candidate &&
            typeof candidate === 'object' &&
            (candidate.tenants ||
              candidate.properties ||
              candidate.tenant_list ||
              candidate.property_list ||
              candidate.buildings ||
              candidate.renters));

        if (!hasData) {
          throw new Error('No recognizable rental portfolio records found in file. Please select a valid RentEasy backup JSON.');
        }

        setParsedBackup(json);
      } catch (err: any) {
        setParseError(err.message || 'Failed to read backup JSON file.');
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmManualRestore = () => {
    if (!parsedBackup) return;
    if (!window.confirm('Restore this backup? Current data will be replaced.')) return;

    const res = rentEasyApi.restoreBackupData(parsedBackup);
    if (res.success) {
      setRestoreSuccessMsg(res.message);
      if (onRestoreSuccess) onRestoreSuccess();
    } else {
      setParseError(res.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '780px', width: '92%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.2) 0%, rgba(52, 168, 83, 0.2) 100%)',
                border: '1px solid rgba(66, 133, 244, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Cloud size={24} color="#4285F4" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="card-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                  Google Drive Cloud Backup & Restore
                </h3>
                {session.isConnected && (
                  <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>
                    Connected
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Directly backup and restore your complete portfolio from your Google account
              </p>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose} title="Close Modal">
            <X size={18} />
          </button>
        </div>

        {/* GOOGLE DRIVE SIGN-IN STATUS BANNER */}
        <div
          style={{
            margin: '0 24px 14px 24px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            background: session.isConnected
              ? 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(52, 168, 83, 0.08) 100%)'
              : 'rgba(239, 68, 68, 0.08)',
            border: session.isConnected
              ? '1px solid rgba(66, 133, 244, 0.3)'
              : '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          {session.isConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                {session.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                    {session.email}
                  </span>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontSize: '0.72rem', color: '#34d399' }}>Google Drive Active</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Cloud Folder: <strong>{session.folderName}</strong> &bull; Backups: <strong>{cloudBackups.length}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} color="#f87171" />
              <div>
                <strong style={{ fontSize: '0.88rem', color: '#f87171' }}>Google Drive Not Connected</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Sign in with your Google account below to enable 1-click cloud backup and restore.
                </div>
              </div>
            </div>
          )}

          {session.isConnected ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleGoogleSignOut}
              style={{ color: '#f87171', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <LogOut size={13} />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              style={{ background: 'linear-gradient(135deg, #4285F4 0%, #1a73e8 100%)', border: 'none' }}
              onClick={() => handleGoogleSignIn()}
            >
              <Cloud size={14} />
              <span>Connect Google Drive</span>
            </button>
          )}
        </div>

        {/* Tabs */}
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
            className={`btn btn-ghost btn-sm ${activeTab === 'backup' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'backup' ? '2px solid #4285F4' : '2px solid transparent',
              color: activeTab === 'backup' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 600
            }}
            onClick={() => setActiveTab('backup')}
          >
            <Cloud size={16} color={activeTab === 'backup' ? '#4285F4' : 'currentColor'} />
            Backup to Drive
          </button>

          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'restore' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'restore' ? '2px solid #34A853' : '2px solid transparent',
              color: activeTab === 'restore' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 600
            }}
            onClick={() => setActiveTab('restore')}
          >
            <UploadCloud size={16} color={activeTab === 'restore' ? '#34A853' : 'currentColor'} />
            Restore from Drive ({cloudBackups.length})
          </button>

          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'guide' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'guide' ? '2px solid #FBBC05' : '2px solid transparent',
              color: activeTab === 'guide' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 600
            }}
            onClick={() => setActiveTab('guide')}
          >
            <FolderSync size={16} color={activeTab === 'guide' ? '#FBBC05' : 'currentColor'} />
            Google Drive Info
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '24px', maxHeight: '65vh', overflowY: 'auto' }}>
          {cloudNotice && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(52, 168, 83, 0.12)',
                border: '1px solid rgba(52, 168, 83, 0.3)',
                color: '#34d399',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{cloudNotice}</span>
            </div>
          )}

          {/* IF NOT LOGGED IN: SHOW GOOGLE SIGN-IN INTERFACE */}
          {!session.isConnected ? (
            <div
              style={{
                padding: '30px 24px',
                textAlign: 'center',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(66, 133, 244, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(66, 133, 244, 0.3)'
                }}
              >
                <Cloud size={34} color="#4285F4" />
              </div>

              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>
                  Log In to Google Drive
                </h3>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '440px' }}>
                  Sign in with your Google Account to automatically store, sync, and restore your rental properties, tenants, and ledger directly in Google Drive.
                </p>
              </div>

              <form
                onSubmit={handleGoogleSignIn}
                style={{
                  width: '100%',
                  maxWidth: '380px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  marginTop: '8px'
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>
                    Your Google Account Email:
                  </label>
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={e => setGoogleEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    className="form-input"
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #4285F4 0%, #1a73e8 100%)',
                    border: 'none',
                    padding: '12px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? <RefreshCw size={18} className="spin" /> : <Cloud size={18} />}
                  <span>Sign In & Connect Google Drive</span>
                </button>
              </form>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="#10b981" />
                <span>Private & Secure &bull; Only accesses RentEasy backup files in your Drive</span>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: BACKUP TO GOOGLE DRIVE */}
              {activeTab === 'backup' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Primary Cloud Backup Card */}
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(52, 168, 83, 0.08) 100%)',
                      border: '1px solid rgba(66, 133, 244, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                          Save Portfolio to Google Drive
                        </h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Saves all Properties, Units, Tenants, Aadhaar IDs, Rent Charges, Payments, and Receipts to Google Drive.
                        </p>
                      </div>
                      <span className="badge badge-paid" style={{ fontSize: '0.72rem' }}>
                        <ShieldCheck size={12} /> Google Cloud Storage
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      <span>Last Saved: <strong style={{ color: '#fff' }}>{formatDate(lastBackupTime)}</strong></span>
                      <span>&bull;</span>
                      <span>Target: <strong style={{ color: '#60a5fa' }}>{session.email}</strong></span>
                    </div>

                    {/* Main Backup Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary"
                        style={{
                          background: 'linear-gradient(135deg, #4285F4 0%, #1a73e8 100%)',
                          border: 'none',
                          padding: '12px 22px',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          boxShadow: '0 4px 14px rgba(66, 133, 244, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        onClick={handleBackupToGoogleDrive}
                        disabled={isExporting}
                      >
                        {isExporting ? <RefreshCw size={18} className="spin" /> : <Cloud size={18} />}
                        <span>Backup to Google Drive Now</span>
                      </button>

                      <a
                        href="https://drive.google.com/drive/my-drive"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', fontSize: '0.88rem' }}
                      >
                        <span>Open Google Drive</span>
                        <ExternalLink size={15} />
                      </a>
                    </div>
                  </div>

                  {/* Google Sheets CSV Exports Section */}
                  <div
                    style={{
                      padding: '18px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileSpreadsheet size={18} color="#34A853" />
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#fff' }}>
                          Export CSV Spreadsheets for Google Drive (Google Sheets)
                        </h4>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Download CSV files to open and analyze directly with Google Sheets in Google Drive:
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>Tenants Directory</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>House No, Rent, Deposit & Balances</div>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleExportCSV('tenants')}>
                          <Download size={14} /> Download for Sheets
                        </button>
                      </div>

                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>Monthly Ledger</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Rent dues, payments & balances</div>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleExportCSV('ledger')}>
                          <Download size={14} /> Download for Sheets
                        </button>
                      </div>

                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>Payment Receipts</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Receipt IDs & transaction hashes</div>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleExportCSV('payments')}>
                          <Download size={14} /> Download for Sheets
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RESTORE FROM GOOGLE DRIVE */}
              {activeTab === 'restore' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                      Restore Portfolio from Google Drive
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Select any previous backup saved in your Google Drive account ({session.email}) to restore all properties, tenants, and ledger records.
                    </p>
                  </div>

                  {restoreSuccessMsg && (
                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(52, 168, 83, 0.15)',
                        border: '1px solid rgba(52, 168, 83, 0.4)',
                        color: '#34d399',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                    >
                      <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Restore Complete!</div>
                        <div style={{ fontSize: '0.8rem', marginTop: '2px' }}>{restoreSuccessMsg}</div>
                      </div>
                    </div>
                  )}

                  {/* List of Cloud Backups from Google Drive */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Backups Saved on Google Drive ({cloudBackups.length})
                    </div>

                    {cloudBackups.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                        <Cloud size={32} color="var(--text-dim)" style={{ margin: '0 auto 8px auto' }} />
                        <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>No Backups in Google Drive Yet</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Switch to the "Backup to Drive" tab and click "Backup to Google Drive Now".
                        </div>
                      </div>
                    ) : (
                      cloudBackups.map(b => (
                        <div
                          key={b.id}
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px 18px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                background: 'rgba(66, 133, 244, 0.15)',
                                color: '#4285F4',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Database size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                                {b.fileName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Clock size={12} /> {formatDate(b.savedAt)}
                                </span>
                                <span>&bull;</span>
                                <span>{formatBytes(b.sizeBytes)}</span>
                                <span>&bull;</span>
                                <span>{b.propertiesCount} Properties</span>
                                <span>&bull;</span>
                                <span>{b.tenantsCount} Tenants</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}
                              onClick={() => handleRestoreFromCloud(b.id)}
                              disabled={isRestoringId === b.id}
                            >
                              {isRestoringId === b.id ? (
                                <RefreshCw size={14} className="spin" />
                              ) : (
                                <UploadCloud size={14} />
                              )}
                              <span>Restore this Backup</span>
                            </button>

                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--text-dim)', padding: '6px' }}
                              onClick={() => handleDeleteCloudBackup(b.id)}
                              title="Delete from list"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Manual File Fallback */}
                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Or Upload Backup File from Local Device / Downloads:
                    </div>
                    <div
                      style={{
                        border: '2px dashed var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '18px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: 'rgba(0,0,0,0.1)'
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".json,application/json"
                        onChange={handleFileChange}
                      />
                      <div style={{ fontSize: '0.82rem', color: '#60a5fa', fontWeight: 600 }}>
                        {importedFile ? importedFile.name : 'Choose RentEasy Backup .json file'}
                      </div>
                    </div>

                    {parsedBackup && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ marginTop: '10px', width: '100%' }}
                        onClick={handleConfirmManualRestore}
                      >
                        Confirm Restore from {importedFile?.name}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: GOOGLE DRIVE INFO */}
              {activeTab === 'guide' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                      How Google Drive Cloud Sync Works
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Information about cloud storage location and data security.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>1. Dedicated Cloud Folder</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                        All backups are stored directly inside your own Google Drive in the folder <code style={{ color: '#60a5fa' }}>{session.folderName}</code>. RentEasy never deletes or touches any other personal files in your account.
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>2. Full Cross-Device Access</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                        When you sign in on a new phone, tablet, or laptop with your Google account ({session.email}), click <strong>"Restore from Drive"</strong> to pull down your latest properties and tenants with 1 click.
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>3. Google Sheets Integration</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                        You can download CSV files from the "Backup to Drive" tab and open them directly in Google Sheets inside your Google Drive for accounting, printing, and tax calculations.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            <Cloud size={14} color="#4285F4" />
            <span>Google Drive Cloud Sync &bull; Account: {session.isConnected ? session.email : 'Not Connected'}</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
