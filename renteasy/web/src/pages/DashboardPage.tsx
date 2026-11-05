import React, { useState, useEffect } from 'react';
import { rentEasyApi, DeviceSyncStatus } from '../services/rentEasyApi';
import { DashboardSummary, RentCharge, Receipt } from '../types';
import {
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Building2,
  Users,
  Calendar,
  CalendarDays,
  Plus,
  CreditCard,
  BellRing,
  ArrowUpRight,
  CheckCircle2,
  Zap,
  ArrowRight,
  Cloud,
  HardDrive,
  Database,
  PhoneCall,
  Pencil,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onOpenRecordPayment: (charge?: RentCharge) => void;
  onOpenAddProperty: () => void;
  onOpenAddTenant: () => void;
  onViewReceipt: (receipt: Receipt) => void;
  onEditReceipt?: (receipt: Receipt) => void;
  onOpenGoogleDriveBackup?: () => void;
  onOpenLiveSync?: () => void;
  syncStatus?: DeviceSyncStatus;
  refreshTrigger?: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenRecordPayment,
  onOpenAddProperty,
  onOpenAddTenant,
  onViewReceipt,
  onEditReceipt,
  onOpenGoogleDriveBackup,
  onOpenLiveSync,
  syncStatus,
  refreshTrigger = 0
}) => {
  const currentSyncStatus = syncStatus || rentEasyApi.getSyncStatus();
  // Dynamically determine current present month (YYYY-MM)
  const getPresentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const presentMonth = getPresentMonth();
  const [selectedMonth, setSelectedMonth] = useState(presentMonth || '2026-10');
  const [syncTick, setSyncTick] = useState(0);
  const [summary, setSummary] = useState<DashboardSummary>(() => rentEasyApi.getDashboardSummary(presentMonth || '2026-10'));
  const [charges, setCharges] = useState<RentCharge[]>(() => rentEasyApi.getRentCharges(presentMonth || '2026-10'));

  const refreshData = React.useCallback(() => {
    setSummary(rentEasyApi.getDashboardSummary(selectedMonth));
    setCharges(rentEasyApi.getRentCharges(selectedMonth));
  }, [selectedMonth]);

  useEffect(() => {
    refreshData();
  }, [selectedMonth, refreshTrigger, refreshData]);

  // Real-time synchronization listener for Phone <-> Web updates and local edits
  useEffect(() => {
    const handleSync = () => {
      refreshData();
    };
    window.addEventListener('renteasy_sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('renteasy_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [refreshData]);

  const overdueCharges = charges.filter(c => c.status === 'overdue' || (c.outstanding_balance > 0 && new Date() > new Date(c.due_date)));
  const recentReceipts = rentEasyApi.getReceipts().slice(0, 3);

  // Generate selectable dynamic month list around present month
  const monthOptions = React.useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const dateObj = new Date();
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(dateObj.getFullYear(), dateObj.getMonth() + offset, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      const isCurrent = val === presentMonth;
      options.push({
        value: val,
        label: isCurrent ? `${name} (Current Present Entry)` : name
      });
    }
    return options;
  }, [presentMonth]);

  const handleGenerateCharges = () => {
    const res = rentEasyApi.generateMonthlyCharges(selectedMonth);
    alert(`Successfully verified and generated ${res.createdCount} monthly rent charges for ${selectedMonth}!`);
    setSyncTick(t => t + 1);
  };

  return (
    <div className="page-wrapper">
      {/* Top Banner & Quick Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Rental Portfolio Dashboard
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Real-time financial status, automated tenant collection & reminder tracking
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 12px', gap: '8px' }}>
            <Calendar size={16} color="var(--primary)" />
            <select
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', fontWeight: 600 }}
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={handleGenerateCharges}>
            <Zap size={14} color="var(--primary)" /> Generate Rent Charges
          </button>

          {onOpenGoogleDriveBackup && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenGoogleDriveBackup}
              title="Save Portfolio to Google Drive"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Cloud size={14} color="#4285F4" /> Save to Drive
            </button>
          )}

          <button className="btn btn-primary" onClick={() => onOpenRecordPayment()}>
            <CreditCard size={16} /> Record Payment
          </button>
        </div>
      </div>

      {/* Restore Previous Backup Banner (Shown when properties/tenants are 0 on this device) */}
      {summary.total_properties === 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.12) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Database size={22} color="#818cf8" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                Restore Your Previous Backup
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Have an existing rental portfolio? Restore from Google Drive or upload a local backup file (.json).
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {onOpenGoogleDriveBackup && (
              <button
                className="btn btn-primary btn-sm"
                style={{ background: 'linear-gradient(135deg, #4285F4 0%, #1a73e8 100%)', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                onClick={onOpenGoogleDriveBackup}
              >
                <Cloud size={14} /> Restore from Google Drive
              </button>
            )}

            {onOpenGoogleDriveBackup && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                onClick={onOpenGoogleDriveBackup}
              >
                <HardDrive size={14} color="#818cf8" /> Restore from Local Backup (.json)
              </button>
            )}

            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenAddProperty}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} /> Add First Property
            </button>
          </div>
        </div>
      )}

      {/* Quick Phone & Cloud Synchronization Status Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 18px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: currentSyncStatus.isLiveConnected ? '#10b981' : '#f59e0b',
              boxShadow: currentSyncStatus.isLiveConnected ? '0 0 10px #10b981' : 'none'
            }}
          />
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{currentSyncStatus.isLiveConnected ? 'Phone & Central Web Synchronized' : 'Phone & Web Ready'}</span>
              <span
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: currentSyncStatus.isLiveConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: currentSyncStatus.isLiveConnected ? '#34d399' : '#fbbf24',
                  fontWeight: 600
                }}
              >
                {currentSyncStatus.isLiveConnected ? 'Live 2-Way' : 'Local'}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Last sync: {currentSyncStatus.lastSyncedAt || 'Ready to sync'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onOpenLiveSync && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenLiveSync}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                borderColor: currentSyncStatus.isLiveConnected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'
              }}
            >
              <RefreshCw
                size={13}
                style={{
                  animation: currentSyncStatus.isSyncing ? 'spin 1s linear infinite' : 'none'
                }}
              />
              <span>{currentSyncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          {onOpenGoogleDriveBackup && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenGoogleDriveBackup}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                borderColor: 'rgba(66, 133, 244, 0.4)'
              }}
            >
              <Cloud size={14} color="#4285F4" />
              <span>Google Drive Login / Backup</span>
            </button>
          )}
        </div>
      </div>

      {/* 11-Month Rent Increase Milestone Alert Banner */}
      {(() => {
        const milestones = rentEasyApi.getElevenMonthMilestones();
        const overdueRentIncreases = milestones.filter(m => m.status === 'overdue' || m.status === 'due_soon');
        if (overdueRentIncreases.length === 0) return null;

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.15) 0%, rgba(245, 158, 11, 0.12) 100%)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={20} color="#fb7185" />
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                  {overdueRentIncreases.length} {overdueRentIncreases.length === 1 ? 'Tenant is' : 'Tenants are'} Due for 11-Month Rent Increase!
                </div>
                <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                  11-month lease milestone reached. Eligible for standard +5% to +10% annual rent escalation.
                </div>
              </div>
            </div>

            <button
              className="btn btn-sm"
              onClick={() => onNavigate('reminders')}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Review 11-Mo Increases</span>
              <ArrowRight size={13} />
            </button>
          </div>
        );
      })()}

      {/* 4 Financial Key Metric Cards */}
      <div className="metrics-grid">
        {/* Expected */}
        <div className="metric-card" style={{ '--metric-accent': 'var(--primary)' } as any}>
          <div className="metric-header">
            <span className="metric-label">Expected Rent ({selectedMonth})</span>
            <div className="metric-icon-box">
              <Calendar size={20} />
            </div>
          </div>
          <div className="metric-value">
            ₹{summary.expected_rent.toLocaleString('en-IN')}
          </div>
          <div className="metric-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
            <span>{summary.total_properties} Properties • {summary.occupied_properties} Occupied</span>
            <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.75rem' }}>
              Present: ₹{(summary.total_active_rent || summary.expected_rent).toLocaleString('en-IN')}/mo
            </span>
          </div>
        </div>

        {/* Collected */}
        <div className="metric-card" style={{ '--metric-accent': 'var(--emerald)' } as any}>
          <div className="metric-header">
            <span className="metric-label">Collected This Month</span>
            <div className="metric-icon-box" style={{ background: 'var(--emerald-surface)', color: 'var(--emerald)' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#34d399' }}>
            ₹{summary.collected_rent.toLocaleString('en-IN')}
          </div>
          <div className="metric-meta">
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                <span>Collection Progress</span>
                <strong style={{ color: '#34d399' }}>{summary.collection_percentage}%</strong>
              </div>
              <div className="progress-container">
                <div className="progress-fill" style={{ width: `${Math.min(100, summary.collection_percentage)}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Outstanding */}
        <div className="metric-card" style={{ '--metric-accent': 'var(--amber)' } as any}>
          <div className="metric-header">
            <span className="metric-label">Outstanding Balance</span>
            <div className="metric-icon-box" style={{ background: 'var(--amber-surface)', color: 'var(--amber)' }}>
              <IndianRupee size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: summary.outstanding_rent > 0 ? '#fbbf24' : '#34d399' }}>
            ₹{summary.outstanding_rent.toLocaleString('en-IN')}
          </div>
          <div className="metric-meta">
            <span style={{ color: 'var(--text-dim)' }}>
              {summary.outstanding_rent === 0 ? 'All leases fully collected' : 'Pending tenant remittances'}
            </span>
          </div>
        </div>

        {/* Overdue */}
        <div className="metric-card" style={{ '--metric-accent': 'var(--rose)' } as any}>
          <div className="metric-header">
            <span className="metric-label">Overdue & Late Dues</span>
            <div className="metric-icon-box" style={{ background: 'var(--rose-surface)', color: 'var(--rose)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#fb7185' }}>
            ₹{summary.overdue_amount.toLocaleString('en-IN')}
          </div>
          <div className="metric-meta">
            <span className="badge badge-overdue" style={{ fontSize: '0.7rem' }}>
              {summary.overdue_count} Overdue Leases
            </span>
            <span style={{ color: 'var(--text-dim)' }}>Action required</span>
          </div>
        </div>
      </div>

      {/* Quick Action Dock */}
      <div
        style={{
          background: 'linear-gradient(90deg, #131c2e 0%, var(--bg-card) 100%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-md)', background: 'var(--primary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="var(--primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Quick Landlord Operations</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Directly provision units, register tenants, or view rent schedules</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('calendar')}>
            <CalendarDays size={15} color="var(--primary)" /> Rent Calendar
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onOpenAddProperty}>
            <Building2 size={15} /> Add Property
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onOpenAddTenant}>
            <Users size={15} /> Add Tenant
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: 'rgba(56, 189, 248, 0.08)' }}
            onClick={() => onNavigate('tenants')}
            title="View, edit, and update tenant details"
          >
            <Pencil size={15} /> Edit Tenants
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onOpenRecordPayment()}>
            <CreditCard size={15} /> Record Rent Payment
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('reminders')}>
            <BellRing size={15} /> Open Reminder Centre
          </button>
        </div>
      </div>

      {/* Grid: Overdue Alerts & Monthly Collection Trend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '24px' }}>
        {/* Left: Overdue Follow-ups & Reminders */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="var(--rose)" /> Overdue Rent Follow-ups
              </h3>
              <p className="card-subtitle">Tenants with unpaid balance past their lease due day</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('ledger')}>
              Ledger <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {overdueCharges.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <CheckCircle2 size={32} color="var(--emerald)" style={{ margin: '0 auto 10px auto' }} />
                <div>All rents for this month are up to date!</div>
              </div>
            ) : (
              overdueCharges.map(c => (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{c.tenant_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {c.property_name} ({c.unit_number}) • Due: {c.due_date}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fb7185', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                      Pending: ₹{c.outstanding_balance.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => onOpenRecordPayment(c)}
                    >
                      Collect Now
                    </button>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <a
                        href={`tel:${c.tenant_phone}`}
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: '0.72rem',
                          color: '#10b981',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          textDecoration: 'none',
                          padding: '4px 8px'
                        }}
                        title={`Call ${c.tenant_name} (${c.tenant_phone})`}
                      >
                        <PhoneCall size={12} /> Call
                      </a>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                        onClick={() => onNavigate('reminders')}
                      >
                        Remind
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Collection Trend Chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 className="card-title">Collection Performance Trend</h3>
              <p className="card-subtitle">Expected vs. Collected rent comparison over recent months</p>
            </div>
            <span className="badge badge-paid">
              <TrendingUp size={12} /> High Efficiency
            </span>
          </div>

          <div style={{ height: '280px', width: '100%', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.monthly_trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={12} />
                <YAxis stroke="var(--text-dim)" fontSize={12} tickFormatter={val => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="expected" fill="#6366f1" name="Expected Rent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" fill="#10b981" name="Collected Rent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Receipts List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 className="card-title">Recently Issued Digital Receipts</h3>
            <p className="card-subtitle">Instant proof of payments with unique receipt numbers and hash verification</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('receipts')}>
            View All Receipts <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Tenant Name</th>
                <th>Property</th>
                <th>Amount Paid</th>
                <th>Channel / Ref</th>
                <th>Payment Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentReceipts.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                    {r.receipt_number}
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.tenant_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.property_name} ({r.unit_number})</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399' }}>
                    ₹{r.amount_paid.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.72rem' }}>
                      {r.payment_method.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600 }}>
                    {(() => {
                      const dStr = r.payment_date || r.issued_at;
                      if (!dStr) return '';
                      const clean = dStr.includes('T') ? dStr.split('T')[0] : dStr;
                      const parts = clean.split('-');
                      if (parts.length === 3) {
                        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                      }
                      return new Date(dStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                    })()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      {onEditReceipt && (
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Edit Payment Receipt Details"
                          style={{
                            color: '#38bdf8',
                            borderColor: 'rgba(56, 189, 248, 0.4)',
                            backgroundColor: 'rgba(56, 189, 248, 0.08)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={() => onEditReceipt(r)}
                        >
                          <Pencil size={12} />
                          <span>Edit</span>
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => onViewReceipt(r)}>
                        View Receipt
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
