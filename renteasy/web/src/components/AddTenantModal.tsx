import React, { useState, useEffect } from 'react';
import { Property, Tenant } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import {
  UserPlus,
  Edit3,
  X,
  Phone,
  Home,
  Calendar,
  CreditCard,
  IndianRupee,
  ShieldCheck,
  Check,
  MapPin,
  FileText,
  Building2,
  Mail,
  ShieldAlert
} from 'lucide-react';

interface AddTenantModalProps {
  properties: Property[];
  initialPropertyId?: string;
  initialUnitNumber?: string;
  tenantToEdit?: Tenant | null;
  onClose: () => void;
  onSuccess: (tenant: Tenant) => void;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({
  properties,
  initialPropertyId,
  initialUnitNumber,
  tenantToEdit,
  onClose,
  onSuccess
}) => {
  const isEditing = !!tenantToEdit;

  const [name, setName] = useState(tenantToEdit ? tenantToEdit.name : '');
  const [phone, setPhone] = useState(tenantToEdit ? tenantToEdit.phone : '+91 ');
  const [email, setEmail] = useState(tenantToEdit ? (tenantToEdit.email || '') : '');
  const [emergencyContact, setEmergencyContact] = useState(tenantToEdit ? (tenantToEdit.emergency_contact || '') : '');
  const [status, setStatus] = useState<'active' | 'notice' | 'past'>(tenantToEdit ? tenantToEdit.status : 'active');
  const [propertyId, setPropertyId] = useState<string>(() => {
    if (tenantToEdit) {
      if (tenantToEdit.property_id) return tenantToEdit.property_id;
      const matched = properties.find(p => p.name === tenantToEdit.linked_property_name);
      if (matched) return matched.id;
    }
    return initialPropertyId || '';
  });
  const [houseNumber, setHouseNumber] = useState(tenantToEdit ? tenantToEdit.house_number : (initialUnitNumber || ''));
  const [date, setDate] = useState(tenantToEdit ? tenantToEdit.date : new Date().toISOString().split('T')[0]);
  const [dueDay, setDueDay] = useState(tenantToEdit ? String(tenantToEdit.due_day || 5) : '5');
  const [monthlyRent, setMonthlyRent] = useState(tenantToEdit ? String(tenantToEdit.monthly_rent) : '');
  const [depositAmount, setDepositAmount] = useState(tenantToEdit ? String(tenantToEdit.deposit_amount) : '');
  const [depositPaid, setDepositPaid] = useState(tenantToEdit ? tenantToEdit.deposit_paid : true);
  const [aadhaarNumber, setAadhaarNumber] = useState(tenantToEdit ? (tenantToEdit.aadhaar_number || '') : '');
  const [permanentAddress, setPermanentAddress] = useState(tenantToEdit ? (tenantToEdit.permanent_address || '') : '');
  const [initialBalance, setInitialBalance] = useState(tenantToEdit ? String(tenantToEdit.initial_balance || 0) : '0');

  const [whatsappEnabled, setWhatsappEnabled] = useState(tenantToEdit ? (tenantToEdit.whatsapp_enabled ?? true) : true);
  const [smsEnabled, setSmsEnabled] = useState(tenantToEdit ? (tenantToEdit.sms_enabled ?? true) : true);

  // Available units for the selected property
  const selectedProperty = properties.find(p => p.id === propertyId);
  const availableUnits = selectedProperty && selectedProperty.units ? selectedProperty.units : [];

  useEffect(() => {
    if (tenantToEdit) {
      setName(tenantToEdit.name);
      setPhone(tenantToEdit.phone);
      setEmail(tenantToEdit.email || '');
      setEmergencyContact(tenantToEdit.emergency_contact || '');
      setStatus(tenantToEdit.status || 'active');
      setHouseNumber(tenantToEdit.house_number);
      setDate(tenantToEdit.date);
      setDueDay(String(tenantToEdit.due_day || 5));
      setMonthlyRent(String(tenantToEdit.monthly_rent));
      setDepositAmount(String(tenantToEdit.deposit_amount));
      setDepositPaid(tenantToEdit.deposit_paid);
      setAadhaarNumber(tenantToEdit.aadhaar_number || '');
      setPermanentAddress(tenantToEdit.permanent_address || '');
      setInitialBalance(String(tenantToEdit.initial_balance || 0));
      setWhatsappEnabled(tenantToEdit.whatsapp_enabled ?? true);
      setSmsEnabled(tenantToEdit.sms_enabled ?? true);

      if (tenantToEdit.property_id) {
        setPropertyId(tenantToEdit.property_id);
      } else if (tenantToEdit.linked_property_name) {
        const matched = properties.find(p => p.name === tenantToEdit.linked_property_name);
        if (matched) setPropertyId(matched.id);
      }
    } else if (initialPropertyId) {
      handlePropertyChange(initialPropertyId);
    }
  }, [tenantToEdit, initialPropertyId]);

  // When property is picked
  const handlePropertyChange = (propId: string) => {
    setPropertyId(propId);
    const prop = properties.find(p => p.id === propId);
    if (prop) {
      if (prop.default_rent && !monthlyRent && !isEditing) {
        setMonthlyRent(String(prop.default_rent));
        setDepositAmount(String(prop.default_rent * 3));
      }
      // If units exist, default to first vacant unit
      if (prop.units && prop.units.length > 0 && !isEditing) {
        const firstVacant = prop.units.find(u => u.status === 'vacant') || prop.units[0];
        if (firstVacant && !initialUnitNumber) {
          setHouseNumber(firstVacant.unit_number);
          if (firstVacant.default_rent) {
            setMonthlyRent(String(firstVacant.default_rent));
            setDepositAmount(String(firstVacant.default_rent * 3));
          }
        }
      }
    }
  };

  // When a unit is picked from dropdown
  const handleUnitSelect = (unitNo: string) => {
    setHouseNumber(unitNo);
    const unit = availableUnits.find(u => u.unit_number === unitNo);
    if (unit && unit.default_rent && !isEditing) {
      setMonthlyRent(String(unit.default_rent));
      setDepositAmount(String(unit.default_rent * 3));
    }
  };

  const handleAadhaarChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 12);
    const formatted = digitsOnly.replace(/(\d{4})(?=\d)/g, '$1 ');
    setAadhaarNumber(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !houseNumber.trim()) {
      alert('Please fill in Tenant Name, Mobile No, and House/Unit Number.');
      return;
    }

