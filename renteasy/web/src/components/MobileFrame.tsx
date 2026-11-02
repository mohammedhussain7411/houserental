import React from 'react';
import { DeviceSyncStatus } from '../services/rentEasyApi';
import {
  Home,
  Building2,
  CalendarDays,
  FileSpreadsheet,
  BellRing,
  Receipt as ReceiptIcon,
  Wifi,
  Battery,
  Signal,
  Smartphone,
  RefreshCw,
  Cloud,
  Settings
} from 'lucide-react';

interface MobileFrameProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenInstall?: () => void;
  onOpenLiveSync?: () => void;
  onOpenGoogleDriveBackup?: () => void;
  onOpenSettings?: () => void;
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
  syncStatus,
  children
}) => {
  const isConnected = syncStatus?.isLiveConnected ?? true;
  const isSyncing = syncStatus?.isSyncing ?? false;
  return (
    <div className="mobile-view-wrapper">
      {onOpenInstall && (
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={onOpenInstall}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              padding: '8px 16px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Smartphone size={15} />
            <span>Install on Real Android Phone (APK)</span>
          </button>
        </div>
      )}
      <div className="phone-mockup">
        {/* Dynamic Island / Notch */}
        <div className="phone-notch">
          <div className="phone-camera"></div>
        </div>

        {/* Status Bar */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '20px',
            right: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#fff',
            zIndex: 35
          }}
        >
          <span>9:41</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Signal size={12} />
            <Wifi size={12} />
            <Battery size={14} />
          </div>
        </div>

        {/* Mobile Header Bar with Sync Now & Google Drive buttons */}
        <div
          style={{
            position: 'absolute',
            top: '36px',
            left: '0',
            right: '0',
            height: '48px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(12, 17, 28, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 30
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            onClick={() => onNavigate('dashboard')}
          >
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '7px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.8rem'
              }}
            >
              R
            </div>
            <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff', letterSpacing: '-0.02em' }}>
              RentEasy
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Sync Now button */}
            <button
              onClick={onOpenLiveSync}
              title="Sync Phone and Web Data"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                borderRadius: '20px',
                padding: '4px 9px',
                color: isConnected ? '#34d399' : '#fbbf24',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <RefreshCw
                size={11}
                className={isSyncing ? 'spin-animation' : ''}
                style={{
                  animation: isSyncing ? 'spin 1s linear infinite' : 'none'
                }}
              />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>

            {/* Google Drive / Login Button */}
            {onOpenGoogleDriveBackup && (
              <button
                onClick={onOpenGoogleDriveBackup}
                title="Google Drive Backup & Login"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(66, 133, 244, 0.15)',
                  border: '1px solid rgba(66, 133, 244, 0.4)',
                  borderRadius: '20px',
                  padding: '4px 9px',
                  color: '#93c5fd',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Cloud size={12} color="#4285F4" />
                <span>Google</span>
              </button>
            )}

            {/* Settings Button */}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                title="Settings"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Settings size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Screen Content */}
        <div className="phone-screen" style={{ paddingTop: '88px' }}>
          {children}
        </div>

        {/* Native Mobile Bottom Navigation Bar */}
        <div className="phone-bottom-nav">
          <button
            className={`phone-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            <Home size={17} />
            <span>Home</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'properties' ? 'active' : ''}`}
            onClick={() => onNavigate('properties')}
          >
            <Building2 size={17} />
            <span>Units</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'ledger' ? 'active' : ''}`}
            onClick={() => onNavigate('ledger')}
          >
            <FileSpreadsheet size={17} />
            <span>Ledger</span>
          </button>

          <button
            className="phone-nav-item"
            onClick={onOpenLiveSync}
            style={{ color: isConnected ? '#34d399' : '#fbbf24' }}
          >
            <RefreshCw
              size={17}
              style={{
                animation: isSyncing ? 'spin 1s linear infinite' : 'none'
              }}
            />
            <span>Sync</span>
          </button>

          <button
            className="phone-nav-item"
            onClick={onOpenGoogleDriveBackup}
            style={{ color: '#60a5fa' }}
          >
            <Cloud size={17} color="#4285F4" />
            <span>Drive</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'receipts' ? 'active' : ''}`}
            onClick={() => onNavigate('receipts')}
          >
            <ReceiptIcon size={17} />
            <span>Receipts</span>
          </button>
        </div>
      </div>
    </div>
  );
};
