import React, { useState, useEffect } from 'react';
import { rentEasyApi } from '../services/rentEasyApi';
import { PropertyUnit, Tenant } from '../types';
import { Home, X, Check, Building2, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export interface EditHouseNumberTarget {
  type: 'unit' | 'tenant';
  propertyId?: string;
  propertyName?: string;
  unit?: PropertyUnit;
  tenant?: Tenant;
  assignedTenant?: Tenant;
}

interface EditHouseNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: EditHouseNumberTarget | null;
  onSuccess?: (newNumber: string) => void;
}

export const EditHouseNumberModal: React.FC<EditHouseNumberModalProps> = ({
  isOpen,
  onClose,
  target,
  onSuccess
}) => {
  if (!isOpen || !target) return null;

  const currentHouseNumber =
    target.type === 'unit'
      ? target.unit?.unit_number || ''
      : target.tenant?.house_number || '';

  const propertyName =
    target.propertyName ||
    target.tenant?.linked_property_name ||
    'Residential Property';

  const tenantName =
    target.assignedTenant?.name ||
    target.tenant?.name ||
    target.unit?.current_tenant_name ||
    null;

  const tenantPhone =
    target.assignedTenant?.phone ||
    target.tenant?.phone ||
    null;

  const rentAmount =
    target.assignedTenant?.monthly_rent ||
    target.tenant?.monthly_rent ||
    target.unit?.default_rent ||
    0;

  const [newNumber, setNewNumber] = useState(currentHouseNumber);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setNewNumber(currentHouseNumber);
    setError(null);
  }, [currentHouseNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let clean = newNumber.trim();
    if (!clean) {
      setError('House / Unit number cannot be empty.');
      return;
    }

    // Auto-prefix with property initial if user enters bare numbers (e.g., "16" -> "A-16")
    const pName = (propertyName || '').trim();
    if (pName && pName !== 'Residential Property') {
      const initial = pName.charAt(0).toUpperCase();
      const digitsOnly = clean.replace(/^(?:house\s*#?\s*|flat\s*#?\s*|unit\s*#?\s*|[a-z]-?)/i, '').trim();
      if (/^\d+$/.test(digitsOnly) && !clean.toUpperCase().startsWith(`${initial}-`)) {
        clean = `${initial}-${digitsOnly}`;
      }
    }

    if (clean === currentHouseNumber) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (target.type === 'unit' && target.propertyId && target.unit) {
        rentEasyApi.updateUnitNumber(target.propertyId, target.unit.id, clean);
      } else if (target.type === 'tenant' && target.tenant) {
        rentEasyApi.updateTenantHouseNumber(target.tenant.id, clean);
      } else {
        throw new Error('Missing unit or tenant target information.');
      }

      if (onSuccess) {
        onSuccess(clean);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update house number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
        padding: '16px'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.15)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(56, 189, 248, 0.08) 0%, transparent 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#34d399'
              }}
            >
              <Home size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Edit House / Unit Number
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, marginTop: '2px' }}>
                Update house number with automatic synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{
              padding: '8px',
              borderRadius: '8px',
              color: '#94a3b8',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Target Overview Card */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current Assignment
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: tenantName ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                  color: tenantName ? '#34d399' : '#94a3b8'
                }}
              >
                {tenantName ? 'OCCUPIED' : 'VACANT'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} color="#38bdf8" />
                <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.95rem' }}>
                  {propertyName}
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 800,
                  fontSize: '1rem',
                  color: '#fbbf24',
                  background: 'rgba(251, 191, 36, 0.1)',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(251, 191, 36, 0.25)'
                }}
              >
                {currentHouseNumber}
              </div>
            </div>

            {tenantName && (
              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399' }}>
                  <User size={13} />
                  <span>{tenantName}</span>
                  {tenantPhone && <span style={{ color: '#64748b' }}>({tenantPhone})</span>}
                </div>
                {rentAmount > 0 && (
                  <span style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                    ₹{rentAmount.toLocaleString('en-IN')}/mo
                  </span>
                )}
              </div>
            )}
          </div>

          {/* New House Number Input */}
          <div className="form-group" style={{ margin: 0 }}>
            <label
              className="form-label"
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={14} color="#38bdf8" />
              New House / Unit Number <span style={{ color: '#f43f5e' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                autoFocus
                className="form-input"
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  borderColor: error ? '#f43f5e' : 'rgba(56, 189, 248, 0.4)',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  color: '#ffffff',
                  width: '100%'
                }}
                placeholder="e.g. Flat 101, House #1A, 2nd Floor Unit"
                value={newNumber}
                onChange={e => {
                  setNewNumber(e.target.value);
                  if (error) setError(null);
                }}
              />
            </div>
          </div>

          {/* Real-time propagation explanation notice */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}
          >
            <ArrowRight size={16} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.45 }}>
              Renaming will automatically update the <strong style={{ color: '#e2e8f0' }}>property unit inventory</strong>,{' '}
              <strong style={{ color: '#e2e8f0' }}>tenant profile</strong>,{' '}
              <strong style={{ color: '#e2e8f0' }}>rent charges</strong>, and{' '}
              <strong style={{ color: '#e2e8f0' }}>receipts</strong> across phone & web instantly.
            </div>
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Modal Footer Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '18px',
              marginTop: '4px'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '10px 18px', fontSize: '0.88rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !newNumber.trim() || newNumber.trim() === currentHouseNumber}
              style={{
                padding: '10px 22px',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)'
              }}
            >
              {isSubmitting ? (
                'Saving...'
              ) : (
                <>
                  <Check size={16} /> Save House Number
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
