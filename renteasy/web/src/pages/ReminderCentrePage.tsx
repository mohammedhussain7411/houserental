import React, { useState } from 'react';
import { MessageJob, MessageType, MessageChannel } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
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
  PhoneCall
} from 'lucide-react';

export const ReminderCentrePage: React.FC = () => {
  const [jobs, setJobs] = useState<MessageJob[]>(rentEasyApi.getMessageJobs());
  const [selectedTemplate, setSelectedTemplate] = useState<MessageType>('overdue_reminder');
  const [activeChannel, setActiveChannel] = useState<MessageChannel>('whatsapp');
  const landlord = rentEasyApi.getLandlord();

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

  // Sample preview text
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
            Automated Reminder Centre
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Schedule and simulate WhatsApp Business and Indian DLT-compliant SMS payment reminders
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleRunReminders}>
          <Play size={16} /> Run Automated Check & Dispatch Now
        </button>
      </div>

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
  );
};
