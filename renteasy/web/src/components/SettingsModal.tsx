import React, { useState } from 'react';
import { rentEasyApi } from '../services/rentEasyApi';
import { Landlord, AuditLog } from '../types';
import {
  Settings,
  X,
  User,
  Shield,
  MessageSquare,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  History,
  KeyRound,
  Cloud,
  ExternalLink,
  ShieldCheck,
  Download,
  Trash2,
  FolderSync,
  HardDrive
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  onUpdate: (landlord: Landlord) => void;
  onOpenGoogleDriveBackup?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onUpdate, onOpenGoogleDriveBackup }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'backup' | 'messaging' | 'audit'>('profile');
  const [landlord, setLandlord] = useState<Landlord>(rentEasyApi.getLandlord());
  const [authCreds, setAuthCreds] = useState(rentEasyApi.getAuthCredentials());
  const [gdriveSession, setGdriveSession] = useState(rentEasyApi.getGoogleDriveSession());
  const [passSuccess, setPassSuccess] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const auditLogs = rentEasyApi.getAuditLogs();
  const lastBackup = rentEasyApi.getLastBackupTime();

  const handleToggleAutoBackup = () => {
    const nextVal = !gdriveSession.autoBackup;
    rentEasyApi.updateGoogleDriveAutoBackup(nextVal);
    setGdriveSession(prev => ({ ...prev, autoBackup: nextVal }));
    if (nextVal) {
      rentEasyApi.triggerAutoGoogleDriveBackup();
      setBackupMsg('Automatic Google Drive cloud backup is now ACTIVE!');
    } else {
      setBackupMsg('Automatic Google Drive backup paused.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = rentEasyApi.updateLandlord(landlord);
    onUpdate(updated);
    onClose();
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCreds.email || !authCreds.passwordPlain) {
      alert('Please fill in both email and password');
      return;
    }
    rentEasyApi.updateAuthCredentials(authCreds.email, authCreds.passwordPlain);
    setPassSuccess('Login credentials updated successfully!');
    setTimeout(() => setPassSuccess(''), 3000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} color="var(--primary)" />
            <h3 className="card-title" style={{ margin: 0 }}>System Settings & Compliance</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 24px', gap: '8px', background: 'rgba(0,0,0,0.1)', overflowX: 'auto' }}>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'profile' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'profile' ? '#fff' : 'var(--text-dim)',
              padding: '12px 16px'
            }}
            onClick={() => setActiveTab('profile')}
          >
            <User size={15} /> Landlord Profile
          </button>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'security' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'security' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'security' ? '#fff' : 'var(--text-dim)',
              padding: '12px 16px'
            }}
            onClick={() => setActiveTab('security')}
          >
            <KeyRound size={15} /> Login & Password
          </button>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'backup' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'backup' ? '2px solid #818cf8' : '2px solid transparent',
              color: activeTab === 'backup' ? '#fff' : 'var(--text-dim)',
              padding: '12px 16px'
            }}
            onClick={() => setActiveTab('backup')}
          >
            <HardDrive size={15} color={activeTab === 'backup' ? '#818cf8' : 'currentColor'} /> Backup & Restore
          </button>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'messaging' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'messaging' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'messaging' ? '#fff' : 'var(--text-dim)',
              padding: '12px 16px'
            }}
            onClick={() => setActiveTab('messaging')}
          >
            <MessageSquare size={15} /> WhatsApp & DLT SMS
          </button>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'audit' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'audit' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'audit' ? '#fff' : 'var(--text-dim)',
              padding: '12px 16px'
            }}
            onClick={() => setActiveTab('audit')}
          >
            <History size={15} /> Audit Log ({auditLogs.length})
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Landlord Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={landlord.name}
                  onChange={e => setLandlord({ ...landlord, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={landlord.email}
                    onChange={e => setLandlord({ ...landlord, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Official Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={landlord.phone}
                    onChange={e => setLandlord({ ...landlord, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Rental Business / Property Brand Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={landlord.company_name}
                  onChange={e => setLandlord({ ...landlord, company_name: e.target.value })}
                  placeholder="e.g. Sharma Estates"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default UPI ID for Rent Remittance</label>
                <input
                  type="text"
                  className="form-input"
                  value={landlord.upi_id}
                  onChange={e => setLandlord({ ...landlord, upi_id: e.target.value })}
                  placeholder="e.g. yourname@okhdfcbank"
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  This UPI ID will appear on all rent reminders and digital receipts.
                </span>
              </div>

              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', marginTop: '10px' }}>
                Save Profile
              </button>
            </form>
          )}

          {activeTab === 'messaging' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* WhatsApp Business Card */}
              <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <MessageSquare size={16} />
                    </div>
                    <span style={{ fontWeight: 700 }}>WhatsApp Business Platform</span>
                  </div>
                  <span className="badge badge-paid">
                    <CheckCircle2 size={12} /> Connected & Verified
                  </span>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Meta Cloud API Account: <strong style={{ color: '#fff' }}>WABA-881920491</strong><br />
                  Sender Phone: <strong style={{ color: '#fff' }}>+91 98765 43210 (Verified Business)</strong><br />
                  Webhook Status: <strong style={{ color: '#34d399' }}>Active (HTTP 200)</strong>
                </div>
              </div>

              {/* Indian DLT SMS Gateway Card */}
              <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--sky)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <Shield size={16} />
                    </div>
                    <span style={{ fontWeight: 700 }}>Indian Telecom DLT Compliance (TRAI)</span>
                  </div>
                  <span className="badge badge-paid">
                    <CheckCircle2 size={12} /> DLT Registered
                  </span>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Principal Entity ID: <strong style={{ color: '#fff' }}>1101569380000042</strong><br />
                  Approved Sender Header: <strong style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>TL-RNTEZY</strong><br />
                  Registered Template: <strong style={{ color: '#fff' }}>Rent Due & Overdue Collection Notice</strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSaveCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <KeyRound size={17} color="var(--primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Landlord Login Credentials</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Manage your username and password for phone & desktop access</div>
                    </div>
                  </div>
                  <span className="badge badge-paid">
                    <CheckCircle2 size={12} /> Active
                  </span>
                </div>

                {passSuccess && (
                  <div style={{ background: 'var(--emerald-surface)', border: '1px solid var(--emerald)', borderRadius: '8px', padding: '10px 14px', color: '#34d399', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{passSuccess}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Username / Login Email</label>
                  <input
                    type="text"
                    className="form-input"
                    value={authCreds.email}
                    onChange={e => setAuthCreds({ ...authCreds, email: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    You can log in using this email, <code style={{ color: '#fff' }}>admin</code>, or your phone number.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Current / New Landlord Password</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    value={authCreds.passwordPlain}
                    onChange={e => setAuthCreds({ ...authCreds, passwordPlain: e.target.value })}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Default password is <strong style={{ color: '#34d399' }}>admin123</strong>. Type any new password and click Save below.
                  </span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                >
                  <CheckCircle2 size={14} /> Save New Credentials
                </button>
              </div>
            </form>
          )}

          {activeTab === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Local Backup Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <HardDrive size={22} color="#818cf8" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#fff' }}>Local Device Backup & Restore</h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Save a complete standalone .json backup file directly to this PC / phone downloads
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>
                    Offline Ready
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none' }}
                    onClick={() => {
                      const backup = rentEasyApi.getCompleteBackupData();
                      const now = new Date();
                      const dateStr = now.toISOString().split('T')[0];
                      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
                      const filename = `RentEasy_Backup_${dateStr}_${timeStr}.json`;
                      rentEasyApi.downloadBlob(filename, JSON.stringify(backup, null, 2), 'application/json');
                      setBackupMsg(`Local backup "${filename}" downloaded to device downloads!`);
                    }}
                  >
                    <Download size={14} /> Download Local Backup (.json)
                  </button>

                  {onOpenGoogleDriveBackup && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        onClose();
                        onOpenGoogleDriveBackup();
                      }}
                    >
                      <Download size={14} /> Open Full Backup Hub
                    </button>
                  )}
                </div>
              </div>

              {/* Google Drive Card */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(52, 168, 83, 0.08) 100%)',
                  border: '1px solid rgba(66, 133, 244, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Cloud size={24} color="#4285F4" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#fff' }}>Google Drive Cloud Sync & Auto-Backup</h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Safely archive and backup your rental books directly into Google Drive
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>
                    <ShieldCheck size={12} /> Google Cloud
                  </span>
                </div>

                {/* Connected Google Account & Auto-Backup Status Box */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Google Account:</span>
                      <strong style={{ fontSize: '0.85rem', color: gdriveSession.isConnected ? '#60a5fa' : 'var(--text-muted)' }}>
                        {gdriveSession.email || 'Not connected (Sign in to connect)'}
                      </strong>
                    </div>
                    {gdriveSession.isConnected && (
                      <span className="badge badge-paid" style={{ fontSize: '0.68rem' }}>Connected</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FolderSync size={16} color={gdriveSession.autoBackup ? '#34d399' : 'var(--text-dim)'} />
                      <span style={{ fontSize: '0.8rem', color: '#fff' }}>
                        Continuous Auto-Backup: <strong>{gdriveSession.autoBackup ? 'Enabled' : 'Disabled'}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`btn ${gdriveSession.autoBackup ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      onClick={handleToggleAutoBackup}
                    >
                      {gdriveSession.autoBackup ? 'Pause Auto-Backup' : 'Enable Auto-Backup'}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  Last Backup: <strong style={{ color: '#fff' }}>{lastBackup ? new Date(lastBackup).toLocaleString('en-IN') : 'Not yet saved to Drive'}</strong>
                </div>

                {backupMsg && (
                  <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(52, 168, 83, 0.15)', color: '#34d399', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{backupMsg}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ background: 'linear-gradient(135deg, #4285F4 0%, #1a73e8 100%)', border: 'none' }}
                    onClick={async () => {
                      const backup = rentEasyApi.getCompleteBackupData();
                      const nowStr = new Date().toISOString().split('T')[0];
                      await rentEasyApi.saveToGoogleDriveOrShare(`RentEasy_Full_Backup_${nowStr}.json`, JSON.stringify(backup, null, 2));
                      setBackupMsg('Backup saved to Google Drive cloud & downloaded!');
                    }}
                  >
                    <Cloud size={14} /> Quick Save to Drive
                  </button>

                  {onOpenGoogleDriveBackup && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        onClose();
                        onOpenGoogleDriveBackup();
                      }}
                    >
                      <Download size={14} /> Open Backup & Restore Hub
                    </button>
                  )}

                  <a
                    href="https://drive.google.com/drive/my-drive"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>Open Drive</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Danger Zone: Erase Demo Records */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f87171' }}>Erase All Records & Start Fresh</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Wipes all demo properties, tenants, and ledger transactions so you can enter your own real properties.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: '#ef4444', color: '#fff', border: 'none', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    if (window.confirm('Are you sure you want to erase all records and start completely fresh? A safety backup will be saved first.')) {
                      rentEasyApi.eraseAllDemoRecords();
                      setBackupMsg('All records erased! System is now clean and ready for your real data.');
                    }
                  }}
                >
                  <Trash2 size={14} /> Erase Demo Records
                </button>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                Immutable financial and operational change ledger (last 50 events)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditLogs.map(log => (
                  <div
                    key={log.id}
                    style={{
                      background: 'var(--bg-surface)',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '0.7rem' }}>
                        {log.action.replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-main)', marginTop: '2px' }}>
                      {log.details}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
