import React from 'react';
import { rentEasyApi, DeviceSyncStatus } from '../services/rentEasyApi';
import {
  Home,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  BellRing,
  Receipt as ReceiptIcon,
  Smartphone,
  RefreshCw,
  Cloud,
  HardDrive,
  Settings,
  Users,
  Monitor,
  LogOut
} from 'lucide-react';

interface MobileFrameProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenInstall?: () => void;
  onOpenLiveSync?: () => void;
  onOpenGoogleDriveBackup?: () => void;
  onOpenSettings?: () => void;
  onSwitchToLaptop?: () => void;
  onLogout?: () => void;
  syncStatus?: DeviceSyncStatus;
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  currentPage,
  onNavigate,
  onOpenInstall,
  onOpenLiveSync,
  onOpenGoogleDriveBackup,
  onOpenSettings,
  onSwitchToLaptop,
  onLogout,
  syncStatus,
  children
}) => {
  const isConnected = syncStatus?.isLiveConnected ?? true;
  const isSyncing = syncStatus?.isSyncing ?? false;

  return (
    <div className="native-mobile-container">
      {/* Native Mobile Header Bar */}
      <header className="mobile-header">
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          onClick={() => onNavigate('dashboard')}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
            }}
          >
            R
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#fff', letterSpacing: '-0.02em' }}>
            RentEasy
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Sync Button */}
          {onOpenLiveSync && (
            <button
              onClick={onOpenLiveSync}
              title="Sync Phone and Cloud Data"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                borderRadius: '16px',
                padding: '4px 8px',
                color: isConnected ? '#34d399' : '#fbbf24',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RefreshCw
                size={11}
                style={{
                  animation: isSyncing ? 'spin 1s linear infinite' : 'none'
                }}
              />
              <span>{isSyncing ? 'Sync...' : isConnected ? 'Online' : 'Offline'}</span>
            </button>
          )}

          {/* Backup Button */}
          {onOpenGoogleDriveBackup && (
            <button
              onClick={onOpenGoogleDriveBackup}
              title="Backup & Restore (Local Download & Google Drive)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                borderRadius: '16px',
                padding: '4px 8px',
                color: '#a5b4fc',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <HardDrive size={11} color="#818cf8" />
              <span>Backup</span>
            </button>
          )}

          {/* Settings Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title="Settings"
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Settings size={14} />
            </button>
          )}

          {/* Sign Out Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                color: '#f87171',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </header>

      {/* Main Native Scrollable Mobile Content */}
      <main className="mobile-content-area">
        {children}
      </main>

      {/* Native Mobile Bottom Navigation Bar (Fixed at bottom) */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <Home size={18} />
          <span>Home</span>
        </button>

        <button
          className={`mobile-nav-item ${currentPage === 'properties' ? 'active' : ''}`}
          onClick={() => onNavigate('properties')}
        >
          <Building2 size={18} />
          <span>Units</span>
        </button>

        <button
          className={`mobile-nav-item ${currentPage === 'tenants' ? 'active' : ''}`}
          onClick={() => onNavigate('tenants')}
        >
          <Users size={18} />
          <span>Tenants</span>
        </button>

        <button
          className={`mobile-nav-item ${currentPage === 'ledger' ? 'active' : ''}`}
          onClick={() => onNavigate('ledger')}
        >
          <FileSpreadsheet size={18} />
          <span>Ledger</span>
        </button>

        <button
          className={`mobile-nav-item ${currentPage === 'receipts' ? 'active' : ''}`}
          onClick={() => onNavigate('receipts')}
        >
          <ReceiptIcon size={18} />
          <span>Receipts</span>
        </button>

        <button
          className={`mobile-nav-item ${currentPage === 'reminders' ? 'active' : ''}`}
          onClick={() => onNavigate('reminders')}
        >
          <BellRing size={18} />
          <span>Alerts</span>
        </button>

        <button
          className={`mobile-nav-item ${currentPage === 'calendar' ? 'active' : ''}`}
          onClick={() => onNavigate('calendar')}
        >
          <CalendarDays size={18} />
          <span>Calendar</span>
        </button>
      </nav>
    </div>
  );
};
