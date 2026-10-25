import React, { useState, useEffect } from 'react';
import { rentEasyApi } from './services/rentEasyApi';
import { Property, Tenant, RentCharge, Receipt, Landlord } from './types';

// Modals
import { ReceiptModal } from './components/ReceiptModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { AddPropertyModal } from './components/AddPropertyModal';
import { AddTenantModal } from './components/AddTenantModal';
import { SettingsModal } from './components/SettingsModal';
import { GoogleDriveBackupModal } from './components/GoogleDriveBackupModal';
import { MobileInstallModal } from './components/MobileInstallModal';
import { MobileFrame } from './components/MobileFrame';
import { LiveSyncModal } from './components/LiveSyncModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { RentCalendarPage } from './pages/RentCalendarPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { TenantsPage } from './pages/TenantsPage';
import { RentLedgerPage } from './pages/RentLedgerPage';
import { ReminderCentrePage } from './pages/ReminderCentrePage';
import { ReceiptsReportsPage } from './pages/ReceiptsReportsPage';
import { LoginPage } from './pages/LoginPage';

// Icons
import {
  Home,
  Building2,
  CalendarDays,
  Users,
  FileSpreadsheet,
  BellRing,
  FileText,
  Settings,
  Smartphone,
  Monitor,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  Menu,
  X,
  LogOut,
  Cloud,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // If the user explicitly signed out in this session, show login screen
    if (sessionStorage.getItem('renteasy_explicit_logout') === 'true') {
      return false;
    }
    // Default to true so all tabs, screens, and features are immediately accessible
    return true;
  });

  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isMobileMode, setIsMobileMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isIconOnlySidebar, setIsIconOnlySidebar] = useState<boolean>(false);

  // Modals state
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState<boolean>(false);
  const [selectedChargeForPayment, setSelectedChargeForPayment] = useState<RentCharge | null>(null);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState<boolean>(false);
  const [isAddTenantOpen, setIsAddTenantOpen] = useState<boolean>(false);
  const [tenantModalInitialPropertyId, setTenantModalInitialPropertyId] = useState<string | undefined>(undefined);
  const [tenantModalInitialUnitNumber, setTenantModalInitialUnitNumber] = useState<string | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isGoogleDriveBackupOpen, setIsGoogleDriveBackupOpen] = useState<boolean>(false);
  const [isMobileInstallOpen, setIsMobileInstallOpen] = useState<boolean>(false);
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);

  const [landlord, setLandlord] = useState<Landlord>(rentEasyApi.getLandlord());
  const [properties, setProperties] = useState<Property[]>(rentEasyApi.getProperties());
  const [charges, setCharges] = useState<RentCharge[]>(rentEasyApi.getRentCharges());
  const [syncStatus, setSyncStatus] = useState(rentEasyApi.getSyncStatus());
  const [isLiveSyncModalOpen, setIsLiveSyncModalOpen] = useState<boolean>(false);
  const [dashboardTick, setDashboardTick] = useState<number>(0);

  // Real-time synchronization listener for Phone <-> Web updates
  useEffect(() => {
    const unsub = rentEasyApi.subscribeSyncStatus(status => {
      setSyncStatus(status);
    });

    const handleSyncEvent = () => {
      setProperties(rentEasyApi.getProperties());
      setCharges(rentEasyApi.getRentCharges());
      setLandlord(rentEasyApi.getLandlord());
    };

    window.addEventListener('renteasy_sync', handleSyncEvent);

    return () => {
      unsub();
      window.removeEventListener('renteasy_sync', handleSyncEvent);
    };
  }, []);

  const handleOpenPayment = (charge?: RentCharge) => {
    setSelectedChargeForPayment(charge || null);
    setIsRecordPaymentOpen(true);
  };

  const handleOpenAddTenant = (propertyId?: string, unitNumber?: string) => {
    setTenantModalInitialPropertyId(propertyId);
    setTenantModalInitialUnitNumber(unitNumber);
    setIsAddTenantOpen(true);
  };

  const handlePaymentSuccess = (receipt: Receipt) => {
    setIsRecordPaymentOpen(false);
    setViewingReceipt(receipt);
    setCharges(rentEasyApi.getRentCharges());
    setDashboardTick(t => t + 1);
  };

  const handlePropertySuccess = (newProp: Property) => {
    setIsAddPropertyOpen(false);
    setProperties(rentEasyApi.getProperties());
    setDashboardTick(t => t + 1);
  };

  const handleTenantSuccess = (newTenant: Tenant) => {
    setIsAddTenantOpen(false);
    setTenantModalInitialPropertyId(undefined);
    setTenantModalInitialUnitNumber(undefined);
    setProperties(rentEasyApi.getProperties());
    setCharges(rentEasyApi.getRentCharges());
    setDashboardTick(t => t + 1);
    window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'local', key: 'tenants' } }));
  };

  // Render the current page content
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            refreshTrigger={dashboardTick}
            onNavigate={setCurrentPage}
            onOpenRecordPayment={handleOpenPayment}
            onOpenAddProperty={() => setIsAddPropertyOpen(true)}
            onOpenAddTenant={() => handleOpenAddTenant()}
            onViewReceipt={setViewingReceipt}
            onOpenGoogleDriveBackup={() => setIsGoogleDriveBackupOpen(true)}
          />
        );
      case 'calendar':
        return <RentCalendarPage onOpenRecordPayment={handleOpenPayment} />;
      case 'properties':
        return (
          <PropertiesPage
            onOpenAddProperty={() => setIsAddPropertyOpen(true)}
            onOpenAddTenant={handleOpenAddTenant}
            onOpenRecordPayment={handleOpenPayment}
            onTenantUpdated={handleTenantSuccess}
          />
        );
      case 'tenants':
        return (
          <TenantsPage
            onOpenAddTenant={() => handleOpenAddTenant()}
            onOpenRecordPayment={handleOpenPayment}
            properties={properties}
            onTenantUpdated={handleTenantSuccess}
          />
        );
      case 'ledger':
        return (
          <RentLedgerPage
            onOpenRecordPayment={handleOpenPayment}
            onViewReceipt={setViewingReceipt}
          />
        );
      case 'reminders':
        return <ReminderCentrePage />;
      case 'receipts':
        return <ReceiptsReportsPage onViewReceipt={setViewingReceipt} />;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('renteasy_auth_token');
    sessionStorage.removeItem('renteasy_auth_token');
    sessionStorage.setItem('renteasy_explicit_logout', 'true');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isIconOnlySidebar ? 'icon-only' : ''}`} style={{ display: isMobileMode ? 'none' : 'flex' }}>
        <div className="sidebar-header">
          <div
            className="logo-badge"
            title={isIconOnlySidebar ? "RentEasy — Click to expand" : "RentEasy — Click to collapse"}
            style={{ cursor: 'pointer' }}
            onClick={() => setIsIconOnlySidebar(!isIconOnlySidebar)}
          >
            <div className="logo-icon">
              <Building2 size={22} />
            </div>
            {!isIconOnlySidebar && (
              <div>
                <div style={{ lineHeight: 1.1 }}>RentEasy</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 500, letterSpacing: '0.04em' }}>
                  LANDLORD OS
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {!isIconOnlySidebar ? (
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', padding: '8px 14px', letterSpacing: '0.06em' }}>
              Core Modules
            </div>
          ) : (
            <div className="sidebar-divider" />
          )}

          <button
            className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
            data-tooltip="Dashboard"
            title="Dashboard"
          >
            <Home size={19} className="nav-icon" />
            {!isIconOnlySidebar && <span>Dashboard</span>}
          </button>

          <button
            className={`nav-link ${currentPage === 'calendar' ? 'active' : ''}`}
            onClick={() => setCurrentPage('calendar')}
            data-tooltip="Rent Calendar"
            title="Rent Calendar"
          >
            <CalendarDays size={19} className="nav-icon" />
            {!isIconOnlySidebar && <span>Rent Calendar</span>}
          </button>

          <button
            className={`nav-link ${currentPage === 'properties' ? 'active' : ''}`}
            onClick={() => setCurrentPage('properties')}
            data-tooltip="Properties"
            title="Properties"
          >
            <Building2 size={19} className="nav-icon" />
            {!isIconOnlySidebar && <span>Properties</span>}
          </button>

          <button
            className={`nav-link ${currentPage === 'tenants' ? 'active' : ''}`}
            onClick={() => setCurrentPage('tenants')}
            data-tooltip="Tenants & Leases"
            title="Tenants & Leases"
          >
            <Users size={19} className="nav-icon" />
            {!isIconOnlySidebar && <span>Tenants & Leases</span>}
          </button>

          <button
            className={`nav-link ${currentPage === 'ledger' ? 'active' : ''}`}
            onClick={() => setCurrentPage('ledger')}
            data-tooltip="Monthly Ledger"
            title="Monthly Ledger"
          >
            <FileSpreadsheet size={19} className="nav-icon" />
            {!isIconOnlySidebar && <span>Monthly Ledger</span>}
          </button>

          {!isIconOnlySidebar ? (
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', padding: '16px 14px 6px 14px', letterSpacing: '0.06em' }}>
              Automation & Tools
            </div>
          ) : (
            <div className="sidebar-divider" />
          )}

          <button
            className={`nav-link ${currentPage === 'reminders' ? 'active' : ''}`}
            onClick={() => setCurrentPage('reminders')}
            data-tooltip="Reminder Centre"
            title="Reminder Centre"
          >
            <BellRing size={19} className="nav-icon" />
            {!isIconOnlySidebar && <span>Reminder Centre</span>}
          </button>

          <button
            className={`nav-link ${currentPage === 'receipts' ? 'active' : ''}`}
            onClick={() => setCurrentPage('receipts')}
            data-tooltip="Receipts & Reports"
            title="Receipts & Reports"
          >
            <FileText size={19} className="nav-icon" />
            {!isIconOnlySidebar && <span>Receipts & Reports</span>}
          </button>

          <button
            className="nav-link"
            onClick={() => setIsGoogleDriveBackupOpen(true)}
            data-tooltip="Google Drive Backup"
            title="Google Drive Backup"
          >
            <Cloud size={19} className="nav-icon" color="#4285F4" />
            {!isIconOnlySidebar && <span>Google Drive Backup</span>}
          </button>

          <button
            className="nav-link"
            onClick={() => setIsMobileInstallOpen(true)}
            data-tooltip="Install App (APK)"
            title="Install App (APK)"
          >
            <Smartphone size={19} className="nav-icon" color="#10b981" />
            {!isIconOnlySidebar && <span>Install App (APK)</span>}
          </button>
        </nav>

        {/* Sidebar Footer User Box */}
        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
          {isIconOnlySidebar ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
                onClick={() => setIsSettingsOpen(true)}
                title={`Landlord: ${landlord.name}`}
              >
                RS
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center' }}
                onClick={() => setIsSettingsOpen(true)}
                title="Settings"
              >
                <Settings size={18} color="var(--text-dim)" />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center', color: '#fb7185' }}
                onClick={handleLogout}
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center', marginTop: '4px' }}
                onClick={() => setIsIconOnlySidebar(false)}
                title="Expand Side Panel"
              >
                <PanelLeftOpen size={16} color="var(--text-dim)" />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '4px 10px' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                onClick={() => setIsSettingsOpen(true)}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                  RS
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#fff' }}>{landlord.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{landlord.company_name}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '6px' }}
                  onClick={() => setIsIconOnlySidebar(true)}
                  title="Collapse to Icons"
                >
                  <PanelLeftClose size={17} color="var(--text-dim)" />
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '6px', color: '#fb7185' }}
                  onClick={handleLogout}
                  title="Sign Out"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Navbar with Mode Switcher & Quick Actions */}
        <header className="top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* View Mode Toggle: Desktop vs Mobile View */}
            <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                className={`btn btn-sm ${!isMobileMode ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => setIsMobileMode(false)}
              >
                <Monitor size={14} /> Desktop Dashboard
              </button>
              <button
                className={`btn btn-sm ${isMobileMode ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                onClick={() => setIsMobileMode(true)}
              >
                <Smartphone size={14} /> Mobile App Preview
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Real-Time Phone <-> Web Sync Indicator */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsLiveSyncModalOpen(true)}
              title="Real-Time Phone & Web Synchronization Status"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                borderColor: syncStatus.isLiveConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)',
                background: syncStatus.isLiveConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                padding: '5px 11px'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: syncStatus.isLiveConnected ? '#10b981' : '#f59e0b',
                  boxShadow: syncStatus.isLiveConnected ? '0 0 8px #10b981' : 'none',
                  display: 'inline-block'
                }}
              />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: syncStatus.isLiveConnected ? '#34d399' : '#fbbf24' }}>
                {syncStatus.isSyncing ? 'Syncing...' : syncStatus.isLiveConnected ? 'Phone & Web Linked' : 'Connecting Sync...'}
              </span>
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsMobileInstallOpen(true)}
              title="Install on Mobile (APK)"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Smartphone size={15} />
              <span>Install / APK</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsGoogleDriveBackupOpen(true)}
              title="Save or Restore Data in Google Drive"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Cloud size={16} color="#4285F4" />
              <span>Google Drive</span>
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsSettingsOpen(true)}
              title="System Settings & Audit Log"
            >
              <Settings size={16} />
              <span>Settings</span>
            </button>

            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              title="Sign Out of Landlord Session"
              style={{ color: '#fb7185', fontSize: '0.78rem', gap: '5px' }}
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* View Mode Router */}
        {isMobileMode ? (
          <MobileFrame
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onOpenInstall={() => setIsMobileInstallOpen(true)}
          >
            {renderCurrentPage()}
          </MobileFrame>
        ) : (
          renderCurrentPage()
        )}
      </main>

      {/* Global Modals */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          initialCharge={selectedChargeForPayment}
          charges={charges}
          onClose={() => setIsRecordPaymentOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {isAddPropertyOpen && (
        <AddPropertyModal
          onClose={() => setIsAddPropertyOpen(false)}
          onSuccess={handlePropertySuccess}
        />
      )}

      {isAddTenantOpen && (
        <AddTenantModal
          properties={properties}
          initialPropertyId={tenantModalInitialPropertyId}
          initialUnitNumber={tenantModalInitialUnitNumber}
          onClose={() => {
            setIsAddTenantOpen(false);
            setTenantModalInitialPropertyId(undefined);
            setTenantModalInitialUnitNumber(undefined);
          }}
          onSuccess={handleTenantSuccess}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onUpdate={setLandlord}
          onOpenGoogleDriveBackup={() => setIsGoogleDriveBackupOpen(true)}
        />
      )}

      {isGoogleDriveBackupOpen && (
        <GoogleDriveBackupModal
          onClose={() => setIsGoogleDriveBackupOpen(false)}
          onRestoreSuccess={() => {
            setProperties(rentEasyApi.getProperties());
            setCharges(rentEasyApi.getRentCharges());
            setLandlord(rentEasyApi.getLandlord());
            setDashboardTick(t => t + 1);
          }}
        />
      )}

      {isMobileInstallOpen && (
        <MobileInstallModal onClose={() => setIsMobileInstallOpen(false)} />
      )}

      {isLiveSyncModalOpen && (
        <LiveSyncModal
          isOpen={isLiveSyncModalOpen}
          onClose={() => setIsLiveSyncModalOpen(false)}
        />
      )}

      {viewingReceipt && (
        <ReceiptModal
          receipt={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </div>
  );
}
