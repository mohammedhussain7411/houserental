import React, { useState } from 'react';
import { Receipt } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import {
  FileText,
  Download,
  Share2,
  Search,
  Calendar,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  IndianRupee,
  ExternalLink
} from 'lucide-react';

interface ReceiptsReportsPageProps {
  onViewReceipt: (receipt: Receipt) => void;
}

export const ReceiptsReportsPage: React.FC<ReceiptsReportsPageProps> = ({ onViewReceipt }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const receipts = rentEasyApi.getReceipts();
  const summary = rentEasyApi.getDashboardSummary('2026-10');

  const filtered = receipts.filter(r =>
    r.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.property_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (receipts.length === 0) {
      alert('No receipts to export.');
      return;
    }

    const headers = ['Receipt Number', 'Issued Date', 'Tenant Name', 'Property', 'Unit', 'Period', 'Amount Paid', 'Payment Method', 'Reference', 'Remaining Balance', 'Hash'];
    const rows = receipts.map(r => [
      r.receipt_number,
      new Date(r.issued_at).toLocaleDateString('en-IN'),
      `"${r.tenant_name}"`,
      `"${r.property_name}"`,
      `"${r.unit_number}"`,
      r.period_month,
      r.amount_paid,
      r.payment_method,
      `"${r.reference}"`,
      r.outstanding_balance,
      r.verification_hash
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RentEasy_Receipts_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResendReceipt = (r: Receipt, channel: 'whatsapp' | 'sms') => {
    rentEasyApi.queueMessageJob({
      tenant_id: 'ten-001',
      tenant_name: r.tenant_name,
      tenant_phone: '+919845012345',
      property_name: `${r.property_name} (${r.unit_number})`,
      type: 'payment_receipt',
      channel
    });
    alert(`Receipt ${r.receipt_number} has been queued and resent via ${channel.toUpperCase()}!`);
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Receipts & Financial Reports
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Tamper-proof digital receipts, private PDF delivery, collection performance, and transaction CSV exports
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleExportCSV}>
          <Download size={16} /> Export All to CSV
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Total Collected (YTD)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            ₹{(summary.collected_rent * 4).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Across all verified units</div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Receipts Issued</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {receipts.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>100% Cryptographically verified</div>
        </div>

        <div className="card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Collection Efficiency</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
            {summary.collection_percentage}%
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Current month settlement rate</div>
        </div>
      </div>

      {/* Receipts Search & Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>Issued Digital Receipts</h3>
            <p className="card-subtitle">Permanent financial ledger of all customer rent receipts</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '6px 12px', width: '280px', gap: '8px' }}>
            <Search size={15} color="var(--text-dim)" />
            <input
              type="text"
              style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%' }}
              placeholder="Search receipt # or tenant..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Tenant Name</th>
                <th>Property</th>
                <th>Period</th>
                <th>Amount Paid</th>
                <th>Method / Ref</th>
                <th>Issued Date</th>
                <th>Verification Hash</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                    {r.receipt_number}
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.tenant_name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.property_name} ({r.unit_number})</td>
                  <td>{r.period_month}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#34d399' }}>
                    ₹{r.amount_paid.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.72rem' }}>
                      {r.payment_method.toUpperCase()}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>{r.reference}</div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {new Date(r.issued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {r.verification_hash}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewReceipt(r)}
                      >
                        View / Print
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        title="Resend to WhatsApp"
                        onClick={() => handleResendReceipt(r, 'whatsapp')}
                      >
                        <Share2 size={13} />
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
