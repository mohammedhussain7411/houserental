import React from 'react';
import { RentCalendarEvent } from '../types';
import {
  CalendarDays,
  Smartphone,
  ExternalLink,
  Download,
  Bell,
  CheckCircle2,
  X,
  User,
  Building2,
  IndianRupee,
  Clock,
  PhoneCall
} from 'lucide-react';

interface AddToPhoneCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: RentCalendarEvent | null;
  allEvents?: RentCalendarEvent[];
  monthName?: string;
  year?: number;
  landlordName?: string;
  companyName?: string;
}

// Generate single or multiple .ics content
function generateICSContent(
  events: RentCalendarEvent[],
  landlordName = 'Landlord',
  calendarName = 'RentEasy Due Dates'
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RentEasy//Landlord Rent Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:Asia/Kolkata'
  ];

  events.forEach(ev => {
    const dateFormatted = ev.dateStr.replace(/-/g, '');
    const uid = `renteasy-${ev.id}-${dateFormatted}@renteasy.app`;
    const summary = `Rent Due: ${ev.unit_number} (${ev.tenant_name}) - Rs. ${ev.amount.toLocaleString('en-IN')}`;
    const description = `RentEasy Collection Reminder\\nTenant: ${ev.tenant_name}\\nPhone: ${ev.tenant_phone}\\nProperty: ${ev.property_name} (${ev.unit_number})\\nMonthly Rent: Rs. ${ev.amount.toLocaleString('en-IN')}\\nPending Balance: Rs. ${ev.outstanding_balance.toLocaleString('en-IN')}\\nLandlord: ${landlordName}`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dateFormatted}T090000Z`);
    // Scheduled at 9:00 AM on due date
    lines.push(`DTSTART:${dateFormatted}T090000Z`);
    lines.push(`DTEND:${dateFormatted}T100000Z`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`LOCATION:${ev.property_name}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT15M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: Collect rent from ${ev.tenant_name} (${ev.unit_number})`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function triggerICSDownload(icsData: string, filename: string) {
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => window.URL.revokeObjectURL(url), 2000);
}

function getGoogleCalendarUrl(ev: RentCalendarEvent): string {
  const dateFormatted = ev.dateStr.replace(/-/g, '');
  const title = encodeURIComponent(`Rent Due: ${ev.unit_number} (${ev.tenant_name}) - ₹${ev.amount.toLocaleString('en-IN')}`);
  const details = encodeURIComponent(
    `RentEasy Collection Reminder\nTenant: ${ev.tenant_name}\nPhone: ${ev.tenant_phone}\nProperty: ${ev.property_name} (${ev.unit_number})\nMonthly Rent: ₹${ev.amount.toLocaleString('en-IN')}\nOutstanding Balance: ₹${ev.outstanding_balance.toLocaleString('en-IN')}`
  );
  const location = encodeURIComponent(ev.property_name);
  // 9:00 AM to 10:00 AM UTC/Local
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateFormatted}T090000Z/${dateFormatted}T100000Z&details=${details}&location=${location}`;
}

export const AddToPhoneCalendarModal: React.FC<AddToPhoneCalendarModalProps> = ({
  isOpen,
  onClose,
  event,
  allEvents = [],
  monthName = 'This Month',
  year = new Date().getFullYear(),
  landlordName = 'Landlord'
}) => {
  if (!isOpen) return null;

  const isBulkMode = !event && allEvents.length > 0;
  const targetEvents = event ? [event] : allEvents;

  const handleDownloadSingleICS = () => {
    if (!event) return;
    const ics = generateICSContent([event], landlordName, `Rent Due ${event.unit_number}`);
    triggerICSDownload(ics, `RentDue_${event.unit_number}_${event.dateStr}.ics`);
  };

  const handleDownloadAllICS = () => {
    if (allEvents.length === 0) {
      alert('No events scheduled for this month.');
      return;
    }
    const ics = generateICSContent(allEvents, landlordName, `RentEasy Schedule ${monthName} ${year}`);
    triggerICSDownload(ics, `RentEasy_${monthName}_${year}_Schedule.ics`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px', width: '92%', borderRadius: '16px', padding: '24px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}
            >
              <Smartphone size={22} color="var(--primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                Add to Phone Calendar
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Apple Calendar, Google Calendar & Android Alarm
              </p>
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Event Preview Card */}
        {event ? (
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                  {event.unit_number} ({event.tenant_name})
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <Building2 size={13} /> {event.property_name}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Rent Amount</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                  ₹{event.amount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
              <Clock size={14} color="var(--primary)" />
              <span>
                Due Date: <strong>{new Date(event.dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong> (9:00 AM)
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Tenant Contact:</span>
              <a
                href={`tel:${event.tenant_phone}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#10b981',
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(16, 185, 129, 0.25)'
                }}
                title={`Call ${event.tenant_name} (${event.tenant_phone})`}
              >
                <PhoneCall size={13} /> Call {event.tenant_phone}
              </a>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--bg-surface)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px'
            }}
          >
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
              All {allEvents.length} Due Dates for {monthName} {year}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0 }}>
              Export the full schedule to your phone so you get automatic reminders on each tenant's due date.
            </p>
          </div>
        )}

        {/* Action Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Option 1: Native Phone Calendar (Apple Calendar, Samsung, Outlook .ics) */}
          <button
            onClick={event ? handleDownloadSingleICS : handleDownloadAllICS}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
              <CalendarDays size={22} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  {event ? 'Add to Phone Calendar (.ics)' : `Sync All ${allEvents.length} Units to Phone`}
                </div>
                <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                  Works with iPhone (Apple Calendar), Android, Samsung & Outlook
                </div>
              </div>
            </div>
            <Download size={18} />
          </button>

          {/* Option 2: Google Calendar Direct Link (for single event) */}
          {event && (
            <a
              href={getGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: '12px',
                textDecoration: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                <div style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '18px' }}>📅</span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                    Open in Google Calendar
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    1-tap Google Calendar app alert with tenant details
                  </div>
                </div>
              </div>
              <ExternalLink size={16} color="var(--text-dim)" />
            </a>
          )}

          {/* Option 3: If on single event, also offer Full Month Sync */}
          {event && allEvents.length > 1 && (
            <button
              onClick={handleDownloadAllICS}
              className="btn btn-ghost"
              style={{
                width: '100%',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}
            >
              <Download size={14} />
              <span>Or sync all {allEvents.length} rent dates for {monthName}</span>
            </button>
          )}
        </div>

        {/* Helpful Footnote */}
        <div
          style={{
            marginTop: '18px',
            padding: '10px 12px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-dim)'
          }}
        >
          <Bell size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
          <span>Events include a <strong>15-minute prior alarm</strong> so you never miss a rent collection.</span>
        </div>
      </div>
    </div>
  );
};
