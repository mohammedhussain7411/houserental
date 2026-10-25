import React, { useState } from 'react';
import { rentEasyApi } from '../services/rentEasyApi';
import { RentCalendarEvent, RentCharge, Property } from '../types';
import {
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  MessageSquare,
  Share2,
  Download,
  Building2,
  User,
  Phone,
  Home,
  IndianRupee,
  Filter,
  CalendarDays,
  ListOrdered,
  ExternalLink,
  Smartphone,
  PhoneCall,
  X
} from 'lucide-react';
import { RescheduleDueDateModal } from '../components/RescheduleDueDateModal';
import { AddToPhoneCalendarModal } from '../components/AddToPhoneCalendarModal';

interface RentCalendarPageProps {
  onOpenRecordPayment: (charge?: RentCharge) => void;
}

// Generate .ics file for Google Calendar / Apple Calendar / Outlook
function generateICS(events: RentCalendarEvent[], landlordName: string, companyName: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RentEasy//Landlord Rent Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:RentEasy Rent Collection Schedule',
    'X-WR-TIMEZONE:Asia/Kolkata'
  ];

  events.forEach(ev => {
    const dateFormatted = ev.dateStr.replace(/-/g, '');
    const uid = `${ev.id}@renteasy.app`;
    const summary = `Rent Collection: ${ev.unit_number} (${ev.tenant_name}) - Rs. ${ev.amount.toLocaleString('en-IN')}`;
    const description = `Collect monthly rent for unit ${ev.unit_number} at ${ev.property_name}.\\nTenant: ${ev.tenant_name} (${ev.tenant_phone})\\nRent Amount: Rs. ${ev.amount}\\nStatus: ${ev.status.toUpperCase()}\\nPending Balance: Rs. ${ev.outstanding_balance}`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dateFormatted}T000000Z`);
    lines.push(`DTSTART;VALUE=DATE:${dateFormatted}`);
    lines.push(`DTEND;VALUE=DATE:${dateFormatted}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`LOCATION:${ev.property_name}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT15H');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: Collect rent from ${ev.tenant_name} (${ev.unit_number})`);
    lines.push('END:VALARM');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadICSFile(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getGoogleCalendarUrl(ev: RentCalendarEvent): string {
  const dateFormatted = ev.dateStr.replace(/-/g, '');
  const title = encodeURIComponent(`Rent Due: ${ev.unit_number} (${ev.tenant_name}) - ₹${ev.amount.toLocaleString('en-IN')}`);
  const details = encodeURIComponent(
    `Collect monthly rent from ${ev.tenant_name} (${ev.tenant_phone}) for ${ev.unit_number} at ${ev.property_name}.\nAmount: ₹${ev.amount}\nStatus: ${ev.status.toUpperCase()}\nPending Balance: ₹${ev.outstanding_balance}`
  );
  const location = encodeURIComponent(ev.property_name);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateFormatted}/${dateFormatted}&details=${details}&location=${location}`;
}

export const RentCalendarPage: React.FC<RentCalendarPageProps> = ({ onOpenRecordPayment }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reschedulingEvent, setReschedulingEvent] = useState<RentCalendarEvent | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [phoneCalendarEvent, setPhoneCalendarEvent] = useState<RentCalendarEvent | null>(null);
  const [isSyncAllPhoneModalOpen, setIsSyncAllPhoneModalOpen] = useState<boolean>(false);

  const landlord = rentEasyApi.getLandlord();
  const properties = rentEasyApi.getProperties();
  const allEvents = React.useMemo(() => {
    return rentEasyApi.getCalendarCollectionEvents(currentYear, currentMonth);
  }, [currentYear, currentMonth, refreshKey]);

  // Filter events
  const filteredEvents = allEvents.filter(ev => {
    const matchesProperty = propertyFilter === 'all' || ev.property_name === propertyFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && (ev.status === 'pending' || ev.status === 'partially_paid')) ||
      (statusFilter === 'paid' && ev.status === 'paid') ||
      (statusFilter === 'overdue' && ev.status === 'overdue');
    return matchesProperty && matchesStatus;
  });

  // Financial summary for this month
  const totalScheduled = filteredEvents.reduce((acc, ev) => acc + ev.amount, 0);
  const totalCollected = filteredEvents.reduce((acc, ev) => acc + ev.amount_paid, 0);
  const totalPending = filteredEvents.reduce((acc, ev) => acc + ev.outstanding_balance, 0);
  const overdueCount = filteredEvents.filter(ev => ev.status === 'overdue').length;

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setSelectedDateStr(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    );
  };

  const handleExportICS = () => {
    if (filteredEvents.length === 0) {
      alert('No rent collection events found for this month.');
      return;
    }
    const icsData = generateICS(filteredEvents, landlord.name, landlord.company_name);
    downloadICSFile(icsData, `RentEasy_Rent_Schedule_${currentYear}_${String(currentMonth).padStart(2, '0')}.ics`);
  };

  // WhatsApp reminder message trigger
  const handleSendWhatsAppReminder = (ev: RentCalendarEvent) => {
    const message = encodeURIComponent(
      `Hello ${ev.tenant_name}, this is a gentle reminder from ${landlord.name} regarding your monthly rent of ₹${ev.amount.toLocaleString(
        'en-IN'
      )} for ${ev.unit_number} (${ev.property_name}) scheduled for collection on ${ev.due_date}. Kindly transfer to UPI: ${landlord.upi_id}. Thank you!`
    );
    const cleanPhone = (ev.whatsapp_number || ev.tenant_phone).replace(/\D/g, '');
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`, '_blank');
  };

  // Build Calendar Matrix for Grid View
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sunday

  // Events grouped by date string (YYYY-MM-DD)
  const eventsByDate = filteredEvents.reduce((acc, ev) => {
    if (!acc[ev.dateStr]) acc[ev.dateStr] = [];
    acc[ev.dateStr].push(ev);
    return acc;
  }, {} as Record<string, RentCalendarEvent[]>);

  // Selected Day's events
  const selectedDayEvents = selectedDateStr ? eventsByDate[selectedDateStr] || [] : [];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="page-wrapper">
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: 0 }}>
              Rent Collection Calendar
            </h1>
            <span className="badge badge-paid" style={{ fontSize: '0.72rem' }}>
              <CalendarDays size={13} /> Unit Due Dates
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            See exactly which unit and tenant rent is due for collection on every day of the month
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button
              className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              onClick={() => setViewMode('grid')}
            >
              <CalendarIcon size={14} /> Month Grid
            </button>
            <button
              className={`btn btn-sm ${viewMode === 'agenda' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              onClick={() => setViewMode('agenda')}
            >
              <ListOrdered size={14} /> Collection Agenda
            </button>
          </div>

          {/* Add to phone calendar / sync */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsSyncAllPhoneModalOpen(true)}
            title="Add and sync rent collection due dates to your phone calendar"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Smartphone size={14} color="#6366f1" />
            <span>Add to Phone Calendar</span>
          </button>
        </div>
      </div>

      {/* Financial Metrics Strip for Current Calendar Month */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        <div className="metric-card" style={{ '--metric-accent': 'var(--primary)' } as any}>
          <div className="metric-header">
            <span className="metric-label">Scheduled This Month</span>
            <div className="metric-icon-box">
              <CalendarIcon size={18} />
            </div>
          </div>
          <div className="metric-value">
            ₹{totalScheduled.toLocaleString('en-IN')}
          </div>
          <div className="metric-meta">
            <span>{filteredEvents.length} units with rent due dates</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-accent': 'var(--emerald)' } as any}>
          <div className="metric-header">
            <span className="metric-label">Collected On Time</span>
            <div className="metric-icon-box" style={{ background: 'var(--emerald-surface)', color: 'var(--emerald)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#34d399' }}>
            ₹{totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="metric-meta">
            <span>{totalScheduled > 0 ? Math.round((totalCollected / totalScheduled) * 100) : 0}% collected</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-accent': 'var(--amber)' } as any}>
          <div className="metric-header">
            <span className="metric-label">Pending Collection</span>
            <div className="metric-icon-box" style={{ background: 'var(--amber-surface)', color: 'var(--amber)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: totalPending > 0 ? '#fbbf24' : '#34d399' }}>
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <div className="metric-meta">
            <span>{filteredEvents.filter(e => e.outstanding_balance > 0).length} units awaiting collection</span>
          </div>
        </div>

        <div className="metric-card" style={{ '--metric-accent': 'var(--rose)' } as any}>
          <div className="metric-header">
            <span className="metric-label">Overdue Units</span>
            <div className="metric-icon-box" style={{ background: 'var(--rose-surface)', color: 'var(--rose)' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ color: overdueCount > 0 ? '#fb7185' : 'var(--text-dim)' }}>
            {overdueCount} Units
          </div>
          <div className="metric-meta">
            <span>{overdueCount > 0 ? 'Follow-up reminder needed' : 'All due dates honored'}</span>
          </div>
        </div>
      </div>

      {/* Month Navigation & Filter Toolbar */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        {/* Month Selector Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button className="btn btn-ghost btn-sm" onClick={handlePrevMonth} title="Previous Month">
              <ChevronLeft size={18} />
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, minWidth: '180px', textAlign: 'center' }}>
              {monthNames[currentMonth - 1]} {currentYear}
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={handleNextMonth} title="Next Month">
              <ChevronRight size={18} />
            </button>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={handleJumpToToday}>
            Today
          </button>
        </div>

        {/* Property & Status Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={15} color="var(--text-dim)" />
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.825rem', width: 'auto' }}
              value={propertyFilter}
              onChange={e => setPropertyFilter(e.target.value)}
            >
              <option value="all">All Properties & Buildings</option>
              {properties.map(p => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="var(--text-dim)" />
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.825rem', width: 'auto' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending / Due</option>
              <option value="paid">Collected / Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Calendar Section */}
      {viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: selectedDateStr ? '1fr 380px' : '1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left: 7-Column Interactive Monthly Calendar Grid */}
          <div className="card" style={{ padding: '20px' }}>
            {/* Day of Week Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '10px', textAlign: 'center' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                <div
                  key={day}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: idx === 0 || idx === 6 ? 'var(--text-dim)' : 'var(--text-muted)',
                    padding: '8px 0'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Matrix */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {/* Empty leading cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  style={{
                    minHeight: '110px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px dashed rgba(255, 255, 255, 0.04)'
                  }}
                />
              ))}

              {/* Day Cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayEvents = eventsByDate[dateStr] || [];
                const isToday =
                  today.getFullYear() === currentYear &&
                  today.getMonth() + 1 === currentMonth &&
                  today.getDate() === dayNum;
                const isSelected = selectedDateStr === dateStr;

                const dayTotal = dayEvents.reduce((acc, ev) => acc + ev.amount, 0);
                const hasOverdue = dayEvents.some(ev => ev.status === 'overdue');
                const hasPending = dayEvents.some(ev => ev.status === 'pending' || ev.status === 'partially_paid');
                const allPaid = dayEvents.length > 0 && dayEvents.every(ev => ev.status === 'paid');

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDateStr(dateStr)}
                    style={{
                      minHeight: '110px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected
                        ? 'rgba(99, 102, 241, 0.12)'
                        : dayEvents.length > 0
                        ? 'var(--bg-surface)'
                        : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected
                        ? '2px solid var(--primary)'
                        : isToday
                        ? '2px solid rgba(16, 185, 129, 0.5)'
                        : '1px solid var(--border-subtle)',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Top Row: Date Number & Total Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontWeight: isToday || isSelected ? 800 : 600,
                          fontSize: '0.875rem',
                          color: isToday ? '#34d399' : isSelected ? '#fff' : 'var(--text-main)',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isToday ? 'rgba(16, 185, 129, 0.2)' : 'transparent'
                        }}
                      >
                        {dayNum}
                      </span>

                      {dayEvents.length > 0 && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color: allPaid ? '#34d399' : hasOverdue ? '#fb7185' : '#fbbf24',
                            background: allPaid
                              ? 'rgba(16, 185, 129, 0.15)'
                              : hasOverdue
                              ? 'rgba(244, 63, 94, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                            padding: '2px 5px',
                            borderRadius: '4px'
                          }}
                        >
                          ₹{(dayTotal / 1000).toFixed(0)}k
                        </span>
                      )}
                    </div>

                    {/* Unit Rent Badges on this day */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '6px', flex: 1 }}>
                      {dayEvents.slice(0, 3).map(ev => {
                        const isEvPaid = ev.status === 'paid';
                        const isEvOverdue = ev.status === 'overdue';

                        return (
                          <div
                            key={ev.id}
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isEvPaid
                                ? 'rgba(16, 185, 129, 0.2)'
                                : isEvOverdue
                                ? 'rgba(244, 63, 94, 0.25)'
                                : 'rgba(99, 102, 241, 0.2)',
                              color: isEvPaid ? '#34d399' : isEvOverdue ? '#fb7185' : '#e0e7ff',
                              borderLeft: `3px solid ${isEvPaid ? '#10b981' : isEvOverdue ? '#f43f5e' : '#6366f1'}`,
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              fontWeight: 600
                            }}
                            title={`${ev.unit_number}: ${ev.tenant_name} (₹${ev.amount.toLocaleString('en-IN')})`}
                          >
                            <strong>{ev.unit_number}</strong>: ₹{(ev.amount / 1000).toFixed(0)}k
                          </div>
                        );
                      })}

                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '2px' }}>
                          +{dayEvents.length - 3} more units
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Date Detail Inspector */}
          {selectedDateStr && (
            <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Collection Details
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '2px 0 0 0' }}>
                    {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </h3>
                </div>

                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedDateStr(null)}>
                  <X size={16} />
                </button>
              </div>

              {/* Day Summary Pill */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Units Scheduled</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{selectedDayEvents.length} Units</div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Day Total Due</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    ₹{selectedDayEvents.reduce((acc, ev) => acc + ev.amount, 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Unit Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto' }}>
                {selectedDayEvents.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-dim)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                    <CalendarIcon size={28} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                    <div style={{ fontSize: '0.875rem' }}>No rent scheduled for collection on this day.</div>
                  </div>
                ) : (
                  selectedDayEvents.map(ev => {
                    const isPaid = ev.status === 'paid';
                    const isOverdue = ev.status === 'overdue';

                    return (
                      <div
                        key={ev.id}
                        style={{
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-md)',
                          border: isPaid
                            ? '1px solid rgba(16, 185, 129, 0.3)'
                            : isOverdue
                            ? '1px solid rgba(244, 63, 94, 0.35)'
                            : '1px solid var(--border-subtle)',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        {/* Top: Unit & Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Home size={15} color="var(--primary)" />
                              <strong style={{ fontSize: '1rem', color: '#fff' }}>{ev.unit_number}</strong>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                              {ev.property_name}
                            </div>
                          </div>

                          <span className={`badge ${isPaid ? 'badge-paid' : isOverdue ? 'badge-overdue' : 'badge-pending'}`} style={{ fontSize: '0.68rem' }}>
                            {ev.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Tenant Info & Contact */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <User size={13} color="var(--text-dim)" /> {ev.tenant_name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <Phone size={11} /> {ev.tenant_phone}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Rent Amount</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                              ₹{ev.amount.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>

                        {/* Balance Note */}
                        {ev.outstanding_balance > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Pending to Collect:</span>
                            <strong style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                              ₹{ev.outstanding_balance.toLocaleString('en-IN')}
                            </strong>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '6px', paddingTop: '4px', flexWrap: 'wrap' }}>
                          {isPaid ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '0.8rem', fontWeight: 600 }}>
                              <CheckCircle2 size={16} /> Fully Settled for this Month
                            </div>
                          ) : (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ flex: 1, minWidth: '95px', fontSize: '0.75rem', padding: '6px 10px' }}
                                onClick={() => onOpenRecordPayment(ev.charge)}
                              >
                                <CreditCard size={13} /> Collect Rent
                              </button>

                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', padding: '6px 10px', color: '#fbbf24' }}
                                onClick={() => setReschedulingEvent(ev)}
                                title="Tenant missed due date? Set a new collection date"
                              >
                                <CalendarClock size={13} /> Reschedule
                              </button>
                            </>
                          )}

                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '6px 10px', color: '#25D366' }}
                            onClick={() => handleSendWhatsAppReminder(ev)}
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </button>

                          <a
                            href={`tel:${ev.tenant_phone}`}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '6px 10px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                            title={`Call ${ev.tenant_name} (${ev.tenant_phone})`}
                          >
                            <PhoneCall size={13} /> Call
                          </a>

                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '6px 10px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => setPhoneCalendarEvent(ev)}
                            title="Add this rent collection event to your phone calendar"
                          >
                            <Smartphone size={13} /> Phone Calendar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Agenda / Timeline List View */
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 className="card-title">Chronological Rent Collection Agenda</h3>
              <p className="card-subtitle">Every rent collection event sorted day-by-day for {monthNames[currentMonth - 1]} {currentYear}</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleExportICS}>
              <Download size={14} /> Export All to Calendar (.ics)
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Object.keys(eventsByDate)
              .sort()
              .map(dateKey => {
                const dayEvs = eventsByDate[dateKey];
                const dateObj = new Date(dateKey + 'T00:00:00');
                const isDateToday =
                  today.getFullYear() === dateObj.getFullYear() &&
                  today.getMonth() === dateObj.getMonth() &&
                  today.getDate() === dateObj.getDate();

                return (
                  <div
                    key={dateKey}
                    style={{
                      borderLeft: isDateToday ? '3px solid var(--emerald)' : '3px solid var(--primary)',
                      paddingLeft: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Day Group Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                        {dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </div>
                      {isDateToday && <span className="badge badge-paid" style={{ fontSize: '0.68rem' }}>TODAY</span>}
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        • {dayEvs.length} Units (Total: ₹{dayEvs.reduce((a, b) => a + b.amount, 0).toLocaleString('en-IN')})
                      </span>
                    </div>

                    {/* Unit Cards on this day */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                      {dayEvs.map(ev => {
                        const isPaid = ev.status === 'paid';
                        const isOverdue = ev.status === 'overdue';

                        return (
                          <div
                            key={ev.id}
                            style={{
                              background: 'var(--bg-surface)',
                              border: isPaid
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : isOverdue
                                ? '1px solid rgba(244, 63, 94, 0.35)'
                                : '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-md)',
                              padding: '14px 16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                                  {ev.unit_number}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{ev.property_name}</div>
                              </div>
                              <span className={`badge ${isPaid ? 'badge-paid' : isOverdue ? 'badge-overdue' : 'badge-pending'}`}>
                                {ev.status.toUpperCase()}
                              </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{ev.tenant_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{ev.tenant_phone}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Rent Due</div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                                  ₹{ev.amount.toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', flexWrap: 'wrap' }}>
                              {!isPaid && (
                                <>
                                  <button
                                    className="btn btn-primary btn-sm"
                                    style={{ flex: 1, minWidth: '95px', fontSize: '0.75rem' }}
                                    onClick={() => onOpenRecordPayment(ev.charge)}
                                  >
                                    <CreditCard size={13} /> Collect Now
                                  </button>

                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.75rem', color: '#fbbf24' }}
                                    onClick={() => setReschedulingEvent(ev)}
                                    title="Tenant missed due date? Set a new collection date"
                                  >
                                    <CalendarClock size={13} /> Reschedule
                                  </button>
                                </>
                              )}
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', color: '#25D366' }}
                                onClick={() => handleSendWhatsAppReminder(ev)}
                              >
                                <MessageSquare size={13} /> WhatsApp
                              </button>
                              <a
                                href={`tel:${ev.tenant_phone}`}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                title={`Call ${ev.tenant_name} (${ev.tenant_phone})`}
                              >
                                <PhoneCall size={13} /> Call
                              </a>
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.75rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => setPhoneCalendarEvent(ev)}
                                title="Add this rent collection event to your phone calendar"
                              >
                                <Smartphone size={13} /> Phone Calendar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Reschedule Missed Due Date Modal */}
      {reschedulingEvent && (
        <RescheduleDueDateModal
          event={reschedulingEvent}
          onClose={() => setReschedulingEvent(null)}
          onSuccess={result => {
            setReschedulingEvent(null);
            setRefreshKey(prev => prev + 1);
            setSelectedDateStr(result.newDueDate);
          }}
        />
      )}

      {/* Add To Phone Calendar Modal */}
      <AddToPhoneCalendarModal
        isOpen={phoneCalendarEvent !== null || isSyncAllPhoneModalOpen}
        onClose={() => {
          setPhoneCalendarEvent(null);
          setIsSyncAllPhoneModalOpen(false);
        }}
        event={phoneCalendarEvent}
        allEvents={filteredEvents}
        monthName={monthNames[currentMonth - 1]}
        year={currentYear}
        landlordName={landlord.name}
        companyName={landlord.company_name}
      />
    </div>
  );
};
