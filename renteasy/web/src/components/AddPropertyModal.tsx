import React, { useState } from 'react';
import { Property, PropertyType } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import {
  Building2,
  X,
  Plus,
  Home,
  IndianRupee,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';

interface AddPropertyModalProps {
  onClose: () => void;
  onSuccess: (property: Property) => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('560001');
  const [propertyType, setPropertyType] = useState<PropertyType>('2BHK');
  const [defaultRent, setDefaultRent] = useState('25000');

  // Multi-unit configuration
  const [totalUnits, setTotalUnits] = useState('4');
  const [unitPrefix, setUnitPrefix] = useState('Flat ');
  const [startNumber, setStartNumber] = useState('101');
  const [useCustomNames, setUseCustomNames] = useState(false);
  const [customUnitNames, setCustomUnitNames] = useState('');

  // Live preview of generated unit numbers
  const count = Math.max(1, parseInt(totalUnits) || 1);
  const startNum = parseInt(startNumber) || 101;

  const generatedUnitsPreview: string[] = useCustomNames
    ? customUnitNames.split(',').map(s => s.trim()).filter(Boolean)
    : Array.from({ length: Math.min(count, 12) }, (_, i) => `${unitPrefix}${startNum + i}`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a building or property name.');
      return;
    }

    const customList = useCustomNames
      ? customUnitNames.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const prop = rentEasyApi.addProperty({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      property_type: propertyType,
      default_rent: parseFloat(defaultRent) || 0,
      total_units: count,
      unit_prefix: unitPrefix,
      start_number: startNum,
      custom_unit_names: customList && customList.length > 0 ? customList : undefined
    });

    onSuccess(prop);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--primary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} color="var(--primary)" />
            </div>
            <div>
              <h3 className="card-title" style={{ margin: 0 }}>Add Property & Generate Units</h3>
              <p className="card-subtitle">Define building details and automatically generate multiple units/flats</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {/* Building Name */}
            <div className="form-group">
              <label className="form-label">Property / Building / Society Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Prestige Lakeview Apartments or Sharma Commercial Complex"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* Address */}
            <div className="form-group">
              <label className="form-label">Street Address *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 15th Cross, 4th Main, HSR Layout"
                value={address}
                onChange={e => setAddress(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">City *</label>
                <input
                  type="text"
                  className="form-input"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pincode *</label>
                <input
                  type="text"
                  className="form-input"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Multi-Unit Automatic Generator Box */}
            <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} color="var(--primary)" /> Multi-Unit Automatic Generation
                </div>
                <span className="badge badge-paid" style={{ fontSize: '0.7rem' }}>
                  <Sparkles size={11} /> Auto-Generates Units
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Number of Units / Flats in this Property *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem' }}
                    value={totalUnits}
                    onChange={e => setTotalUnits(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Default Rent per Unit (₹) *</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem' }}
                    value={defaultRent}
                    onChange={e => setDefaultRent(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Unit Type</label>
                  <select
                    className="form-select"
                    value={propertyType}
                    onChange={e => setPropertyType(e.target.value as PropertyType)}
                  >
                    <option value="1BHK">1BHK Apartment</option>
                    <option value="2BHK">2BHK Apartment</option>
                    <option value="3BHK">3BHK Apartment</option>
                    <option value="3BHK Villa">3BHK Villa</option>
                    <option value="1BHK Studio">Studio Apartment</option>
                    <option value="Independent House">Independent House</option>
                    <option value="Commercial">Commercial / Office</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unit Numbering Pattern</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      className="form-select"
                      style={{ width: '110px' }}
                      value={unitPrefix}
                      onChange={e => setUnitPrefix(e.target.value)}
                      disabled={useCustomNames}
                    >
                      <option value="Flat ">Flat </option>
                      <option value="Unit ">Unit </option>
                      <option value="House #">House #</option>
                      <option value="Shop ">Shop </option>
                      <option value="Villa ">Villa </option>
                      <option value="">(None)</option>
                    </select>
                    <input
                      type="number"
                      className="form-input"
                      style={{ fontFamily: 'var(--font-mono)' }}
                      placeholder="Start 101"
                      value={startNumber}
                      onChange={e => setStartNumber(e.target.value)}
                      disabled={useCustomNames}
                    />
                  </div>
                </div>
              </div>

              {/* Custom Names Toggle */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={useCustomNames}
                    onChange={e => setUseCustomNames(e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  I want to specify custom unit numbers manually (comma-separated)
                </label>
                {useCustomNames && (
                  <input
                    type="text"
                    className="form-input"
                    style={{ marginTop: '8px' }}
                    placeholder="e.g. 101, 102, 201, 202, Penthouse, Shop-A"
                    value={customUnitNames}
                    onChange={e => setCustomUnitNames(e.target.value)}
                  />
                )}
              </div>

              {/* Live Units Preview Chip Deck */}
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
                  Units That Will Be Automatically Created ({count} Units Total):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {generatedUnitsPreview.map((uName, idx) => (
                    <span
                      key={idx}
                      className="badge"
                      style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#818cf8',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        fontSize: '0.72rem'
                      }}
                    >
                      <Home size={11} /> {uName}
                    </span>
                  ))}
                  {count > 12 && !useCustomNames && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', alignSelf: 'center' }}>
                      + {count - 12} more units...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Create Property & {count} Units
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
