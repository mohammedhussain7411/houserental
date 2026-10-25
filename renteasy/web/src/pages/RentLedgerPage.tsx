import React, { useState, useEffect } from 'react';
import { RentCharge, Receipt, Payment } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Calendar,
  CalendarClock,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  IndianRupee,
  Building2,
  FileText,
  CalendarDays,
  Smartphone,
  Pencil
} from 'lucide-react';
import { RescheduleDueDateModal } from '../components/RescheduleDueDateModal';
import { AddToPhoneCalendarModal } from '../components/AddToPhoneCalendarModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { RentCalendarEvent } from '../types';

interface RentLedgerPageProps {
  onOpenRecordPayment: (charge?: RentCharge) => void;
  onViewReceipt: (receipt: Receipt) => void;
}

export const RentLedgerPage: React.FC<RentLedgerPageProps> = ({
  onOpenRecordPayment,
  onViewReceipt
}) => {
  const presentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(presentMonth || '2026-10');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reschedulingCharge, setReschedulingCharge] = useState<RentCharge | null>(null);
  const [calendarChargeForPhone, setCalendarChargeForPhone] = useState<RentCharge | null>(null);
  const [isSyncAllPhoneModalOpen, setIsSyncAllPhoneModalOpen] = useState<boolean>(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editingCharge, setEditingCharge] = useState<RentCharge | null>(null);

  const [charges, setCharges] = useState<RentCharge[]>(rentEasyApi.getRentCharges(selectedMonth));

  // Real-time synchronization listener for Phone <-> Web updates
  useEffect(() => {
    const handleSync = () => {
      setCharges(rentEasyApi.getRentCharges(selectedMonth));
    };
    window.addEventListener('renteasy_sync', handleSync);
    return () => window.removeEventListener('renteasy_sync', handleSync);
  }, [selectedMonth]);

  const payments = rentEasyApi.getPayments();
  const receipts = rentEasyApi.getReceipts();

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    setCharges(rentEasyApi.getRentCharges(month));
  };

  const handleReversePayment = (paymentId: string) => {
    const reason = prompt('Please enter the reason for payment reversal / void:');
    if (!reason || !reason.trim()) return;

    try {
      rentEasyApi.reversePayment(paymentId, reason.trim());
      alert('Payment reversed successfully. Balance restored and audit record logged.');
      setCharges(rentEasyApi.getRentCharges(selectedMonth));
    } catch (e: any) {
      alert(e.message || 'Failed to reverse payment');
    }
  };

  const filtered = charges.filter(c => {
    const matchesSearch = c.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.unit_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Monthly Rent Ledger
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Financial source of truth: charges, payments, partial debt allocations, and balance carry-forward
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const nowStr = new Date().toISOString().split('T')[0];
              const csv = rentEasyApi.exportLedgerCSV(selectedMonth);
              rentEasyApi.downloadBlob(`RentEasy_Ledger_${selectedMonth}_${nowStr}.csv`, csv, 'text/csv;charset=utf-8;');
              alert(`Rent Ledger for ${selectedMonth} downloaded! You can upload it to Google Drive and open with Google Sheets.`);
            }}
            title="Download CSV to open in Google Sheets / Drive"
          >
            <FileSpreadsheet size={16} color="#34A853" /> Export for Google Sheets
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setIsSyncAllPhoneModalOpen(true)}
            title="Add and sync rent collection due dates to your phone calendar"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Smartphone size={15} color="#6366f1" />
            <span>Add to Phone Calendar</span>
          </button>

          <button className="btn btn-primary" onClick={() => onOpenRecordPayment()}>
            <CreditCard size={16} /> Record Payment
          </button>
        </div>
      </div>

      {/* Control Bar: Month, Search & Status Chips */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 12px', gap: '8px' }}>
            <Calendar size={16} color="var(--primary)" />
            <select
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.875rem', outline: 'none', cursor: 'pointer', fontWeight: 600 }}
              value={selectedMonth}
              onChange={e => handleMonthChange(e.target.value)}
            >
              <option value="2026-09">September 2026</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-11">November 2026</option>
            </select>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 12px', width: '280px', gap: '8px' }}>
            <Search size={15} color="var(--text-dim)" />
            <input
              type="text"
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%' }}
              placeholder="Filter tenant or property..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'paid', 'partially_paid', 'pending', 'overdue'] as const).map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
              style={{ textTransform: 'capitalize', fontSize: '0.78rem' }}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Rent Ledger Grid */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Tenant & Property</th>
                <th>Due Date</th>
                <th>Base Rent</th>
                <th>Other / Carry-Fwd</th>
                <th>Total Due</th>
                <th>Amount Paid</th>
                <th>Outstanding Balance</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const linkedReceipt = receipts.find(r => r.property_name.includes(c.property_name) && r.period_month === c.period_month);
                const linkedPayment = payments.find(p => p.allocated_charge_id === c.id && !p.is_reversed);

                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#ffffff' }}>{c.tenant_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={13} color="var(--primary)" /> {c.property_name} ({c.unit_number})
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.due_date}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        {new Date() > new Date(c.due_date) && c.outstanding_balance > 0 ? (
                          <span style={{ color: '#fb7185' }}>Late payment</span>
                        ) : 'Scheduled'}
                      </div>
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      ₹{c.rent_amount.toLocaleString('en-IN')}
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', color: c.other_charges > 0 ? '#fbbf24' : 'var(--text-dim)' }}>
                      ₹{c.other_charges.toLocaleString('en-IN')}
                      {c.other_charges > 0 && <span style={{ fontSize: '0.68rem', display: 'block', color: 'var(--text-dim)' }}>(Maint/Past Due)</span>}
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                      ₹{c.total_due.toLocaleString('en-IN')}
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399' }}>
                      ₹{c.amount_paid.toLocaleString('en-IN')}
                    </td>

                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: c.outstanding_balance > 0 ? '#fbbf24' : '#34d399' }}>
                      ₹{c.outstanding_balance.toLocaleString('en-IN')}
                    </td>

                    <td>
                      <span className={`badge badge-${c.status}`}>
                        <span className="badge-dot"></span>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {c.outstanding_balance > 0 ? (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => onOpenRecordPayment(c)}
                            >
                              Collect
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Reschedule next collection due date"
                              style={{ color: '#fbbf24' }}
                              onClick={() => setReschedulingCharge(c)}
                            >
                              <CalendarClock size={14} />
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Add due date to Phone Calendar"
                              style={{ color: '#818cf8' }}
                              onClick={() => setCalendarChargeForPhone(c)}
                            >
                              <CalendarDays size={14} />
                            </button>
                          </>
                        ) : null}

                        {linkedReceipt && (
                          <button
                            className="btn btn-secondary btn-sm"
                            title="View Receipt"
                            onClick={() => onViewReceipt(linkedReceipt)}
                          >
                            <FileText size={14} />
                          </button>
                        )}

                        {linkedPayment && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Edit Payment (Date, Amount, Channel, Reference)"
                              style={{
                                color: '#38bdf8',
                                borderColor: 'rgba(56, 189, 248, 0.4)',
                                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              onClick={() => {
                                setEditingPayment(linkedPayment);
                                setEditingCharge(c);
                              }}
                            >
                              <Pencil size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Reverse Payment"
                              style={{ color: '#fb7185' }}
                              onClick={() => handleReversePayment(linkedPayment.id)}
                            >
                              <RotateCcw size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <RecordPaymentModal
          initialCharge={editingCharge}
          paymentToEdit={editingPayment}
          charges={charges}
          onClose={() => {
            setEditingPayment(null);
            setEditingCharge(null);
          }}
          onSuccess={(receipt) => {
            setEditingPayment(null);
            setEditingCharge(null);
            setCharges(rentEasyApi.getRentCharges(selectedMonth));
            onViewReceipt(receipt);
          }}
        />
      )}

      {reschedulingCharge && (
        <RescheduleDueDateModal
          charge={reschedulingCharge}
          onClose={() => setReschedulingCharge(null)}
          onSuccess={() => {
            setReschedulingCharge(null);
            setCharges(rentEasyApi.getRentCharges(selectedMonth));
          }}
        />
      )}

      {/* Add To Phone Calendar Modal */}
      <AddToPhoneCalendarModal
        isOpen={calendarChargeForPhone !== null || isSyncAllPhoneModalOpen}
        onClose={() => {
          setCalendarChargeForPhone(null);
          setIsSyncAllPhoneModalOpen(false);
        }}
        event={
          calendarChargeForPhone
            ? {
                id: calendarChargeForPhone.id,
                dateStr: calendarChargeForPhone.due_date,
                day: parseInt(calendarChargeForPhone.due_date.split('-')[2] || '1', 10),
                unit_number: calendarChargeForPhone.unit_number,
                property_name: calendarChargeForPhone.property_name,
                tenant_name: calendarChargeForPhone.tenant_name,
                tenant_phone: calendarChargeForPhone.tenant_phone,
                amount: calendarChargeForPhone.rent_amount,
                amount_paid: calendarChargeForPhone.amount_paid,
                outstanding_balance: calendarChargeForPhone.outstanding_balance,
                status: calendarChargeForPhone.status,
                due_date: calendarChargeForPhone.due_date,
                charge: calendarChargeForPhone
              }
            : null
        }
        allEvents={charges.map(c => ({
          id: c.id,
          dateStr: c.due_date,
          day: parseInt(c.due_date.split('-')[2] || '1', 10),
          unit_number: c.unit_number,
          property_name: c.property_name,
          tenant_name: c.tenant_name,
          tenant_phone: c.tenant_phone,
          amount: c.rent_amount,
          amount_paid: c.amount_paid,
          outstanding_balance: c.outstanding_balance,
          status: c.status,
          due_date: c.due_date,
          charge: c
        }))}
        monthName={selectedMonth}
        year={parseInt(selectedMonth.split('-')[0], 10)}
        landlordName={rentEasyApi.getLandlord().name}
        companyName={rentEasyApi.getLandlord().company_name}
      />
    </div>
  );
};
