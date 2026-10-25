import React, { useState, useEffect } from 'react';
import { RentCharge, Receipt, Payment, PaymentMethod } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  X,
  IndianRupee,
  ShieldCheck,
  Check,
  RefreshCw,
  FileText,
  Calendar,
  Save,
  Pencil
} from 'lucide-react';

interface RecordPaymentModalProps {
  initialCharge?: RentCharge | null;
  paymentToEdit?: Payment | null;
  charges: RentCharge[];
  onClose: () => void;
  onSuccess: (receipt: Receipt) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  initialCharge,
  paymentToEdit,
  charges,
  onClose,
  onSuccess
}) => {
  const isEditing = !!paymentToEdit;

  const [selectedChargeId, setSelectedChargeId] = useState<string>(
    paymentToEdit?.allocated_charge_id ||
      (initialCharge ? initialCharge.id : (charges.find(c => c.outstanding_balance > 0)?.id || charges[0]?.id || ''))
  );

  const activeCharge = charges.find(c => c.id === selectedChargeId) || initialCharge;

  const [paymentDate, setPaymentDate] = useState<string>(
    paymentToEdit ? paymentToEdit.payment_date : new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState<string>(
    paymentToEdit ? String(paymentToEdit.amount) : ''
  );
  const [method, setMethod] = useState<PaymentMethod>(
    paymentToEdit ? paymentToEdit.method : 'upi'
  );
  const [reference, setReference] = useState<string>(
    paymentToEdit ? paymentToEdit.reference : ''
  );
  const [notes, setNotes] = useState<string>(
    paymentToEdit?.notes || ''
  );
  const [idempotencyKey, setIdempotencyKey] = useState<string>(
    paymentToEdit?.idempotency_key || `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paymentToEdit) {
      setAmount(String(paymentToEdit.amount));
      setPaymentDate(paymentToEdit.payment_date);
      setMethod(paymentToEdit.method);
      setReference(paymentToEdit.reference);
      setNotes(paymentToEdit.notes || '');
    } else if (activeCharge) {
      setAmount(String(activeCharge.outstanding_balance));
      setReference(`UPI/${Math.floor(100000000000 + Math.random() * 900000000000)}/PAY`);
    }
  }, [activeCharge, paymentToEdit]);

  const numAmount = parseFloat(amount) || 0;
  const currentOutstanding = activeCharge ? activeCharge.outstanding_balance : 0;
  const remainingAfter = Math.max(0, currentOutstanding - numAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!paymentDate) {
      setError('Please select a valid payment date.');
      return;
    }

    if (numAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }

    if (!reference.trim()) {
      setError('Please provide a payment reference (e.g. UPI Ref / Bank UTR).');
      return;
    }

    try {
      if (isEditing && paymentToEdit) {
        const res = rentEasyApi.updatePayment(paymentToEdit.id, {
          amount: numAmount,
          payment_date: paymentDate,
          method,
          reference: reference.trim(),
          notes: notes.trim() || undefined
        });

        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });

        onSuccess(res.receipt);
      } else {
        if (!activeCharge) {
          setError('Please select a valid rent charge.');
          return;
        }

        const res = rentEasyApi.recordPayment({
          rent_charge_id: activeCharge.id,
          amount: numAmount,
          payment_date: paymentDate,
          method,
          reference: reference.trim(),
          idempotency_key: idempotencyKey,
          notes: notes.trim() || undefined
        });

        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });

        onSuccess(res.receipt);
      }
    } catch (err: any) {
      setError(err.message || 'Payment operation failed.');
    }
  };

  const tenants = rentEasyApi.getTenants();
  const linkedTenant = activeCharge ? tenants.find(t => t.active_lease_id === activeCharge.lease_id || t.name === activeCharge.tenant_name) : null;
  const securityDeposit = linkedTenant ? linkedTenant.deposit_amount : 0;
  const houseNumber = linkedTenant ? linkedTenant.house_number : (activeCharge ? activeCharge.unit_number : '');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isEditing ? 'rgba(56, 189, 248, 0.15)' : 'var(--emerald-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isEditing ? <Pencil size={18} color="#38bdf8" /> : <IndianRupee size={18} color="var(--emerald)" />}
            </div>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                {isEditing ? 'Edit Rent Payment & Date' : 'Record Payment & Send Receipt'}
              </h3>
              <p className="card-subtitle">
                {isEditing
                  ? 'Update payment date, amount, method, and transaction reference'
                  : 'Deducts payment received, updates house balance, and sends receipt message'}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '12px 16px', background: 'var(--rose-surface)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: '#fb7185', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            {/* Select Charge */}
            <div className="form-group">
              <label className="form-label">Select House / Tenant</label>
              <select
                className="form-select"
                value={selectedChargeId}
                onChange={e => setSelectedChargeId(e.target.value)}
              >
                {charges.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.tenant_name} — House {c.unit_number} ({c.property_name}) | Balance: ₹{c.outstanding_balance.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            {/* Live Financial Balance Summary with House & Security Deposit */}
            {activeCharge && (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>House / Unit</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                    {houseNumber}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Security Deposit</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                    ₹{securityDeposit.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>House Balance</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                    ₹{activeCharge.outstanding_balance.toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>After Deduction</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: remainingAfter > 0 ? '#fbbf24' : '#34d399', fontFamily: 'var(--font-mono)' }}>
                    ₹{remainingAfter.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Date Option */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} color="var(--primary)" /> Payment Date
              </label>
              <input
                type="date"
                className="form-input"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                Date the rent was remitted / received
              </span>
            </div>

            {/* Payment Amount */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Payment Amount (₹)</label>
                {activeCharge && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', color: 'var(--primary)', padding: '2px 6px' }}
                    onClick={() => setAmount(String(activeCharge.outstanding_balance))}
                  >
                    Pay Full Due (₹{activeCharge.outstanding_balance.toLocaleString('en-IN')})
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                className="form-input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700 }}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                {numAmount < currentOutstanding
                  ? '⚠️ Partial payment: A partial receipt will be issued and ₹' + remainingAfter.toLocaleString('en-IN') + ' remains outstanding.'
                  : '✅ Full payment: Rent will be marked 100% paid.'}
              </span>
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="form-label">Payment Channel</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {(['upi', 'bank_transfer', 'cash', 'cheque'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`btn ${method === m ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}
                  >
                    {m === 'bank_transfer' ? 'NetBanking' : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Reference */}
            <div className="form-group">
              <label className="form-label">Transaction Reference / UTR Number</label>
              <input
                type="text"
                className="form-input"
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="e.g. UPI/428719284729/HDFC"
                required
              />
            </div>

            {/* Idempotency Key Guard (shown only when creating new payment) */}
            {!isEditing && (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} color="#10b981" /> Idempotency Key (Duplicate Protection)
                  </label>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.7rem', padding: '2px 4px' }}
                    onClick={() => setIdempotencyKey(`idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)}
                  >
                    <RefreshCw size={12} /> Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)' }}
                  value={idempotencyKey}
                  readOnly
                />
              </div>
            )}

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Internal Notes (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Paid via Google Pay by Tenant"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={isEditing ? 'btn btn-primary' : 'btn btn-success'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Save size={16} />
              {isEditing ? 'Save Payment Updates' : 'Save Payment & Issue Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
