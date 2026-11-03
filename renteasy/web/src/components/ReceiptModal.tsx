import React from 'react';
import { Receipt } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import {
  Printer,
  Share2,
  X,
  CheckCircle2,
  Building2,
  FileText,
  Calendar,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Pencil
} from 'lucide-react';

interface ReceiptModalProps {
  receipt: Receipt | null;
  onClose: () => void;
  onEditReceipt?: (receipt: Receipt) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose, onEditReceipt }) => {
  if (!receipt) return null;

  const landlord = rentEasyApi.getLandlord();
  const tenants = rentEasyApi.getTenants();
  const payments = rentEasyApi.getPayments();
  const linkedTenant = tenants.find(t => t.name === receipt.tenant_name);
  const securityDeposit = linkedTenant ? linkedTenant.deposit_amount : 0;
  const houseNumber = linkedTenant ? linkedTenant.house_number : receipt.unit_number;

  // Resolve Payment Date (actual date tenant paid)
  const linkedPayment = payments.find(p => p.id === receipt.payment_id || (p.receipt_number && p.receipt_number === receipt.receipt_number));
  const rawPaymentDate = receipt.payment_date || linkedPayment?.payment_date || (receipt.issued_at ? receipt.issued_at.split('T')[0] : '');

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const paymentDateFormatted = formatDisplayDate(rawPaymentDate);
    const text = encodeURIComponent(
      `Hello ${receipt.tenant_name},\nYour rent payment of ₹${receipt.amount_paid.toLocaleString('en-IN')} has been received on ${paymentDateFormatted} and deducted for House ${houseNumber}.\nRemaining House Balance: ₹${receipt.outstanding_balance.toLocaleString('en-IN')}.\nSecurity Deposit Held: ₹${securityDeposit.toLocaleString('en-IN')}.\nReceipt: ${receipt.receipt_number}\nPayment Received Date: ${paymentDateFormatted}\nVerification Hash: ${receipt.verification_hash}\nThank you, ${landlord.name}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleSendSMS = () => {
    rentEasyApi.queueMessageJob({
      tenant_id: linkedTenant ? linkedTenant.id : 'ten-001',
      tenant_name: receipt.tenant_name,
      tenant_phone: linkedTenant ? linkedTenant.phone : '+919845012345',
      property_name: `${receipt.property_name} (House ${houseNumber})`,
      type: 'payment_receipt',
      channel: 'sms'
    });
    alert(`Payment receipt SMS dispatched to ${linkedTenant ? linkedTenant.phone : 'tenant'}!`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="var(--primary)" />
            <h3 className="card-title" style={{ margin: 0 }}>Digital Rent Receipt</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onEditReceipt && (
              <button
                className="btn btn-secondary btn-sm"
                title="Edit Payment Receipt Details"
                style={{
                  color: '#38bdf8',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                onClick={() => {
                  onClose();
                  onEditReceipt(receipt);
                }}
              >
                <Pencil size={13} />
                <span>Edit Receipt</span>
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Printable Receipt Paper Container */}
          <div
            className="printable-receipt"
            style={{
              backgroundColor: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              position: 'relative',
              boxShadow: 'var(--shadow-md)',
              color: '#ffffff'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed rgba(255, 255, 255, 0.15)', paddingBottom: '18px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={22} color="var(--primary)" />
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{landlord.company_name}</span>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Landlord: {landlord.name} | Phone: {landlord.phone}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  UPI: {landlord.upi_id}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-paid" style={{ marginBottom: '6px' }}>
                  <CheckCircle2 size={12} /> Payment Verified
                </span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                  {receipt.receipt_number}
                </div>
                <div style={{ fontSize: '0.825rem', color: '#38bdf8', fontWeight: 700, marginTop: '3px' }}>
                  Paid on: {formatDisplayDate(rawPaymentDate)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Issued: {formatDisplayDate(receipt.issued_at)}
                </div>
              </div>
            </div>

            {/* Receipt Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.1fr', gap: '16px', marginBottom: '22px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>Received From (Tenant)</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '2px' }}>{receipt.tenant_name}</div>
                <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, marginTop: '2px' }}>House: {houseNumber}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{receipt.property_name}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>Payment Received Date</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={15} /> {formatDisplayDate(rawPaymentDate)}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Rental Month: <strong style={{ color: '#fff' }}>{receipt.period_month}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  Via {receipt.payment_method.toUpperCase()} ({receipt.reference})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '3px' }}>
                  Deposit Held: <strong>₹{securityDeposit.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

            {/* Amount Box */}
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '18px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>Amount Received (Deducted)</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  ₹{receipt.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Remaining House Balance</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: receipt.outstanding_balance > 0 ? '#fbbf24' : '#34d399', fontFamily: 'var(--font-mono)' }}>
                  ₹{receipt.outstanding_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  {receipt.outstanding_balance > 0 ? 'Partially Paid' : 'Zero Balance (Fully Paid)'}
                </div>
              </div>
            </div>

            {/* Security Verification & Landlord Signature */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#10b981" />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34d399' }}>Cryptographically Verified</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    SHA256: {receipt.verification_hash}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)', width: '130px', margin: '0 auto 4px auto' }}></div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Authorized Signatory</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{landlord.name}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          {onEditReceipt && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                onClose();
                onEditReceipt(receipt);
              }}
              style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
            >
              <Pencil size={15} /> Edit Receipt
            </button>
          )}
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Print / Save PDF
          </button>
          <button className="btn btn-secondary" onClick={handleSendSMS} style={{ color: 'var(--sky)' }}>
            <Smartphone size={16} /> Send SMS Receipt
          </button>
          <button className="btn btn-success" onClick={handleWhatsAppShare}>
            <Share2 size={16} /> Send via WhatsApp
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