    if (isEditing && tenantToEdit) {
      const updated = rentEasyApi.updateTenant(tenantToEdit.id, {
        name: name.trim(),
        phone: phone.trim(),
        whatsapp_number: phone.trim(),
        email: email.trim() || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
        house_number: houseNumber.trim(),
        date,
        monthly_rent: parseFloat(monthlyRent) || 0,
        due_day: parseInt(dueDay) || 5,
        deposit_amount: parseFloat(depositAmount) || 0,
        deposit_paid: depositPaid,
        aadhaar_number: aadhaarNumber.trim() || undefined,
        permanent_address: permanentAddress.trim() || undefined,
        property_id: propertyId || undefined,
        whatsapp_enabled: whatsappEnabled,
        sms_enabled: smsEnabled,
        status
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'local', key: 'tenants' } }));
      }
      onSuccess(updated);
    } else {
      const tenant = rentEasyApi.addTenant({
        name: name.trim(),
        phone: phone.trim(),
        whatsapp_number: phone.trim(),
        email: email.trim() || undefined,
        emergency_contact: emergencyContact.trim() || undefined,
        house_number: houseNumber.trim(),
        date,
        monthly_rent: parseFloat(monthlyRent) || 0,
        due_day: parseInt(dueDay) || 5,
        deposit_amount: parseFloat(depositAmount) || 0,
        deposit_paid: depositPaid,
        aadhaar_number: aadhaarNumber.trim() || undefined,
        permanent_address: permanentAddress.trim() || undefined,
        initial_balance: parseFloat(initialBalance) || 0,
        property_id: propertyId || undefined,
        whatsapp_enabled: whatsappEnabled,
        sms_enabled: smsEnabled
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'local', key: 'tenants' } }));
      }
      onSuccess(tenant);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '660px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isEditing ? <Edit3 size={18} color="var(--primary)" /> : <UserPlus size={18} color="var(--primary)" />}
            </div>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>
                {isEditing ? 'Edit Tenant Details & Rent' : 'Register Tenant & Assign House'}
              </h3>
              <p className="card-subtitle">
                {isEditing
                  ? 'Update contact info, monthly rent, house assignment, due date, and KYC'
                  : 'Auto-updates monthly rent on the given date and tracks house balance'}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {/* 1. Name & Mobile */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Tenant Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 98450 12345"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email & Emergency Contact */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mail size={14} color="var(--primary)" /> Email Address
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. tenant@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldAlert size={14} color="#f59e0b" /> Emergency Contact
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Father: Ramesh (+91 98450 11111)"
                  value={emergencyContact}
                  onChange={e => setEmergencyContact(e.target.value)}
                />
              </div>
            </div>

            {/* Tenancy Status if editing */}
            {isEditing && (
              <div className="form-group">
                <label className="form-label">Tenancy Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={e => setStatus(e.target.value as 'active' | 'notice' | 'past')}
                >
                  <option value="active">Active (Currently Living in Unit)</option>
                  <option value="notice">On Notice Period (Vacating Soon)</option>
                  <option value="past">Past Tenant (Moved Out / Closed)</option>
                </select>
              </div>
            )}

            {/* 2. Building & Unit Selection */}
            <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={15} /> Property & Unit Assignment
              </div>

              <div className="form-group">
                <label className="form-label">Select Property / Building</label>
                <select
                  className="form-select"
                  value={propertyId}
                  onChange={e => handlePropertyChange(e.target.value)}
                >
                  <option value="">-- Independent House / Unassigned Property --</option>
                  {properties.map(p => {
                    const totalU = p.units ? p.units.length : p.total_units || 1;
                    const vacantU = p.units ? p.units.filter(u => u.status === 'vacant').length : 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({totalU} units, {vacantU} vacant) — {p.city}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Available units in property dropdown */}
                {availableUnits.length > 0 ? (
                  <div className="form-group">
                    <label className="form-label">Choose Auto-Created Unit</label>
                    <select
                      className="form-select"
                      value={houseNumber}
                      onChange={e => handleUnitSelect(e.target.value)}
                    >
                      <option value="">-- Choose Unit --</option>
                      {availableUnits.map(u => (
                        <option key={u.id} value={u.unit_number}>
                          {u.unit_number} ({u.status.toUpperCase()} — ₹{u.default_rent.toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="form-group" style={{ gridColumn: availableUnits.length > 0 ? 'auto' : '1 / -1' }}>
                  <label className="form-label">House / Unit Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Flat 101 or House #12"
                    value={houseNumber}
                    onChange={e => setHouseNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 3. Move-in Date & Auto-Update Due Day */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={14} color="var(--primary)" /> Move-in / Agreement Date *
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Auto-Update Date of Month *</label>
                <select
                  className="form-select"
                  value={dueDay}
                  onChange={e => setDueDay(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 7, 10, 15, 20, 25, 28].map(d => (
                    <option key={d} value={d}>
                      {d}th of every month
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  Rent auto-charges on this date each month.
                </span>
              </div>
            </div>

            {/* 4. Monthly Rent & Security Deposit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Monthly Rent (₹) *</label>
                <input
                  type="number"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.05rem' }}
                  placeholder="22000"
                  value={monthlyRent}
                  onChange={e => setMonthlyRent(e.target.value)}
                  required
                />
                {isEditing && (
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '4px', display: 'block' }}>
                    💡 Updating rent will immediately reflect in Tenant Details, recalculate house balances, and synchronize the property unit.
                  </span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} color="#10b981" /> Security Deposit (₹) *
                </label>
                <input
                  type="number"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  placeholder="75000"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  required
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', marginTop: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={depositPaid}
                    onChange={e => setDepositPaid(e.target.checked)}
                    style={{ accentColor: 'var(--emerald)' }}
                  />
                  Security Deposit Received & Held
                </label>
              </div>
            </div>

            {/* 5. Aadhaar Number & Initial Balance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={14} color="var(--sky)" /> Aadhaar Number (12 Digits)
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
                  placeholder="XXXX XXXX XXXX"
                  value={aadhaarNumber}
                  onChange={e => handleAadhaarChange(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {isEditing ? 'Starting Balance (₹)' : 'Existing Balance (₹, if any)'}
                </label>
                <input
                  type="number"
                  className="form-input"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  placeholder="0"
                  value={initialBalance}
                  onChange={e => setInitialBalance(e.target.value)}
                />
                {isEditing && tenantToEdit && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                    Current Live Total Balance: <strong style={{ color: tenantToEdit.balance_amount > 0 ? '#fbbf24' : '#34d399' }}>₹{tenantToEdit.balance_amount.toLocaleString('en-IN')}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} color="var(--text-dim)" /> Permanent / Native Address
              </label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="e.g. House No. 24, Near Bus Stand, Mysuru, Karnataka"
                value={permanentAddress}
                onChange={e => setPermanentAddress(e.target.value)}
              />
            </div>

            {/* Messaging consent */}
            <div style={{ display: 'flex', gap: '20px', paddingTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={e => setWhatsappEnabled(e.target.checked)}
                  style={{ accentColor: '#25D366' }}
                />
                Send WhatsApp Reminders & Receipts
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={e => setSmsEnabled(e.target.checked)}
                  style={{ accentColor: 'var(--sky)' }}
                />
                Send SMS Messages
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} /> {isEditing ? 'Save Changes & Update Rent' : 'Register Tenant & Activate Auto-Billing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
