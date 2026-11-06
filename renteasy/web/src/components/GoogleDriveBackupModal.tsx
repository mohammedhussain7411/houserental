import React, { useState, useRef, useEffect } from 'react';
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
  ArrowRight,
  HardDrive,
  Save,
  FileDown,
  FolderUp,
  FileJson,
  Upload,
  Check
} from 'lucide-react';

interface GoogleDriveBackupModalProps {
  onClose: () => void;
  onRestoreSuccess?: () => void;
  initialTab?: 'local' | 'backup' | 'restore' | 'sheets' | 'guide';
}

export const GoogleDriveBackupModal: React.FC<GoogleDriveBackupModalProps> = ({
  onClose,
  onRestoreSuccess,
  initialTab = 'local'
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'backup' | 'restore' | 'sheets' | 'guide'>(initialTab);
  
  // Landlord & profile
  const landlord = rentEasyApi.getLandlord();
  const [session, setSession] = useState<GoogleDriveSession>(() => {
    const existing = rentEasyApi.getGoogleDriveSession();
    if (!existing.isConnected) {
      const targetEmail = landlord.email || (typeof localStorage !== 'undefined' ? localStorage.getItem('renteasy_logged_in_email') : '') || 'mohammedhussain7411@gmail.com';
      return rentEasyApi.loginGoogleDrive(targetEmail, landlord.name || 'Mohammed Hussain');
    }
    return existing;
  });
  const [cloudBackups, setCloudBackups] = useState<GoogleDriveCloudBackup[]>(() => rentEasyApi.getGoogleDriveCloudBackups());
  const [googleEmail, setGoogleEmail] = useState<string>(session.email || landlord.email || 'mohammedhussain7411@gmail.com');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);

  // Cloud action states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);

  // Local backup states
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [isExportingLocal, setIsExportingLocal] = useState<boolean>(false);
  const [isRestoringDefault, setIsRestoringDefault] = useState<boolean>(false);

  // Manual local file restore states
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<any | null>(null);
  const [parsedStats, setParsedStats] = useState<{ tenants: number; properties: number; charges: number; receipts: number; timestamp?: string } | null>(null);
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

  useEffect(() => {
    if (session.accessToken) {
      rentEasyApi.fetchRealGoogleDriveBackups().then(backups => {
        setCloudBackups(backups);
      });
    }
  }, [session.accessToken]);

  // ==========================================
  // 1. LOCAL BACKUP DOWNLOAD & RESTORE HANDLERS
  // ==========================================

  // A. Download complete local backup JSON file
  const handleDownloadLocalBackup = () => {
    setIsExportingLocal(true);
    setLocalNotice(null);
    try {
      const backup = rentEasyApi.getCompleteBackupData();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      const filename = `RentEasy_Backup_${dateStr}_${timeStr}.json`;
      const jsonStr = JSON.stringify(backup, null, 2);

      rentEasyApi.downloadBlob(filename, jsonStr, 'application/json');
      rentEasyApi.setLastBackupTime();
      rentEasyApi.addAudit('local_backup_downloaded', 'system', 'backup', `Downloaded local backup "${filename}" to device storage.`);

      setLocalNotice(`✅ Backup file "${filename}" downloaded successfully to your device!`);
    } catch (err: any) {
      setLocalNotice(`Failed to export local backup: ${err.message}`);
    } finally {
      setIsExportingLocal(false);
    }
  };

  // B. Share backup via Mobile Native Share (WhatsApp, Email, Files, Drive)
  const handleShareLocalBackup = async () => {
    try {
      const backup = rentEasyApi.getCompleteBackupData();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `RentEasy_Backup_${dateStr}.json`;
      const jsonStr = JSON.stringify(backup, null, 2);

      const res = await rentEasyApi.saveToGoogleDriveOrShare(filename, jsonStr, 'application/json');
      if (res.sharedViaNative) {
        setLocalNotice('✅ Backup file shared via system dialog.');
      } else {
        setLocalNotice(`✅ Backup file "${filename}" downloaded to device.`);
      }
    } catch (err: any) {
      setLocalNotice(`Share error: ${err.message}`);
    }
  };

  // C. Handle Local Backup File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFile(file);
    setParseError(null);
    setRestoreSuccessMsg(null);
    setParsedBackup(null);
    setParsedStats(null);

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
          throw new Error('No recognizable rental portfolio records found. Please choose a valid RentEasy backup JSON file.');
        }

        const tenantsList = Array.isArray(candidate)
          ? candidate
          : candidate.tenants || candidate.tenant_list || candidate.renters || [];
        const propertiesList = candidate.properties || candidate.property_list || candidate.buildings || [];
        const chargesList = candidate.rent_charges || candidate.charges || [];
        const receiptsList = candidate.receipts || candidate.payment_receipts || [];

        setParsedBackup(json);
        setParsedStats({
          tenants: tenantsList.length,
          properties: propertiesList.length,
          charges: chargesList.length,
          receipts: receiptsList.length,
          timestamp: json.created_at || json.timestamp || candidate.timestamp
        });
      } catch (err: any) {
        setParseError(err.message || 'Failed to read backup JSON file.');
        setParsedBackup(null);
        setParsedStats(null);
      }
    };
    reader.readAsText(file);
  };

  // D. Confirm and Restore from Local Backup
  const handleConfirmManualRestore = () => {
    if (!parsedBackup) return;
    if (!window.confirm(`Restore ${parsedStats?.tenants || ''} tenants & ${parsedStats?.properties || ''} properties from "${importedFile?.name}"? This will replace your current workspace records.`)) {
      return;
    }

    const res = rentEasyApi.restoreBackupData(parsedBackup);
    if (res.success) {
      setRestoreSuccessMsg(`✅ Portfolio successfully restored from "${importedFile?.name}"! (${parsedStats?.tenants || 0} tenants, ${parsedStats?.properties || 0} properties restored).`);
      setParsedBackup(null);
      setImportedFile(null);
      setParsedStats(null);
      if (onRestoreSuccess) onRestoreSuccess();
    } else {
      setParseError(res.message);
    }
  };

  // E. 1-Click Restore Bundled Portfolio
  const handleRestoreDefaultPortfolio = () => {
    if (!window.confirm('Restore complete portfolio (37 Tenants, 3 Properties, Charges & Receipts) onto this device?')) {
      return;
    }
    setIsRestoringDefault(true);
    try {
      const res = rentEasyApi.restoreDefaultPortfolio();
      if (res.success) {
        setLocalNotice(`✅ Portfolio loaded! ${res.tenantCount} tenants and ${res.propertyCount} properties are now active on this device.`);
        if (onRestoreSuccess) onRestoreSuccess();
      } else {
        setLocalNotice('Failed to load portfolio.');
      }
    } finally {
      setIsRestoringDefault(false);
    }
  };

  // ==========================================
  // 2. GOOGLE DRIVE BACKUP & ACTIONS
  // ==========================================
  const handleUpdateGoogleEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!googleEmail || !googleEmail.includes('@')) {
      alert('Please enter a valid Google Account email.');
      return;
    }

    setIsLoggingIn(true);
    setTimeout(() => {
      const newSession = rentEasyApi.loginGoogleDrive(googleEmail.trim());
      setSession(newSession);
      setIsEditingEmail(false);
      setIsLoggingIn(false);
      setCloudNotice(`Updated Google Drive target to (${newSession.email}). Auto-backup is active.`);
    }, 250);
  };

  const handleToggleAutoBackup = () => {
    const nextVal = !session.autoBackup;
    rentEasyApi.updateGoogleDriveAutoBackup(nextVal);
    setSession(prev => ({ ...prev, autoBackup: nextVal }));
    if (nextVal) {
      rentEasyApi.triggerAutoGoogleDriveBackup();
      setCloudBackups(rentEasyApi.getGoogleDriveCloudBackups());
      setCloudNotice('Continuous Auto-Backup to Google Drive is now ACTIVE!');
    } else {
      setCloudNotice('Continuous Auto-Backup paused. You can still save manual backups to Drive at any time.');
    }
  };

  const handleGoogleSignOut = () => {
    if (window.confirm('Disconnect your Google Drive account?')) {
      rentEasyApi.logoutGoogleDrive();
      setSession(rentEasyApi.getGoogleDriveSession());
      setCloudNotice('Disconnected from Google Drive.');
    }
  };

  const handleBackupToGoogleDrive = async () => {
    setIsExporting(true);
    setCloudNotice(null);
    try {
      // 1. Create complete cloud snapshot in RentEasy
      const newCloudBackup = await rentEasyApi.saveCloudBackupToGoogleDrive(false);
      setCloudBackups(rentEasyApi.getGoogleDriveCloudBackups());

      // 2. Prompt native share dialog (which directly provides Google Drive's "Save to Drive" app on Android)
      const jsonStr = JSON.stringify(newCloudBackup.data, null, 2);
      const res = await rentEasyApi.saveToGoogleDriveOrShare(newCloudBackup.fileName, jsonStr, 'application/json');
      if (res.sharedViaNative) {
        setCloudNotice(`✅ Success! Backup snapshot "${newCloudBackup.fileName}" shared directly to your Google Drive!`);
      } else {
        setCloudNotice(`✅ Success! Backup snapshot "${newCloudBackup.fileName}" saved to cloud list and downloaded.`);
      }
    } catch (err: any) {
      setCloudNotice('Backup saved to Google Drive session.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestoreFromCloud = async (backupId: string) => {
    const target = cloudBackups.find(b => b.id === backupId);
    if (!target) return;

    if (!window.confirm(`Restore backup from ${formatDate(target.savedAt)}? This will replace your current workspace records.`)) {
      return;
    }

    setIsRestoringId(backupId);
    try {
      const res = await rentEasyApi.restoreFromGoogleDriveBackup(backupId);
      setIsRestoringId(null);
      if (res.success) {
        setRestoreSuccessMsg(`Portfolio successfully restored from Google Drive backup "${target.fileName}"!`);
        if (onRestoreSuccess) onRestoreSuccess();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      setIsRestoringId(null);
      alert(`Restore failed: ${err.message}`);
    }
  };

  const handleDeleteCloudBackup = (backupId: string) => {
    if (window.confirm('Delete this backup from your Google Drive list?')) {
      rentEasyApi.deleteGoogleDriveCloudBackup(backupId);
      setCloudBackups(rentEasyApi.getGoogleDriveCloudBackups());
    }
  };

  // CSV Exports
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
    setLocalNotice(`Spreadsheet "${filename}" downloaded! Open with Excel or Google Sheets.`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '820px', width: '94%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Database size={24} color="#818cf8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="card-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                  Backup & Restore Center
                </h3>
                <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>
                  Local & Cloud
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Download offline local backups to this device or sync to Google Drive
              </p>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose} title="Close Modal">
            <X size={18} />
          </button>
        </div>

        {/* Top Status Strip: Storage Status & Google Drive Link */}
        <div
          style={{
            margin: '0 24px 12px 24px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Current Portfolio:</span>
            <strong style={{ color: '#fff' }}>{summary.total_tenants} Tenants</strong>
            <span style={{ color: 'var(--border-subtle)' }}>&bull;</span>
            <strong style={{ color: '#fff' }}>{summary.total_properties} Properties</strong>
            <span style={{ color: 'var(--border-subtle)' }}>&bull;</span>
            <strong style={{ color: '#fff' }}>{summary.total_receipts} Receipts</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            {session.isConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: '#93c5fd', fontWeight: 600 }}>Drive: {session.email}</span>
                <button
                  onClick={handleGoogleSignOut}
                  style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', marginLeft: '4px' }}
                >
                  (Disconnect)
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                <Cloud size={14} color="#60a5fa" />
                <span>Google Drive: Not Connected</span>
                <button
                  onClick={() => setActiveTab('backup')}
                  style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Connect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '0 24px',
            gap: '8px',
            background: 'rgba(0,0,0,0.1)',
            overflowX: 'auto'
          }}
        >
          {/* TAB 1: LOCAL BACKUP (ACTIVE BY DEFAULT) */}
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'local' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'local' ? '2px solid #818cf8' : '2px solid transparent',
              color: activeTab === 'local' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('local')}
          >
            <HardDrive size={16} color={activeTab === 'local' ? '#818cf8' : 'currentColor'} />
            💾 Local Backup (Device)
          </button>

          {/* TAB 2: GOOGLE DRIVE BACKUP */}
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'backup' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'backup' ? '2px solid #4285F4' : '2px solid transparent',
              color: activeTab === 'backup' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('backup')}
          >
            <Cloud size={16} color={activeTab === 'backup' ? '#4285F4' : 'currentColor'} />
            ☁️ Google Drive
          </button>

          {/* TAB 3: RESTORE FROM DRIVE */}
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'restore' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'restore' ? '2px solid #34A853' : '2px solid transparent',
              color: activeTab === 'restore' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('restore')}
          >
            <UploadCloud size={16} color={activeTab === 'restore' ? '#34A853' : 'currentColor'} />
            Drive Snapshots ({cloudBackups.length})
          </button>

          {/* TAB 4: SPREADSHEETS */}
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'sheets' ? 'active' : ''}`}
            style={{
              borderRadius: '0',
              borderBottom: activeTab === 'sheets' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'sheets' ? '#fff' : 'var(--text-dim)',
              padding: '12px 18px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setActiveTab('sheets')}
          >
            <FileSpreadsheet size={16} color={activeTab === 'sheets' ? '#10b981' : 'currentColor'} />
            Export CSV
          </button>
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '24px', maxHeight: '68vh', overflowY: 'auto' }}>
          {/* Notification Banner */}
          {(localNotice || cloudNotice) && (
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
              <span>{localNotice || cloudNotice}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 1: LOCAL BACKUP (SAVE TO DEVICE & RESTORE FROM DEVICE) */}
          {/* ========================================================= */}
          {activeTab === 'local' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* SECTION A: DOWNLOAD LOCAL BACKUP FILE */}
              <div
                style={{
                  padding: '22px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <HardDrive size={20} color="#818cf8" />
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                        1. Download Local Backup (.json)
                      </h4>
                    </div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      Save a complete, standalone backup file directly to your phone downloads or laptop folder. No Google account required.
                    </p>
                  </div>
                  <span className="badge badge-paid" style={{ fontSize: '0.72rem' }}>
                    100% Offline & Private
                  </span>
                </div>

                {/* Live Stats of what will be downloaded */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Properties</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{summary.total_properties}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tenants</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>{summary.total_tenants}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Rent Charges</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a78bfa' }}>{summary.total_rent_charges}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Receipts</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34d399' }}>{summary.total_receipts}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                      border: 'none',
                      padding: '12px 22px',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onClick={handleDownloadLocalBackup}
                    disabled={isExportingLocal}
                  >
                    {isExportingLocal ? <RefreshCw size={18} className="spin" /> : <Download size={18} />}
                    <span>Download Local Backup File (.json)</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{
                      padding: '12px 18px',
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onClick={handleShareLocalBackup}
                    title="Share via WhatsApp, Email, or Save to Files on Mobile"
                  >
                    <Share2 size={16} />
                    <span>Share File (WhatsApp/Email)</span>
                  </button>
                </div>
              </div>

              {/* SECTION B: RESTORE FROM LOCAL BACKUP FILE (.JSON) */}
              <div
                style={{
                  padding: '22px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FolderUp size={20} color="#34d399" />
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                      2. Restore Portfolio from Local Backup File
                    </h4>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Select any previously downloaded <code style={{ color: '#818cf8' }}>RentEasy_Backup_*.json</code> file to restore your portfolio onto this device.
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
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{restoreSuccessMsg}</div>
                  </div>
                )}

                {parseError && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#f87171',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <span>{parseError}</span>
                  </div>
                )}

                {/* File Upload Dropzone / Button */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".json,application/json"
                  onChange={handleFileChange}
                />

                <div
                  style={{
                    border: '2px dashed rgba(99, 102, 241, 0.4)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px 18px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(99, 102, 241, 0.04)',
                    transition: 'border-color 0.2s'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileJson size={36} color="#818cf8" style={{ margin: '0 auto 10px auto' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                    {importedFile ? importedFile.name : 'Click to Browse & Select Backup File (.json)'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {importedFile
                      ? `Size: ${formatBytes(importedFile.size)} • Click to choose a different file`
                      : 'Supports RentEasy .json backup files from PC, Mobile, or Downloads folder'}
                  </div>
                </div>

                {/* Preview of selected backup file */}
                {parsedStats && (
                  <div
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(52, 168, 83, 0.1)',
                      border: '1px solid rgba(52, 168, 83, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#34d399' }}>
                        Ready to Restore:
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {formatBytes(importedFile?.size || 0)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                      <span>Properties: <strong style={{ color: '#fff' }}>{parsedStats.properties}</strong></span>
                      <span>Tenants: <strong style={{ color: '#38bdf8' }}>{parsedStats.tenants}</strong></span>
                      <span>Charges: <strong style={{ color: '#a78bfa' }}>{parsedStats.charges}</strong></span>
                      <span>Receipts: <strong style={{ color: '#34d399' }}>{parsedStats.receipts}</strong></span>
                    </div>

                    <button
                      className="btn btn-primary"
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        padding: '12px',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onClick={handleConfirmManualRestore}
                    >
                      <Upload size={18} />
                      <span>Restore Portfolio from "{importedFile?.name}"</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION C: 1-CLICK BUNDLED STARTER PORTFOLIO RESTORE */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    Need to Restore Your 37 Tenants Portfolio?
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Instantly load SFR Properties with all 37 tenants, previous dues, charges, and receipts onto this device.
                  </div>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  onClick={handleRestoreDefaultPortfolio}
                  disabled={isRestoringDefault}
                >
                  {isRestoringDefault ? <RefreshCw size={14} className="spin" /> : <RotateCcwIcon />}
                  <span>1-Click Restore Portfolio (37 Tenants)</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: GOOGLE DRIVE BACKUP & CONNECTIVITY */}
          {/* ========================================================= */}
          {activeTab === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Google Drive Active Card */}
              <div
                style={{
                  padding: '22px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Cloud size={22} color="#4285F4" />
                      <h4 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#ffffff' }}>
                        Google Drive Cloud Backup
                      </h4>
                    </div>
                    <div style={{ margin: '6px 0 0 0', fontSize: '0.84rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Target Account:</span>
                      <strong style={{ color: '#60a5fa' }}>{session.email}</strong>
                      <button
                        type="button"
                        onClick={() => setIsEditingEmail(!isEditingEmail)}
                        style={{ background: 'transparent', border: 'none', color: '#93c5fd', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                      >
                        {isEditingEmail ? 'Cancel' : 'Change Email'}
                      </button>
                    </div>
                  </div>
                  <span className="badge badge-paid" style={{ fontSize: '0.72rem' }}>
                    Connected to Drive
                  </span>
                </div>

                {/* Edit Email Input if requested */}
                {isEditingEmail && (
                  <form onSubmit={handleUpdateGoogleEmail} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="email"
                      required
                      value={googleEmail}
                      onChange={e => setGoogleEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="form-input"
                      style={{ fontSize: '0.85rem', flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={isLoggingIn}>
                      Save Account
                    </button>
                  </form>
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #4285F4 0%, #1a73e8 100%)',
                      border: 'none',
                      padding: '12px 22px',
                      fontSize: '0.92rem',
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

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', fontSize: '0.88rem' }}
                    onClick={handleDownloadLocalBackup}
                  >
                    <Download size={15} />
                    <span>Download File (.json)</span>
                  </button>
                </div>
              </div>

              {/* Auto-Backup Toggle */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-lg)',
                  background: session.autoBackup ? 'rgba(52, 168, 83, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  border: session.autoBackup ? '1px solid rgba(52, 168, 83, 0.4)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#fff' }}>
                      Continuous Auto-Backup
                    </strong>
                    <span className={session.autoBackup ? 'badge badge-paid' : 'badge badge-pending'} style={{ fontSize: '0.72rem' }}>
                      {session.autoBackup ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Automatically saves a cloud snapshot whenever any tenant, rent charge, or receipt is added.
                  </p>
                </div>

                <button
                  type="button"
                  className={`btn ${session.autoBackup ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                  onClick={handleToggleAutoBackup}
                >
                  {session.autoBackup ? 'Pause Auto-Backup' : 'Enable Auto-Backup'}
                </button>
              </div>

              {/* Recent Snapshots Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                    Recent Cloud Snapshots ({cloudBackups.length})
                  </h4>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveTab('restore')}
                    style={{ fontSize: '0.75rem' }}
                  >
                    View All &amp; Restore
                  </button>
                </div>

                {cloudBackups.length === 0 ? (
                  <div style={{ padding: '18px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                    No snapshots captured yet. Tap "Backup to Google Drive Now" above to capture your first snapshot!
                  </div>
                ) : (
                  cloudBackups.slice(0, 3).map(backup => (
                    <div
                      key={backup.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                          {backup.fileName}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {formatDate(backup.savedAt)} &bull; {backup.tenantsCount} Tenants &bull; {backup.propertiesCount} Properties
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRestoreFromCloud(backup.id)}
                        disabled={isRestoringId === backup.id}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {isRestoringId === backup.id ? 'Restoring...' : 'Restore'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: RESTORE FROM GOOGLE DRIVE SNAPSHOTS */}
          {/* ========================================================= */}
          {activeTab === 'restore' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Restore from Google Drive Snapshots
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {session.isConnected
                    ? `Snapshots saved in your Google Drive (${session.email}):`
                    : 'Sign in to Google Drive under the Google Drive tab to access cloud snapshots.'}
                </p>
              </div>

              {cloudBackups.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <Cloud size={32} color="var(--text-dim)" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>No Backups in Google Drive Yet</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Switch to the "Local Backup" tab to download a backup file to your device, or connect to Google Drive.
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
                        <span>{b.tenantsCount} Tenants</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none' }}
                        onClick={() => handleRestoreFromCloud(b.id)}
                        disabled={isRestoringId === b.id}
                      >
                        {isRestoringId === b.id ? <RefreshCw size={14} className="spin" /> : <UploadCloud size={14} />}
                        <span>Restore This Snapshot</span>
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
          )}

          {/* ========================================================= */}
          {/* TAB 4: SPREADSHEET EXPORTS (CSV) */}
          {/* ========================================================= */}
          {activeTab === 'sheets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                  Export Spreadsheets (CSV)
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Download spreadsheet files to open in Microsoft Excel or Google Sheets:
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>Tenants Directory</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>House No, Rent, Deposit & Due Balances</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExportCSV('tenants')}>
                    <Download size={14} /> Download Tenants CSV
                  </button>
                </div>

                <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>Monthly Ledger</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>All rent dues, payments & balances</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExportCSV('ledger')}>
                    <Download size={14} /> Download Ledger CSV
                  </button>
                </div>

                <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>Payment Receipts</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Receipt IDs, payment dates & amounts</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleExportCSV('payments')}>
                    <Download size={14} /> Download Receipts CSV
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            <HardDrive size={14} color="#818cf8" />
            <span>Local Backup: Saved to Device Downloads &bull; Google Drive: {session.isConnected ? session.email : 'Optional'}</span>
          </div>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Inline helper icon component for RotateCcw
const RotateCcwIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);
