import React, { useState, useEffect, useMemo } from 'react';
import { Tenant, Property, PropertyOwner, HouseType, PaintingOption, RentalAgreement } from '../types';
import { rentEasyApi, numberToIndianWords } from '../services/rentEasyApi';
import {
  FileText,
  Printer,
  Copy,
  Check,
  Share2,
  X,
  User,
  Home,
  Paintbrush,
  Calendar,
  IndianRupee,
  ShieldCheck,
  Save,
  RotateCcw,
  Pencil,
  Eye,
  Plus,
  Building,
  Phone,
  FileCheck,
  AlertCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface RentalAgreementModalProps {
  tenant: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
  properties?: Property[];
  onAgreementSaved?: (agreement: RentalAgreement) => void;
}

export const RentalAgreementModal: React.FC<RentalAgreementModalProps> = ({
  tenant,
  isOpen,
  onClose,
  properties = [],
  onAgreementSaved
}) => {
  if (!isOpen || !tenant) return null;

  const [owners, setOwners] = useState<PropertyOwner[]>(rentEasyApi.getOwners());
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(() => {
    const list = rentEasyApi.getOwners();
    const def = list.find(o => o.is_default);
    return def ? def.id : (list[0]?.id || 'owner-default-1');
  });

  // Owner management state
  const [isAddingNewOwner, setIsAddingNewOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newOwnerIdNumber, setNewOwnerIdNumber] = useState('');

  // Agreement configurations
  const [houseType, setHouseType] = useState<HouseType>(() => {
    const existing = rentEasyApi.getRentalAgreementByTenantId(tenant.id);
    if (existing?.house_type) return existing.house_type;
    // Guess from linked property unit or default
    return '1BHK';
  });

  const [paintingOption, setPaintingOption] = useState<PaintingOption>(() => {
    const existing = rentEasyApi.getRentalAgreementByTenantId(tenant.id);
    return existing?.painting_option || 'with_painting';
  });

  const [paintingAmount, setPaintingAmount] = useState<number>(() => {
    const existing = rentEasyApi.getRentalAgreementByTenantId(tenant.id);
    if (existing?.painting_amount !== undefined) return existing.painting_amount;
    return Math.min(Math.max(5000, tenant.monthly_rent || 5000), 10000);
  });

  const [startDate, setStartDate] = useState<string>(() => {
    const existing = rentEasyApi.getRentalAgreementByTenantId(tenant.id);
    return existing?.start_date || tenant.date || new Date().toISOString().split('T')[0];
  });

  const [durationMonths, setDurationMonths] = useState<number>(() => {
    const existing = rentEasyApi.getRentalAgreementByTenantId(tenant.id);
    return existing?.duration_months || 11;
  });

  const [noticePeriodMonths, setNoticePeriodMonths] = useState<number>(() => {
    const existing = rentEasyApi.getRentalAgreementByTenantId(tenant.id);
    return existing?.notice_period_months || 1;
  });

  const [monthlyRent, setMonthlyRent] = useState<number>(() => {
    const existing = rentEasyApi.getRentalAgreementByTenantId(tenant.id);
    return existing?.monthly_rent || tenant.monthly_rent || 0;
  });

  const [depositAmount, setDepositAmount] = useState<number>(() => {
    const existing = rentEasyApi.getRentalAgreementByTenantId(tenant.id);
    return existing?.deposit_amount || tenant.deposit_amount || 0;
  });

  const [dueDay, setDueDay] = useState<number>(() => {
    const existing = rentEasyApi.getRentalAgreementByTenantId(tenant.id);
    return existing?.due_day || tenant.due_day || 5;
  });

  const [stampPaperSpace, setStampPaperSpace] = useState<boolean>(false);

  // Active view mode: 'preview' or 'edit'
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');

  // Custom agreement text
  const [agreementText, setAgreementText] = useState<string>('');
  const [isCustomEdited, setIsCustomEdited] = useState<boolean>(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedOwner = useMemo(() => {
    return owners.find(o => o.id === selectedOwnerId) || owners[0] || {
      id: 'owner-default-1',
      name: 'Mohammed Hussain',
      phone: '+91 98450 12345',
      address: 'Bengaluru, Karnataka',
      is_default: true
    };
  }, [owners, selectedOwnerId]);

  const propertyAddress = useMemo(() => {
    if (tenant.property_id) {
      const p = properties.find(prop => prop.id === tenant.property_id);
      if (p) return `${p.address}, ${p.city} - ${p.pincode}`;
    }
    if (tenant.linked_property_name) {
      const p = properties.find(prop => prop.name.trim().toLowerCase() === tenant.linked_property_name?.trim().toLowerCase());
      if (p) return `${p.address}, ${p.city} - ${p.pincode}`;
    }
    return 'Bengaluru, Karnataka, India';
  }, [tenant, properties]);

  // Load existing saved agreement or generate fresh
  useEffect(() => {
    const existing = rentEasyApi.getRentalAgreementByTenantId(tenant.id);
    if (existing && existing.agreement_text) {
      setAgreementText(existing.agreement_text);
      setIsCustomEdited(!!existing.is_custom_edited);
      if (existing.owner_id && owners.some(o => o.id === existing.owner_id)) {
        setSelectedOwnerId(existing.owner_id);
      }
      if (existing.house_type) setHouseType(existing.house_type);
      if (existing.painting_option) setPaintingOption(existing.painting_option);
      if (existing.painting_amount !== undefined) setPaintingAmount(existing.painting_amount);
      if (existing.start_date) setStartDate(existing.start_date);
      if (existing.duration_months) setDurationMonths(existing.duration_months);
      if (existing.notice_period_months) setNoticePeriodMonths(existing.notice_period_months);
      if (existing.monthly_rent) setMonthlyRent(existing.monthly_rent);
      if (existing.deposit_amount !== undefined) setDepositAmount(existing.deposit_amount);
      if (existing.due_day) setDueDay(existing.due_day);
    } else {
      generateFreshText();
    }
  }, [tenant.id]);

  const generateFreshText = (
    overrideParams?: Partial<{
      owner_name: string;
      owner_phone: string;
      owner_address: string;
      owner_id_number?: string;
      house_type: HouseType;
      painting_option: PaintingOption;
      painting_amount: number;
      monthly_rent: number;
      deposit_amount: number;
      start_date: string;
      duration_months: number;
      notice_period_months: number;
      due_day: number;
    }>
  ) => {
    const text = rentEasyApi.generateDefaultAgreementText({
      owner_name: overrideParams?.owner_name || selectedOwner.name,
      owner_phone: overrideParams?.owner_phone || selectedOwner.phone,
      owner_address: overrideParams?.owner_address || selectedOwner.address || 'Bengaluru, Karnataka',
      owner_id_number: overrideParams?.owner_id_number || selectedOwner.aadhaar_or_pan,
      tenant_name: tenant.name,
      tenant_phone: tenant.phone,
      tenant_aadhaar: tenant.aadhaar_number,
      tenant_permanent_address: tenant.permanent_address,
      property_name: tenant.linked_property_name ? `Property ${tenant.linked_property_name}` : 'Residential House',
      house_number: tenant.house_number,
      property_address: propertyAddress,
      house_type: overrideParams?.house_type || houseType,
      monthly_rent: overrideParams?.monthly_rent !== undefined ? overrideParams.monthly_rent : monthlyRent,
      due_day: overrideParams?.due_day !== undefined ? overrideParams.due_day : dueDay,
      deposit_amount: overrideParams?.deposit_amount !== undefined ? overrideParams.deposit_amount : depositAmount,
      start_date: overrideParams?.start_date || startDate,
      duration_months: overrideParams?.duration_months || durationMonths,
      notice_period_months: overrideParams?.notice_period_months || noticePeriodMonths,
      painting_option: overrideParams?.painting_option || paintingOption,
      painting_amount: overrideParams?.painting_amount !== undefined ? overrideParams.painting_amount : paintingAmount
    });
    setAgreementText(text);
    setIsCustomEdited(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle owner addition
  const handleAddNewOwner = () => {
    if (!newOwnerName.trim()) {
      alert('Please enter Owner Name');
      return;
    }
    const created = rentEasyApi.addOwner({
      name: newOwnerName.trim(),
      phone: newOwnerPhone.trim() || '+91 ',
      address: newOwnerAddress.trim() || 'Bengaluru, Karnataka',
      aadhaar_or_pan: newOwnerIdNumber.trim() || undefined,
      is_default: false
    });
    const updated = rentEasyApi.getOwners();
    setOwners(updated);
    setSelectedOwnerId(created.id);
    setIsAddingNewOwner(false);
    setNewOwnerName('');
    setNewOwnerPhone('');
    setNewOwnerAddress('');
    setNewOwnerIdNumber('');
    showToast(`Owner "${created.name}" added successfully!`);

    // Regenerate if not custom edited
    if (!isCustomEdited) {
      generateFreshText({
        owner_name: created.name,
        owner_phone: created.phone,
        owner_address: created.address,
        owner_id_number: created.aadhaar_or_pan
      });
    }
  };

  const handleOwnerChange = (newId: string) => {
    setSelectedOwnerId(newId);
    const owner = owners.find(o => o.id === newId);
    if (owner && !isCustomEdited) {
      generateFreshText({
        owner_name: owner.name,
        owner_phone: owner.phone,
        owner_address: owner.address,
        owner_id_number: owner.aadhaar_or_pan
      });
    }
  };

  const handleHouseTypeChange = (newType: HouseType) => {
    setHouseType(newType);
    if (!isCustomEdited) {
      generateFreshText({ house_type: newType });
    }
  };

  const handlePaintingOptionChange = (newOption: PaintingOption) => {
    setPaintingOption(newOption);
    if (!isCustomEdited) {
      generateFreshText({ painting_option: newOption });
    }
  };

  const handlePaintingAmountChange = (amt: number) => {
    setPaintingAmount(amt);
    if (!isCustomEdited) {
      generateFreshText({ painting_amount: amt });
    }
  };

  const handleSaveAgreement = () => {
    const saved = rentEasyApi.saveRentalAgreement({
      id: `agr-${tenant.id}`,
      tenant_id: tenant.id,
      property_id: tenant.property_id,
      owner_id: selectedOwner.id,
      owner_name: selectedOwner.name,
      owner_phone: selectedOwner.phone,
      owner_address: selectedOwner.address || '',
      owner_id_number: selectedOwner.aadhaar_or_pan,
      tenant_name: tenant.name,
      tenant_phone: tenant.phone,
      tenant_aadhaar: tenant.aadhaar_number,
      tenant_permanent_address: tenant.permanent_address,
      property_name: tenant.linked_property_name || 'House',
      house_number: tenant.house_number,
      property_address: propertyAddress,
      house_type: houseType,
      monthly_rent: monthlyRent,
      due_day: dueDay,
      deposit_amount: depositAmount,
      start_date: startDate,
      duration_months: durationMonths,
      notice_period_months: noticePeriodMonths,
      painting_option: paintingOption,
      painting_amount: paintingAmount,
      agreement_text: agreementText,
      is_custom_edited: isCustomEdited,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (onAgreementSaved) {
      onAgreementSaved(saved);
    }
    showToast('Rental Agreement saved successfully! Accessible anytime.');
  };

  const handleResetToTemplate = () => {
    if (window.confirm('Reset this agreement back to the standard template? Any custom wording you typed will be replaced with fresh parameters.')) {
      generateFreshText();
      showToast('Agreement reset to standard legal template.');
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(agreementText);
      showToast('Agreement copied to clipboard!');
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = agreementText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Agreement copied to clipboard!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const summary = `*RENTAL AGREEMENT SUMMARY*
House / Unit: ${tenant.house_number} (${tenant.linked_property_name || 'Property'})
Tenant: ${tenant.name} (${tenant.phone})
Owner / Landlord: ${selectedOwner.name} (${selectedOwner.phone})
Accommodation: ${houseType}
Monthly Rent: ₹${monthlyRent.toLocaleString('en-IN')}/- (Due on ${dueDay}th of each month)
Security Deposit: ₹${depositAmount.toLocaleString('en-IN')}/-
Tenancy Period: ${durationMonths} Months (From ${startDate})
Painting Clause: ${paintingOption === 'with_painting' ? `With Painting (Deduction: ₹${paintingAmount.toLocaleString('en-IN')}/-)` : 'Without Painting (Handover in clean condition)'}
Notice Period: ${noticePeriodMonths} Month

_Full legal agreement registered on RentEasy Landlord OS._`;

    const encoded = encodeURIComponent(summary);
    const targetPhone = (tenant.whatsapp_number || tenant.phone || '').replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${targetPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-dialog"
        style={{
          maxWidth: '920px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0f1d',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '24px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
              zIndex: 2000,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <Check size={16} /> {toastMessage}
          </div>
        )}

        {/* Modal Header */}
        <div
          className="no-print"
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#0f172a',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(56, 189, 248, 0.25))',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8'
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Rental Agreement
                </h2>
                <span
                  style={{
                    backgroundColor: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    border: '1px solid rgba(56, 189, 248, 0.3)'
                  }}
                >
                  {tenant.house_number}
                </span>
                {isCustomEdited && (
                  <span
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Pencil size={10} /> Custom Edited
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                Tenant: <strong style={{ color: '#fff' }}>{tenant.name}</strong> • Phone: {tenant.phone} • Rent: ₹{monthlyRent.toLocaleString('en-IN')}/mo
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* View Mode Switcher */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '3px',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <button
                className="btn btn-xs"
                style={{
                  backgroundColor: activeTab === 'preview' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'preview' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab('preview')}
              >
                <Eye size={13} /> Preview
              </button>
              <button
                className="btn btn-xs"
                style={{
                  backgroundColor: activeTab === 'edit' ? 'var(--primary)' : 'transparent',
                  color: activeTab === 'edit' ? '#fff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab('edit')}
                title="Edit full agreement text, clauses, and terms"
              >
                <Pencil size={13} /> Edit Agreement Text
              </button>
            </div>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleCopyText}
              title="Copy entire agreement to clipboard"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Copy size={13} /> Copy
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handleWhatsAppShare}
              title="Share summary via WhatsApp"
              style={{
                fontSize: '0.78rem',
                color: '#25D366',
                borderColor: 'rgba(37, 211, 102, 0.4)',
                backgroundColor: 'rgba(37, 211, 102, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Share2 size={13} /> WhatsApp
            </button>

            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePrint}
              title="Print document or save as PDF"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Printer size={13} /> Print / PDF
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleSaveAgreement}
              title="Save this agreement in database"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Save size={13} /> Save Agreement
            </button>

            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Controls Strip (Owner selection, House Type, Painting Option, Rent details) */}
        <div
          className="no-print"
          style={{
            backgroundColor: '#111c33',
            padding: '14px 22px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Row 1: Owner Selection & House Type */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Owner Selector */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <User size={12} /> Owner / Lessor of Property:
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewOwner(!isAddingNewOwner)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontWeight: 600,
                    padding: 0
                  }}
                >
                  <Plus size={11} /> {isAddingNewOwner ? 'Cancel' : 'Add New Owner'}
                </button>
              </div>

              {!isAddingNewOwner ? (
                <div style={{ position: 'relative' }}>
                  <select
                    className="input-field"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: '0.82rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.35)',
                      borderColor: 'rgba(56, 189, 248, 0.3)',
                      color: '#ffffff',
                      borderRadius: '8px'
                    }}
                    value={selectedOwnerId}
                    onChange={e => handleOwnerChange(e.target.value)}
                  >
                    {owners.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name} {o.phone ? `(${o.phone})` : ''} {o.is_default ? '— Primary Owner' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                /* Inline Add New Owner Box */
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      className="input-field"
                      style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                      placeholder="Full Owner Name *"
                      value={newOwnerName}
                      onChange={e => setNewOwnerName(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input-field"
                      style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                      placeholder="Contact Mobile (e.g. +91 9845012345)"
                      value={newOwnerPhone}
                      onChange={e => setNewOwnerPhone(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                    <input
                      type="text"
                      className="input-field"
                      style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                      placeholder="Residential / Office Address"
                      value={newOwnerAddress}
                      onChange={e => setNewOwnerAddress(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input-field"
                      style={{ padding: '6px 8px', fontSize: '0.78rem' }}
                      placeholder="Aadhaar / PAN No (Optional)"
                      value={newOwnerIdNumber}
                      onChange={e => setNewOwnerIdNumber(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => setIsAddingNewOwner(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary btn-xs"
                      onClick={handleAddNewOwner}
                    >
                      Save & Select Owner
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* House Type Selector (1RK, 1BHK, 2BHK, 3BHK, etc.) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Home size={12} /> House Accommodation:
              </label>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {(['1RK', '1BHK', '2BHK', '3BHK', '4BHK', 'Commercial'] as HouseType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    style={{
                      padding: '5px 11px',
                      fontSize: '0.78rem',
                      borderRadius: '6px',
                      border: houseType === type ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: houseType === type ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.03)',
                      color: houseType === type ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: houseType === type ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => handleHouseTypeChange(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Painting Option & Amount + Tenure Parameters */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            {/* Painting Option Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Paintbrush size={12} /> Painting Clause:
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: paintingOption === 'with_painting' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: paintingOption === 'with_painting' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: paintingOption === 'with_painting' ? '#fbbf24' : 'var(--text-muted)',
                    fontWeight: paintingOption === 'with_painting' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onClick={() => handlePaintingOptionChange('with_painting')}
                >
                  <Paintbrush size={12} /> With Painting
                </button>
                <button
                  type="button"
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: paintingOption === 'without_painting' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: paintingOption === 'without_painting' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: paintingOption === 'without_painting' ? '#10b981' : 'var(--text-muted)',
                    fontWeight: paintingOption === 'without_painting' ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  onClick={() => handlePaintingOptionChange('without_painting')}
                >
                  <Check size={12} /> Without Painting
                </button>

                {/* Amount input when with_painting is chosen */}
                {paintingOption === 'with_painting' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Deduction: ₹</span>
                    <input
                      type="number"
                      className="input-field"
                      style={{
                        width: '110px',
                        padding: '4px 8px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: '#fbbf24',
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        borderColor: 'rgba(245, 158, 11, 0.4)'
                      }}
                      value={paintingAmount}
                      onChange={e => handlePaintingAmountChange(Number(e.target.value) || 0)}
                      step="500"
                      min="0"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Agreement Start Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Commencement Date:
              </label>
              <input
                type="date"
                className="input-field"
                style={{
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  width: '135px'
                }}
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  if (!isCustomEdited) generateFreshText({ start_date: e.target.value });
                }}
              />
            </div>

            {/* Stamp Paper Top Space Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  color: stampPaperSpace ? '#a5b4fc' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: stampPaperSpace ? 600 : 400
                }}
              >
                <input
                  type="checkbox"
                  checked={stampPaperSpace}
                  onChange={e => setStampPaperSpace(e.target.checked)}
                />
                Stamp Paper Margin (100mm)
              </label>

              {isCustomEdited && (
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={handleResetToTemplate}
                  title="Discard edits and reload clean standard template"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}
                >
                  <RotateCcw size={11} /> Reset Template
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body: Agreement Document (Preview or Edit Mode) */}
        <div
          className="modal-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            backgroundColor: '#070b14',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {activeTab === 'preview' ? (
            /* PREVIEW / PRINTABLE VIEW */
            <div
              className="printable-agreement"
              style={{
                backgroundColor: '#ffffff',
                color: '#1a1a1a',
                borderRadius: '8px',
                padding: stampPaperSpace ? '100mm 25mm 25mm 25mm' : '28mm 25mm 25mm 25mm',
                maxWidth: '820px',
                margin: '0 auto',
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.45)',
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: '11pt',
                lineHeight: 1.65,
                width: '100%',
                position: 'relative'
              }}
            >
              {stampPaperSpace && (
                <div
                  className="no-print"
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    right: '20px',
                    height: '90mm',
                    border: '2px dashed #94a3b8',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(241, 245, 249, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    gap: '4px'
                  }}
                >
                  <AlertCircle size={20} color="#6366f1" />
                  <span>E-STAMP / NON-JUDICIAL STAMP PAPER SPACE (100 MM)</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#94a3b8' }}>
                    Print this first page directly onto your legal stamp paper. This placeholder disappears when printed.
                  </span>
                </div>
              )}

              <pre
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: '10.5pt',
                  lineHeight: '1.68',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#111827',
                  margin: 0
                }}
              >
                {agreementText}
              </pre>
            </div>
          ) : (
            /* EDIT VIEW ("I required a option to edit Rental agreement if i need") */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  padding: '8px 14px',
                  borderRadius: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pencil size={15} color="#818cf8" />
                  <span style={{ fontSize: '0.82rem', color: '#c7d2fe', fontWeight: 600 }}>
                    Direct Legal Document Editor: You can freely modify, insert custom terms, or tailor clauses.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={handleResetToTemplate}
                    style={{ color: '#fbbf24' }}
                  >
                    <RotateCcw size={11} /> Revert to Standard
                  </button>
                  <button
                    className="btn btn-primary btn-xs"
                    onClick={() => {
                      handleSaveAgreement();
                      setActiveTab('preview');
                    }}
                  >
                    <Save size={11} /> Save & Switch to Preview
                  </button>
                </div>
              </div>

              <textarea
                style={{
                  width: '100%',
                  flex: 1,
                  minHeight: '480px',
                  backgroundColor: '#090d16',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.86rem',
                  lineHeight: 1.6,
                  resize: 'none',
                  outline: 'none',
                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.5)'
                }}
                value={agreementText}
                onChange={e => {
                  setAgreementText(e.target.value);
                  setIsCustomEdited(true);
                }}
                placeholder="Type or edit the agreement clauses here..."
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <span>Length: {agreementText.length} characters • {agreementText.split(/\s+/).filter(Boolean).length} words</span>
                <span style={{ color: '#34d399' }}>✓ All edits will be permanently preserved when you click Save.</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="no-print"
          style={{
            padding: '12px 22px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: '#0f172a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            <FileCheck size={14} color="#10b981" />
            <span>Ready for A4 Legal printing or Non-Judicial E-Stamp execution.</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSaveAgreement}>
              <Save size={14} /> Save Agreement
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
