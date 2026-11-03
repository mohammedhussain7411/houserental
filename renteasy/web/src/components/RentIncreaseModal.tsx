import React, { useState } from 'react';
import { Tenant, ElevenMonthMilestone } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import {
  TrendingUp,
  X,
  Calendar,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface RentIncreaseModalProps {
  tenant: Tenant;
  onClose: () => void;
  onSuccess: () => void;
}

export const RentIncreaseModal: React.FC<RentIncreaseModalProps> = ({
  tenant,
  onClose,
  onSuccess
}) => {
  const landlord = rentEasyApi.getLandlord();
  const moveInDate = tenant.date || (tenant.created_at ? tenant.created_at.split('T')[0] : '2026-01-01');
  const calc = rentEasyApi.calculate11MonthMilestone(moveInDate);

  const currentRent = Number(tenant.monthly_rent || 0);
  const rent5Pct = Math.round((currentRent * 1.05) / 50) * 50;
  const rent10Pct = Math.round((currentRent * 1.10) / 50) * 50;
  const rentPlus500 = currentRent + 500;
  const rentPlus1000 = currentRent + 1000;

  const [newRent, setNewRent] = useState<string>(String(rent5Pct || currentRent + 500));
  const [resetCycle, setResetCycle] = useState<boolean>(true);
  const [cycleStartDate, setCycleStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const numNewRent = parseFloat(newRent) || 0;
  const diff = numNewRent - currentRent;
  const pctDiff = currentRent > 0 ? ((diff / currentRent) * 100).toFixed(1) : '0';

  const formatDisplayDate = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const getWhatsAppMessage = () => {
    const ownerName = landlord.name || 'Property Owner';
    const increaseNotice =
      diff > 0
        ? `As per the annual rent revision clause in our rental agreement, your revised monthly rent will be ₹${numNewRent.toLocaleString('en-IN')} (revised from ₹${currentRent.toLocaleString('en-IN')}, +${pctDiff}%).`
        : `Your monthly rent continues at ₹${currentRent.toLocaleString('en-IN')}.`;

    return `Dear ${tenant.name},\n\nHope you are doing well.\n\nThis is a friendly reminder that as per your rental agreement dated ${formatDisplayDate(moveInDate)}, your 11-month tenancy period for House ${tenant.house_number} completes on ${formatDisplayDate(calc.milestoneDateStr)}.\n\n${increaseNotice}\n\nKindly contact us to complete the renewal of your rental agreement for the next 11-month term.\n\nThank you,\n${ownerName}\nPhone: ${landlord.phone || '+91'}`;
  };

  const handleOpenWhatsApp = () => {
    const phone = (tenant.whatsapp_number || tenant.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : `91${phone.slice(-10)}`;
    const msg = getWhatsAppMessage();
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleApplyIncrease = (e: React.FormEvent) => {
    e.preventDefault();
    if (numNewRent <= 0) {
      alert('Please enter a valid monthly rent amount.');
      return;
    }

    setIsSaving(true);
    try {
      rentEasyApi.increaseTenantRent(
        tenant.id,
        numNewRent,
        resetCycle,
        resetCycle ? cycleStartDate : undefined
      );

      setSuccessMsg(`Successfully updated monthly rent for ${tenant.name} to ₹${numNewRent.toLocaleString('en-IN')}!`);
      setTimeout(() => {
        setIsSaving(false);
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsSaving(false);
      alert(`Error updating rent: ${err.message}`);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        style={{ maxWidth: '600px', width: '92%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8'
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="card-title" style={{ margin: 0, fontSize: '1.2rem' }}>
                11-Month Rent Increase & Renewal
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {tenant.name} &bull; House {tenant.house_number}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* 11-Month Milestone Timeline Status Card */}
        <div style={{ padding: '0 24px 14px 24px' }}>
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-lg)',
              background:
                calc.status === 'overdue'
                  ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)'
                  : calc.status === 'due_soon'
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)'
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
              border:
                calc.status === 'overdue'
                  ? '1px solid rgba(244, 63, 94, 0.35)'
                  : calc.status === 'due_soon'
                  ? '1px solid rgba(245, 158, 11, 0.35)'
                  : '1px solid rgba(16, 185, 129, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color:
                    calc.status === 'overdue'
                      ? '#fb7185'
                      : calc.status === 'due_soon'
                      ? '#fbbf24'
                      : '#34d399'
                }}
              >
                {calc.status === 'overdue'
                  ? '⚠️ 11-Month Term Completed (Overdue for Revision)'
                  : calc.status === 'due_soon'
                  ? '⏳ 11-Month Term Completing Soon'
                  : '✅ 11-Month Term in Progress'}
              </span>

              <span
                className="badge"
                style={{
                  backgroundColor:
                    calc.status === 'overdue'
                      ? 'rgba(244, 63, 94, 0.2)'
                      : calc.status === 'due_soon'
                      ? 'rgba(245, 158, 11, 0.2)'
                      : 'rgba(16, 185, 129, 0.2)',
                  color:
                    calc.status === 'overdue'
                      ? '#fb7185'
                      : calc.status === 'due_soon'
                      ? '#fbbf24'
                      : '#34d399',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
              >
                {calc.daysRemaining <= 0
                  ? `${Math.abs(calc.daysRemaining)} days overdue`
                  : `${calc.daysRemaining} days remaining`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Move-in Date</div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff' }}>
                  {formatDisplayDate(moveInDate)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>11-Month Due Date</div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#93c5fd' }}>
                  {formatDisplayDate(calc.milestoneDateStr)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Tenure Duration</div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#fff' }}>
                  {calc.monthsPassed} Months Active
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rent Revision Form */}
        <form onSubmit={handleApplyIncrease} style={{ padding: '0 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Current vs New Rent comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>CURRENT MONTHLY RENT</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                ₹{currentRent.toLocaleString('en-IN')}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600 }}>REVISED MONTHLY RENT</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#a5b4fc', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>₹{numNewRent.toLocaleString('en-IN')}</span>
                {diff !== 0 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: diff > 0 ? '#34d399' : '#fb7185' }}>
                    ({diff > 0 ? '+' : ''}₹{diff.toLocaleString('en-IN')})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Increment Preset Pills */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
              Standard 11-Month Increase Presets:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${numNewRent === rent5Pct ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setNewRent(String(rent5Pct))}
                style={{ fontSize: '0.78rem' }}
              >
                +5% Escalation (₹{rent5Pct.toLocaleString('en-IN')})
              </button>

              <button
                type="button"
                className={`btn btn-sm ${numNewRent === rent10Pct ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setNewRent(String(rent10Pct))}
                style={{ fontSize: '0.78rem' }}
              >
                +10% Escalation (₹{rent10Pct.toLocaleString('en-IN')})
              </button>

              <button
                type="button"
                className={`btn btn-sm ${numNewRent === rentPlus500 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setNewRent(String(rentPlus500))}
                style={{ fontSize: '0.78rem' }}
              >
                +₹500 (₹{rentPlus500.toLocaleString('en-IN')})
              </button>

              <button
                type="button"
                className={`btn btn-sm ${numNewRent === rentPlus1000 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setNewRent(String(rentPlus1000))}
                style={{ fontSize: '0.78rem' }}
              >
                +₹1,000 (₹{rentPlus1000.toLocaleString('en-IN')})
              </button>
            </div>
          </div>

          {/* Custom New Rent Amount Input */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IndianRupee size={14} color="var(--primary)" /> Custom Revised Monthly Rent Amount (₹):
            </label>
            <input
              type="number"
              step="50"
              required
              className="form-input"
              value={newRent}
              onChange={e => setNewRent(e.target.value)}
              placeholder="e.g. 7000"
              style={{ fontSize: '1rem', fontWeight: 700 }}
            />
          </div>

          {/* Reset 11-Month Cycle Option */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <input
                type="checkbox"
                id="chk-reset-cycle"
                checked={resetCycle}
                onChange={e => setResetCycle(e.target.checked)}
                style={{ marginTop: '3px', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="chk-reset-cycle" style={{ fontSize: '0.82rem', color: '#fff', cursor: 'pointer', lineHeight: 1.4 }}>
                <strong>Reset 11-month cycle for the next renewal term:</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                  Updates the lease start date so the next 11-month rent increase reminder automatically starts counting from this date.
                </div>
              </label>
            </div>

            {resetCycle && (
              <div style={{ paddingLeft: '22px' }}>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>
                  Next 11-Month Cycle Start Date:
                </label>
                <input
                  type="date"
                  className="form-input"
                  style={{ maxWidth: '200px', fontSize: '0.82rem' }}
                  value={cycleStartDate}
                  onChange={e => setCycleStartDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {successMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenWhatsApp}
              title="Open WhatsApp with pre-drafted 11-month renewal notice"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#25D366',
                borderColor: 'rgba(37, 211, 102, 0.3)'
              }}
            >
              <MessageSquare size={16} />
              <span>Send WhatsApp Notice</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
              >
                {isSaving ? <RefreshCw size={15} className="spin-animation" /> : <TrendingUp size={15} />}
                <span>{isSaving ? 'Updating...' : 'Save & Increase Rent'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

