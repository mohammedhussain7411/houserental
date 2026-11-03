import React from 'react';
import { rentEasyApi, DeviceSyncStatus } from '../services/rentEasyApi';
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
  HardDrive,
  Settings,
  Users,
  Monitor
} from 'lucide-react';

interface MobileFrameProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenInstall?: () => void;
  onOpenLiveSync?: () => void;
  onOpenGoogleDriveBackup?: () => void;
  onOpenSettings?: () => void;
  onSwitchToLaptop?: () => void;
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
          className="fake-status-bar"
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
            {/* Laptop / Desktop Interface Button */}
            {onSwitchToLaptop && (
              <button
                onClick={onSwitchToLaptop}
                title="Switch to Full Laptop / Desktop Interface (if some parts are not visible)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(99, 102, 241, 0.25)',
                  border: '1px solid rgba(99, 102, 241, 0.6)',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  color: '#c7d2fe',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Monitor size={12} />
                <span>Laptop View</span>
              </button>
            )}

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

            {/* Backup & Restore Button */}
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
                  borderRadius: '20px',
                  padding: '4px 9px',
                  color: '#a5b4fc',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <HardDrive size={12} color="#818cf8" />
                <span>Backup</span>
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
          {rentEasyApi.getTenants().length === 0 && (
            <div style={{
              margin: '12px 16px',
              padding: '12px 14px',
              backgroundColor: '#1e293b',
              border: '1px solid #38bdf8',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#38bdf8' }}>
                📱 Data not showing on your phone?
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                Tap below to instantly restore your 37 tenants & units onto this mobile device:
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  rentEasyApi.restoreDefaultPortfolio();
                }}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
                  fontWeight: 700
                }}
              >
                🔄 Load 37 Tenants & Units
              </button>
            </div>
          )}
          {children}
        </div>

        {/* Native Mobile Bottom Navigation Bar (Horizontally scrollable) */}
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
            className={`phone-nav-item ${currentPage === 'tenants' ? 'active' : ''}`}
            onClick={() => onNavigate('tenants')}
          >
            <Users size={17} />
            <span>Tenants</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'ledger' ? 'active' : ''}`}
            onClick={() => onNavigate('ledger')}
          >
            <FileSpreadsheet size={17} />
            <span>Ledger</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'reminders' ? 'active' : ''}`}
            onClick={() => onNavigate('reminders')}
          >
            <BellRing size={17} />
            <span>Reminders</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'calendar' ? 'active' : ''}`}
            onClick={() => onNavigate('calendar')}
          >
            <CalendarDays size={17} />
            <span>Calendar</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'receipts' ? 'active' : ''}`}
            onClick={() => onNavigate('receipts')}
          >
            <ReceiptIcon size={17} />
            <span>Receipts</span>
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

          {onSwitchToLaptop && (
            <button
              className="phone-nav-item"
              onClick={onSwitchToLaptop}
              style={{ color: '#a5b4fc' }}
              title="Switch to Laptop View"
            >
              <Monitor size={17} />
              <span>Laptop</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
