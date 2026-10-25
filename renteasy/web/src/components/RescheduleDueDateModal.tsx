import React, { useState } from 'react';
import { rentEasyApi } from '../services/rentEasyApi';
import { RentCalendarEvent, RentCharge, Tenant } from '../types';
import {
  CalendarClock,
  X,
  Calendar,
  AlertTriangle,
  Clock,
  Home,
  User,
  Phone,
  IndianRupee,
  MessageSquare,
  Check,
  Sparkles,
  Info
} from 'lucide-react';

interface RescheduleDueDateModalProps {
  event?: RentCalendarEvent | null;
  charge?: RentCharge | null;
  tenant?: Tenant | null;
  onClose: () => void;
  onSuccess: (result: { oldDueDate: string; newDueDate: string }) => void;
}

export const RescheduleDueDateModal: React.FC<RescheduleDueDateModalProps> = ({
  event,
  charge,
  tenant,
  onClose,
  onSuccess
}) => {
  // Extract details from whichever prop is passed
  const tenantName = event?.tenant_name || charge?.tenant_name || tenant?.name || 'Tenant';
  const tenantPhone = event?.tenant_phone || charge?.tenant_phone || tenant?.phone || '';
  const unitNumber = event?.unit_number || charge?.unit_number || tenant?.house_number || 'Unit';
  const propertyName = event?.property_name || charge?.property_name || tenant?.linked_property_name || 'Property';
  const currentDueDate = event?.due_date || charge?.due_date || (tenant?.date ? `${tenant.date.substring(0, 7)}-${String(tenant.due_day || 5).padStart(2, '0')}` : new Date().toISOString().split('T')[0]);
  const pendingAmount = event?.outstanding_balance !== undefined ? event.outstanding_balance : (charge?.outstanding_balance !== undefined ? charge.outstanding_balance : (tenant?.balance_amount || 0));

  const landlord = rentEasyApi.getLandlord();

  // Initial next due date: default to today + 5 days
  const today = new Date();
  const defaultNextDate = new Date(today);
  defaultNextDate.setDate(today.getDate() + 5);
  const defaultNextDateStr = defaultNextDate.toISOString().split('T')[0];

  const [newDueDate, setNewDueDate] = useState<string>(defaultNextDateStr);
  const [updatePermanent, setUpdatePermanent] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('Salary delayed, promised payment by new date');
  const [notifyTenant, setNotifyTenant] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick preset dates
  const handleAddDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNewDueDate(d.toISOString().split('T')[0]);
  };

  const handleEndOfMonth = () => {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setNewDueDate(d.toISOString().split('T')[0]);
  };

  const reasonPresets = [
    'Salary delayed, promised payment by new date',
    'Tenant traveling / out of town',
    'Bank / UPI transaction issue',
    'Requested 1-week grace period',
    'Cash payment handover scheduled'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDueDate) {
      alert('Please select a valid new due date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = rentEasyApi.rescheduleDueDate({
        chargeId: event?.charge_id || charge?.id,
        tenantId: event?.tenant_id || tenant?.id,
        newDueDate,
        updatePermanentDueDay: updatePermanent,
        reason: reason.trim(),
        notifyTenant
      });

      onSuccess({
        oldDueDate: res.oldDueDate,
        newDueDate: res.newDueDate
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update due date');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview message
  const previewMessage = `Hi ${tenantName}, as discussed, your rent collection due date for ${unitNumber} (${propertyName}) has been updated to ${new Date(newDueDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Outstanding amount: ₹${pendingAmount.toLocaleString('en-IN')}. Please transfer to UPI: ${landlord.upi_id}. Thank you! - ${landlord.name}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--amber-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarClock size={20} color="var(--amber)" />
            </div>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                Reschedule Rent Due Date
              </h3>
              <p className="card-subtitle">
                Update next collection date on calendar when a tenant missed or requested an extension
              </p>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '74vh', overflowY: 'auto' }}>
            {/* 1. Unit & Current Missed Due Date Card */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Home size={16} color="var(--primary)" />
                    <strong style={{ fontSize: '1.05rem', color: '#fff' }}>{unitNumber}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {propertyName}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Pending Rent</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                    ₹{pendingAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{tenantName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{tenantPhone}</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Current Missed Due Date</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fb7185', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                    <AlertTriangle size={13} /> {currentDueDate}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. New Due Date Picker with Quick Add Buttons */}
            <div className="form-group" style={{ marginTop: '6px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={15} color="var(--primary)" />
                <strong>New Next Due Date *</strong>
              </label>

              <input
                type="date"
                className="form-input"
                style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                value={newDueDate}
                onChange={e => setNewDueDate(e.target.value)}
                required
              />

              {/* Quick shortcut pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  onClick={() => handleAddDays(3)}
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  onClick={() => handleAddDays(7)}
                >
                  +7 Days (1 Week)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  onClick={() => handleAddDays(15)}
                >
                  +15 Days
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  onClick={handleEndOfMonth}
                >
                  End of Month
                </button>
              </div>
            </div>

            {/* 3. Scope: One-time extension vs. Permanent lease due date */}
            <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Extension Scope
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scope"
                  checked={!updatePermanent}
                  onChange={() => setUpdatePermanent(false)}
                  style={{ marginTop: '3px', accentColor: 'var(--primary)' }}
                />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                    One-time extension for this month's rent only
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Moves the collection event to {newDueDate} on the calendar and resets the overdue alert. Future months will stay on regular schedule.
                  </div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scope"
                  checked={updatePermanent}
                  onChange={() => setUpdatePermanent(true)}
                  style={{ marginTop: '3px', accentColor: 'var(--primary)' }}
                />
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                    Change permanent monthly due day to {newDueDate ? parseInt(newDueDate.split('-')[2], 10) : 5}th of every month
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Also updates the tenant's ongoing monthly agreement due date to the {newDueDate ? parseInt(newDueDate.split('-')[2], 10) : 5}th for all future months.
                  </div>
                </div>
              </label>
            </div>

            {/* 4. Reason / Landlord Notes */}
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label className="form-label">Reason / Notes for Rescheduling</label>

              {/* Quick reason chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {reasonPresets.map(preset => (
                  <span
                    key={preset}
                    onClick={() => setReason(preset)}
                    style={{
                      fontSize: '0.7rem',
                      background: reason === preset ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: reason === preset ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                      color: reason === preset ? '#fff' : 'var(--text-dim)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {preset}
                  </span>
                ))}
              </div>

              <input
                type="text"
                className="form-input"
                placeholder="e.g. Salary credited on 20th"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>

            {/* 5. WhatsApp & SMS Notification Preview */}
            <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>
                <input
                  type="checkbox"
                  checked={notifyTenant}
                  onChange={e => setNotifyTenant(e.target.checked)}
                  style={{ accentColor: '#25D366' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={15} color="#25D366" /> Send Updated Due Date Notice to Tenant (WhatsApp / SMS)
                </span>
              </label>

              {notifyTenant && (
                <div style={{ background: '#0b141a', border: '1px solid rgba(37, 211, 102, 0.2)', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: '#d1d7db', lineHeight: 1.45, fontStyle: 'italic' }}>
                  <div style={{ fontSize: '0.68rem', color: '#25D366', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', fontStyle: 'normal' }}>
                    Message Preview
                  </div>
                  "{previewMessage}"
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <CalendarClock size={16} /> Save New Due Date & Update Calendar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
