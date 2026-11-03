import React, { useState } from 'react';
import { MessageJob, MessageType, MessageChannel, Tenant, ElevenMonthMilestone } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import { RentIncreaseModal } from '../components/RentIncreaseModal';
import { RentalAgreementModal } from '../components/RentalAgreementModal';
import {
  BellRing,
  MessageSquare,
  Shield,
  Clock,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  CheckCheck,
  Send,
  Smartphone,
  PhoneCall,
  TrendingUp,
  Calendar,
  FileText,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Percent
} from 'lucide-react';

export const ReminderCentrePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'eleven_month' | 'monthly_dues'>('eleven_month');
  const [jobs, setJobs] = useState<MessageJob[]>(rentEasyApi.getMessageJobs());
  const [selectedTemplate, setSelectedTemplate] = useState<MessageType>('overdue_reminder');
  const [activeChannel, setActiveChannel] = useState<MessageChannel>('whatsapp');
  const landlord = rentEasyApi.getLandlord();

  // 11-Month Rent Increase state
  const [milestoneRefreshTick, setMilestoneRefreshTick] = useState<number>(0);
  const [milestones, setMilestones] = useState<ElevenMonthMilestone[]>(() =>
    rentEasyApi.getElevenMonthMilestones()
  );
  const [milestoneFilter, setMilestoneFilter] = useState<'all' | 'overdue' | 'due_soon' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTenantForRentIncrease, setSelectedTenantForRentIncrease] = useState<Tenant | null>(null);
  const [selectedTenantForAgreement, setSelectedTenantForAgreement] = useState<Tenant | null>(null);

  const refreshMilestones = () => {
    setMilestones(rentEasyApi.getElevenMonthMilestones());
    setMilestoneRefreshTick(t => t + 1);
  };

  const handleRunReminders = () => {
    const res = rentEasyApi.runAutomatedReminderSimulation();
    alert(`Automation completed!\n• Dispatched: ${res.remindersSent} reminders\n• Automatically skipped ${res.skippedPaidCount} tenants who already settled their rent.`);
    setJobs(rentEasyApi.getMessageJobs());
  };

  const handleRetry = (jobId: string) => {
    try {
      rentEasyApi.retryMessage(jobId);
      setJobs(rentEasyApi.getMessageJobs());
      alert('Message retried and delivered successfully.');
    } catch (e: any) {
      alert(e.message || 'Retry failed');
    }
  };

  const overdueCount = milestones.filter(m => m.status === 'overdue').length;
  const dueSoonCount = milestones.filter(m => m.status === 'due_soon').length;
  const upcomingCount = milestones.filter(m => m.status === 'upcoming').length;

  const filteredMilestones = milestones.filter(m => {
    if (milestoneFilter !== 'all' && m.status !== milestoneFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.tenant.name.toLowerCase().includes(q);
      const matchHouse = (m.tenant.house_number || '').toLowerCase().includes(q);
      const matchPhone = (m.tenant.phone || '').includes(q);
      return matchName || matchHouse || matchPhone;
    }
    return true;
  });

  const formatDisplayDate = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const handleSendWhatsAppNotice = (m: ElevenMonthMilestone) => {
    const phone = (m.tenant.whatsapp_number || m.tenant.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : `91${phone.slice(-10)}`;
    const ownerName = landlord.name || 'Property Owner';
    const msg = `Dear ${m.tenant.name},\n\nHope you are doing well.\n\nThis is a friendly reminder that as per your 11-month rental agreement dated ${formatDisplayDate(m.moveInDate)}, your tenancy period for House ${m.tenant.house_number} completes on ${formatDisplayDate(m.milestoneDate)}.\n\nAs per standard agreement revision terms, your monthly rent is due for annual revision to ₹${m.suggestedRent5Pct.toLocaleString('en-IN')} (+5% escalation) or ₹${m.suggestedRent10Pct.toLocaleString('en-IN')} (+10%).\n\nKindly contact us to complete the renewal of your rental agreement for the next 11-month term.\n\nThank you,\n${ownerName}\nPhone: ${landlord.phone || '+91'}`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Sample preview text for monthly dues
  const previewData = {
    tenant_name: 'Priya Venkat',
    property_name: 'Greenwood Heights (Villa 14)',
    due_date: '07-Oct-2026',
    outstanding_amount: '45,000.00',
    landlord_name: landlord.name,
    receipt_number: 'REC-2026-0002',
    payment_amount: '34,000.00',
    rent_period: 'October 2026',
    receipt_link: 'https://renteasy.app/verify/REC-2026-0002'
  };

  const getWhatsAppPreviewText = () => {
    if (selectedTemplate === 'upcoming_reminder') {
      return `Hello ${previewData.tenant_name},\nThis is a friendly reminder that your house rent of ₹${previewData.outstanding_amount} is due on ${previewData.due_date} for ${previewData.property_name}.\nIf you have already paid, please ignore this message.\nRegards,\n${previewData.landlord_name}`;
    }
    if (selectedTemplate === 'due_date_reminder') {
      return `Hello ${previewData.tenant_name},\nYour house rent of ₹${previewData.outstanding_amount} for ${previewData.property_name} is due today (${previewData.due_date}).\nKindly make the payment via UPI to ${landlord.upi_id}.\nRegards,\n${previewData.landlord_name}`;
    }
    if (selectedTemplate === 'overdue_reminder') {
      return `Hello ${previewData.tenant_name},\nImportant: Your rent payment of ₹${previewData.outstanding_amount} for ${previewData.property_name} was due on ${previewData.due_date} and is currently OVERDUE.\nPlease clear the pending dues immediately to avoid late fees.\nRegards,\n${previewData.landlord_name}`;
    }
    return `Hello ${previewData.tenant_name},\nYour payment of ₹${previewData.payment_amount} has been received for ${previewData.rent_period}.\nProperty: ${previewData.property_name}\nReceipt Number: ${previewData.receipt_number}\nRemaining Balance: ₹0.00\nOfficial Digital Receipt: ${previewData.receipt_link}\nThank you.\n${previewData.landlord_name}`;
  };

  const getSMSPreviewText = () => {
    if (selectedTemplate === 'overdue_reminder') {
      return `[TL-RNTEZY]: Rent of Rs.${previewData.outstanding_amount} for ${previewData.property_name} is OVERDUE since ${previewData.due_date}. Kindly settle immediately to ${landlord.upi_id}.`;
    }
    if (selectedTemplate === 'due_date_reminder') {
      return `[TL-RNTEZY]: Hello ${previewData.tenant_name}, rent of Rs.${previewData.outstanding_amount} for ${previewData.property_name} is due today. Remit to ${landlord.upi_id}.`;
    }
    if (selectedTemplate === 'upcoming_reminder') {
      return `[TL-RNTEZY]: Friendly reminder: rent of Rs.${previewData.outstanding_amount} for ${previewData.property_name} is due on ${previewData.due_date}.`;
    }
    return `[TL-RNTEZY]: Payment of Rs.${previewData.payment_amount} received for ${previewData.rent_period}. Receipt ${previewData.receipt_number}. Link: ${previewData.receipt_link}`;
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Reminder & Lease Renewal Centre
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Track 11-month lease completion for annual rent escalation, and automated monthly rent reminders
          </p>
        </div>

        {activeTab === 'monthly_dues' && (
          <button className="btn btn-primary" onClick={handleRunReminders}>
            <Play size={16} /> Run Automated Check & Dispatch Now
          </button>
        )}
      </div>

      {/* Main Feature Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
        <button
          className={`btn ${activeTab === 'eleven_month' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('eleven_month')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            padding: '10px 18px',
            fontWeight: 700
          }}
        >
          <TrendingUp size={16} />
          <span>11-Month Rent Increase Reminders</span>
          {(overdueCount > 0 || dueSoonCount > 0) && (
            <span
              style={{
                background: overdueCount > 0 ? '#ef4444' : '#f59e0b',
                color: '#fff',
                fontSize: '0.72rem',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: 800
              }}
            >
              {overdueCount + dueSoonCount} Due
            </span>
          )}
        </button>

        <button
          className={`btn ${activeTab === 'monthly_dues' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('monthly_dues')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.88rem',
            padding: '10px 18px',
            fontWeight: 700
          }}
        >
          <BellRing size={16} />
          <span>Monthly Dues & Outbox Dispatch</span>
        </button>
      </div>

      {/* TAB 1: 11-MONTH RENT INCREASE REMINDERS */}
      {activeTab === 'eleven_month' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '18px', borderLeft: '4px solid #6366f1' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                Total Active Tenancies
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                {milestones.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Tenants with recorded move-in dates
              </div>
            </div>

            <div
              className="card"
              onClick={() => setMilestoneFilter('overdue')}
              style={{
                padding: '18px',
                borderLeft: '4px solid #ef4444',
                cursor: 'pointer',
                background: milestoneFilter === 'overdue' ? 'rgba(239, 68, 68, 0.08)' : undefined
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#fb7185', textTransform: 'uppercase', fontWeight: 700 }}>
                11-Month Completed (Due Now)
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fb7185', marginTop: '4px' }}>
                {overdueCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Eligible for immediate rent escalation
              </div>
            </div>

            <div
              className="card"
              onClick={() => setMilestoneFilter('due_soon')}
              style={{
                padding: '18px',
                borderLeft: '4px solid #f59e0b',
                cursor: 'pointer',
                background: milestoneFilter === 'due_soon' ? 'rgba(245, 158, 11, 0.08)' : undefined
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>
                Completing in 30 Days
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                {dueSoonCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Send advance 11-month notice
              </div>
            </div>

            <div
              className="card"
              onClick={() => setMilestoneFilter('upcoming')}
              style={{
                padding: '18px',
                borderLeft: '4px solid #10b981',
                cursor: 'pointer',
                background: milestoneFilter === 'upcoming' ? 'rgba(16, 185, 129, 0.08)' : undefined
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 700 }}>
                Tenure in Progress
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                {upcomingCount}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                More than 30 days remaining
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 18px'
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`btn btn-sm ${milestoneFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMilestoneFilter('all')}
                style={{ fontSize: '0.78rem' }}
              >
                All Tenancies ({milestones.length})
              </button>

              <button
                className={`btn btn-sm ${milestoneFilter === 'overdue' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMilestoneFilter('overdue')}
                style={{
                  fontSize: '0.78rem',
                  color: milestoneFilter === 'overdue' ? '#fff' : '#fb7185',
                  borderColor: 'rgba(239, 68, 68, 0.4)'
                }}
              >
                ⚠️ Completed / Overdue ({overdueCount})
              </button>

              <button
                className={`btn btn-sm ${milestoneFilter === 'due_soon' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMilestoneFilter('due_soon')}
                style={{
                  fontSize: '0.78rem',
                  color: milestoneFilter === 'due_soon' ? '#fff' : '#fbbf24',
                  borderColor: 'rgba(245, 158, 11, 0.4)'
                }}
              >
                ⏳ Due in 30 Days ({dueSoonCount})
              </button>

              <button
                className={`btn btn-sm ${milestoneFilter === 'upcoming' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMilestoneFilter('upcoming')}
                style={{ fontSize: '0.78rem' }}
              >
                ✅ Upcoming ({upcomingCount})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search tenant or house..."
                className="form-input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.82rem', width: '220px' }}
              />
            </div>
          </div>

          {/* Tenants Milestone List Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ border: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>House / Unit</th>
                    <th>Tenant Details</th>
                    <th>Move-in Date</th>
                    <th>11-Month Due Date</th>
                    <th>Status & Tenure</th>
                    <th>Current Rent</th>
                    <th>Escalation (+5% / +10%)</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMilestones.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No tenants match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMilestones.map(m => (
                      <tr key={m.tenant.id}>
                        {/* House */}
                        <td>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: '#fff',
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              padding: '4px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            {m.tenant.house_number}
                          </span>
                        </td>

                        {/* Tenant Name & Contact */}
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>
                            {m.tenant.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span>{m.tenant.phone}</span>
                            {m.tenant.phone && (
                              <a
                                href={`tel:${m.tenant.phone}`}
                                title={`Call ${m.tenant.name}`}
                                style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center' }}
                              >
                                <PhoneCall size={12} />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Move-in Date */}
                        <td>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#e2e8f0' }}>
                            {formatDisplayDate(m.moveInDate)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            Lease start
                          </div>
                        </td>

                        {/* 11-Month Due Date */}
                        <td>
                          <div
                            style={{
                              fontSize: '0.86rem',
                              fontWeight: 700,
                              color:
                                m.status === 'overdue'
                                  ? '#fb7185'
                                  : m.status === 'due_soon'
                                  ? '#fbbf24'
                                  : '#93c5fd'
                            }}
                          >
                            {formatDisplayDate(m.milestoneDate)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                            11 months
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                m.status === 'overdue'
                                  ? 'rgba(244, 63, 94, 0.18)'
                                  : m.status === 'due_soon'
                                  ? 'rgba(245, 158, 11, 0.18)'
                                  : 'rgba(16, 185, 129, 0.18)',
                              color:
                                m.status === 'overdue'
                                  ? '#fb7185'
                                  : m.status === 'due_soon'
                                  ? '#fbbf24'
                                  : '#34d399',
                              fontSize: '0.74rem',
                              fontWeight: 700
                            }}
                          >
                            {m.daysRemaining <= 0
                              ? `⚠️ ${Math.abs(m.daysRemaining)}d Overdue`
                              : m.status === 'due_soon'
                              ? `⏳ ${m.daysRemaining}d Left`
                              : `✅ ${m.daysRemaining}d Left`}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {m.monthsPassed} mo active
                          </div>
                        </td>

                        {/* Current Rent */}
                        <td>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>
                            ₹{m.currentRent.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>per month</div>
                        </td>

                        {/* Suggested +5% / +10% */}
                        <td>
                          <div style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 600 }}>
                            +5%: ₹{m.suggestedRent5Pct.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#a5b4fc', fontWeight: 600 }}>
                            +10%: ₹{m.suggestedRent10Pct.toLocaleString('en-IN')}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {/* WhatsApp Notice */}
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleSendWhatsAppNotice(m)}
                              title="Send 11-month rent increase & lease renewal reminder on WhatsApp"
                              style={{
                                color: '#25D366',
                                borderColor: 'rgba(37, 211, 102, 0.3)',
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <MessageSquare size={13} /> Notice
                            </button>

                            {/* Increase Rent Modal Trigger */}
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => setSelectedTenantForRentIncrease(m.tenant)}
                              title={`Apply rent increase for ${m.tenant.name}`}
                              style={{
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontWeight: 700
                              }}
                            >
                              <TrendingUp size={13} /> Increase Rent
                            </button>

                            {/* Rental Agreement */}
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedTenantForAgreement(m.tenant)}
                              title={`View or generate renewal rental agreement for ${m.tenant.name}`}
                              style={{
                                fontSize: '0.75rem',
                                padding: '4px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <FileText size={13} color="#818cf8" /> Agreement
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY DUES & OUTBOX DISPATCH */}
      {activeTab === 'monthly_dues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 4 Standard Reminder Timing Rules */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Upcoming Reminder</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>3 Days Before Due</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Friendly notification with due date & UPI details</div>
            </div>

            <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--sky)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Due Date Alert</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '4px' }}>On the Due Date</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Direct payment nudge sent at 9:00 AM IST</div>
            </div>

            <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--rose)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Overdue Escalation</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fb7185', marginTop: '4px' }}>3 Days Overdue</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Urgent settlement notice to tenant</div>
            </div>

            <div className="card" style={{ padding: '18px', borderLeft: '4px solid var(--amber)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Persistent Follow-up</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24', marginTop: '4px' }}>Every 7 Days Overdue</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Repeats automatically until paid or paused</div>
            </div>
          </div>

          {/* Split View: Live Message Preview vs Delivery Outbox */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px' }}>
            {/* Left: Message Template Simulator */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 className="card-title">Live Message Preview</h3>
                  <p className="card-subtitle">Test message formatting, variables, and approved template copy</p>
                </div>

                {/* Channel Toggle */}
                <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
                  <button
                    className={`btn btn-sm ${activeChannel === 'whatsapp' ? 'btn-success' : 'btn-ghost'}`}
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setActiveChannel('whatsapp')}
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </button>
                  <button
                    className={`btn btn-sm ${activeChannel === 'sms' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setActiveChannel('sms')}
                  >
                    <Shield size={13} /> DLT SMS
                  </button>
                </div>
              </div>

              {/* Template Type Selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {[
                  { id: 'upcoming_reminder', label: 'Upcoming (3d)' },
                  { id: 'due_date_reminder', label: 'Due Date' },
                  { id: 'overdue_reminder', label: 'Overdue (3d/7d)' },
                  { id: 'payment_receipt', label: 'Receipt Confirmation' }
                ].map(t => (
                  <button
                    key={t.id}
                    className={`btn btn-sm ${selectedTemplate === t.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem' }}
                    onClick={() => setSelectedTemplate(t.id as MessageType)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Chat Bubble Sandbox */}
              {activeChannel === 'whatsapp' ? (
                <div className="whatsapp-chat-box">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                      W
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>RentEasy Verified Business</div>
                      <div style={{ fontSize: '0.72rem', color: '#25D366' }}>Official WhatsApp Template (Approved)</div>
                    </div>
                  </div>

                  <div className="whatsapp-bubble">
                    {getWhatsAppPreviewText()}
                    <div className="whatsapp-meta">
                      <span>10:30 AM</span>
                      <CheckCheck size={14} className="whatsapp-ticks" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="sms-chat-box">
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sender Header: <strong style={{ color: '#38bdf8' }}>TL-RNTEZY</strong></span>
                    <span>TRAI DLT Category: Transactional</span>
                  </div>
                  <div className="sms-bubble">
                    {getSMSPreviewText()}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Message Outbox & Delivery Status */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 className="card-title">Outbox & Delivery Tracking</h3>
                  <p className="card-subtitle">Real delivery status webhooks from Meta and SMS provider</p>
                </div>
                <span className="badge badge-paid">
                  <CheckCircle2 size={12} /> Webhooks Active
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto', maxHeight: '420px' }}>
                {jobs.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No messages queued yet.
                  </div>
                ) : (
                  jobs.map(j => (
                    <div
                      key={j.id}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{j.tenant_name}</span>
                          <span className="badge" style={{ background: j.channel === 'whatsapp' ? 'rgba(37,211,102,0.15)' : 'rgba(14,165,233,0.15)', color: j.channel === 'whatsapp' ? '#25D366' : '#38bdf8', fontSize: '0.68rem' }}>
                            {j.channel.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {j.property_name} • {j.type.replace('_', ' ')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {new Date(j.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <a
                            href={`tel:${j.tenant_phone}`}
                            className="btn btn-secondary btn-sm"
                            style={{
                              fontSize: '0.7rem',
                              padding: '3px 8px',
                              color: '#10b981',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title={`Call ${j.tenant_name} (${j.tenant_phone})`}
                          >
                            <PhoneCall size={11} /> Call
                          </a>
                          <span className={`badge badge-${j.status === 'delivered' ? 'paid' : j.status === 'failed' ? 'overdue' : 'pending'}`} style={{ fontSize: '0.72rem' }}>
                            {j.status.toUpperCase()}
                          </span>
                        </div>

                        {j.status === 'failed' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                            onClick={() => handleRetry(j.id)}
                          >
                            <RotateCw size={12} /> Retry
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rent Increase Modal */}
      {selectedTenantForRentIncrease && (
        <RentIncreaseModal
          tenant={selectedTenantForRentIncrease}
          onClose={() => setSelectedTenantForRentIncrease(null)}
          onSuccess={() => {
            refreshMilestones();
            setSelectedTenantForRentIncrease(null);
          }}
        />
      )}

      {/* Rental Agreement Modal */}
      {selectedTenantForAgreement && (
        <RentalAgreementModal
          tenant={selectedTenantForAgreement}
          isOpen={!!selectedTenantForAgreement}
          properties={rentEasyApi.getProperties()}
          onClose={() => setSelectedTenantForAgreement(null)}
        />
      )}
    </div>
  );
};
