import React, { useState, useEffect } from 'react';
import { Tenant, Property, RentCharge } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import { AddTenantModal } from '../components/AddTenantModal';
import { EditHouseNumberModal, EditHouseNumberTarget } from '../components/EditHouseNumberModal';
import { RentalAgreementModal } from '../components/RentalAgreementModal';
import { RentIncreaseModal } from '../components/RentIncreaseModal';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Home,
  Calendar,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  FileText,
  MapPin,
  IndianRupee,
  Zap,
  MessageSquare,
  Shield,
  FileSpreadsheet,
  Trash2,
  PhoneCall,
  Pencil,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  TrendingUp,
  Clock
} from 'lucide-react';

interface TenantsPageProps {
  onOpenAddTenant: () => void;
  onOpenRecordPayment: (charge?: RentCharge) => void;
  properties: Property[];
  onTenantUpdated?: (tenant: Tenant) => void;
}

export const TenantsPage: React.FC<TenantsPageProps> = ({
  onOpenAddTenant,
  onOpenRecordPayment,
  properties,
  onTenantUpdated
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>(rentEasyApi.getTenants());
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editingHouseTarget, setEditingHouseTarget] = useState<EditHouseNumberTarget | null>(null);
  const [selectedTenantForAgreement, setSelectedTenantForAgreement] = useState<Tenant | null>(null);
  const [selectedTenantForRentIncrease, setSelectedTenantForRentIncrease] = useState<Tenant | null>(null);
  const charges = rentEasyApi.getRentCharges();

  // Real-time synchronization listener for Phone <-> Web updates
  useEffect(() => {
    const handleSync = () => {
      setTenants(rentEasyApi.getTenants());
    };
    window.addEventListener('renteasy_sync', handleSync);
    return () => window.removeEventListener('renteasy_sync', handleSync);
  }, []);


  const handleTogglePreference = (tenantId: string, channel: 'whatsapp' | 'sms') => {
    rentEasyApi.toggleTenantPreference(tenantId, channel);
    setTenants(rentEasyApi.getTenants());
  };

  const handleMoveTenant = (tenantId: string, direction: 'up' | 'down') => {
    const success = rentEasyApi.moveTenantOrder(tenantId, direction);
    if (success) {
      setTenants(rentEasyApi.getTenants());
    }
  };

  const handleSortByHouse = () => {
    rentEasyApi.sortTenantsByHouseNumber(true);
    setTenants(rentEasyApi.getTenants());
  };

  const handleDeleteTenant = (t: Tenant) => {
    if (window.confirm(`Are you sure you want to delete tenant "${t.name}" (House ${t.house_number})? This will vacate their assigned unit.`)) {
      rentEasyApi.deleteTenant(t.id);
      setTenants(rentEasyApi.getTenants());
    }
  };

  const handleTriggerAutoRentCheck = () => {
    const res = rentEasyApi.autoCheckAndApplyMonthlyRent();
    setTenants(rentEasyApi.getTenants());
    alert(`Auto-Rent Check Completed:\n• ${res.updatedCount} house rent charges auto-updated on their given due dates.\n• ${res.messagesSent} reminder/update notices dispatched via WhatsApp & SMS.`);
  };

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.phone.includes(searchTerm) ||
    t.house_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.aadhaar_number && t.aadhaar_number.includes(searchTerm)) ||
    (t.permanent_address && t.permanent_address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Tenants & House Balances
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            House numbers, security deposits, monthly auto-billing schedules, and live balances
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const nowStr = new Date().toISOString().split('T')[0];
              const csv = rentEasyApi.exportTenantsCSV();
              rentEasyApi.downloadBlob(`RentEasy_Tenants_GoogleSheets_${nowStr}.csv`, csv, 'text/csv;charset=utf-8;');
              alert('Tenants directory downloaded! You can upload it to Google Drive and open with Google Sheets.');
            }}
            title="Download CSV formatted for Google Sheets & Google Drive"
          >
            <FileSpreadsheet size={14} color="#34A853" /> Export for Google Sheets
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleTriggerAutoRentCheck} title="Check and apply auto-rent charges for due dates">
            <Zap size={14} color="var(--primary)" /> Check Due Date Auto-Billing
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{
              color: '#38bdf8',
              borderColor: 'rgba(56, 189, 248, 0.4)',
              backgroundColor: 'rgba(56, 189, 248, 0.08)'
            }}
            onClick={() => {
              if (filtered.length > 0) {
                setEditingTenant(filtered[0]);
              } else if (tenants.length > 0) {
                setEditingTenant(tenants[0]);
              } else {
                alert('No tenants registered yet. Register a tenant first.');
              }
            }}
            title="Select a tenant to edit all details, agreement, and monthly rent"
          >
            <Pencil size={14} /> Edit Tenant Details
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{
              color: '#a5b4fc',
              borderColor: 'rgba(99, 102, 241, 0.4)',
              backgroundColor: 'rgba(99, 102, 241, 0.12)'
            }}
            onClick={() => {
              if (filtered.length > 0) {
                setSelectedTenantForAgreement(filtered[0]);
              } else if (tenants.length > 0) {
                setSelectedTenantForAgreement(tenants[0]);
              } else {
                alert('No tenants registered yet. Register a tenant first.');
              }
            }}
            title="Create, view, or edit rental agreement with owner, house type (1RK/1BHK/2BHK/3BHK), and painting clauses"
          >
            <FileText size={14} color="#818cf8" /> Rental Agreements
          </button>
          <button className="btn btn-primary" onClick={onOpenAddTenant}>
            <UserPlus size={16} /> Register New Tenant
          </button>
        </div>
      </div>

      {/* Search Bar & Stats Ribbon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '8px 14px', width: '380px', gap: '8px' }}>
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%' }}
            placeholder="Search by name, house #, mobile, Aadhaar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              padding: '6px 12px',
              borderColor: 'rgba(56, 189, 248, 0.3)',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              color: '#38bdf8'
            }}
            onClick={handleSortByHouse}
            title="Auto-sort tenants in natural order by House Number (House #1, House #2, etc.)"
          >
            <ArrowUpDown size={14} /> Auto-Sort by House #
          </button>
          <div style={{ background: 'var(--bg-card)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Total Tenants: </span>
            <strong style={{ color: '#fff' }}>{tenants.length}</strong>
          </div>
          <div style={{ background: 'var(--bg-card)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Total Security Deposits: </span>
            <strong style={{ color: '#34d399', fontFamily: 'var(--font-mono)' }}>
              ₹{tenants.reduce((acc, t) => acc + (t.deposit_amount || 0), 0).toLocaleString('en-IN')}
            </strong>
          </div>
        </div>
      </div>

      {/* Tenants Table with Complete House & Payment Details */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '65px', textAlign: 'center' }}>Move</th>
                <th>Tenant & Contact</th>
                <th>House Number</th>
                <th>Move-In Date</th>
                <th>Monthly Rent</th>
                <th>Security Deposit</th>
                <th>Aadhaar & Address</th>
                <th>House Balance</th>
                <th style={{ textAlign: 'right' }}>Manage & Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, index) => {
                const tenantCharge = charges.find(c => (c.lease_id === t.active_lease_id || c.tenant_name === t.name) && c.outstanding_balance > 0);

                return (
                  <tr key={t.id}>
                    {/* Move Up / Down Buttons */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', width: '65px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <button
                          onClick={() => handleMoveTenant(t.id, 'up')}
                          disabled={index === 0}
                          style={{
                            background: index === 0 ? 'transparent' : 'rgba(56, 189, 248, 0.12)',
                            border: index === 0 ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(56, 189, 248, 0.35)',
                            color: index === 0 ? '#475569' : '#38bdf8',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            padding: '3px 6px',
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title={`Move ${t.name} Up (↑)`}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          onClick={() => handleMoveTenant(t.id, 'down')}
                          disabled={index === filtered.length - 1}
                          style={{
                            background: index === filtered.length - 1 ? 'transparent' : 'rgba(56, 189, 248, 0.12)',
                            border: index === filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(56, 189, 248, 0.35)',
                            color: index === filtered.length - 1 ? '#475569' : '#38bdf8',
                            cursor: index === filtered.length - 1 ? 'not-allowed' : 'pointer',
                            padding: '3px 6px',
                            borderRadius: '5px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title={`Move ${t.name} Down (↓)`}
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    </td>
                    {/* Name & Mobile */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: '#ffffff',
                            fontSize: '0.98rem',
                            cursor: 'pointer'
                          }}
                          onClick={() => setEditingTenant(t)}
                          title="Click to edit tenant details & rent"
                        >
                          {t.name}
                        </div>
                        <button
                          className="btn btn-secondary btn-xs"
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            color: '#38bdf8',
                            borderColor: 'rgba(56, 189, 248, 0.4)',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setEditingTenant(t)}
                          title={`Edit all details for ${t.name}`}
                        >
                          <Pencil size={11} /> Edit Details
                        </button>
                      </div>
                      <a
                        href={`tel:${t.phone}`}
                        style={{
                          fontSize: '0.8rem',
                          color: '#10b981',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '2px',
                          textDecoration: 'none',
                          fontWeight: 600
                        }}
                        title={`Tap to call ${t.phone}`}
                      >
                        <Phone size={12} /> {t.phone}
                      </a>
                      {t.email && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                          {t.email}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: t.whatsapp_enabled ? '#25D366' : 'var(--text-dim)',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleTogglePreference(t.id, 'whatsapp')}
                          title="Click to toggle WhatsApp"
                        >
                          WA: {t.whatsapp_enabled ? '✓' : '✕'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: t.sms_enabled ? '#38bdf8' : 'var(--text-dim)',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleTogglePreference(t.id, 'sms')}
                          title="Click to toggle SMS"
                        >
                          SMS: {t.sms_enabled ? '✓' : '✕'}
                        </span>
                      </div>
                    </td>

                    {/* House Number */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Home size={15} color="var(--primary)" /> {t.house_number}
                        </div>
                        <button
                          className="btn btn-secondary btn-xs"
                          style={{
                            padding: '2px 7px',
                            fontSize: '0.68rem',
                            color: '#38bdf8',
                            borderColor: 'rgba(56, 189, 248, 0.35)',
                            backgroundColor: 'rgba(56, 189, 248, 0.08)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setEditingHouseTarget({ type: 'tenant', tenant: t })}
                          title={`Edit / rename house number for ${t.name}`}
                        >
                          <Pencil size={10} /> Edit House #
                        </button>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {t.linked_property_name || 'Independent Unit'}
                      </div>
                    </td>

                    {/* Move-in / Agreement Date & 11-Month Milestone */}
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.date}</div>
                      {(() => {
                        const mCalc = rentEasyApi.calculate11MonthMilestone(t.date);
                        if (mCalc.status === 'overdue') {
                          return (
                            <div
                              onClick={() => setSelectedTenantForRentIncrease(t)}
                              style={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                marginTop: '4px',
                                background: 'rgba(244, 63, 94, 0.18)',
                                color: '#fb7185',
                                border: '1px solid rgba(244, 63, 94, 0.4)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700
                              }}
                              title="11 months completed! Click to increase rent"
                            >
                              <TrendingUp size={10} /> 11m Due (+Rent)
                            </div>
                          );
                        }
                        if (mCalc.status === 'due_soon') {
                          return (
                            <div
                              onClick={() => setSelectedTenantForRentIncrease(t)}
                              style={{
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                marginTop: '4px',
                                background: 'rgba(245, 158, 11, 0.18)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.4)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 700
                              }}
                              title={`11-month renewal due in ${mCalc.daysRemaining} days`}
                            >
                              <Clock size={10} /> 11m in {mCalc.daysRemaining}d
                            </div>
                          );
                        }
                        return (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            Auto-bills on <strong style={{ color: 'var(--primary)' }}>{t.due_day}th</strong>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Monthly Rent */}
                    <td style={{ cursor: 'pointer' }} onClick={() => setEditingTenant(t)} title="Click to edit monthly rent">
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ₹{t.monthly_rent.toLocaleString('en-IN')}
                        <Pencil size={11} color="#64748b" />
                      </div>
                      <span className="badge" style={{ background: 'var(--primary-surface)', color: 'var(--primary)', fontSize: '0.65rem' }}>
                        Per Month
                      </span>
                    </td>

                    {/* Security Deposit */}
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399' }}>
                        ₹{t.deposit_amount.toLocaleString('en-IN')}
                      </div>
                      <span className={`badge ${t.deposit_paid ? 'badge-paid' : 'badge-overdue'}`} style={{ fontSize: '0.65rem' }}>
                        {t.deposit_paid ? 'Held' : 'Unpaid'}
                      </span>
                    </td>

                    {/* Aadhaar & Address */}
                    <td style={{ maxWidth: '220px', cursor: 'pointer' }} onClick={() => setEditingTenant(t)} title="Click to edit Aadhaar, address & KYC">
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#e2e8f0', letterSpacing: '0.04em' }}>
                        {t.aadhaar_number ? `Aadhaar: ${t.aadhaar_number}` : 'Aadhaar: Not provided'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={t.permanent_address}>
                        {t.permanent_address || 'No address specified'}
                      </div>
                    </td>

                    {/* Live Balance Amount */}
                    <td style={{ cursor: 'pointer' }} onClick={() => setEditingTenant(t)} title="Click to edit tenant balance, rent, or agreement details">
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          color: t.balance_amount > 0 ? '#fbbf24' : '#34d399',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>₹{t.balance_amount.toLocaleString('en-IN')}</span>
                        <Pencil size={11} color="#64748b" />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                        {t.balance_amount > 0 ? (
                          <span style={{ color: '#fb7185' }}>Pending Dues</span>
                        ) : (
                          <span style={{ color: '#34d399' }}>Clear / No Dues</span>
                        )}
                        {t.initial_balance > 0 && (
                          <span style={{ color: '#38bdf8', fontSize: '0.68rem', fontWeight: 600 }}>
                            (₹{t.initial_balance.toLocaleString('en-IN')} prev bal)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Collect Payment, Edit Tenant & Receipt Trigger */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{
                          color: '#34d399',
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          marginRight: '6px'
                        }}
                        onClick={() => setSelectedTenantForRentIncrease(t)}
                        title={`Increase monthly rent & 11-month renewal for ${t.name}`}
                      >
                        <TrendingUp size={13} /> +Rent
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{
                          color: '#a5b4fc',
                          borderColor: 'rgba(99, 102, 241, 0.4)',
                          backgroundColor: 'rgba(99, 102, 241, 0.12)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: 600,
                          marginRight: '6px'
                        }}
                        onClick={() => setSelectedTenantForAgreement(t)}
                        title={`Create, view or edit rental agreement for ${t.name} (House ${t.house_number})`}
                      >
                        <FileText size={13} /> Agreement
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{
                          color: '#38bdf8',
                          borderColor: 'rgba(56, 189, 248, 0.4)',
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontWeight: 600,
                          marginRight: '6px'
                        }}
                        onClick={() => setEditingTenant(t)}
                        title={`Edit all details & monthly rent for ${t.name}`}
                      >
                        <Pencil size={13} /> Edit Tenant
                      </button>
                      <a
                        href={`tel:${t.phone}`}
                        className="btn btn-secondary btn-sm"
                        style={{
                          color: '#10b981',
                          borderColor: 'rgba(16, 185, 129, 0.35)',
                          backgroundColor: 'rgba(16, 185, 129, 0.08)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          textDecoration: 'none',
                          marginRight: '6px'
                        }}
                        title={`Call ${t.name} (${t.phone})`}
                      >
                        <PhoneCall size={13} /> Call
                      </a>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => onOpenRecordPayment(tenantCharge)}
                      >
                        <CreditCard size={14} /> Add Payment
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{
                          color: '#f87171',
                          borderColor: 'rgba(239, 68, 68, 0.35)',
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginLeft: '6px'
                        }}
                        onClick={() => handleDeleteTenant(t)}
                        title={`Delete tenant ${t.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Tenant & Rent Modal with Up/Down Tenant Switcher */}
      {editingTenant && (
        <AddTenantModal
          properties={properties}
          tenantToEdit={editingTenant}
          allTenants={filtered.length > 0 ? filtered : tenants}
          onNavigateTenant={(next) => setEditingTenant(next)}
          onClose={() => setEditingTenant(null)}
          onSuccess={(updated) => {
            setEditingTenant(null);
            setTenants(rentEasyApi.getTenants());
            if (onTenantUpdated) {
              onTenantUpdated(updated);
            }
          }}
        />
      )}

      {/* Edit House Number Modal */}
      <EditHouseNumberModal
        isOpen={!!editingHouseTarget}
        target={editingHouseTarget}
        onClose={() => setEditingHouseTarget(null)}
        onSuccess={() => {
          setEditingHouseTarget(null);
          setTenants(rentEasyApi.getTenants());
        }}
      />

      {/* 11-Month Rent Increase Modal */}
      {selectedTenantForRentIncrease && (
        <RentIncreaseModal
          tenant={selectedTenantForRentIncrease}
          onClose={() => setSelectedTenantForRentIncrease(null)}
          onSuccess={() => {
            setSelectedTenantForRentIncrease(null);
            setTenants(rentEasyApi.getTenants());
          }}
        />
      )}

      {/* Rental Agreement Modal */}
      {selectedTenantForAgreement && (
        <RentalAgreementModal
          tenant={selectedTenantForAgreement}
          isOpen={!!selectedTenantForAgreement}
          properties={properties}
          onClose={() => setSelectedTenantForAgreement(null)}
          onAgreementSaved={() => {
            setTenants(rentEasyApi.getTenants());
          }}
        />
      )}
    </div>
  );
};
