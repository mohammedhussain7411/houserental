import React, { useState, useEffect } from 'react';
import { Property, PropertyUnit, RentCharge, Tenant } from '../types';
import { rentEasyApi } from '../services/rentEasyApi';
import { AddTenantModal } from '../components/AddTenantModal';
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  MapPin,
  IndianRupee,
  User,
  History,
  DoorOpen,
  Layers,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Trash2,
  Pencil
} from 'lucide-react';

interface PropertiesPageProps {
  onOpenAddProperty: () => void;
  onOpenAddTenant: (preselectedPropertyId?: string, preselectedUnit?: string) => void;
  onOpenRecordPayment: (charge?: RentCharge) => void;
  onTenantUpdated?: (tenant: Tenant) => void;
}

export const PropertiesPage: React.FC<PropertiesPageProps> = ({
  onOpenAddProperty,
  onOpenAddTenant,
  onOpenRecordPayment,
  onTenantUpdated
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [properties, setProperties] = useState<Property[]>(rentEasyApi.getProperties());
  const [tenants, setTenants] = useState<Tenant[]>(rentEasyApi.getTenants());
  const allCharges = rentEasyApi.getRentCharges();

  // Real-time synchronization listener for Phone <-> Web updates
  useEffect(() => {
    const handleSync = () => {
      setProperties(rentEasyApi.getProperties());
      setTenants(rentEasyApi.getTenants());
    };
    window.addEventListener('renteasy_sync', handleSync);
    return () => window.removeEventListener('renteasy_sync', handleSync);
  }, []);

  // Reliable helper to find the active tenant for any property and unit
  const getUnitTenant = (p: Property, u: PropertyUnit): Tenant | undefined => {
    return tenants.find(t =>
      (t.active_lease_id && u.current_lease_id && t.active_lease_id === u.current_lease_id) ||
      (u.current_tenant_name && t.name.trim().toLowerCase() === u.current_tenant_name.trim().toLowerCase()) ||
      (t.house_number && u.unit_number && t.house_number.trim().toLowerCase() === u.unit_number.trim().toLowerCase() &&
       (!t.linked_property_name || t.linked_property_name.trim().toLowerCase() === p.name.trim().toLowerCase())) ||
      (t.property_id && t.property_id === p.id && t.house_number && u.unit_number && t.house_number.trim().toLowerCase() === u.unit_number.trim().toLowerCase())
    );
  };

  const filtered = properties.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.units && p.units.some(u => u.unit_number.toLowerCase().includes(searchTerm.toLowerCase())));
    const hasOccupied = p.units
      ? p.units.some(u => u.status === 'occupied' || !!getUnitTenant(p, u))
      : p.status === 'occupied';
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'occupied' && hasOccupied) ||
      (statusFilter === 'vacant' && !hasOccupied);
    return matchesSearch && matchesStatus;
  });

  const toggleExpand = (propId: string) => {
    setExpandedPropertyId(prev => (prev === propId ? null : propId));
  };

  const handleAddUnitDirect = (propId: string) => {
    const unitNo = prompt('Enter new Unit Number (e.g. Flat 401 or Penthouse):');
    if (!unitNo || !unitNo.trim()) return;
    const rentStr = prompt('Enter monthly rent for this unit (₹):', '25000');
    const rent = parseFloat(rentStr || '0') || 25000;

    try {
      rentEasyApi.addUnitToProperty(propId, unitNo.trim(), rent);
      setProperties(rentEasyApi.getProperties());
    } catch (e: any) {
      alert(e.message || 'Failed to add unit');
    }
  };

  const handleDeleteProperty = (property: Property) => {
    const units = property.units || [];
    const occupiedUnits = units.filter(u => u.status === 'occupied');
    const isOccupied = occupiedUnits.length > 0 || property.status === 'occupied';

    const confirmMsg = isOccupied
      ? `⚠️ WARNING: "${property.name}" has occupied units (${occupiedUnits.map(u => u.unit_number).join(', ')}).\n\nDeleting this property will permanently remove all ${units.length} unit(s) and unlink existing tenant leases.\n\nAre you sure you want to delete "${property.name}"?`
      : `Are you sure you want to permanently delete property "${property.name}" and all its units?`;

    if (window.confirm(confirmMsg)) {
      rentEasyApi.deleteProperty(property.id);
      setProperties(rentEasyApi.getProperties());
    }
  };

  const handleDeleteUnit = (propertyId: string, propertyName: string, unit: PropertyUnit) => {
    const isOccupied = unit.status === 'occupied';
    const confirmMsg = isOccupied
      ? `⚠️ WARNING: Unit "${unit.unit_number}" is currently OCCUPIED by ${unit.current_tenant_name || 'a tenant'}.\n\nDeleting this unit will unlink the tenant.\n\nAre you sure you want to delete unit "${unit.unit_number}"?`
      : `Are you sure you want to delete unit "${unit.unit_number}" from "${propertyName}"?`;

    if (window.confirm(confirmMsg)) {
      rentEasyApi.deleteUnit(propertyId, unit.id);
      setProperties(rentEasyApi.getProperties());
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Properties & Units Inventory
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Buildings, societies, commercial properties, and automatically managed rental units
          </p>
        </div>

        <button className="btn btn-primary" onClick={onOpenAddProperty}>
          <Plus size={16} /> Add Property & Auto-Create Units
        </button>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '8px 14px', width: '340px', gap: '8px' }}>
          <Search size={16} color="var(--text-dim)" />
          <input
            type="text"
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.875rem', outline: 'none', width: '100%' }}
            placeholder="Search building, address, or unit..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['all', 'occupied', 'vacant'] as const).map(s => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
              style={{ textTransform: 'capitalize' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Buildings & Multi-Units Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filtered.map(p => {
          const unitsList = p.units && p.units.length > 0
            ? p.units
            : [{ id: `u-${p.id}`, property_id: p.id, unit_number: p.unit_number || 'Unit 1', property_type: p.property_type, default_rent: p.default_rent, status: p.status, current_tenant_name: p.current_tenant_name }];

          const occupiedCount = unitsList.filter(u => u.status === 'occupied' || !!getUnitTenant(p, u)).length;
          const vacantCount = unitsList.length - occupiedCount;

          // Compute actual occupied rental cashflow
          const actualOccupiedRent = unitsList.reduce((acc, u) => {
            const t = getUnitTenant(p, u);
            if (t && t.status === 'active' && t.monthly_rent) {
              return acc + t.monthly_rent;
            }
            if (u.status === 'occupied' && (u.default_rent || p.default_rent)) {
              return acc + (u.default_rent || p.default_rent || 0);
            }
            return acc;
          }, 0);

          // Compute total potential rent across all units using updated tenant rent where available
          const totalPotential = unitsList.reduce((acc, u) => {
            const t = getUnitTenant(p, u);
            const rentVal = t?.monthly_rent || u.default_rent || p.default_rent || 0;
            return acc + rentVal;
          }, 0);

          const isExpanded = expandedPropertyId === p.id || expandedPropertyId === null; // Expanded by default for high clarity

          return (
            <div
              key={p.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '22px 24px'
              }}
            >
              {/* Property Header Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'var(--primary-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={20} color="var(--primary)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', margin: 0 }}>
                        {p.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        <MapPin size={13} />
                        <span>{p.address}, {p.city} - {p.pincode}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Occupancy Stats Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Occupancy & Rent</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                      {unitsList.length} Units ({occupiedCount} Occupied / {vacantCount} Vacant)
                    </div>
                  </div>

                  <span className={`badge ${occupiedCount > 0 ? 'badge-paid' : 'badge-vacant'}`}>
                    <span className="badge-dot"></span>
                    {occupiedCount > 0 ? `${Math.round((occupiedCount / unitsList.length) * 100)}% Occupied` : 'Vacant Building'}
                  </span>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAddUnitDirect(p.id)}
                    title="Add another unit to this building"
                  >
                    <Plus size={14} /> Add Unit
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{
                      color: '#f87171',
                      borderColor: 'rgba(239, 68, 68, 0.35)',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)'
                    }}
                    onClick={() => handleDeleteProperty(p)}
                    title={`Delete "${p.name}" and all units`}
                  >
                    <Trash2 size={14} /> Delete
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleExpand(p.id)}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Collapsible Units Subgrid */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span>Units in this Property ({unitsList.length} Units)</span>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <span style={{ color: '#34d399', fontWeight: 800 }}>
                        Active Rent: ₹{actualOccupiedRent.toLocaleString('en-IN')}/mo
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>•</span>
                      <span>Total Potential: ₹{totalPotential.toLocaleString('en-IN')}/mo</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '14px' }}>
                    {unitsList.map(u => {
                      const assignedTenant = getUnitTenant(p, u);
                      const isOccupied = u.status === 'occupied' || !!assignedTenant;
                      // CRITICAL FIX: Always display the active tenant's updated rent, fallback to unit default_rent, then property default_rent
                      const effectiveRent = assignedTenant?.monthly_rent || u.default_rent || p.default_rent || 0;

                      return (
                        <div
                          key={u.id}
                          style={{
                            background: isOccupied ? 'var(--bg-surface)' : 'rgba(255, 255, 255, 0.02)',
                            border: isOccupied ? '1px solid rgba(16, 185, 129, 0.3)' : '1px dashed var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
                                {u.unit_number}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                {u.property_type || p.property_type}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className={`badge ${isOccupied ? 'badge-paid' : 'badge-vacant'}`} style={{ fontSize: '0.65rem' }}>
                                {isOccupied ? 'OCCUPIED' : 'VACANT'}
                              </span>
                              <button
                                onClick={() => handleDeleteUnit(p.id, p.name, u)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
                                title={`Delete unit ${u.unit_number}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                            <div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Monthly Rent</span>
                                {assignedTenant ? (
                                  <span style={{ fontSize: '0.62rem', color: '#34d399', fontWeight: 600, background: 'rgba(16, 185, 129, 0.12)', padding: '1px 5px', borderRadius: '3px' }}>
                                    Tenant Agreed
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.62rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 5px', borderRadius: '3px' }}>
                                    Base
                                  </span>
                                )}
                              </div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: effectiveRent > 0 ? '#fff' : '#fb7185' }}>
                                {effectiveRent > 0 ? `₹${effectiveRent.toLocaleString('en-IN')}` : '₹0 (Set rent)'}
                              </div>
                            </div>

                            {isOccupied ? (
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tenant</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={12} /> {assignedTenant?.name || u.current_tenant_name || 'Occupied'}
                                  </div>
                                  <button
                                    style={{
                                      background: 'rgba(56, 189, 248, 0.12)',
                                      border: '1px solid rgba(56, 189, 248, 0.35)',
                                      color: '#38bdf8',
                                      cursor: 'pointer',
                                      padding: '3px 7px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600
                                    }}
                                    onClick={() => {
                                      const t = assignedTenant || tenants.find(item => item.name === u.current_tenant_name || item.active_lease_id === u.current_lease_id);
                                      if (t) {
                                        setEditingTenant(t);
                                      } else {
                                        alert(`Tenant record for "${u.current_tenant_name || 'Occupant'}" not found. You can register them in Tenants.`);
                                      }
                                    }}
                                    title={`Edit ${assignedTenant?.name || u.current_tenant_name} and update monthly rent`}
                                  >
                                    <Pencil size={11} /> Edit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.7rem', padding: '3px 7px' }}
                                  onClick={() => {
                                    const input = prompt(`Enter monthly rent for ${p.name} - ${u.unit_number}:`, String(effectiveRent || p.default_rent || 20000));
                                    if (input && !isNaN(Number(input))) {
                                      rentEasyApi.updateUnitRent(p.id, u.id, Number(input));
                                      setProperties(rentEasyApi.getProperties());
                                    }
                                  }}
                                  title="Set or update base rent for this unit"
                                >
                                  <Pencil size={11} /> Rent
                                </button>
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                                  onClick={() => onOpenAddTenant(p.id, u.unit_number)}
                                >
                                  <DoorOpen size={13} /> Assign
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Tenant & Rent Modal */}
      {editingTenant && (
        <AddTenantModal
          properties={properties}
          tenantToEdit={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSuccess={(updated) => {
            setEditingTenant(null);
            setProperties(rentEasyApi.getProperties());
            setTenants(rentEasyApi.getTenants());
            if (onTenantUpdated) {
              onTenantUpdated(updated);
            }
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'local', key: 'tenants' } }));
            }
          }}
        />
      )}
    </div>
  );
};
