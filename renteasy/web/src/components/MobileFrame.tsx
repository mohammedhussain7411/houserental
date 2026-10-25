import React from 'react';
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
  Smartphone
} from 'lucide-react';

interface MobileFrameProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenInstall?: () => void;
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  currentPage,
  onNavigate,
  onOpenInstall,
  children
}) => {
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
            top: '12px',
            left: '24px',
            right: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.75rem',
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

        {/* Scrollable Screen Content */}
        <div className="phone-screen">
          {children}
        </div>

        {/* Native Mobile Bottom Navigation Bar */}
        <div className="phone-bottom-nav">
          <button
            className={`phone-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('dashboard')}
          >
            <Home size={18} />
            <span>Home</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'calendar' ? 'active' : ''}`}
            onClick={() => onNavigate('calendar')}
          >
            <CalendarDays size={18} />
            <span>Calendar</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'properties' ? 'active' : ''}`}
            onClick={() => onNavigate('properties')}
          >
            <Building2 size={18} />
            <span>Units</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'ledger' ? 'active' : ''}`}
            onClick={() => onNavigate('ledger')}
          >
            <FileSpreadsheet size={18} />
            <span>Ledger</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'reminders' ? 'active' : ''}`}
            onClick={() => onNavigate('reminders')}
          >
            <BellRing size={18} />
            <span>Reminders</span>
          </button>

          <button
            className={`phone-nav-item ${currentPage === 'receipts' ? 'active' : ''}`}
            onClick={() => onNavigate('receipts')}
          >
            <ReceiptIcon size={18} />
            <span>Receipts</span>
          </button>
        </div>
      </div>
    </div>
  );
};
