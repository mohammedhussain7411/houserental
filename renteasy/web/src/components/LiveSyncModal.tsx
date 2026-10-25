import React, { useState, useEffect } from 'react';
import { rentEasyApi, DeviceSyncStatus } from '../services/rentEasyApi';
import {
  Smartphone,
  Monitor,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Database,
  ArrowLeftRight,
  X,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface LiveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveSyncModal: React.FC<LiveSyncModalProps> = ({ isOpen, onClose }) => {
  const [syncStatus, setSyncStatus] = useState<DeviceSyncStatus>(rentEasyApi.getSyncStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = rentEasyApi.subscribeSyncStatus(status => {
      setSyncStatus(status);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const phoneUrl = 'http://192.168.0.104:5174/';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(phoneUrl)}`;

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    setMessage(null);
    try {
      await rentEasyApi.forceSyncNow();
      setMessage('✅ Real-time synchronization completed! Both Phone and Web are in sync.');
    } catch (e: any) {
      setMessage(`Sync failed: ${e?.message || 'Check network connection'}`);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399'
            }}>
              <ArrowLeftRight size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Phone & Web Real-Time Sync</h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Two-way live update system for mobile & desktop
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          {/* Status Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderRadius: '12px',
            background: syncStatus.isLiveConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${syncStatus.isLiveConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: syncStatus.isLiveConnected ? '#10b981' : '#f59e0b',
                boxShadow: syncStatus.isLiveConnected ? '0 0 10px #10b981' : 'none'
              }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                  {syncStatus.isLiveConnected ? 'Live Two-Way Sync Active' : 'Connecting to Sync Server...'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {syncStatus.isLiveConnected
                    ? 'Changes on Phone or Web automatically update both screens in real time'
                    : 'Searching for local sync server at ' + phoneUrl}
                </div>
              </div>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleManualSync}
              disabled={isManualSyncing || syncStatus.isSyncing}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={isManualSyncing || syncStatus.isSyncing ? 'spin' : ''} />
              <span>{isManualSyncing || syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {message && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.82rem',
              color: '#34d399'
            }}>
              {message}
            </div>
          )}

          {/* Sync Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{
              padding: '12px',
              borderRadius: '10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '6px' }}>
                <Monitor size={14} /> Desktop / Web
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>Connected & Active</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Revision #{syncStatus.revision || '0'}
              </div>
            </div>

            <div style={{
              padding: '12px',
              borderRadius: '10px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '6px' }}>
                <Smartphone size={14} /> Phone / Mobile
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#34d399' }}>Live Two-Way Linked</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Last Synced: {syncStatus.lastSyncedAt || 'Just now'}
              </div>
            </div>
          </div>

          {/* Central Storage Info */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'var(--bg-surface-raised)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0' }}>
              <Database size={15} color="#818cf8" />
              <span>Central Host Database</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              All records (tenants, properties, rent charges, receipts, payments) are centrally stored in <code style={{ color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>server-data/renteasy-db.json</code>.
            </div>
          </div>

          {/* QR Code and Mobile Connection Link */}
          <div style={{
            padding: '14px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            gap: '16px',
            alignItems: 'center'
          }}>
            <div style={{
              background: '#fff',
              padding: '8px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <img
                src={qrCodeUrl}
                alt="Scan to open on phone"
                style={{ width: '100px', height: '100px', display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                Open on your Phone to test live sync:
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                1. Ensure your phone is connected to the same Wi-Fi.<br />
                2. Scan this QR code or open browser at:
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-base)',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#38bdf8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {phoneUrl}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleCopy}
                  style={{ padding: '4px', height: 'auto' }}
                  title="Copy Phone URL"
                >
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                💡 Tip: Put or edit any tenant on phone, and watch this screen update automatically!
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
};
