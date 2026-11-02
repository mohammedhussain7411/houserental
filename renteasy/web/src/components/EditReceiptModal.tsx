import React, { useState, useEffect } from 'react';
import { Receipt, PaymentMethod } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import confetti from 'canvas-confetti';
import {
  FileText,
  X,
  IndianRupee,
  Calendar,
  CreditCard,
  Building2,
  Home,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Pencil,
  Smartphone
} from 'lucide-react';

interface EditReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedReceipt: Receipt) => void;
  onDelete?: (deletedReceiptId: string) => void;
}

export const EditReceiptModal: React.FC<EditReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onSuccess,
  onDelete
}) => {
  if (!isOpen || !receipt) return null;

  // Extract initial date in YYYY-MM-DD
  const initialDateStr = receipt.issued_at
    ? receipt.issued_at.split('T')[0]
    : new Date().toISOString().split('T')[0];

  const [receiptNumber, setReceiptNumber] = useState<string>(receipt.receipt_number || '');
  const [amount, setAmount] = useState<string>(String(receipt.amount_paid || ''));
  const [paymentDate, setPaymentDate] = useState<string>(initialDateStr);
  const [method, setMethod] = useState<PaymentMethod>(receipt.payment_method || 'upi');
  const [reference, setReference] = useState<string>(receipt.reference || '');
  const [periodMonth, setPeriodMonth] = useState<string>(receipt.period_month || '');
  const [unitNumber, setUnitNumber] = useState<string>(receipt.unit_number || '');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync state when receipt prop changes
  useEffect(() => {
    if (receipt) {
      setReceiptNumber(receipt.receipt_number || '');
      setAmount(String(receipt.amount_paid || ''));
      setPaymentDate(receipt.issued_at ? receipt.issued_at.split('T')[0] : new Date().toISOString().split('T')[0]);
      setMethod(receipt.payment_method || 'upi');
      setReference(receipt.reference || '');
      setPeriodMonth(receipt.period_month || '');
      setUnitNumber(receipt.unit_number || '');
      setError(null);

      // Load notes from linked payment if exists
      const payments = rentEasyApi.getPayments();
      const p = payments.find(item => item.id === receipt.payment_id || item.receipt_number === receipt.receipt_number);
      if (p && p.notes) {
        setNotes(p.notes);
      } else {
        setNotes('');
      }
    }
  }, [receipt]);

  const numAmount = parseFloat(amount) || 0;
  const originalAmount = Number(receipt.amount_paid) || 0;
  const amountDiff = numAmount - originalAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError('Payment amount must be greater than 0.');
      return;
    }

    if (!paymentDate) {
      setError('Please select a valid payment date.');
      return;
    }

    if (!reference.trim()) {
      setError('Please provide a payment reference (e.g., UPI Ref, Cheque #, or Cash).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = rentEasyApi.updateReceipt(receipt.id, {
        amount_paid: numAmount,
        payment_date: paymentDate,
        payment_method: method,
        reference: reference.trim(),
        receipt_number: receiptNumber.trim() || receipt.receipt_number,
        period_month: periodMonth.trim() || receipt.period_month,
        unit_number: unitNumber.trim() || receipt.unit_number,
        notes: notes.trim() || undefined
      });

      confetti({
        particleCount: 60,
        spread: 55,
        origin: { y: 0.6 }
      });

      onSuccess(res.receipt);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update payment receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm(`Are you sure you want to delete / void receipt "${receipt.receipt_number}" for ${receipt.tenant_name} (₹${receipt.amount_paid.toLocaleString('en-IN')})?\n\nThis will remove the payment and restore the tenant's outstanding dues.`)) {
      return;
    }

    try {
      rentEasyApi.deleteReceipt(receipt.id);
      if (onDelete) {
        onDelete(receipt.id);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete receipt.');
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.15)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
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
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Pencil size={20} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                Edit Payment Receipt
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {receipt.receipt_number} • {receipt.tenant_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '72vh', overflowY: 'auto' }}>
            {error && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Read-Only Context Banner */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
                  Tenant & Property
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                  {receipt.tenant_name}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {receipt.property_name} • Unit: <strong style={{ color: 'var(--primary)' }}>{unitNumber || receipt.unit_number}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
                  Billing Month
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--sky)', marginTop: '2px' }}>
                  {receipt.period_month}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Hash: {receipt.verification_hash}
                </div>
              </div>
            </div>

            {/* Amount Field with Live Balance Calculation */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Amount Paid (₹) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontWeight: 700 }}>
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  className="form-control"
                  style={{ paddingLeft: '30px', fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Live adjustment preview */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>
                  Original: ₹{originalAmount.toLocaleString('en-IN')}
                </span>
                {amountDiff !== 0 && (
                  <span style={{ fontWeight: 600, color: amountDiff > 0 ? '#34d399' : '#fbbf24' }}>
                    {amountDiff > 0
                      ? `+₹${Math.abs(amountDiff).toLocaleString('en-IN')} (reduces tenant dues)`
                      : `-₹${Math.abs(amountDiff).toLocaleString('en-IN')} (increases tenant dues)`}
                  </span>
                )}
              </div>
            </div>

            {/* Payment Date & Receipt Number */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Payment Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  className="form-control"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Receipt #
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={receiptNumber}
                  onChange={e => setReceiptNumber(e.target.value)}
                  placeholder="REC-2026-0001"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Payment Channel / Mode <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {(['upi', 'cash', 'bank_transfer', 'cheque'] as PaymentMethod[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: method === m ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: method === m ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: method === m ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: method === m ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => {
                      setMethod(m);
                      if (m === 'cash' && (!reference || reference.startsWith('UPI/'))) {
                        setReference('Cash In Hand');
                      }
                    }}
                  >
                    {m === 'bank_transfer' ? 'Bank UTR' : m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference / UTR Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Transaction Reference / UTR <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. UPI/123456789012/PAY or Cheque #123456"
              />
            </div>

            {/* Notes / Remarks */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Notes / Memo (Optional)
              </label>
              <textarea
                className="form-control"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes or remarks regarding this payment..."
                style={{ resize: 'vertical' }}
              />
            </div>

            {/* Danger Zone: Delete Option */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Mistaken or duplicate receipt?
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.25)', backgroundColor: 'rgba(248, 113, 113, 0.08)' }}
                onClick={handleDelete}
              >
                <Trash2 size={13} /> Void / Delete Receipt
              </button>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ minWidth: '130px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Save size={15} />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
