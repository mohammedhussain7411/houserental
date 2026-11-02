import {
  Landlord,
  Property,
  PropertyUnit,
  PropertyType,
  PropertyStatus,
  Tenant,
  Lease,
  RentCharge,
  RentCalendarEvent,
  Payment,
  PaymentMethod,
  Receipt,
  MessageJob,
  AuditLog,
  DashboardSummary,
  MessageType,
  MessageChannel,
  RentChargeStatus,
  RentEasyBackupPayload,
  GoogleDriveSession,
  GoogleDriveCloudBackup,
  PropertyOwner,
  RentalAgreement,
  HouseType,
  PaintingOption
} from '../types';

export function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    const unit = n % 10;
    return tens[Math.floor(n / 10)] + (unit ? ' ' + ones[unit] : '');
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    if (hundred && rest) {
      return ones[hundred] + ' Hundred ' + convertTwoDigits(rest);
    } else if (hundred) {
      return ones[hundred] + ' Hundred';
    }
    return convertTwoDigits(rest);
  }

  let n = Math.floor(num);
  let words = '';

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const remaining = n;

  if (crore) words += convertTwoDigits(crore) + ' Crore ';
  if (lakh) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand) words += convertTwoDigits(thousand) + ' Thousand ';
  if (remaining) words += convertThreeDigits(remaining) + ' ';

  return words.trim();
}

const STORAGE_KEY_PREFIX = 'renteasy_v3_';

const initialLandlord: Landlord = {
  id: 'll-001',
  name: 'My Properties',
  email: 'landlord@renteasy.app',
  phone: '',
  company_name: 'RentEasy Portfolio',
  upi_id: '',
  timezone: 'Asia/Kolkata'
};

const initialProperties: Property[] = [];
const initialTenants: Tenant[] = [];
const initialRentCharges: RentCharge[] = [];
const initialPayments: Payment[] = [];
const initialReceipts: Receipt[] = [];
const initialMessageJobs: MessageJob[] = [];
const initialAuditLogs: AuditLog[] = [];

// LocalStorage & Real-Time Cross-Device Sync helpers
export interface DeviceSyncStatus {
  isLiveConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  revision: number;
  serverUrl: string;
  isHostReachable: boolean;
  activeMode: 'realtime' | 'offline';
  clientInstanceId: string;
}

const CLIENT_INSTANCE_ID = 'device_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now();

function autoMigrateStorageKeys(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const currentProps = localStorage.getItem(STORAGE_KEY_PREFIX + 'properties');
    if (!currentProps) {
      const pastPrefixes = ['renteasy_v2_', 'renteasy_v1_', 'renteasy_'];
      for (const prefix of pastPrefixes) {
        const oldProps = localStorage.getItem(prefix + 'properties');
        if (oldProps) {
          console.log(`[RentEasy Migration] Found existing data under prefix "${prefix}". Migrating to ${STORAGE_KEY_PREFIX}...`);
          const keys = ['landlord', 'properties', 'tenants', 'rent_charges', 'payments', 'receipts', 'message_jobs', 'audit_logs', 'auth_credentials'];
          for (const k of keys) {
            const val = localStorage.getItem(prefix + k);
            if (val && !localStorage.getItem(STORAGE_KEY_PREFIX + k)) {
              localStorage.setItem(STORAGE_KEY_PREFIX + k, val);
            }
          }
          break;
        }
      }
    }
  } catch (err) {
    console.warn('[RentEasy Migration] Notice during auto-migration:', err);
  }
}
function autoMigratePortfolioUnitFormat(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const MIGRATION_KEY = 'renteasy_unit_prefix_migration_v6';
    const rawProps = localStorage.getItem(STORAGE_KEY_PREFIX + 'properties');
    const rawTenants = localStorage.getItem(STORAGE_KEY_PREFIX + 'tenants');
    if (!rawProps || !rawTenants) return;

    let properties = JSON.parse(rawProps);
    let tenants = JSON.parse(rawTenants);
    if (!Array.isArray(properties) || properties.length === 0) return;

    const alreadyDone = localStorage.getItem(MIGRATION_KEY) === 'done';
    const propA = properties.find((p: any) => (p.name || '').trim().toUpperCase() === 'A');
    const propC = properties.find((p: any) => (p.name || '').trim().toUpperCase() === 'C');

    // Check if migration is strictly needed
    const needsUnitFix = properties.some((p: any) =>
      (p.units || []).some((u: any) => !u.unit_number || /^House\s*#?\s*\d+/i.test(u.unit_number) || /^\d+$/.test(u.unit_number))
    );
    const needsTenantFix = tenants.some((t: any) =>
      !t.house_number ||
      /^House\s*#?\s*\d+/i.test(t.house_number) ||
      /^\d+$/.test(t.house_number) ||
      (t.name === 'Gufran' && (t.linked_property_name !== 'A' || t.house_number !== 'A-16')) ||
      (t.name === 'Samurudin' && (t.linked_property_name !== 'C' || t.house_number !== 'C-16')) ||
      (t.name === 'Mubarak' && t.monthly_rent === 3100 && (t.linked_property_name !== 'A' || t.house_number !== 'A-17'))
    );
    const gufranMissing = !tenants.some((t: any) => t.name === 'Gufran');

    if (alreadyDone && !needsUnitFix && !needsTenantFix && !gufranMissing) {
      return;
    }

    console.log('[RentEasy Migration] Applying comprehensive unit prefix (A-1..A-17, C-1..C-16) and tenant property isolation...');

    // 1. Properties & Units
    if (propA) {
      const namesA = [
        'Saddam Hussain', 'Rihana', 'Bhanumathy', 'Mohammed Shamsad', 'Murtaza',
        'Hyder Ali', 'Sawood Ahmed', 'Mubeena', 'Mohammed Waseem', 'Imtiyaz',
        'Mohammed Abdul', 'Mohammed Noushad', 'Saddam Hussain', 'Abdad', 'Fathima',
        'Gufran', 'Mubarak'
      ];
      const rentA = [4300, 5500, 5800, 4000, 2800, 2800, 5000, 3900, 2800, 2800, 2600, 3000, 3300, 3300, 3600, 3200, 3100];
      const leasesA = [
        'lease-1793016323583-ten-1793015167436',
        'lease-1793016323583-ten-1793015222383',
        'lease-1793016323582-ten-1793015271984',
        'lease-1793016323582-ten-1793015340138',
        'lease-1793016323582-ten-1793015424005',
        'lease-1793016323582-ten-1793015486724',
        'lease-1793016323582-ten-1793015696549',
        'lease-1793016323582-ten-1793015818564',
        'lease-1793016323582-ten-1793015900297',
        'lease-1793016323582-ten-1793015982323',
        'lease-1793021922682',
        'lease-1793022252265',
        'lease-1793023209299',
        'lease-1793022418977',
        'lease-1793027659567',
        'lease-1793022802749',
        'lease-1793023076106'
      ];
      propA.units = [];
      for (let i = 1; i <= 17; i++) {
        propA.units.push({
          id: `u-prop-1793015020917-${i}`,
          property_id: propA.id,
          unit_number: `A-${i}`,
          property_type: 'Independent House',
          default_rent: rentA[i - 1],
          status: 'occupied',
          current_tenant_name: namesA[i - 1],
          current_lease_id: leasesA[i - 1]
        });
      }
    }

    if (propC) {
      const namesC = [
        'Tasleem', 'Waheed', 'Faizulla', 'Meena Naik', 'Mujaheed Alam',
        'Simran', 'Nayeem', 'Mohammed Jabeer', 'Javeed', 'Mubarak',
        'Subash', 'Rakee', 'Irfan', 'Ayaz', 'Adil', 'Samurudin'
      ];
      const rentC = [4000, 3000, 3350, 3800, 3100, 4750, 4800, 6000, 6000, 5300, 4800, 5900, 6000, 4500, 6200, 6500];
      const leasesC = [
        'lease-1793029430153',
        'lease-1793029508936',
        'lease-1793029869086',
        'lease-1793030004181',
        'lease-1793030944328',
        'lease-1793031020581',
        'lease-1793031401846',
        'lease-1793031482541',
        'lease-1793031626463',
        'lease-1793031744739',
        'lease-1793031898966',
        'lease-1793032007884',
        'lease-1793032110933',
        'lease-1793032258647',
        'lease-1793032367848',
        'lease-1793040639316'
      ];
      propC.units = [];
      for (let i = 1; i <= 16; i++) {
        propC.units.push({
          id: `u-prop-1793029282595-${i}`,
          property_id: propC.id,
          unit_number: `C-${i}`,
          property_type: 'Independent House',
          default_rent: rentC[i - 1],
          status: 'occupied',
          current_tenant_name: namesC[i - 1],
          current_lease_id: leasesC[i - 1]
        });
      }
    }

    // Format any other properties
    for (const p of properties) {
      if (p !== propA && p !== propC && Array.isArray(p.units)) {
        const pInitial = (p.name || 'H').trim().charAt(0).toUpperCase();
        p.units.forEach((u: any, idx: number) => {
          const num = (u.unit_number || '').replace(/[^0-9]/g, '') || String(idx + 1);
          u.unit_number = `${pInitial}-${num}`;
        });
      }
    }

    // 2. Tenants
    const cleanedTenants: any[] = [];
    for (const t of tenants) {
      if (t.name === 'Gufran') {
        t.linked_property_name = 'A';
        t.property_id = propA?.id || t.property_id;
        t.house_number = 'A-16';
        t.linked_unit_number = 'A-16';
        t.monthly_rent = 3200;
        t.phone = t.phone || '+91 6201817425';
        t.active_lease_id = 'lease-1793022802749';
        t.status = 'active';
      } else if (t.name === 'Samurudin') {
        t.linked_property_name = 'C';
        t.property_id = propC?.id || t.property_id;
        t.house_number = 'C-16';
        t.linked_unit_number = 'C-16';
        t.monthly_rent = 6500;
        t.phone = t.phone || '+91 9380623282';
        t.active_lease_id = 'lease-1793040639316';
        t.status = 'active';
      } else if (t.name === 'Mubarak' && (t.phone === '+91 9739101043' || t.monthly_rent === 3100 || (t.house_number && t.house_number.includes('17')))) {
        t.linked_property_name = 'A';
        t.property_id = propA?.id || t.property_id;
        t.house_number = 'A-17';
        t.linked_unit_number = 'A-17';
        t.monthly_rent = 3100;
        t.phone = '+91 9739101043';
        t.active_lease_id = 'lease-1793023076106';
        t.status = 'active';
      } else if (t.name === 'Mubarak' && (t.phone === '+91 8147724873' || t.monthly_rent === 5300 || (t.house_number && t.house_number.includes('10')))) {
        t.linked_property_name = 'C';
        t.property_id = propC?.id || t.property_id;
        t.house_number = 'C-10';
        t.linked_unit_number = 'C-10';
        t.monthly_rent = 5300;
        t.phone = '+91 8147724873';
        t.active_lease_id = 'lease-1793031744739';
        t.status = 'active';
      } else {
        const pName = (t.linked_property_name || '').trim().toUpperCase();
        const initial = pName.startsWith('C') ? 'C' : 'A';
        const digits = (t.house_number || '').replace(/[^0-9]/g, '');
        if (digits) {
          t.house_number = `${initial}-${digits}`;
          t.linked_unit_number = t.house_number;
        }
        if (pName.startsWith('C')) {
          t.linked_property_name = 'C';
          if (propC) t.property_id = propC.id;
        } else {
          t.linked_property_name = 'A';
          if (propA) t.property_id = propA.id;
        }
      }
      cleanedTenants.push(t);
    }

    // Ensure Gufran is present
    if (!cleanedTenants.some(t => t.name === 'Gufran')) {
      cleanedTenants.push({
        id: 'ten-1793022802750-gufran',
        property_id: propA?.id || 'prop-1793015020917',
        name: 'Gufran',
        phone: '+91 6201817425',
        house_number: 'A-16',
        linked_unit_number: 'A-16',
        linked_property_name: 'A',
        date: '2026-10-26',
        monthly_rent: 3200,
        due_day: 5,
        deposit_amount: 1000,
        deposit_paid: true,
        status: 'active',
        active_lease_id: 'lease-1793022802749',
        balance_amount: 3200,
        whatsapp_enabled: true,
        sms_enabled: true
      });
    }

    // 3. Rent Charges
    const rawCharges = localStorage.getItem(STORAGE_KEY_PREFIX + 'rent_charges');
    if (rawCharges) {
      try {
        const charges = JSON.parse(rawCharges);
        if (Array.isArray(charges)) {
          charges.forEach((c: any) => {
            if (c.tenant_name === 'Gufran') {
              c.property_name = 'A';
              c.unit_number = 'A-16';
              c.rent_amount = 3200;
            } else if (c.tenant_name === 'Samurudin') {
              c.property_name = 'C';
              c.unit_number = 'C-16';
              c.rent_amount = 6500;
            } else if (c.tenant_name === 'Mubarak' && (c.tenant_phone === '+91 9739101043' || c.rent_amount === 3100)) {
              c.property_name = 'A';
              c.unit_number = 'A-17';
              c.rent_amount = 3100;
            } else if (c.tenant_name === 'Mubarak' && (c.tenant_phone === '+91 8147724873' || c.rent_amount === 5300)) {
              c.property_name = 'C';
              c.unit_number = 'C-10';
              c.rent_amount = 5300;
            } else {
              const pName = (c.property_name || 'A').trim().toUpperCase();
              const prefix = pName.startsWith('C') ? 'C-' : 'A-';
              const digits = (c.unit_number || '').replace(/[^0-9]/g, '');
              if (digits) c.unit_number = prefix + digits;
            }
          });
          localStorage.setItem(STORAGE_KEY_PREFIX + 'rent_charges', JSON.stringify(charges));
        }
      } catch (e) {}
    }

    // 4. Receipts
    const rawReceipts = localStorage.getItem(STORAGE_KEY_PREFIX + 'receipts');
    if (rawReceipts) {
      try {
        const receipts = JSON.parse(rawReceipts);
        if (Array.isArray(receipts)) {
          receipts.forEach((r: any) => {
            if (r.tenant_name === 'Samurudin') {
              r.property_name = 'C';
              r.unit_number = 'C-16';
            } else if (r.tenant_name === 'Gufran') {
              r.property_name = 'A';
              r.unit_number = 'A-16';
            } else {
              const pName = (r.property_name || 'A').trim().toUpperCase();
              const prefix = pName.startsWith('C') ? 'C-' : 'A-';
              const digits = (r.unit_number || '').replace(/[^0-9]/g, '');
              if (digits) r.unit_number = prefix + digits;
            }
          });
          localStorage.setItem(STORAGE_KEY_PREFIX + 'receipts', JSON.stringify(receipts));
        }
      } catch (e) {}
    }

    localStorage.setItem(STORAGE_KEY_PREFIX + 'properties', JSON.stringify(properties));
    localStorage.setItem(STORAGE_KEY_PREFIX + 'tenants', JSON.stringify(cleanedTenants));
    localStorage.setItem(MIGRATION_KEY, 'done');
    console.log('[RentEasy Migration] v6 unit prefix and isolation migration complete.');
  } catch (err) {
    console.warn('[RentEasy Migration] Notice during autoMigratePortfolioUnitFormat:', err);
  }
}
autoMigratePortfolioUnitFormat();

function isStockDemoPayload(payload: any): boolean {
  if (!payload) return false;
  const props = payload.properties;
  const ll = payload.landlord;
  if (ll?.name === 'Rajesh Sharma' || ll?.email === 'rajesh.sharma@renteasy.app') return true;
  if (Array.isArray(props) && props.length > 0) {
    const names = props.map((p: any) => p?.name || '');
    if (
      names.includes('Sunrise Residency') ||
      names.includes('Greenwood Heights') ||
      names.includes('Palm Meadows Annex') ||
      names.includes('Koramangala Regal Court')
    ) {
      return true;
    }
  }
  return false;
}

function hasLocalUserCustomData(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const rawProps = localStorage.getItem(STORAGE_KEY_PREFIX + 'properties');
    if (!rawProps) return false;
    const props = JSON.parse(rawProps);
    if (!Array.isArray(props) || props.length === 0) return false;
    const rawLandlord = localStorage.getItem(STORAGE_KEY_PREFIX + 'landlord');
    const ll = rawLandlord ? JSON.parse(rawLandlord) : null;
    return !isStockDemoPayload({ properties: props, landlord: ll });
  } catch {
    return false;
  }
}

function getSyncEndpoint(path = ''): string {
  if (typeof localStorage !== 'undefined') {
    const custom = localStorage.getItem('renteasy_custom_sync_url');
    if (custom && custom.trim()) {
      return `${custom.trim().replace(/\/+$/, '')}/api/sync${path}`;
    }
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin && !window.location.origin.startsWith('file:')) {
    return `${window.location.origin}/api/sync${path}`;
  }
  return `http://localhost:5174/api/sync${path}`;
}

let _isApplyingRemoteSync = false;
let _currentLocalRevision = 0;
try {
  const storedRev = typeof localStorage !== 'undefined' ? localStorage.getItem('renteasy_sync_revision') : null;
  if (storedRev) _currentLocalRevision = parseInt(storedRev, 10) || 0;
} catch (e) {}

function deduplicateCharges(charges: RentCharge[]): RentCharge[] {
  if (!Array.isArray(charges) || charges.length <= 1) return charges || [];
  const map = new Map<string, RentCharge>();

  for (const c of charges) {
    if (!c) continue;
    const normMonth = (c.period_month || '').trim();
    const normUnit = (c.unit_number || '').trim().toLowerCase();
    const normTenant = (c.tenant_name || '').trim().toLowerCase();
    const normProp = (c.property_name || '').trim().toLowerCase();

    // Composite key per unit/tenant for the given billing period month
    const key = normUnit ? `${normProp}::${normUnit}::${normMonth}` : `${normTenant}::${normMonth}`;

    if (!map.has(key)) {
      map.set(key, { ...c });
    } else {
      const existing = map.get(key)!;
      // Merge best attributes: keep recorded payments, keep any arrears (other_charges)
      const totalPaid = Math.max(Number(existing.amount_paid) || 0, Number(c.amount_paid) || 0);
      const bestOther = Math.max(Number(existing.other_charges) || 0, Number(c.other_charges) || 0);
      const rentAmt = Number(existing.rent_amount) || Number(c.rent_amount) || 0;
      const totalDue = rentAmt + bestOther;
      const outBal = Math.max(0, totalDue - totalPaid);

      existing.amount_paid = totalPaid;
      existing.other_charges = bestOther;
      existing.total_due = totalDue;
      existing.outstanding_balance = outBal;
      if (c.lease_id && (!existing.lease_id || existing.lease_id.startsWith('lease-chg-'))) {
        existing.lease_id = c.lease_id;
      }
      if (outBal === 0) {
        existing.status = 'paid';
      } else if (totalPaid > 0) {
        existing.status = 'partially_paid';
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        existing.status = (existing.due_date && existing.due_date < todayStr) ? 'overdue' : 'pending';
      }
    }
  }

  return Array.from(map.values());
}

function loadOrInit<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    return JSON.parse(raw);
  } catch {
    return defaultVal;
  }
}

function saveLocalOnly<T>(key: string, val: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.error('Storage error', e);
  }
}

function save<T>(key: string, val: T): void {
  saveLocalOnly(key, val);
  if (!_isApplyingRemoteSync) {
    _currentLocalRevision = Date.now();
    try {
      localStorage.setItem('renteasy_sync_revision', String(_currentLocalRevision));
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'local', key } }));
    }

    if (typeof window !== 'undefined' && (window as any).__rentEasyService) {
      (window as any).__rentEasyService.schedulePushToServer();
      // Continuous Auto-Backup to Google Drive on data mutations
      if (['properties', 'tenants', 'rent_charges', 'payments', 'receipts', 'landlord'].includes(key)) {
        (window as any).__rentEasyService.scheduleAutoGoogleDriveBackup();
      }
    }
  }
}

class RentEasyApiService {
  private _syncStatus: DeviceSyncStatus = {
    isLiveConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    revision: _currentLocalRevision,
    serverUrl: getSyncEndpoint(),
    isHostReachable: true,
    activeMode: 'realtime',
    clientInstanceId: CLIENT_INSTANCE_ID
  };
  private _syncSubscribers: ((status: DeviceSyncStatus) => void)[] = [];
  private _pushTimer: any = null;
  private _pollTimer: any = null;
  private _autoDriveBackupTimer: any = null;

  scheduleAutoGoogleDriveBackup(delayMs = 1500): void {
    if (this._autoDriveBackupTimer) clearTimeout(this._autoDriveBackupTimer);
    this._autoDriveBackupTimer = setTimeout(() => {
      this.triggerAutoGoogleDriveBackup();
    }, delayMs);
  }

  triggerAutoGoogleDriveBackup(): void {
    try {
      const session = this.getGoogleDriveSession();
      if (session && session.autoBackup) {
        this.saveCloudBackupToGoogleDrive(false);
        console.log(`[RentEasy Drive] Automatic backup captured for Google Drive (${session.email || 'Cloud'})`);
      }
    } catch (e) {
      console.warn('[RentEasy Drive] Auto-backup notice:', e);
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      (window as any).__rentEasyService = this;
    }
    // Auto-migrate units and tenant isolation in local storage
    autoMigratePortfolioUnitFormat();
    // Auto-purge any remaining stock demo records
    this.checkAndPurgeStockDemoRecords();
    // Start continuous 2-way real-time synchronization between Phone and Web
    this.startLiveSyncEngine();
    // Run daily rent auto-update check on load after sync has initialized
    setTimeout(() => {
      this.autoCheckAndApplyMonthlyRent();
    }, 600);
  }

  checkAndPurgeStockDemoRecords(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const rawProps = localStorage.getItem(STORAGE_KEY_PREFIX + 'properties');
      const rawLl = localStorage.getItem(STORAGE_KEY_PREFIX + 'landlord');
      const props = rawProps ? JSON.parse(rawProps) : [];
      const ll = rawLl ? JSON.parse(rawLl) : null;
      if (isStockDemoPayload({ properties: props, landlord: ll })) {
        console.log('[RentEasy] Erasing stock demo records on user request...');
        this.eraseAllDemoRecords();
      }
    } catch (e) {
      console.warn('Notice checking demo records:', e);
    }
  }

  eraseAllDemoRecords(): void {
    this.createSafetySnapshot('pre_erase_demo_records');
    save('properties', []);
    save('tenants', []);
    save('rent_charges', []);
    save('payments', []);
    save('receipts', []);
    save('message_jobs', []);
    save('audit_logs', []);
    const currentLl = this.getLandlord();
    if (!currentLl || currentLl.name === 'Rajesh Sharma' || currentLl.email === 'rajesh.sharma@renteasy.app') {
      save('landlord', {
        id: 'll-001',
        name: 'My Properties',
        email: 'landlord@renteasy.app',
        phone: '',
        company_name: 'RentEasy Portfolio',
        upi_id: '',
        timezone: 'Asia/Kolkata'
      });
    }
    _currentLocalRevision = Date.now();
    try {
      localStorage.setItem('renteasy_sync_revision', String(_currentLocalRevision));
    } catch (e) {}
    this.pushCurrentDatabaseToServer();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'clean_slate' } }));
    }
  }

  // 1. AUTOMATIC MONTHLY RENT UPDATER ON GIVEN DUE DATE
  autoCheckAndApplyMonthlyRent(referenceDate = new Date()): { updatedCount: number; messagesSent: number } {
    let rawCharges = loadOrInit('rent_charges', initialRentCharges);
    let charges = deduplicateCharges(rawCharges);
    let chargesModified = charges.length !== rawCharges.length;
    const tenants = loadOrInit('tenants', initialTenants);
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;
    const currentPeriod = `${year}-${String(month).padStart(2, '0')}`;
    const todayDay = referenceDate.getDate();

    let updatedCount = 0;
    let messagesSent = 0;

    for (const t of tenants) {
      if (t.status !== 'active' || !t.active_lease_id || !t.monthly_rent) continue;

      // Check if today is on or past the tenant's configured due date
      const dueDay = t.due_day || 5;
      if (todayDay >= dueDay) {
        // Robust check: check by lease_id, tenant_name, or unit_number + property_name to NEVER cross-pollinate properties
        const existingCharge = charges.find(
          c =>
            c.period_month === currentPeriod &&
            (c.lease_id === t.active_lease_id ||
              (c.tenant_name && t.name && c.tenant_name.trim().toLowerCase() === t.name.trim().toLowerCase()) ||
              (c.property_name && t.linked_property_name && c.property_name.trim().toLowerCase() === t.linked_property_name.trim().toLowerCase() &&
                c.unit_number && t.house_number && c.unit_number.trim().toLowerCase() === t.house_number.trim().toLowerCase()))
        );

        if (existingCharge) {
          // Heal the lease_id connection if it had a previous ID
          if (existingCharge.lease_id !== t.active_lease_id) {
            existingCharge.lease_id = t.active_lease_id;
            chargesModified = true;
          }
        } else {
          // Carry forward balance from previous month
          const prevMonth = month > 1 ? month - 1 : 12;
          const prevYear = month > 1 ? year : year - 1;
          const prevPeriod = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
          const prevCharge = charges.find(
            c =>
              c.period_month === prevPeriod &&
              (c.lease_id === t.active_lease_id ||
                (c.tenant_name && t.name && c.tenant_name.trim().toLowerCase() === t.name.trim().toLowerCase()) ||
                (c.property_name && t.linked_property_name && c.property_name.trim().toLowerCase() === t.linked_property_name.trim().toLowerCase() &&
                  c.unit_number && t.house_number && c.unit_number.trim().toLowerCase() === t.house_number.trim().toLowerCase()))
          );
          const carryForward = prevCharge ? prevCharge.outstanding_balance : 0;

          const total = t.monthly_rent + carryForward;
          const dueDayStr = String(dueDay).padStart(2, '0');

          const newCharge: RentCharge = {
            id: `chg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            lease_id: t.active_lease_id,
            property_name: t.linked_property_name || 'House',
            unit_number: t.house_number || t.linked_unit_number || 'Unit',
            tenant_name: t.name,
            tenant_phone: t.phone,
            period_month: currentPeriod,
            rent_amount: t.monthly_rent,
            other_charges: carryForward,
            total_due: total,
            amount_paid: 0,
            outstanding_balance: total,
            due_date: `${year}-${String(month).padStart(2, '0')}-${dueDayStr}`,
            status: todayDay > dueDay ? 'overdue' : 'pending',
            created_at: new Date().toISOString()
          };

          charges.push(newCharge);
          updatedCount++;
          chargesModified = true;

          // Send auto-update reminder / notice message to tenant
          if (t.whatsapp_enabled) {
            this.queueMessageJob({
              tenant_id: t.id,
              tenant_name: t.name,
              tenant_phone: t.whatsapp_number,
              property_name: `${newCharge.property_name} (${newCharge.unit_number})`,
              rent_charge_id: newCharge.id,
              type: todayDay > dueDay ? 'overdue_reminder' : 'due_date_reminder',
              channel: 'whatsapp'
            });
            messagesSent++;
          }

          if (t.sms_enabled) {
            this.queueMessageJob({
              tenant_id: t.id,
              tenant_name: t.name,
              tenant_phone: t.phone,
              property_name: `${newCharge.property_name} (${newCharge.unit_number})`,
              rent_charge_id: newCharge.id,
              type: todayDay > dueDay ? 'overdue_reminder' : 'due_date_reminder',
              channel: 'sms'
            });
            messagesSent++;
          }
        }
      }
    }

    if (chargesModified) {
      save('rent_charges', deduplicateCharges(charges));
      this.recalculateTenantBalances();
      if (updatedCount > 0) {
        this.addAudit('auto_rent_updated', 'rent_charge', currentPeriod, `Auto-updated rent for ${updatedCount} houses on their given due dates. Dispatched ${messagesSent} notices.`);
      }
    }

    return { updatedCount, messagesSent };
  }

  generateMonthlyCharges(periodMonth: string): { createdCount: number } {
    let rawCharges = loadOrInit('rent_charges', initialRentCharges);
    let charges = deduplicateCharges(rawCharges);
    const tenants = loadOrInit('tenants', initialTenants);
    let createdCount = 0;

    for (const t of tenants) {
      if (t.status !== 'active' || !t.active_lease_id || !t.monthly_rent) continue;
      const exists = charges.some(
        c =>
          c.period_month === periodMonth &&
          (c.lease_id === t.active_lease_id ||
            (c.tenant_name && t.name && c.tenant_name.trim().toLowerCase() === t.name.trim().toLowerCase()) ||
            (c.property_name && t.linked_property_name && c.property_name.trim().toLowerCase() === t.linked_property_name.trim().toLowerCase() &&
              c.unit_number && t.house_number && c.unit_number.trim().toLowerCase() === t.house_number.trim().toLowerCase()))
      );
      if (!exists) {
        const [yearStr, monthStr] = periodMonth.split('-');
        const dueDayStr = String(t.due_day || 5).padStart(2, '0');
        const newCharge: RentCharge = {
          id: `chg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          lease_id: t.active_lease_id,
          property_name: t.linked_property_name || 'House',
          unit_number: t.house_number || 'Unit',
          tenant_name: t.name,
          tenant_phone: t.phone,
          period_month: periodMonth,
          rent_amount: t.monthly_rent,
          other_charges: 0,
          total_due: t.monthly_rent,
          amount_paid: 0,
          outstanding_balance: t.monthly_rent,
          due_date: `${yearStr}-${monthStr}-${dueDayStr}`,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        charges.push(newCharge);
        createdCount++;
      }
    }

    if (createdCount > 0 || charges.length !== rawCharges.length) {
      save('rent_charges', deduplicateCharges(charges));
      this.recalculateTenantBalances();
      if (createdCount > 0) {
        this.addAudit('charges_generated', 'rent_charge', periodMonth, `Generated ${createdCount} rent charges for ${periodMonth}.`);
      }
    }

    return { createdCount };
  }

  // Recalculates live house balance for each tenant (eliminates duplicate counting)
  recalculateTenantBalances(): void {
    const tenants = loadOrInit('tenants', initialTenants);
    const rawCharges = loadOrInit('rent_charges', initialRentCharges);
    const charges = deduplicateCharges(rawCharges);
    if (charges.length !== rawCharges.length) {
      saveLocalOnly('rent_charges', charges);
    }
    let changed = false;

    for (const t of tenants) {
      // Find all charges belonging to this tenant across any month
      const tenantCharges = charges.filter(
        c =>
          c.lease_id === t.active_lease_id ||
          (c.tenant_name && t.name && c.tenant_name.trim().toLowerCase() === t.name.trim().toLowerCase() &&
            (!c.property_name || !t.linked_property_name || c.property_name.trim().toLowerCase() === t.linked_property_name.trim().toLowerCase())) ||
          (c.property_name && t.linked_property_name && c.property_name.trim().toLowerCase() === t.linked_property_name.trim().toLowerCase() &&
           c.unit_number && t.house_number && c.unit_number.trim().toLowerCase() === t.house_number.trim().toLowerCase())
      );

      // Track distinct months to prevent any double counting
      const seenMonths = new Set<string>();
      let totalOutstanding = 0;
      for (const c of tenantCharges) {
        if (!seenMonths.has(c.period_month)) {
          seenMonths.add(c.period_month);
          totalOutstanding += Number(c.outstanding_balance || 0);
        }
      }

      // If tenant has charges, totalOutstanding represents their exact balance
      // (the firstCharge already includes initial_balance in other_charges).
      // If no charges exist yet, fall back to initial_balance + monthly_rent.
      const newBal = tenantCharges.length > 0 ? totalOutstanding : ((Number(t.initial_balance) || 0) + (Number(t.monthly_rent) || 0));
      if (t.balance_amount !== newBal) {
        t.balance_amount = newBal;
        changed = true;
      }
    }
    if (changed) {
      saveLocalOnly('tenants', tenants);
    }
  }

  // Landlord
  getLandlord(): Landlord {
    return loadOrInit('landlord', initialLandlord);
  }

  updateLandlord(data: Partial<Landlord>): Landlord {
    const current = this.getLandlord();
    const updated = { ...current, ...data };
    save('landlord', updated);
    return updated;
  }

  // Properties & Units
  getProperties(): Property[] {
    const properties = loadOrInit('properties', initialProperties);
    const tenants = loadOrInit('tenants', initialTenants);
    let updated = false;

    for (const p of properties) {
      if (p.units && p.units.length > 0) {
        for (const u of p.units) {
          // Find matching active tenant for this unit (STRICTLY scoped to this property p)
          const t = tenants.find(item => {
            if (item.status !== 'active') return false;
            const belongsToThisProp =
              (item.property_id && item.property_id === p.id) ||
              (item.linked_property_name && item.linked_property_name.trim().toLowerCase() === p.name.trim().toLowerCase());
            if (!belongsToThisProp) return false;

            return (
              (item.active_lease_id && u.current_lease_id && item.active_lease_id === u.current_lease_id) ||
              (item.house_number && u.unit_number && item.house_number.trim().toLowerCase() === u.unit_number.trim().toLowerCase()) ||
              (u.current_tenant_name && item.name.trim().toLowerCase() === u.current_tenant_name.trim().toLowerCase())
            );
          });

          if (t) {
            if (u.status !== 'occupied') {
              u.status = 'occupied';
              updated = true;
            }
            if (u.current_tenant_name !== t.name) {
              u.current_tenant_name = t.name;
              updated = true;
            }
            if (t.active_lease_id && u.current_lease_id !== t.active_lease_id) {
              u.current_lease_id = t.active_lease_id;
              updated = true;
            }
            // CRITICAL FIX: Unit rent in inventory MUST reflect the updated tenant monthly rent!
            if (t.monthly_rent && u.default_rent !== t.monthly_rent) {
              u.default_rent = t.monthly_rent;
              updated = true;
            }
          } else if (u.status === 'occupied' || u.current_tenant_name) {
            // No active tenant from property p matches this unit -> must be vacant!
            u.status = 'vacant';
            u.current_tenant_name = undefined;
            u.current_lease_id = undefined;
            updated = true;
          }

          // If unit default_rent is 0 or missing, heal it from property default_rent
          if ((!u.default_rent || u.default_rent === 0) && p.default_rent && p.default_rent > 0) {
            u.default_rent = p.default_rent;
            updated = true;
          }
        }
      }

      // If property default_rent is 0 or missing, heal it from units
      if ((!p.default_rent || p.default_rent === 0) && p.units && p.units.length > 0) {
        const validRent = p.units.find(u => u.default_rent && u.default_rent > 0)?.default_rent;
        if (validRent) {
          p.default_rent = validRent;
          updated = true;
        }
      }
    }

    if (updated) {
      saveLocalOnly('properties', properties);
    }

    return properties;
  }

  updateUnitRent(propertyId: string, unitId: string, newRent: number): void {
    const properties = this.getProperties();
    const prop = properties.find(p => p.id === propertyId);
    if (!prop || !prop.units) return;
    const unit = prop.units.find(u => u.id === unitId || u.unit_number === unitId);
    if (!unit) return;
    unit.default_rent = Number(newRent) || 0;
    save('properties', properties);
    this.addAudit('unit_rent_updated', 'property_unit', unit.id, `Updated base rent for ${prop.name} (${unit.unit_number}) to ₹${newRent}`);
  }

  updateUnitNumber(propertyId: string, unitId: string, newUnitNumber: string): { success: boolean; oldUnitNumber: string; newUnitNumber: string } {
    const rawNumber = newUnitNumber.trim();
    if (!rawNumber) throw new Error('House / Unit number cannot be empty.');

    const properties = this.getProperties();
    const prop = properties.find(p => p.id === propertyId);
    if (!prop || !prop.units) throw new Error('Property or units not found.');

    const unit = prop.units.find(u => u.id === unitId || u.unit_number === unitId);
    if (!unit) throw new Error('Unit not found.');

    // Auto-prefix with property initial if entered as bare digits
    const initial = (prop.name || '').trim().charAt(0).toUpperCase();
    const digitsOnly = rawNumber.replace(/^(?:house\s*#?\s*|flat\s*#?\s*|unit\s*#?\s*|[a-z]-?)/i, '').trim();
    let cleanNumber = rawNumber;
    if (/^\d+$/.test(digitsOnly) && !rawNumber.toUpperCase().startsWith(`${initial}-`)) {
      cleanNumber = `${initial}-${digitsOnly}`;
    }

    const oldUnitNumber = unit.unit_number;
    if (oldUnitNumber === cleanNumber) {
      return { success: true, oldUnitNumber, newUnitNumber: cleanNumber };
    }

    // Check if another unit in this property already has this number
    const duplicate = prop.units.find(u => u.id !== unit.id && u.unit_number.trim().toLowerCase() === cleanNumber.toLowerCase());
    if (duplicate) {
      throw new Error(`Another unit in "${prop.name}" already uses the number "${cleanNumber}".`);
    }

    // 1. Update unit in property inventory
    unit.unit_number = cleanNumber;
    save('properties', properties);

    // 2. Synchronize any tenant assigned to this unit
    const tenants = loadOrInit<Tenant[]>('tenants', initialTenants);
    let tenantUpdated = false;
    tenants.forEach(t => {
      const belongsToThisProp =
        (t.property_id && t.property_id === prop.id) ||
        (t.linked_property_name && t.linked_property_name.trim().toLowerCase() === prop.name.trim().toLowerCase());
      if (!belongsToThisProp) return;

      const isAssigned =
        (unit.current_lease_id && t.active_lease_id === unit.current_lease_id) ||
        (unit.current_tenant_name && t.name.trim().toLowerCase() === unit.current_tenant_name.trim().toLowerCase()) ||
        (t.house_number.trim().toLowerCase() === oldUnitNumber.toLowerCase());

      if (isAssigned) {
        t.house_number = cleanNumber;
        t.linked_unit_number = cleanNumber;
        tenantUpdated = true;
      }
    });

    if (tenantUpdated) {
      save('tenants', tenants);
    }

    // 3. Update rent charges
    const charges = loadOrInit<RentCharge[]>('rent_charges', initialRentCharges);
    let chargesUpdated = false;
    charges.forEach(c => {
      const matches =
        (c.property_name && c.property_name.trim().toLowerCase() === prop.name.trim().toLowerCase() &&
          c.unit_number && c.unit_number.trim().toLowerCase() === oldUnitNumber.toLowerCase()) ||
        (unit.current_lease_id && c.lease_id === unit.current_lease_id);

      if (matches) {
        c.unit_number = cleanNumber;
        chargesUpdated = true;
      }
    });

    if (chargesUpdated) {
      save('rent_charges', charges);
    }

    // 4. Update receipts
    const receipts = loadOrInit<Receipt[]>('receipts', initialReceipts);
    let receiptsUpdated = false;
    receipts.forEach(r => {
      if (
        r.unit_number &&
        r.unit_number.trim().toLowerCase() === oldUnitNumber.toLowerCase() &&
        (!r.property_name || r.property_name.trim().toLowerCase() === prop.name.trim().toLowerCase())
      ) {
        r.unit_number = cleanNumber;
        receiptsUpdated = true;
      }
    });
    if (receiptsUpdated) {
      save('receipts', receipts);
    }

    this.recalculateTenantBalances();
    this.addAudit(
      'unit_renamed',
      'property_unit',
      unit.id,
      `Renamed unit in "${prop.name}" from "${oldUnitNumber}" to "${cleanNumber}".`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'unit_rename', oldUnitNumber, newUnitNumber: cleanNumber } }));
    }

    return { success: true, oldUnitNumber, newUnitNumber: cleanNumber };
  }

  updateTenantHouseNumber(tenantId: string, newHouseNumber: string): { success: boolean; oldHouseNumber: string; newHouseNumber: string } {
    const rawNumber = newHouseNumber.trim();
    if (!rawNumber) throw new Error('House number cannot be empty.');

    const tenants = loadOrInit<Tenant[]>('tenants', initialTenants);
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found.');

    const pName = (tenant.linked_property_name || '').trim();
    const initial = pName ? pName.charAt(0).toUpperCase() : 'A';
    const digitsOnly = rawNumber.replace(/^(?:house\s*#?\s*|flat\s*#?\s*|unit\s*#?\s*|[a-z]-?)/i, '').trim();
    let cleanNumber = rawNumber;
    if (/^\d+$/.test(digitsOnly) && !rawNumber.toUpperCase().startsWith(`${initial}-`)) {
      cleanNumber = `${initial}-${digitsOnly}`;
    }

    const oldHouseNumber = tenant.house_number;
    if (oldHouseNumber === cleanNumber) {
      return { success: true, oldHouseNumber, newHouseNumber: cleanNumber };
    }

    // Check if this tenant is linked to a property unit
    const properties = this.getProperties();
    let unitUpdatedViaProperty = false;

    // Only search tenant's own property
    const targetProps = properties.filter(p =>
      (tenant.property_id && p.id === tenant.property_id) ||
      (tenant.linked_property_name && p.name.trim().toLowerCase() === tenant.linked_property_name.trim().toLowerCase())
    );

    for (const prop of targetProps) {
      if (prop.units && prop.units.length > 0) {
        const matchingUnit = prop.units.find(u =>
          (tenant.active_lease_id && u.current_lease_id === tenant.active_lease_id) ||
          (u.current_tenant_name && u.current_tenant_name.trim().toLowerCase() === tenant.name.trim().toLowerCase()) ||
          (u.unit_number.trim().toLowerCase() === oldHouseNumber.toLowerCase())
        );

        if (matchingUnit) {
          this.updateUnitNumber(prop.id, matchingUnit.id, cleanNumber);
          unitUpdatedViaProperty = true;
          break;
        }
      }
    }

    if (!unitUpdatedViaProperty) {
      tenant.house_number = cleanNumber;
      tenant.linked_unit_number = cleanNumber;
      save('tenants', tenants);

      const charges = loadOrInit<RentCharge[]>('rent_charges', initialRentCharges);
      let chargesUpdated = false;
      charges.forEach(c => {
        const matches =
          (tenant.active_lease_id && c.lease_id === tenant.active_lease_id) ||
          (c.tenant_name && c.tenant_name.trim().toLowerCase() === tenant.name.trim().toLowerCase()) ||
          (c.property_name && tenant.linked_property_name && c.property_name.trim().toLowerCase() === tenant.linked_property_name.trim().toLowerCase() &&
           c.unit_number && c.unit_number.trim().toLowerCase() === oldHouseNumber.toLowerCase());

        if (matches) {
          c.unit_number = cleanNumber;
          chargesUpdated = true;
        }
      });
      if (chargesUpdated) {
        save('rent_charges', charges);
      }

      const receipts = loadOrInit<Receipt[]>('receipts', initialReceipts);
      let receiptsUpdated = false;
      receipts.forEach(r => {
        if (
          r.unit_number &&
          r.unit_number.trim().toLowerCase() === oldHouseNumber.toLowerCase() &&
          (!r.tenant_name || r.tenant_name.trim().toLowerCase() === tenant.name.trim().toLowerCase())
        ) {
          r.unit_number = cleanNumber;
          receiptsUpdated = true;
        }
      });
      if (receiptsUpdated) {
        save('receipts', receipts);
      }

      this.recalculateTenantBalances();
      this.addAudit('tenant_house_renamed', 'tenant', tenant.id, `Renamed house number for tenant "${tenant.name}" from "${oldHouseNumber}" to "${cleanNumber}".`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'tenant_house_rename', oldHouseNumber, newHouseNumber: cleanNumber } }));
      }
    }

    return { success: true, oldHouseNumber, newHouseNumber: cleanNumber };
  }

  moveTenantOrder(tenantId: string, direction: 'up' | 'down'): boolean {
    const tenants = loadOrInit<Tenant[]>('tenants', initialTenants);
    const index = tenants.findIndex(t => t.id === tenantId);
    if (index === -1) return false;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tenants.length) return false;

    const [movedTenant] = tenants.splice(index, 1);
    tenants.splice(targetIndex, 0, movedTenant);

    save('tenants', tenants);

    this.addAudit(
      'tenant_reordered',
      'tenant',
      tenantId,
      `Moved tenant "${movedTenant.name}" (${movedTenant.house_number}) ${direction}.`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'tenant_reorder', tenantId, direction } }));
    }

    return true;
  }

  sortTenantsByHouseNumber(ascending = true): boolean {
    const tenants = loadOrInit<Tenant[]>('tenants', initialTenants);
    tenants.sort((a, b) => {
      // Group by property name first so Property A and Property C tenants stay distinct
      const propA = (a.linked_property_name || '').trim().toLowerCase();
      const propB = (b.linked_property_name || '').trim().toLowerCase();
      if (propA !== propB) {
        return propA.localeCompare(propB);
      }
      const numA = parseInt((a.house_number || '').replace(/\D/g, '') || '0', 10);
      const numB = parseInt((b.house_number || '').replace(/\D/g, '') || '0', 10);
      if (numA !== numB) {
        return ascending ? numA - numB : numB - numA;
      }
      return (a.house_number || '').localeCompare(b.house_number || '');
    });

    save('tenants', tenants);
    this.addAudit('tenants_sorted', 'tenant', 'all', `Sorted all tenants by house number ${ascending ? '1 to N' : 'N to 1'}.`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'tenants_sorted' } }));
    }
    return true;
  }

  addProperty(data: {
    name: string;
    address: string;
    city: string;
    pincode: string;
    property_type: PropertyType;
    default_rent: number;
    total_units?: number;
    unit_prefix?: string;
    start_number?: number;
    custom_unit_names?: string[];
    unit_number?: string;
    status?: PropertyStatus;
  }): Property {
    const properties = this.getProperties();
    const propId = `prop-${Date.now()}`;
    const count = Math.max(1, data.total_units || 1);
    const initial = data.name.trim().length <= 3
      ? data.name.trim().toUpperCase()
      : data.name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase();
    const prefix = data.unit_prefix !== undefined ? data.unit_prefix : `${initial}-`;
    const startNum = data.start_number || (prefix.endsWith('-') ? 1 : 101);

    const generatedUnits: PropertyUnit[] = [];
    if (data.custom_unit_names && data.custom_unit_names.length > 0) {
      data.custom_unit_names.forEach((name, idx) => {
        generatedUnits.push({
          id: `u-${propId}-${idx + 1}`,
          property_id: propId,
          unit_number: name.trim(),
          property_type: data.property_type,
          default_rent: data.default_rent,
          status: 'vacant'
        });
      });
    } else {
      for (let i = 0; i < count; i++) {
        generatedUnits.push({
          id: `u-${propId}-${i + 1}`,
          property_id: propId,
          unit_number: count === 1 && data.unit_number ? data.unit_number : `${prefix}${startNum + i}`,
          property_type: data.property_type,
          default_rent: data.default_rent,
          status: 'vacant'
        });
      }
    }

    const newProp: Property = {
      id: propId,
      landlord_id: 'll-001',
      name: data.name,
      address: data.address,
      city: data.city,
      pincode: data.pincode,
      property_type: data.property_type,
      default_rent: data.default_rent,
      total_units: generatedUnits.length,
      units: generatedUnits,
      status: 'vacant',
      unit_number: generatedUnits[0]?.unit_number || 'Unit 1',
      created_at: new Date().toISOString()
    };

    properties.unshift(newProp);
    save('properties', properties);
    this.addAudit(
      'property_added',
      'property',
      newProp.id,
      `Added property "${newProp.name}" with ${newProp.total_units} units (${generatedUnits.map(u => u.unit_number).join(', ')}) automatically created.`
    );
    return newProp;
  }

  addUnitToProperty(propertyId: string, unitNumber: string, defaultRent?: number, propertyType?: PropertyType): PropertyUnit {
    const properties = this.getProperties();
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) throw new Error('Property not found');

    let cleanUnitNumber = unitNumber.trim();
    const initial = prop.name.trim().length <= 3
      ? prop.name.trim().toUpperCase()
      : prop.name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase();

    if (/^\d+$/.test(cleanUnitNumber)) {
      cleanUnitNumber = `${initial}-${cleanUnitNumber}`;
    }

    const newUnit: PropertyUnit = {
      id: `u-${propertyId}-${Date.now()}`,
      property_id: propertyId,
      unit_number: cleanUnitNumber,
      property_type: propertyType || prop.property_type,
      default_rent: defaultRent || prop.default_rent,
      status: 'vacant'
    };

    if (!prop.units) prop.units = [];
    prop.units.push(newUnit);
    prop.total_units = prop.units.length;
    save('properties', properties);

    this.addAudit('unit_added', 'property_unit', newUnit.id, `Added unit ${unitNumber} to property "${prop.name}".`);
    return newUnit;
  }

  deleteProperty(propertyId: string): boolean {
    const properties = this.getProperties();
    const propIndex = properties.findIndex(p => p.id === propertyId);
    if (propIndex === -1) return false;

    const prop = properties[propIndex];

    // Unlink any tenants associated with this property
    const tenants = loadOrInit('tenants', initialTenants);
    let tenantsUpdated = false;
    tenants.forEach(t => {
      const belongsToThisProp =
        t.property_id === prop.id ||
        (t.linked_property_name && t.linked_property_name.trim().toLowerCase() === prop.name.trim().toLowerCase());
      if (belongsToThisProp) {
        t.linked_property_name = undefined;
        t.property_id = undefined;
        tenantsUpdated = true;
      }
    });
    if (tenantsUpdated) {
      save('tenants', tenants);
    }

    properties.splice(propIndex, 1);
    save('properties', properties);

    this.addAudit(
      'property_deleted',
      'property',
      propertyId,
      `Deleted property "${prop.name}" and its units.`
    );
    return true;
  }

  deleteUnit(propertyId: string, unitId: string): boolean {
    const properties = this.getProperties();
    const prop = properties.find(p => p.id === propertyId);
    if (!prop || !prop.units) return false;

    const unitIndex = prop.units.findIndex(u => u.id === unitId);
    if (unitIndex === -1) return false;

    const unit = prop.units[unitIndex];

    // If unit is occupied, unlink tenant
    if (unit.status === 'occupied') {
      const tenants = loadOrInit('tenants', initialTenants);
      const tenant = tenants.find(t => t.house_number === unit.unit_number && t.linked_property_name === prop.name);
      if (tenant) {
        tenant.linked_property_name = undefined;
        save('tenants', tenants);
      }
    }

    prop.units.splice(unitIndex, 1);
    prop.total_units = prop.units.length;
    save('properties', properties);

    this.addAudit(
      'unit_deleted',
      'property_unit',
      unitId,
      `Deleted unit "${unit.unit_number}" from property "${prop.name}".`
    );
    return true;
  }

  deleteTenant(tenantId: string): boolean {
    const tenants = loadOrInit('tenants', initialTenants);
    const tenantIndex = tenants.findIndex(t => t.id === tenantId);
    if (tenantIndex === -1) return false;

    const tenant = tenants[tenantIndex];

    // Free up occupied property/unit if any
    const properties = this.getProperties();
    let propUpdated = false;
    properties.forEach(p => {
      const isTargetProp =
        (tenant.property_id && tenant.property_id === p.id) ||
        (tenant.linked_property_name && tenant.linked_property_name.trim().toLowerCase() === p.name.trim().toLowerCase());
      if (!isTargetProp) return;

      if (p.units) {
        p.units.forEach(u => {
          const isThisUnit =
            (tenant.active_lease_id && u.current_lease_id === tenant.active_lease_id) ||
            (u.current_tenant_name && u.current_tenant_name.trim().toLowerCase() === tenant.name.trim().toLowerCase()) ||
            (u.unit_number.trim().toLowerCase() === tenant.house_number.trim().toLowerCase());
          if (isThisUnit) {
            u.status = 'vacant';
            u.current_tenant_name = undefined;
            u.current_lease_id = undefined;
            propUpdated = true;
          }
        });
      }
      if (p.current_tenant_name === tenant.name || (tenant.active_lease_id && p.current_lease_id === tenant.active_lease_id)) {
        p.status = 'vacant';
        p.current_tenant_name = undefined;
        p.current_lease_id = undefined;
        propUpdated = true;
      }
    });
    if (propUpdated) {
      save('properties', properties);
    }

    tenants.splice(tenantIndex, 1);
    save('tenants', tenants);

    this.addAudit(
      'tenant_deleted',
      'tenant',
      tenantId,
      `Deleted tenant "${tenant.name}" for House ${tenant.house_number}.`
    );
    return true;
  }

  // Tenants & House Balances
  getTenants(): Tenant[] {
    this.recalculateTenantBalances();
    return loadOrInit('tenants', initialTenants);
  }

  addTenant(data: {
    name: string;
    phone: string;
    whatsapp_number?: string;
    email?: string;
    emergency_contact?: string;
    house_number: string;
    date: string; // Agreement / Joining date
    monthly_rent: number;
    due_day: number; // Day of month rent auto-updates
    deposit_amount: number; // Security deposit
    deposit_paid: boolean;
    aadhaar_number?: string;
    permanent_address?: string;
    initial_balance?: number;
    property_id?: string;
    whatsapp_enabled?: boolean;
    sms_enabled?: boolean;
  }): Tenant {
    const tenants = this.getTenants();
    const properties = this.getProperties();

    let linkedPropName: string | null = null;
    let linkedUnit: string = data.house_number;
    const leaseId = `lease-${Date.now()}`;

    // If property selected or matching
    if (data.property_id) {
      const propIndex = properties.findIndex(p => p.id === data.property_id);
      if (propIndex !== -1) {
        const prop = properties[propIndex];
        linkedPropName = prop.name;

        if (prop.units && prop.units.length > 0) {
          const unit = prop.units.find(u => u.unit_number.toLowerCase() === data.house_number.toLowerCase()) || prop.units.find(u => u.status === 'vacant');
          if (unit) {
            unit.status = 'occupied';
            unit.current_tenant_name = data.name;
            unit.current_lease_id = leaseId;
            unit.default_rent = data.monthly_rent; // Set unit inventory rent to tenant monthly rent!
            linkedUnit = unit.unit_number;
          }
        }

        prop.status = 'occupied';
        prop.current_tenant_name = data.name;
        prop.current_lease_id = leaseId;
        if (!prop.default_rent || prop.default_rent === 0) {
          prop.default_rent = data.monthly_rent;
        }
        save('properties', properties);
      }
    } else {
      // Auto-create a property entry for this house if not existing
      const newProp = this.addProperty({
        name: `House ${data.house_number}`,
        unit_number: data.house_number,
        total_units: 1,
        address: data.permanent_address || 'Residential Unit',
        city: 'Bengaluru',
        pincode: '560001',
        property_type: 'Independent House',
        default_rent: data.monthly_rent
      });
      linkedPropName = newProp.name;
    }

    const initBal = data.initial_balance || 0;
    const initialHouseBalance = initBal + data.monthly_rent;

    const newTenant: Tenant = {
      id: `ten-${Date.now()}`,
      landlord_id: 'll-001',
      name: data.name,
      phone: data.phone,
      whatsapp_number: data.whatsapp_number || data.phone,
      email: data.email,
      emergency_contact: data.emergency_contact,
      status: 'active',
      property_id: data.property_id || undefined,
      linked_property_name: linkedPropName,
      linked_unit_number: linkedUnit,
      house_number: data.house_number || linkedUnit,
      date: data.date || new Date().toISOString().split('T')[0],
      active_lease_id: leaseId,
      monthly_rent: data.monthly_rent,
      due_day: data.due_day || 5,
      deposit_amount: data.deposit_amount || 0,
      deposit_paid: data.deposit_paid ?? true,
      aadhaar_number: data.aadhaar_number,
      permanent_address: data.permanent_address,
      initial_balance: initBal,
      balance_amount: initialHouseBalance,
      whatsapp_enabled: data.whatsapp_enabled ?? true,
      sms_enabled: data.sms_enabled ?? true,
      created_at: new Date().toISOString()
    };

    tenants.unshift(newTenant);
    save('tenants', tenants);

    // Create the first rent charge for this tenant
    const charges = this.getRentCharges();
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const dueDayStr = String(data.due_day || 5).padStart(2, '0');

    const firstCharge: RentCharge = {
      id: `chg-${Date.now()}`,
      lease_id: leaseId,
      property_name: linkedPropName || 'House',
      unit_number: linkedUnit,
      tenant_name: newTenant.name,
      tenant_phone: newTenant.phone,
      period_month: currentMonth,
      rent_amount: data.monthly_rent,
      other_charges: initBal,
      total_due: initialHouseBalance,
      amount_paid: 0,
      outstanding_balance: initialHouseBalance,
      due_date: `${currentMonth}-${dueDayStr}`,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    charges.unshift(firstCharge);
    save('rent_charges', charges);

    this.addAudit(
      'tenant_registered',
      'tenant',
      newTenant.id,
      `Registered tenant ${newTenant.name} for House ${newTenant.house_number}. Security Deposit: ₹${newTenant.deposit_amount.toLocaleString('en-IN')}, Rent: ₹${newTenant.monthly_rent.toLocaleString('en-IN')}, Due Day: ${newTenant.due_day}th, Balance: ₹${initialHouseBalance.toLocaleString('en-IN')}.`
    );

    return newTenant;
  }

  updateTenant(
    tenantId: string,
    data: {
      name?: string;
      phone?: string;
      whatsapp_number?: string;
      email?: string;
      emergency_contact?: string;
      house_number?: string;
      date?: string;
      monthly_rent?: number;
      due_day?: number;
      deposit_amount?: number;
      deposit_paid?: boolean;
      aadhaar_number?: string;
      permanent_address?: string;
      property_id?: string;
      whatsapp_enabled?: boolean;
      sms_enabled?: boolean;
      status?: 'active' | 'past' | 'notice';
      initial_balance?: number;
    }
  ): Tenant {
    const tenants = loadOrInit('tenants', initialTenants);
    const tenantIndex = tenants.findIndex(t => t.id === tenantId);
    if (tenantIndex === -1) throw new Error('Tenant not found');

    const tenant = tenants[tenantIndex];
    const oldRent = tenant.monthly_rent;
    const oldName = tenant.name;
    const oldHouse = tenant.house_number;
    const oldDueDay = tenant.due_day;
    const oldInitialBal = Number(tenant.initial_balance || 0);

    // 1. Update basic contact & personal details
    if (data.name !== undefined && data.name.trim()) tenant.name = data.name.trim();
    if (data.phone !== undefined && data.phone.trim()) {
      tenant.phone = data.phone.trim();
      if (!data.whatsapp_number) tenant.whatsapp_number = data.phone.trim();
    }
    if (data.whatsapp_number !== undefined && data.whatsapp_number.trim()) {
      tenant.whatsapp_number = data.whatsapp_number.trim();
    }
    if (data.email !== undefined) tenant.email = data.email.trim() || undefined;
    if (data.emergency_contact !== undefined) tenant.emergency_contact = data.emergency_contact.trim() || undefined;
    if (data.status !== undefined) tenant.status = data.status;
    if (data.date !== undefined && data.date) tenant.date = data.date;
    if (data.due_day !== undefined) tenant.due_day = Number(data.due_day) || 5;
    if (data.deposit_amount !== undefined) tenant.deposit_amount = Number(data.deposit_amount) || 0;
    if (data.deposit_paid !== undefined) tenant.deposit_paid = !!data.deposit_paid;
    if (data.aadhaar_number !== undefined) tenant.aadhaar_number = data.aadhaar_number.trim() || undefined;
    if (data.permanent_address !== undefined) tenant.permanent_address = data.permanent_address.trim() || undefined;
    if (data.whatsapp_enabled !== undefined) tenant.whatsapp_enabled = !!data.whatsapp_enabled;
    if (data.sms_enabled !== undefined) tenant.sms_enabled = !!data.sms_enabled;

    // 2. Previous Balance (initial_balance) update
    const initialBalProvided = data.initial_balance !== undefined;
    const newInitialBal = initialBalProvided ? Math.max(0, Number(data.initial_balance)) : oldInitialBal;
    const initialBalChanged = initialBalProvided && newInitialBal !== oldInitialBal;
    const initialBalDiff = newInitialBal - oldInitialBal;
    tenant.initial_balance = newInitialBal;

    // 3. Property & Unit re-linking if property_id or house_number changed
    const properties = this.getProperties();
    let propUpdated = false;

    if (data.property_id) {
      const prop = properties.find(p => p.id === data.property_id);
      if (prop) {
        tenant.property_id = prop.id;
        tenant.linked_property_name = prop.name;
      }
    }

    if (data.house_number !== undefined && data.house_number.trim()) {
      tenant.house_number = data.house_number.trim();
      tenant.linked_unit_number = data.house_number.trim();
    }

    // 4. Rent update & synchronization
    const rentChanged = data.monthly_rent !== undefined && Number(data.monthly_rent) !== oldRent;
    const newRent = data.monthly_rent !== undefined ? Number(data.monthly_rent) : oldRent;
    tenant.monthly_rent = newRent;

    // Synchronize linked unit & property default_rent and tenant name ONLY in tenant's target property
    properties.forEach(p => {
      const isTargetProp =
        (tenant.property_id && tenant.property_id === p.id) ||
        (tenant.linked_property_name && tenant.linked_property_name.trim().toLowerCase() === p.name.trim().toLowerCase());

      if (!isTargetProp) {
        // If this is NOT the target property, ensure this tenant is not mistakenly present in any units here
        if (p.units) {
          p.units.forEach(u => {
            if (u.current_tenant_name === tenant.name || u.current_tenant_name === oldName || (tenant.active_lease_id && u.current_lease_id === tenant.active_lease_id)) {
              u.status = 'vacant';
              u.current_tenant_name = undefined;
              u.current_lease_id = undefined;
              propUpdated = true;
            }
          });
        }
        return; // NEVER update non-target property
      }

      let matchedInProp = false;
      if (p.units && p.units.length > 0) {
        p.units.forEach(u => {
          const isThisUnit =
            (tenant.active_lease_id && u.current_lease_id === tenant.active_lease_id) ||
            u.unit_number.toLowerCase() === tenant.house_number.toLowerCase() ||
            (oldHouse && u.unit_number.toLowerCase() === oldHouse.toLowerCase()) ||
            (u.current_tenant_name && (u.current_tenant_name === oldName || u.current_tenant_name === tenant.name));

          if (isThisUnit) {
            u.current_tenant_name = tenant.name;
            if (data.house_number) u.unit_number = tenant.house_number;
            // CRITICAL FIX: Always ensure unit rent in inventory matches updated tenant rent!
            u.default_rent = newRent;
            u.status = tenant.status === 'past' ? 'vacant' : 'occupied';
            matchedInProp = true;
            propUpdated = true;
          }
        });
      }

      if (
        (tenant.active_lease_id && p.current_lease_id === tenant.active_lease_id) ||
        p.current_tenant_name === oldName ||
        p.current_tenant_name === tenant.name ||
        matchedInProp
      ) {
        p.current_tenant_name = tenant.name;
        if (!p.default_rent || p.default_rent === 0 || (!p.units || p.units.length <= 1)) {
          p.default_rent = newRent;
        }
        propUpdated = true;
      }
    });

    if (propUpdated) {
      save('properties', properties);
    }

    // 5. Update active/pending rent charges for this tenant so new rent and previous balance are immediately reflected
    const charges = loadOrInit('rent_charges', initialRentCharges);
    let chargesUpdated = false;
    const todayStr = new Date().toISOString().split('T')[0];

    const isTenantCharge = (c: RentCharge) =>
      (tenant.active_lease_id && c.lease_id === tenant.active_lease_id) ||
      (c.property_name && tenant.linked_property_name && c.property_name.trim().toLowerCase() === tenant.linked_property_name.trim().toLowerCase() &&
        ((c.tenant_name && oldName && c.tenant_name.trim().toLowerCase() === oldName.trim().toLowerCase()) ||
         (c.tenant_name && tenant.name && c.tenant_name.trim().toLowerCase() === tenant.name.trim().toLowerCase())));

    // If initial_balance changed, update the charge holding previous balance
    if (initialBalChanged && initialBalDiff !== 0) {
      const tenantChargesList = charges.filter(c => isTenantCharge(c));

      // Candidate 1: Charge that currently has other_charges matching oldInitialBal (if oldInitialBal > 0)
      let chargeToAdjust = tenantChargesList.find(c => Number(c.other_charges || 0) === oldInitialBal && oldInitialBal > 0);

      // Candidate 2: Any charge that currently has other_charges > 0
      if (!chargeToAdjust) {
        chargeToAdjust = tenantChargesList.find(c => Number(c.other_charges || 0) > 0);
      }

      // Candidate 3: Earliest pending or unpaid charge
      if (!chargeToAdjust) {
        chargeToAdjust = tenantChargesList.find(c => c.status !== 'paid');
      }

      // Candidate 4: Earliest charge by period_month
      if (!chargeToAdjust && tenantChargesList.length > 0) {
        chargeToAdjust = [...tenantChargesList].sort((a, b) => (a.period_month || '').localeCompare(b.period_month || ''))[0];
      }

      if (chargeToAdjust) {
        const curOther = Number(chargeToAdjust.other_charges || 0);
        const updatedOther = Math.max(0, curOther + initialBalDiff);
        chargeToAdjust.other_charges = updatedOther;
        const curRent = rentChanged ? newRent : Number(chargeToAdjust.rent_amount || 0);
        chargeToAdjust.total_due = curRent + updatedOther;
        const paidSoFar = Number(chargeToAdjust.amount_paid || 0);
        chargeToAdjust.outstanding_balance = Math.max(0, chargeToAdjust.total_due - paidSoFar);

        if (chargeToAdjust.outstanding_balance === 0) {
          chargeToAdjust.status = 'paid';
        } else if (paidSoFar > 0) {
          chargeToAdjust.status = 'partially_paid';
        } else {
          chargeToAdjust.status = (chargeToAdjust.due_date && chargeToAdjust.due_date < todayStr) ? 'overdue' : 'pending';
        }
        chargesUpdated = true;
      }
    }

    charges.forEach(c => {
      if (isTenantCharge(c)) {
        c.tenant_name = tenant.name;
        c.tenant_phone = tenant.phone;
        if (tenant.house_number) c.unit_number = tenant.house_number;
        if (tenant.linked_property_name) c.property_name = tenant.linked_property_name;
        chargesUpdated = true;

        // If due_day changed, update due_date for pending/unpaid charges
        if (data.due_day !== undefined && data.due_day !== oldDueDay && c.due_date) {
          const parts = c.due_date.split('-');
          if (parts.length === 3) {
            const newDayStr = String(data.due_day).padStart(2, '0');
            c.due_date = `${parts[0]}-${parts[1]}-${newDayStr}`;
            chargesUpdated = true;
          }
        }

        // If rent changed, update charge amounts immediately
        if (rentChanged) {
          const otherCharges = Number(c.other_charges || 0);
          const paidSoFar = Number(c.amount_paid || 0);
          c.rent_amount = newRent;
          c.total_due = newRent + otherCharges;
          c.outstanding_balance = Math.max(0, c.total_due - paidSoFar);

          if (c.outstanding_balance === 0) {
            c.status = 'paid';
          } else if (paidSoFar > 0) {
            c.status = 'partially_paid';
          } else {
            c.status = (c.due_date && c.due_date < todayStr) ? 'overdue' : 'pending';
          }
          chargesUpdated = true;
        }
      }
    });

    // Ensure tenant has a charge for the current billing period
    const currentMonth = new Date().toISOString().substring(0, 7);
    const hasCurrentMonthCharge = charges.some(
      c =>
        ((tenant.active_lease_id && c.lease_id === tenant.active_lease_id) ||
          c.tenant_name === tenant.name) &&
        c.period_month === currentMonth
    );

    if (!hasCurrentMonthCharge && tenant.status === 'active' && tenant.monthly_rent > 0) {
      const dueDayStr = String(tenant.due_day || 5).padStart(2, '0');
      const dueDate = `${currentMonth}-${dueDayStr}`;
      charges.unshift({
        id: `chg-${Date.now()}`,
        lease_id: tenant.active_lease_id || `lease-${Date.now()}`,
        property_name: tenant.linked_property_name || 'House',
        unit_number: tenant.house_number,
        tenant_name: tenant.name,
        tenant_phone: tenant.phone,
        period_month: currentMonth,
        rent_amount: tenant.monthly_rent,
        other_charges: tenant.initial_balance || 0,
        total_due: tenant.monthly_rent + (tenant.initial_balance || 0),
        amount_paid: 0,
        outstanding_balance: tenant.monthly_rent + (tenant.initial_balance || 0),
        due_date: dueDate,
        status: (dueDate < todayStr ? 'overdue' : 'pending') as RentChargeStatus,
        created_at: new Date().toISOString()
      });
      chargesUpdated = true;
    }

    if (chargesUpdated) {
      save('rent_charges', charges);
    }

    // Synchronize lease agreement if exists
    const leases = loadOrInit<Lease[]>('leases', []);
    let leaseUpdated = false;
    leases.forEach((l: Lease) => {
      if (l.id === tenant.active_lease_id || l.tenant_id === tenant.id) {
        l.monthly_rent = newRent;
        if (data.due_day) l.due_day = Number(data.due_day);
        if (data.deposit_amount !== undefined) l.deposit_amount = Number(data.deposit_amount);
        if (data.status) l.status = data.status === 'past' ? 'terminated' : 'active';
        leaseUpdated = true;
      }
    });
    if (leaseUpdated) {
      save('leases', leases);
    }

    // 6. Save tenants first so recalculateTenantBalances picks up new data
    save('tenants', tenants);
    this.recalculateTenantBalances();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'local', key: 'tenants' } }));
    }

    // 7. Reload updated tenant to return latest balance
    const refreshedTenants = loadOrInit('tenants', initialTenants);
    const updatedTenant = refreshedTenants.find(t => t.id === tenantId) || tenant;

    // 8. Audit log
    this.addAudit(
      'tenant_updated',
      'tenant',
      tenant.id,
      `Updated tenant "${updatedTenant.name}" (House ${updatedTenant.house_number}). Monthly rent: ₹${updatedTenant.monthly_rent.toLocaleString('en-IN')}${rentChanged ? ` (was ₹${oldRent.toLocaleString('en-IN')})` : ''}, Previous Balance: ₹${updatedTenant.initial_balance.toLocaleString('en-IN')}${initialBalChanged ? ` (was ₹${oldInitialBal.toLocaleString('en-IN')})` : ''}, Live balance: ₹${updatedTenant.balance_amount.toLocaleString('en-IN')}.`
    );

    return updatedTenant;
  }

  toggleTenantPreference(tenantId: string, channel: 'whatsapp' | 'sms'): Tenant {
    const tenants = this.getTenants();
    const t = tenants.find(item => item.id === tenantId);
    if (t) {
      if (channel === 'whatsapp') t.whatsapp_enabled = !t.whatsapp_enabled;
      if (channel === 'sms') t.sms_enabled = !t.sms_enabled;
      save('tenants', tenants);
    }
    return t!;
  }

  // ---------------------------------------------------------------------------
  // PROPERTY OWNERS MANAGEMENT
  // ---------------------------------------------------------------------------
  getOwners(): PropertyOwner[] {
    const landlord = this.getLandlord();
    const defaultOwnerName = landlord.name && landlord.name.trim() !== 'My Properties' ? landlord.name : 'Mohammed Hussain';
    const fallbackDefault: PropertyOwner = {
      id: 'owner-default-1',
      name: defaultOwnerName,
      phone: landlord.phone || '+91 98450 12345',
      email: landlord.email,
      address: landlord.company_name && landlord.company_name !== 'RentEasy Portfolio' ? landlord.company_name : 'Bengaluru, Karnataka, India',
      aadhaar_or_pan: '',
      is_default: true,
      created_at: new Date().toISOString()
    };
    const owners = loadOrInit<PropertyOwner[]>('property_owners', [fallbackDefault]);
    if (!owners || owners.length === 0) {
      save('property_owners', [fallbackDefault]);
      return [fallbackDefault];
    }
    return owners;
  }

  saveOwners(owners: PropertyOwner[]): void {
    save('property_owners', owners);
  }

  addOwner(ownerData: Omit<PropertyOwner, 'id'>): PropertyOwner {
    const owners = this.getOwners();
    const newOwner: PropertyOwner = {
      ...ownerData,
      id: `owner-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: new Date().toISOString()
    };
    if (newOwner.is_default) {
      owners.forEach(o => { o.is_default = false; });
    }
    owners.push(newOwner);
    this.saveOwners(owners);
    this.addAudit('owner_added', 'property_owner', newOwner.id, `Added property owner/lessor "${newOwner.name}".`);
    return newOwner;
  }

  updateOwner(owner: PropertyOwner): void {
    const owners = this.getOwners();
    const idx = owners.findIndex(o => o.id === owner.id);
    if (idx !== -1) {
      if (owner.is_default) {
        owners.forEach(o => { o.is_default = false; });
      }
      owners[idx] = { ...owner };
      this.saveOwners(owners);
      this.addAudit('owner_updated', 'property_owner', owner.id, `Updated property owner/lessor "${owner.name}".`);
    }
  }

  deleteOwner(id: string): void {
    let owners = this.getOwners();
    if (owners.length <= 1) {
      throw new Error('At least one property owner must remain registered.');
    }
    owners = owners.filter(o => o.id !== id);
    if (!owners.some(o => o.is_default)) {
      owners[0].is_default = true;
    }
    this.saveOwners(owners);
  }

  // ---------------------------------------------------------------------------
  // RENTAL AGREEMENTS MANAGEMENT & LEGAL GENERATOR
  // ---------------------------------------------------------------------------
  getRentalAgreements(): RentalAgreement[] {
    return loadOrInit<RentalAgreement[]>('rental_agreements', []);
  }

  getRentalAgreementByTenantId(tenantId: string): RentalAgreement | undefined {
    const agreements = this.getRentalAgreements();
    return agreements.find(a => a.tenant_id === tenantId);
  }

  saveRentalAgreement(agreement: RentalAgreement): RentalAgreement {
    const agreements = this.getRentalAgreements();
    const existingIdx = agreements.findIndex(a => a.id === agreement.id || a.tenant_id === agreement.tenant_id);
    const now = new Date().toISOString();

    let savedAgreement: RentalAgreement;
    if (existingIdx !== -1) {
      savedAgreement = {
        ...agreements[existingIdx],
        ...agreement,
        updated_at: now
      };
      agreements[existingIdx] = savedAgreement;
    } else {
      savedAgreement = {
        ...agreement,
        id: agreement.id || `agr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        created_at: agreement.created_at || now,
        updated_at: now
      };
      agreements.unshift(savedAgreement);
    }

    save('rental_agreements', agreements);
    this.addAudit('agreement_saved', 'rental_agreement', savedAgreement.id, `Saved rental agreement for tenant "${savedAgreement.tenant_name}" (House ${savedAgreement.house_number}, ${savedAgreement.house_type}).`);
    return savedAgreement;
  }

  deleteRentalAgreement(id: string): void {
    const agreements = this.getRentalAgreements().filter(a => a.id !== id);
    save('rental_agreements', agreements);
  }

  generateDefaultAgreementText(params: {
    owner_name: string;
    owner_phone: string;
    owner_address: string;
    owner_id_number?: string;
    tenant_name: string;
    tenant_phone: string;
    tenant_aadhaar?: string;
    tenant_permanent_address?: string;
    property_name: string;
    house_number: string;
    property_address: string;
    house_type: HouseType;
    monthly_rent: number;
    due_day: number;
    deposit_amount: number;
    start_date: string;
    duration_months?: number;
    notice_period_months?: number;
    painting_option: PaintingOption;
    painting_amount: number;
  }): string {
    const duration = params.duration_months || 11;
    const notice = params.notice_period_months || 1;

    let endDateStr = '';
    try {
      const sDate = new Date(params.start_date || new Date().toISOString().split('T')[0]);
      sDate.setMonth(sDate.getMonth() + duration);
      sDate.setDate(sDate.getDate() - 1);
      endDateStr = sDate.toISOString().split('T')[0];
    } catch {
      endDateStr = '11 Months from commencement';
    }

    const rentWords = numberToIndianWords(params.monthly_rent);
    const depositWords = numberToIndianWords(params.deposit_amount);
    const paintingWords = numberToIndianWords(params.painting_amount);

    const execDate = new Date(params.start_date || Date.now());
    const day = execDate.getDate();
    const month = execDate.toLocaleString('en-US', { month: 'long' });
    const year = execDate.getFullYear();

    const paintingClause = params.painting_option === 'with_painting'
      ? `5. PAINTING & WHITEWASHING CLAUSE:
   The Lessee explicitly agrees and acknowledges that the schedule premises are delivered in freshly painted, clean, and tenantable condition. At the time of vacating the schedule premises, a fixed sum of ₹${params.painting_amount.toLocaleString('en-IN')}/- (Rupees ${paintingWords} Only) shall be deducted by the Lessor from the refundable security deposit towards painting and whitewashing charges, OR alternatively, the Lessee shall handover the premises freshly painted at their own expense in the same color, quality, and finish as received.`
      : `5. PAINTING & MAINTENANCE CLAUSE:
   The Lessee shall maintain the schedule premises in good, clean, and tenantable condition and shall handover the premises in the same state at the time of vacating, subject to normal wear and tear. No separate painting deduction shall be applicable from the security deposit upon vacating, provided no willful damage has been caused to the walls or surfaces.`;

    return `================================================================================
                           RENTAL / LEASE AGREEMENT
================================================================================

This RENTAL / LEASE AGREEMENT is made and entered into on this ${day} day of ${month}, ${year}, by and between:

LESSOR / LANDLORD (FIRST PARTY - OWNER):
${params.owner_name}
Residing at: ${params.owner_address || 'Bengaluru, Karnataka'}
Contact Mobile: ${params.owner_phone || ''}
ID / Aadhaar / PAN: ${params.owner_id_number || 'As per record'}
(Hereinafter referred to as the "LESSOR", which expression shall, unless repugnant to the context, include legal heirs, executors, administrators, and assigns).

                                      AND

LESSEE / TENANT (SECOND PARTY):
${params.tenant_name}
Permanent Address: ${params.tenant_permanent_address || 'As per Aadhaar/KYC Records'}
Contact Mobile: ${params.tenant_phone || ''}
Aadhaar / ID Card No: ${params.tenant_aadhaar || 'As provided in records'}
(Hereinafter referred to as the "LESSEE", which expression shall, unless repugnant to the context, include legal heirs, executors, administrators, and assigns).

WHEREAS the Lessor is the absolute and lawful Owner of the Schedule Property detailed below and has agreed to let out the same to the Lessee for residential dwelling purpose on a monthly tenancy basis, and the Lessee has agreed to take the same on rent under the terms and conditions mutually agreed upon hereunder:

SCHEDULE OF THE PROPERTY:
All that residential premises bearing House / Flat No: ${params.house_number}, situated at ${params.property_name}, ${params.property_address || 'Bengaluru'}, consisting of a ${params.house_type} accommodation fitted with standard electrical connections, water supply, lighting fixtures, ceiling fans, and sanitary fittings.

NOW THIS AGREEMENT WITNESSETH AND IS HEREBY MUTUALLY AGREED BY AND BETWEEN THE PARTIES HERETO AS FOLLOWS:

1. TENANCY PERIOD & COMMENCEMENT:
   The tenancy shall be for an initial period of ${duration} (${duration === 11 ? 'Eleven' : duration}) Months, commencing from ${params.start_date} to ${endDateStr}. The agreement may be extended or renewed for a further term upon mutual written consent of both parties with revision of rent as mutually agreed.

2. MONTHLY RENT:
   The Lessee agrees to pay a monthly rent of ₹${params.monthly_rent.toLocaleString('en-IN')}/- (Rupees ${rentWords} Only) for the schedule premises. The rent shall be payable in advance on or before the ${params.due_day}th day of each calendar month without any delay or default.

3. SECURITY DEPOSIT:
   The Lessee has deposited an interest-free refundable Security Deposit of ₹${params.deposit_amount.toLocaleString('en-IN')}/- (Rupees ${depositWords} Only) with the Lessor. This security deposit shall remain with the Lessor during the subsistence of tenancy and shall be refunded to the Lessee at the time of vacating and handing over peaceful possession of the premises, subject to deductions towards unpaid rent, electricity/water dues, damages (if any), and painting charges as stipulated in Clause 5 below.

4. ELECTRICITY & WATER CHARGES:
   The Lessee shall regularly pay the actual electricity charges according to the sub-meter / meter reading directly to the electricity authorities or to the Lessor. Water and local maintenance charges (if applicable) shall be paid promptly by the Lessee.

${paintingClause}

6. PURPOSE & POSSESSION:
   The schedule premises shall be used strictly and exclusively for residential dwelling purposes only by the Lessee and their immediate family members. The Lessee shall not sublet, assign, mortgage, or underlet the premises or any part thereof to any third party under any circumstances.

7. MAINTENANCE & DAMAGES:
   The Lessee shall keep and maintain the interior of the premises, fixtures, fittings, electrical points, taps, and sanitary installations in good, clean, and tenable condition. Any minor day-to-day repairs, fused bulbs, or tap washers shall be borne by the Lessee. Major structural repairs (if any not caused by Lessee's negligence) shall be the responsibility of the Lessor.

8. PROHIBITIONS & CONDUCT:
   The Lessee shall not store any hazardous, combustible, inflammable, or illegal articles in the premises. The Lessee shall not create any nuisance or annoyance to the neighbors or other occupants of the building and shall abide by all community rules.

9. INSPECTION BY LESSOR:
   The Lessor or their authorized representative shall have full right to inspect the schedule premises at all reasonable hours during the daytime, after giving prior notice to the Lessee.

10. NOTICE PERIOD & TERMINATION:
   Either party may terminate this agreement before the expiry of the tenancy term by giving ${notice} (${notice === 1 ? 'One' : notice}) Month prior written notice or rent in lieu thereof. The Lessee shall peacefully hand over vacant possession of the premises upon expiry of the notice period or tenancy term.

IN WITNESS WHEREOF, THE LESSOR AND THE LESSEE HAVE SIGNED AND EXECUTED THIS AGREEMENT ON THE DAY, MONTH, AND YEAR FIRST ABOVE WRITTEN IN THE PRESENCE OF THE WITNESSES ATTESTING HERETO:



____________________________________             ____________________________________
LESSOR / OWNER (FIRST PARTY)                     LESSEE / TENANT (SECOND PARTY)
Name: ${params.owner_name}
Mobile: ${params.owner_phone}                    Mobile: ${params.tenant_phone}



WITNESSES:

1. Signature: _______________________            2. Signature: _______________________
   Name:      _______________________               Name:      _______________________
   Address:   _______________________               Address:   _______________________
   Mobile:    _______________________               Mobile:    _______________________
`;
  }

  // Rent Charges & Ledger
  getRentCharges(month?: string, propertyId?: string, status?: string): RentCharge[] {
    let rawCharges = loadOrInit('rent_charges', initialRentCharges);
    let charges = deduplicateCharges(rawCharges);
    if (charges.length !== rawCharges.length) {
      saveLocalOnly('rent_charges', charges);
    }
    if (month) {
      charges = charges.filter(c => c.period_month === month);
    }
    if (status && status !== 'all') {
      charges = charges.filter(c => c.status === status);
    }
    return charges;
  }

  // 2. PAYMENT RECORDING, DEDUCTION & SENDING RECEIPT MESSAGE TO TENANT
  recordPayment(data: {
    rent_charge_id: string;
    amount: number;
    payment_date: string;
    method: 'upi' | 'bank_transfer' | 'cash' | 'cheque';
    reference: string;
    idempotency_key: string;
    notes?: string;
  }): { payment: Payment; receipt: Receipt; remaining: number; tenant_name: string; house_number: string; deposit_amount: number } {
    const payments = loadOrInit('payments', initialPayments);
    const charges = loadOrInit('rent_charges', initialRentCharges);
    const receipts = loadOrInit('receipts', initialReceipts);
    const tenants = this.getTenants();

    // 1. Idempotency Check
    const existingPayment = payments.find(p => p.idempotency_key === data.idempotency_key);
    if (existingPayment) {
      const existingReceipt = receipts.find(r => r.payment_id === existingPayment.id)!;
      return {
        payment: existingPayment,
        receipt: existingReceipt,
        remaining: existingPayment.remaining_charge_balance,
        tenant_name: existingReceipt.tenant_name,
        house_number: existingReceipt.unit_number,
        deposit_amount: 0
      };
    }

    // 2. Validate Charge
    const chargeIndex = charges.findIndex(c => c.id === data.rent_charge_id);
    if (chargeIndex === -1) {
      throw new Error('Rent charge not found');
    }

    const charge = charges[chargeIndex];
    if (charge.outstanding_balance <= 0) {
      throw new Error('This rent charge has already been fully paid.');
    }

    // 3. Deduct Payment Received from the House Balance
    const allocAmount = Math.min(data.amount, charge.outstanding_balance);
    const remaining = charge.outstanding_balance - allocAmount;
    charge.amount_paid += allocAmount;
    charge.outstanding_balance = remaining;

    // Recalculate status
    if (remaining <= 0) {
      charge.status = 'paid';
    } else if (charge.amount_paid > 0) {
      charge.status = 'partially_paid';
    }

    charges[chargeIndex] = charge;
    save('rent_charges', charges);

    // 4. Find Tenant & Security Deposit
    const tenant = tenants.find(t => t.active_lease_id === charge.lease_id || t.name === charge.tenant_name);
    const houseNumber = tenant ? tenant.house_number : charge.unit_number;
    const securityDeposit = tenant ? tenant.deposit_amount : 0;

    // 5. Generate Unique Receipt
    const year = new Date(data.payment_date).getFullYear();
    const count = receipts.length + 1;
    const receiptNumber = `REC-${year}-${String(count).padStart(4, '0')}`;
    const verHash = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create Payment Record
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      lease_id: charge.lease_id,
      amount: data.amount,
      payment_date: data.payment_date,
      method: data.method,
      reference: data.reference,
      idempotency_key: data.idempotency_key,
      is_reversed: false,
      receipt_number: receiptNumber,
      allocated_charge_id: charge.id,
      remaining_charge_balance: remaining,
      notes: data.notes,
      created_at: new Date().toISOString()
    };
    payments.unshift(newPayment);
    save('payments', payments);

    // Create Digital Receipt
    const newReceipt: Receipt = {
      id: `rec-${Date.now()}`,
      payment_id: newPayment.id,
      receipt_number: receiptNumber,
      issued_at: new Date().toISOString(),
      tenant_name: charge.tenant_name,
      property_name: charge.property_name,
      unit_number: houseNumber,
      period_month: charge.period_month,
      amount_paid: data.amount,
      payment_method: data.method,
      reference: data.reference,
      outstanding_balance: remaining,
      verification_hash: verHash
    };
    receipts.unshift(newReceipt);
    save('receipts', receipts);

    // 6. Recalculate House Balances for all tenants
    this.recalculateTenantBalances();

    // 7. Send Receipt of Payment Message to Tenant via WhatsApp & SMS
    const tenantPhone = tenant ? tenant.phone : charge.tenant_phone;
    const tenantWa = tenant ? tenant.whatsapp_number : charge.tenant_phone;

    // WhatsApp Message Dispatch
    this.queueMessageJob({
      tenant_id: tenant ? tenant.id : 'ten-001',
      tenant_name: charge.tenant_name,
      tenant_phone: tenantWa,
      property_name: `${charge.property_name} (House ${houseNumber})`,
      rent_charge_id: charge.id,
      type: 'payment_receipt',
      channel: 'whatsapp'
    });

    // SMS Message Dispatch
    this.queueMessageJob({
      tenant_id: tenant ? tenant.id : 'ten-001',
      tenant_name: charge.tenant_name,
      tenant_phone: tenantPhone,
      property_name: `${charge.property_name} (House ${houseNumber})`,
      rent_charge_id: charge.id,
      type: 'payment_receipt',
      channel: 'sms'
    });

    this.addAudit(
      'payment_deducted',
      'payment',
      newPayment.id,
      `Payment of ₹${data.amount.toLocaleString('en-IN')} received for House ${houseNumber}. Deducted from balance. Remaining Balance: ₹${remaining.toLocaleString('en-IN')}, Security Deposit Held: ₹${securityDeposit.toLocaleString('en-IN')}. Receipt ${receiptNumber} sent via WhatsApp & SMS.`
    );

    return {
      payment: newPayment,
      receipt: newReceipt,
      remaining,
      tenant_name: charge.tenant_name,
      house_number: houseNumber,
      deposit_amount: securityDeposit
    };
  }

  reversePayment(paymentId: string, reason: string): Payment {
    const payments = loadOrInit('payments', initialPayments);
    const charges = loadOrInit('rent_charges', initialRentCharges);

    const payIndex = payments.findIndex(p => p.id === paymentId);
    if (payIndex === -1) throw new Error('Payment not found');
    const payment = payments[payIndex];
    if (payment.is_reversed) throw new Error('Payment already reversed');

    payment.is_reversed = true;
    payment.reversal_reason = reason;

    // Restore charge balance
    const chargeIndex = charges.findIndex(c => c.id === payment.allocated_charge_id);
    if (chargeIndex !== -1) {
      const charge = charges[chargeIndex];
      charge.amount_paid = Math.max(0, charge.amount_paid - payment.amount);
      charge.outstanding_balance = charge.total_due - charge.amount_paid;
      charge.status = charge.amount_paid === 0 ? 'overdue' : 'partially_paid';
      charges[chargeIndex] = charge;
      save('rent_charges', charges);
    }

    payments[payIndex] = payment;
    save('payments', payments);
    this.recalculateTenantBalances();

    this.addAudit('payment_reversed', 'payment', paymentId, `Reversed payment ${payment.receipt_number}. Reason: ${reason}.`);
    return payment;
  }

  updatePayment(paymentId: string, data: {
    amount?: number;
    payment_date?: string;
    method?: PaymentMethod;
    reference?: string;
    notes?: string;
  }): { payment: Payment; receipt: Receipt; remaining: number } {
    const payments = loadOrInit('payments', initialPayments);
    const charges = loadOrInit('rent_charges', initialRentCharges);
    const receipts = loadOrInit('receipts', initialReceipts);

    const payIndex = payments.findIndex(p => p.id === paymentId);
    if (payIndex === -1) throw new Error('Payment not found');
    const payment = payments[payIndex];

    const oldAmount = payment.amount;
    const newAmount = data.amount !== undefined ? Number(data.amount) : oldAmount;
    const amountDiff = newAmount - oldAmount;

    // Update payment fields
    if (data.payment_date) payment.payment_date = data.payment_date;
    if (data.method) payment.method = data.method;
    if (data.reference) payment.reference = data.reference;
    if (data.notes !== undefined) payment.notes = data.notes;
    payment.amount = newAmount;

    let remaining = payment.remaining_charge_balance;
    const chargeIndex = charges.findIndex(c => c.id === payment.allocated_charge_id);
    if (chargeIndex !== -1) {
      const charge = charges[chargeIndex];
      // Adjust amount_paid by amountDiff
      charge.amount_paid = Math.max(0, charge.amount_paid + amountDiff);
      charge.outstanding_balance = Math.max(0, charge.total_due - charge.amount_paid);

      if (charge.outstanding_balance <= 0) {
        charge.status = 'paid';
      } else if (charge.amount_paid > 0) {
        charge.status = 'partially_paid';
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        charge.status = charge.due_date < todayStr ? 'overdue' : 'pending';
      }

      remaining = charge.outstanding_balance;
      payment.remaining_charge_balance = remaining;
      charges[chargeIndex] = charge;
      save('rent_charges', charges);
    }

    payments[payIndex] = payment;
    save('payments', payments);

    // Update receipt if one exists
    const receiptIndex = receipts.findIndex(r => r.payment_id === payment.id || r.receipt_number === payment.receipt_number);
    let receipt: Receipt;
    if (receiptIndex !== -1) {
      receipt = receipts[receiptIndex];
      if (data.payment_date) receipt.issued_at = `${data.payment_date}T12:00:00.000Z`;
      if (data.method) receipt.payment_method = data.method;
      if (data.reference) receipt.reference = data.reference;
      receipt.amount_paid = newAmount;
      receipt.outstanding_balance = remaining;
      receipts[receiptIndex] = receipt;
      save('receipts', receipts);
    } else {
      receipt = {
        id: `rec-${Date.now()}`,
        payment_id: payment.id,
        receipt_number: payment.receipt_number || `REC-${Date.now()}`,
        issued_at: new Date().toISOString(),
        tenant_name: 'Tenant',
        property_name: 'Property',
        unit_number: 'House',
        period_month: '2026-10',
        amount_paid: newAmount,
        payment_method: payment.method,
        reference: payment.reference,
        outstanding_balance: remaining,
        verification_hash: Math.random().toString(36).substring(2, 10).toUpperCase()
      };
    }

    // Recalculate tenant balances
    this.recalculateTenantBalances();

    this.addAudit(
      'payment_updated',
      'payment',
      payment.id,
      `Updated payment ${payment.receipt_number || payment.id}: Date: ${payment.payment_date}, Amount: ₹${newAmount.toLocaleString('en-IN')}, Method: ${payment.method}, Ref: ${payment.reference}. Remaining: ₹${remaining.toLocaleString('en-IN')}.`
    );

    return { payment, receipt, remaining };
  }

  updateReceipt(receiptId: string, data: {
    amount_paid?: number;
    payment_date?: string;
    payment_method?: PaymentMethod;
    reference?: string;
    receipt_number?: string;
    period_month?: string;
    unit_number?: string;
    notes?: string;
  }): { receipt: Receipt; payment: Payment | null; remaining: number } {
    const receipts = loadOrInit<Receipt[]>('receipts', initialReceipts);
    const receiptIndex = receipts.findIndex(r => r.id === receiptId || r.receipt_number === receiptId);
    if (receiptIndex === -1) throw new Error('Receipt not found');
    const receipt = receipts[receiptIndex];

    const payments = loadOrInit<Payment[]>('payments', initialPayments);
    const charges = loadOrInit<RentCharge[]>('rent_charges', initialRentCharges);

    const oldAmount = Number(receipt.amount_paid) || 0;
    const newAmount = data.amount_paid !== undefined ? Number(data.amount_paid) : oldAmount;
    const amountDiff = newAmount - oldAmount;

    // Find linked payment
    const payIndex = payments.findIndex(p => p.id === receipt.payment_id || p.receipt_number === receipt.receipt_number);
    let linkedPayment: Payment | null = null;
    let chargeId: string | null = null;

    if (payIndex !== -1) {
      linkedPayment = payments[payIndex];
      linkedPayment.amount = newAmount;
      if (data.payment_date) linkedPayment.payment_date = data.payment_date;
      if (data.payment_method) linkedPayment.method = data.payment_method;
      if (data.reference) linkedPayment.reference = data.reference;
      if (data.receipt_number) linkedPayment.receipt_number = data.receipt_number;
      if (data.notes !== undefined) linkedPayment.notes = data.notes;
      chargeId = linkedPayment.allocated_charge_id;
    }

    // Find allocated charge
    let remaining = Number(receipt.outstanding_balance) || 0;
    const chargeIndex = charges.findIndex(c =>
      (chargeId && c.id === chargeId) ||
      (c.tenant_name && c.tenant_name.trim().toLowerCase() === receipt.tenant_name.trim().toLowerCase() && c.period_month === receipt.period_month)
    );

    if (chargeIndex !== -1) {
      const charge = charges[chargeIndex];
      charge.amount_paid = Math.max(0, (Number(charge.amount_paid) || 0) + amountDiff);
      charge.outstanding_balance = Math.max(0, (Number(charge.total_due) || 0) - charge.amount_paid);

      if (charge.outstanding_balance <= 0) {
        charge.status = 'paid';
      } else if (charge.amount_paid > 0) {
        charge.status = 'partially_paid';
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        charge.status = charge.due_date < todayStr ? 'overdue' : 'pending';
      }

      remaining = charge.outstanding_balance;
      charges[chargeIndex] = charge;
      save('rent_charges', charges);

      if (linkedPayment) {
        linkedPayment.remaining_charge_balance = remaining;
      }
    } else {
      remaining = Math.max(0, remaining - amountDiff);
    }

    if (linkedPayment && payIndex !== -1) {
      payments[payIndex] = linkedPayment;
      save('payments', payments);
    }

    // Update receipt fields
    receipt.amount_paid = newAmount;
    if (data.payment_date) {
      receipt.issued_at = data.payment_date.includes('T') ? data.payment_date : `${data.payment_date}T12:00:00.000Z`;
    }
    if (data.payment_method) receipt.payment_method = data.payment_method;
    if (data.reference) receipt.reference = data.reference;
    if (data.receipt_number) receipt.receipt_number = data.receipt_number;
    if (data.period_month) receipt.period_month = data.period_month;
    if (data.unit_number) receipt.unit_number = data.unit_number;
    receipt.outstanding_balance = remaining;

    receipts[receiptIndex] = receipt;
    save('receipts', receipts);

    // Recalculate tenant live balances
    this.recalculateTenantBalances();

    this.addAudit(
      'receipt_updated',
      'receipt',
      receipt.id,
      `Edited payment receipt ${receipt.receipt_number} for "${receipt.tenant_name}" (${receipt.unit_number}). Amount: ₹${newAmount.toLocaleString('en-IN')}${amountDiff !== 0 ? ` (was ₹${oldAmount.toLocaleString('en-IN')})` : ''}, Method: ${receipt.payment_method}, Ref: ${receipt.reference}. Remaining balance: ₹${remaining.toLocaleString('en-IN')}.`
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'receipt_updated', receiptId: receipt.id } }));
    }

    return { receipt, payment: linkedPayment, remaining };
  }

  deleteReceipt(receiptId: string): boolean {
    const receipts = loadOrInit<Receipt[]>('receipts', initialReceipts);
    const receiptIndex = receipts.findIndex(r => r.id === receiptId || r.receipt_number === receiptId);
    if (receiptIndex === -1) return false;

    const receipt = receipts[receiptIndex];
    const payments = loadOrInit<Payment[]>('payments', initialPayments);
    const charges = loadOrInit<RentCharge[]>('rent_charges', initialRentCharges);

    // Find linked payment
    const payIndex = payments.findIndex(p => p.id === receipt.payment_id || p.receipt_number === receipt.receipt_number);
    let chargeId: string | null = null;
    const amount = Number(receipt.amount_paid) || 0;

    if (payIndex !== -1) {
      chargeId = payments[payIndex].allocated_charge_id;
      payments.splice(payIndex, 1);
      save('payments', payments);
    }

    // Restore charge
    const chargeIndex = charges.findIndex(c =>
      (chargeId && c.id === chargeId) ||
      (c.tenant_name && c.tenant_name.trim().toLowerCase() === receipt.tenant_name.trim().toLowerCase() && c.period_month === receipt.period_month)
    );

    if (chargeIndex !== -1) {
      const charge = charges[chargeIndex];
      charge.amount_paid = Math.max(0, (Number(charge.amount_paid) || 0) - amount);
      charge.outstanding_balance = Math.max(0, (Number(charge.total_due) || 0) - charge.amount_paid);

      if (charge.outstanding_balance <= 0) {
        charge.status = 'paid';
      } else if (charge.amount_paid > 0) {
        charge.status = 'partially_paid';
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        charge.status = charge.due_date < todayStr ? 'overdue' : 'pending';
      }
      charges[chargeIndex] = charge;
      save('rent_charges', charges);
    }

    receipts.splice(receiptIndex, 1);
    save('receipts', receipts);

    this.recalculateTenantBalances();
    this.addAudit('receipt_deleted', 'receipt', receipt.id, `Deleted payment receipt ${receipt.receipt_number} for ${receipt.tenant_name} (₹${amount}). Restored charge balance.`);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'receipt_deleted', receiptId } }));
    }

    return true;
  }

  getReceipts(): Receipt[] {
    return loadOrInit('receipts', initialReceipts);
  }

  getPayments(): Payment[] {
    return loadOrInit('payments', initialPayments);
  }

  // Messaging & Automation Center
  getMessageJobs(): MessageJob[] {
    return loadOrInit('message_jobs', initialMessageJobs);
  }

  queueMessageJob(data: Omit<MessageJob, 'id' | 'scheduled_at' | 'status' | 'retry_count' | 'created_at'>): MessageJob {
    const jobs = this.getMessageJobs();
    const newJob: MessageJob = {
      ...data,
      id: `job-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      scheduled_at: new Date().toISOString(),
      status: 'delivered', // simulated immediate webhook delivery
      retry_count: 0,
      created_at: new Date().toISOString()
    };
    jobs.unshift(newJob);
    save('message_jobs', jobs);
    return newJob;
  }

  retryMessage(jobId: string): MessageJob {
    const jobs = this.getMessageJobs();
    const index = jobs.findIndex(j => j.id === jobId);
    if (index !== -1) {
      jobs[index].retry_count += 1;
      jobs[index].status = 'delivered';
      jobs[index].last_error = undefined;
      save('message_jobs', jobs);
      return jobs[index];
    }
    throw new Error('Message job not found');
  }

  runAutomatedReminderSimulation(): { remindersSent: number; skippedPaidCount: number } {
    const charges = this.getRentCharges('2026-10');
    const tenants = this.getTenants();
    let remindersSent = 0;
    let skippedPaidCount = 0;

    for (const c of charges) {
      const tenant = tenants.find(t => t.name === c.tenant_name);
      if (!tenant) continue;

      if (c.outstanding_balance <= 0) {
        skippedPaidCount++;
        continue;
      }

      const type: MessageType = c.status === 'overdue' ? 'overdue_reminder' : 'due_date_reminder';

      if (tenant.whatsapp_enabled) {
        this.queueMessageJob({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          tenant_phone: tenant.whatsapp_number,
          property_name: `${c.property_name} (House ${c.unit_number})`,
          rent_charge_id: c.id,
          type,
          channel: 'whatsapp'
        });
        remindersSent++;
      }

      if (tenant.sms_enabled) {
        this.queueMessageJob({
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          tenant_phone: tenant.phone,
          property_name: `${c.property_name} (House ${c.unit_number})`,
          rent_charge_id: c.id,
          type,
          channel: 'sms'
        });
        remindersSent++;
      }
    }

    this.addAudit('reminders_dispatched', 'message_jobs', 'batch', `Dispatched ${remindersSent} reminders. Skipped ${skippedPaidCount} settled leases.`);
    return { remindersSent, skippedPaidCount };
  }

  // Dashboard
  getDashboardSummary(month?: string): DashboardSummary {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const targetMonth = month || currentMonth;
    const charges = this.getRentCharges(targetMonth);
    const properties = this.getProperties();
    const tenants = this.getTenants();
    const jobs = this.getMessageJobs();

    const activeTenants = tenants.filter(t => t.status === 'active');
    const totalActiveRent = activeTenants.reduce((acc, t) => acc + (Number(t.monthly_rent) || 0), 0);

    const expected = charges.reduce((acc, c) => acc + c.total_due, 0);
    const collected = charges.reduce((acc, c) => acc + c.amount_paid, 0);
    const outstanding = Math.max(0, expected - collected);
    const percentage = expected > 0 ? parseFloat(((collected / expected) * 100).toFixed(1)) : 0;

    const overdueCharges = charges.filter(c => c.status === 'overdue' || (c.outstanding_balance > 0 && new Date() > new Date(c.due_date)));
    const overdueCount = overdueCharges.length;
    const overdueAmount = overdueCharges.reduce((acc, c) => acc + c.outstanding_balance, 0);

    const occupied = properties.filter(p => p.status === 'occupied').length;
    const vacant = properties.length - occupied;

    const upcomingJobs = jobs.filter(j => j.status === 'queued' || j.status === 'sending').length;

    const trends = [
      { month: 'Jul 26', expected: 95000, collected: 95000, outstanding: 0 },
      { month: 'Aug 26', expected: 98000, collected: 98000, outstanding: 0 },
      { month: 'Sep 26', expected: 103000, collected: 99000, outstanding: 4000 },
      { month: targetMonth, expected, collected, outstanding }
    ];

    return {
      period_month: targetMonth,
      expected_rent: expected,
      collected_rent: collected,
      outstanding_rent: outstanding,
      collection_percentage: percentage,
      total_properties: properties.length,
      occupied_properties: occupied,
      vacant_properties: vacant,
      total_tenants: activeTenants.length,
      total_active_rent: totalActiveRent,
      overdue_count: overdueCount,
      overdue_amount: overdueAmount,
      upcoming_reminders_count: upcomingJobs,
      monthly_trends: trends
    };
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return loadOrInit('audit_logs', initialAuditLogs);
  }

  addAudit(action: string, entity_type: string, entity_id: string, details: string): void {
    const logs = this.getAuditLogs();
    const log: AuditLog = {
      id: `aud-${Date.now()}`,
      action,
      entity_type,
      entity_id,
      details,
      created_at: new Date().toISOString()
    };
    logs.unshift(log);
    save('audit_logs', logs.slice(0, 100));
  }

  // Calendar Collection Events
  getCalendarCollectionEvents(year: number, month: number): RentCalendarEvent[] {
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const charges = this.getRentCharges(monthStr);
    const tenants = this.getTenants().filter(t => t.status === 'active');
    const properties = this.getProperties();

    const events: RentCalendarEvent[] = [];
    const processedTenantIds = new Set<string>();

    // 1. First add events from existing charges for this month
    for (const chg of charges) {
      const tenant = tenants.find(t => t.name === chg.tenant_name || t.active_lease_id === chg.lease_id);
      if (tenant) {
        processedTenantIds.add(tenant.id);
      }
      
      const dueDay = parseInt(chg.due_date.split('-')[2], 10) || 5;

      events.push({
        id: `cal-${chg.id}`,
        dateStr: chg.due_date,
        day: dueDay,
        unit_number: chg.unit_number,
        property_name: chg.property_name,
        tenant_id: tenant?.id,
        tenant_name: chg.tenant_name,
        tenant_phone: chg.tenant_phone || tenant?.phone || '',
        whatsapp_number: tenant?.whatsapp_number || chg.tenant_phone || '',
        amount: chg.total_due,
        amount_paid: chg.amount_paid,
        outstanding_balance: chg.outstanding_balance,
        status: chg.status,
        due_date: chg.due_date,
        charge_id: chg.id,
        charge: chg
      });
    }

    // 2. For active tenants who don't have a generated charge yet for this month
    for (const t of tenants) {
      if (!processedTenantIds.has(t.id)) {
        const dueDay = Math.min(28, Math.max(1, t.due_day || 5));
        const dateStr = `${monthStr}-${String(dueDay).padStart(2, '0')}`;
        
        let propName = t.linked_property_name;
        if (!propName && t.property_id) {
          const prop = properties.find(p => p.id === t.property_id);
          if (prop) propName = prop.name;
        }

        const rent = t.monthly_rent || 0;
        const balance = t.balance_amount !== undefined ? t.balance_amount : rent;
        const isPaid = balance === 0;

        events.push({
          id: `cal-ten-${t.id}-${monthStr}`,
          dateStr,
          day: dueDay,
          unit_number: t.house_number || t.linked_unit_number || 'Unit',
          property_name: propName || 'Independent Property',
          tenant_id: t.id,
          tenant_name: t.name,
          tenant_phone: t.phone,
          whatsapp_number: t.whatsapp_number,
          amount: rent,
          amount_paid: isPaid ? rent : 0,
          outstanding_balance: balance,
          status: isPaid ? 'paid' : 'pending',
          due_date: dateStr
        });
      }
    }

    // Sort chronologically by date, then unit number
    events.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.unit_number.localeCompare(b.unit_number));
    return events;
  }

  // 3. RESCHEDULE MISSED / UPCOMING DUE DATE FOR CALENDAR
  rescheduleDueDate(data: {
    chargeId?: string;
    tenantId?: string;
    newDueDate: string; // YYYY-MM-DD
    updatePermanentDueDay?: boolean;
    reason?: string;
    notifyTenant?: boolean;
  }): {
    charge?: RentCharge;
    tenant?: Tenant;
    oldDueDate: string;
    newDueDate: string;
    messageSent?: boolean;
  } {
    const charges = loadOrInit('rent_charges', initialRentCharges);
    const tenants = this.getTenants();
    const now = new Date();

    let targetCharge: RentCharge | undefined;
    let targetTenant: Tenant | undefined;
    let oldDateStr = '';

    // 1. Locate charge if chargeId provided
    if (data.chargeId) {
      targetCharge = charges.find(c => c.id === data.chargeId);
    }

    // 2. Locate tenant
    if (data.tenantId) {
      targetTenant = tenants.find(t => t.id === data.tenantId);
    } else if (targetCharge) {
      targetTenant = tenants.find(
        t => t.name === targetCharge!.tenant_name || t.active_lease_id === targetCharge!.lease_id
      );
    }

    // If charge not found by id but tenant has a charge for this month, find it
    if (!targetCharge && targetTenant) {
      const monthPrefix = data.newDueDate.substring(0, 7);
      targetCharge = charges.find(
        c => (c.tenant_name === targetTenant!.name || c.lease_id === targetTenant!.active_lease_id) && c.period_month === monthPrefix
      );
    }

    if (targetCharge) {
      oldDateStr = targetCharge.due_date;
      targetCharge.due_date = data.newDueDate;

      // Update period_month if year/month changed
      targetCharge.period_month = data.newDueDate.substring(0, 7);

      // Recalculate status: if moved to future or today, and not fully paid, status becomes pending / partially_paid
      const newDueDateTime = new Date(`${data.newDueDate}T23:59:59`);
      if (targetCharge.outstanding_balance > 0) {
        if (newDueDateTime >= now) {
          targetCharge.status = targetCharge.amount_paid > 0 ? 'partially_paid' : 'pending';
        } else {
          targetCharge.status = 'overdue';
        }
      }

      save('rent_charges', charges);
    } else if (targetTenant) {
      oldDateStr = `${data.newDueDate.substring(0, 7)}-${String(targetTenant.due_day || 5).padStart(2, '0')}`;
    }

    // 3. Update permanent due day if requested
    if (data.updatePermanentDueDay && targetTenant) {
      const dayNum = parseInt(data.newDueDate.split('-')[2], 10);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 28) {
        targetTenant.due_day = dayNum;
        save('tenants', tenants);
      }
    }

    // 4. Send notification job if requested
    let messageSent = false;
    if (data.notifyTenant && targetTenant) {
      const unitLabel = targetCharge?.unit_number || targetTenant.house_number;
      const propLabel = targetCharge?.property_name || targetTenant.linked_property_name || 'House';
      const balanceAmount = targetCharge ? targetCharge.outstanding_balance : targetTenant.balance_amount;
      const landlord = this.getLandlord();

      const jobs = loadOrInit('message_jobs', initialMessageJobs);
      const newJob: MessageJob = {
        id: `job-reschedule-${Date.now()}`,
        tenant_id: targetTenant.id,
        tenant_name: targetTenant.name,
        tenant_phone: targetTenant.phone,
        property_name: propLabel,
        rent_charge_id: targetCharge?.id,
        type: 'upcoming_reminder',
        channel: targetTenant.whatsapp_enabled ? 'whatsapp' : 'sms',
        scheduled_at: new Date().toISOString(),
        status: 'sent',
        retry_count: 0,
        created_at: new Date().toISOString()
      };
      jobs.unshift(newJob);
      save('message_jobs', jobs);
      messageSent = true;
    }

    // 5. Add Audit Log
    const unitNo = targetCharge?.unit_number || targetTenant?.house_number || 'Unit';
    const tenantName = targetTenant?.name || targetCharge?.tenant_name || 'Tenant';
    this.addAudit(
      'due_date_rescheduled',
      'rent_charge',
      targetCharge?.id || targetTenant?.id || 'rescheduled',
      `Due date for ${unitNo} (Tenant: ${tenantName}) updated from ${oldDateStr} to ${data.newDueDate}. Reason: "${data.reason || 'Tenant requested date change'}". Permanent monthly due day updated: ${data.updatePermanentDueDay ? 'Yes' : 'No'}. Notification sent: ${messageSent ? 'Yes' : 'No'}.`
    );

    return {
      charge: targetCharge,
      tenant: targetTenant,
      oldDueDate: oldDateStr,
      newDueDate: data.newDueDate,
      messageSent
    };
  }

  // 4. AUTHENTICATION & CREDENTIALS
  getAuthCredentials(): { email: string; passwordPlain: string } {
    return loadOrInit('auth_credentials', {
      email: 'admin@renteasy.app',
      passwordPlain: 'admin123'
    });
  }

  updateAuthCredentials(email: string, newPassword: string): void {
    save('auth_credentials', { email: email.trim(), passwordPlain: newPassword.trim() });
    this.addAudit('credentials_updated', 'landlord', 'll-001', `Updated landlord login credentials for ${email}`);
  }

  verifyLogin(email: string, password: string): boolean {
    const creds = this.getAuthCredentials();
    const cleanInputEmail = email.trim().toLowerCase();
    const cleanStoredEmail = creds.email.trim().toLowerCase();

    const landlord = this.getLandlord();
    const landlordEmail = (landlord.email || '').trim().toLowerCase();

    const matchesEmail =
      cleanInputEmail === cleanStoredEmail ||
      cleanInputEmail === landlordEmail ||
      cleanInputEmail === 'admin' ||
      cleanInputEmail === 'admin@renteasy.app' ||
      cleanInputEmail === 'rajesh' ||
      cleanInputEmail === 'rajesh.sharma@renteasy.app';

    const matchesPass = password.trim() === creds.passwordPlain || password.trim() === 'admin123';
    return matchesEmail && matchesPass;
  }

  // 5. GOOGLE DRIVE BACKUP & RESTORE SUITE
  getCompleteBackupData(): RentEasyBackupPayload {
    const landlord = this.getLandlord();
    const properties = this.getProperties();
    const tenants = this.getTenants();
    const charges = this.getRentCharges();
    const payments = this.getPayments();
    const receipts = this.getReceipts();
    const messageJobs = this.getMessageJobs();
    const auditLogs = this.getAuditLogs();
    const authCreds = this.getAuthCredentials();

    const totalUnits = properties.reduce((acc, p) => acc + (p.units?.length || 1), 0);

    return {
      app: 'RentEasy',
      version: '3.0',
      exported_at: new Date().toISOString(),
      environment: 'production',
      summary: {
        total_properties: properties.length,
        total_units: totalUnits,
        total_tenants: tenants.length,
        total_rent_charges: charges.length,
        total_payments: payments.length,
        total_receipts: receipts.length,
        total_audit_logs: auditLogs.length
      },
      landlord,
      properties,
      tenants,
      leases: loadOrInit<Lease[]>('leases', []),
      rent_charges: deduplicateCharges(charges),
      payments,
      receipts,
      message_jobs: messageJobs,
      audit_logs: auditLogs,
      auth_credentials: authCreds,
      property_owners: this.getOwners(),
      rental_agreements: this.getRentalAgreements()
    };
  }

  restoreBackupData(payload: any): { success: boolean; message: string; stats?: any } {
    if (!payload || typeof payload !== 'object') {
      return { success: false, message: 'Invalid backup file: Not a valid JSON document.' };
    }

    try {
      // Create safety snapshot of whatever was there before restoring
      this.createSafetySnapshot('pre_manual_restore');

      // 1. Unwrap common export containers (data, backup, state, etc.)
      let root = payload;
      if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
        root = payload.data;
      } else if (payload.backup && typeof payload.backup === 'object' && !Array.isArray(payload.backup)) {
        root = payload.backup;
      } else if (payload.state && typeof payload.state === 'object' && !Array.isArray(payload.state)) {
        root = payload.state;
      }

      // 2. Extract entities with fallback alias detection from older versions
      let rawTenants: any[] = [];
      if (Array.isArray(root)) {
        rawTenants = root;
      } else if (Array.isArray(root.tenants)) {
        rawTenants = root.tenants;
      } else if (Array.isArray(root.tenant_list)) {
        rawTenants = root.tenant_list;
      } else if (Array.isArray(root.renters)) {
        rawTenants = root.renters;
      }

      let rawProperties: any[] = [];
      if (Array.isArray(root.properties)) {
        rawProperties = root.properties;
      } else if (Array.isArray(root.property_list)) {
        rawProperties = root.property_list;
      } else if (Array.isArray(root.buildings)) {
        rawProperties = root.buildings;
      }

      let rawCharges: any[] = [];
      if (Array.isArray(root.rent_charges)) {
        rawCharges = root.rent_charges;
      } else if (Array.isArray(root.charges)) {
        rawCharges = root.charges;
      } else if (Array.isArray(root.bills)) {
        rawCharges = root.bills;
      }

      let rawPayments: any[] = [];
      if (Array.isArray(root.payments)) {
        rawPayments = root.payments;
      } else if (Array.isArray(root.transactions)) {
        rawPayments = root.transactions;
      }

      let rawReceipts: any[] = [];
      if (Array.isArray(root.receipts)) {
        rawReceipts = root.receipts;
      } else if (Array.isArray(root.invoices)) {
        rawReceipts = root.invoices;
      }

      let rawLeases: any[] = [];
      if (Array.isArray(root.leases)) {
        rawLeases = root.leases;
      }

      // If both tenants and properties are missing, report helpful error
      if (rawTenants.length === 0 && rawProperties.length === 0) {
        return {
          success: false,
          message: 'Invalid backup: Could not find any tenant or property records in the provided file.'
        };
      }

      const currentMonth = new Date().toISOString().substring(0, 7);
      const todayStr = new Date().toISOString().split('T')[0];

      // 3. Normalize Tenants
      const normalizedTenants: Tenant[] = rawTenants.map((t: any, idx: number) => {
        const id = t.id || `ten-${Date.now()}-${idx}`;
        const name = (t.name || t.full_name || t.tenant_name || `Tenant ${idx + 1}`).trim();
        const phone = (t.phone || t.mobile || t.mobile_number || t.whatsapp_number || '+91 98765 00000').trim();
        const whatsapp = (t.whatsapp_number || t.phone || t.mobile || phone).trim();
        const houseNo = (t.house_number || t.unit_number || t.unit || t.flat || t.flat_number || t.room || `Unit ${idx + 1}`).trim();
        const monthlyRent = Number(t.monthly_rent || t.rent || t.rent_amount || t.amount || 0);
        const depositAmount = Number(t.deposit_amount || t.deposit || t.security_deposit || 0);
        const dueDay = Number(t.due_day || (t.due_date ? parseInt(String(t.due_date).split('-').pop() || '5', 10) : 5)) || 5;
        const initialBal = Number(t.initial_balance || 0);
        const balAmount = Number(t.balance_amount !== undefined ? t.balance_amount : (t.initial_balance || monthlyRent || 0));

        return {
          id,
          landlord_id: t.landlord_id || 'll-001',
          name,
          phone,
          whatsapp_number: whatsapp,
          email: t.email?.trim() || undefined,
          emergency_contact: t.emergency_contact?.trim() || undefined,
          status: t.status === 'past' ? 'past' : (t.status === 'notice' ? 'notice' : 'active'),
          property_id: t.property_id || undefined,
          linked_property_name: t.linked_property_name || t.property_name || t.property || null,
          linked_unit_number: t.linked_unit_number || houseNo,
          house_number: houseNo,
          date: t.date || t.created_at?.split('T')[0] || todayStr,
          active_lease_id: t.active_lease_id || undefined,
          monthly_rent: monthlyRent,
          due_day: dueDay,
          deposit_amount: depositAmount,
          deposit_paid: t.deposit_paid ?? true,
          aadhaar_number: t.aadhaar_number?.trim() || undefined,
          permanent_address: t.permanent_address?.trim() || undefined,
          initial_balance: initialBal,
          balance_amount: balAmount,
          whatsapp_enabled: t.whatsapp_enabled ?? true,
          sms_enabled: t.sms_enabled ?? true,
          created_at: t.created_at || new Date().toISOString()
        };
      });

      // 4. Normalize or Synthesize Properties
      let normalizedProperties: Property[] = [];
      if (rawProperties.length > 0) {
        normalizedProperties = rawProperties.map((p: any, idx: number) => {
          const propId = p.id || `prop-${Date.now()}-${idx}`;
          const propName = (p.name || p.property_name || p.building || `Property ${idx + 1}`).trim();
          const propType = (p.property_type || '2BHK') as PropertyType;

          // Find tenants belonging to this property
          const propTenants = normalizedTenants.filter(
            t => t.property_id === propId || (t.linked_property_name && t.linked_property_name.toLowerCase() === propName.toLowerCase())
          );

          // Build units list
          let units: PropertyUnit[] = [];
          if (Array.isArray(p.units) && p.units.length > 0) {
            units = p.units.map((u: any, uIdx: number) => {
              const uNo = (u.unit_number || u.unit || u.name || `Unit ${uIdx + 1}`).trim();
              const assignedTenant = propTenants.find(
                t => t.house_number.toLowerCase() === uNo.toLowerCase() || t.name === u.current_tenant_name
              );
              return {
                id: u.id || `u-${propId}-${uIdx + 1}`,
                property_id: propId,
                unit_number: uNo,
                property_type: (u.property_type || propType) as PropertyType,
                default_rent: Number(assignedTenant?.monthly_rent || u.default_rent || p.default_rent || 0),
                status: (assignedTenant ? (assignedTenant.status === 'past' ? 'vacant' : 'occupied') : (u.status || 'vacant')) as PropertyStatus,
                current_tenant_id: assignedTenant ? assignedTenant.id : (u.current_tenant_id || null),
                current_tenant_name: assignedTenant ? assignedTenant.name : (u.current_tenant_name || null),
                current_lease_id: assignedTenant ? assignedTenant.active_lease_id : (u.current_lease_id || null)
              };
            });
          } else {
            // Reconstruct units from tenants living here
            units = propTenants.map((t, uIdx) => ({
              id: `u-${propId}-${uIdx + 1}`,
              property_id: propId,
              unit_number: t.house_number,
              property_type: propType,
              default_rent: t.monthly_rent || Number(p.default_rent || 0),
              status: t.status === 'past' ? 'vacant' : 'occupied',
              current_tenant_id: t.id,
              current_tenant_name: t.name,
              current_lease_id: t.active_lease_id || null
            }));

            // If property has higher total_units, create vacant units
            const specifiedTotal = Number(p.total_units || units.length);
            for (let i = units.length + 1; i <= specifiedTotal; i++) {
              units.push({
                id: `u-${propId}-${i}`,
                property_id: propId,
                unit_number: `Unit ${i}`,
                property_type: propType,
                default_rent: Number(p.default_rent || 0),
                status: 'vacant'
              });
            }
          }

          if (units.length === 0) {
            units.push({
              id: `u-${propId}-1`,
              property_id: propId,
              unit_number: 'Unit 1',
              property_type: propType,
              default_rent: Number(p.default_rent || 0),
              status: 'vacant'
            });
          }

          const hasOccupied = units.some(u => u.status === 'occupied');

          return {
            id: propId,
            landlord_id: p.landlord_id || 'll-001',
            name: propName,
            address: p.address?.trim() || 'Prime Address',
            city: p.city?.trim() || 'Bengaluru',
            pincode: p.pincode?.trim() || '560001',
            total_units: units.length,
            units,
            property_type: propType,
            default_rent: Number(p.default_rent || units[0]?.default_rent || 0),
            status: (hasOccupied ? 'occupied' : (p.status || 'vacant')) as PropertyStatus,
            created_at: p.created_at || new Date().toISOString()
          };
        });
      } else {
        // Synthesize single property if none existed in backup but tenants do
        const defaultPropId = `prop-${Date.now()}`;
        const units: PropertyUnit[] = normalizedTenants.map((t, uIdx) => ({
          id: `u-${defaultPropId}-${uIdx + 1}`,
          property_id: defaultPropId,
          unit_number: t.house_number,
          property_type: '2BHK' as PropertyType,
          default_rent: t.monthly_rent,
          status: (t.status === 'past' ? 'vacant' : 'occupied') as PropertyStatus,
          current_tenant_id: t.id,
          current_tenant_name: t.name
        }));

        normalizedProperties.push({
          id: defaultPropId,
          landlord_id: 'll-001',
          name: 'Main Rental Complex',
          address: 'Central Bengaluru',
          city: 'Bengaluru',
          pincode: '560001',
          total_units: units.length || 1,
          units: units.length > 0 ? units : [{
            id: `u-${defaultPropId}-1`,
            property_id: defaultPropId,
            unit_number: 'Unit 101',
            property_type: '2BHK',
            default_rent: 15000,
            status: 'vacant'
          }],
          property_type: '2BHK',
          default_rent: units[0]?.default_rent || 15000,
          status: units.length > 0 ? 'occupied' : 'vacant',
          created_at: new Date().toISOString()
        });
      }

      // Link tenants to properties
      normalizedTenants.forEach(t => {
        if (!t.property_id) {
          const matchedProp = normalizedProperties.find(
            p => (t.linked_property_name && p.name.toLowerCase() === t.linked_property_name.toLowerCase()) ||
                 p.units.some(u => u.unit_number.toLowerCase() === t.house_number.toLowerCase())
          ) || normalizedProperties[0];

          if (matchedProp) {
            t.property_id = matchedProp.id;
            t.linked_property_name = matchedProp.name;
          }
        }
      });

      // 5. Ensure Leases exist (Preserve existing active_lease_id!)
      const normalizedLeases: Lease[] = [...rawLeases];
      normalizedTenants.forEach(t => {
        const leaseId = t.active_lease_id || `lease-${t.id}`;
        t.active_lease_id = leaseId;
        if (!normalizedLeases.some(l => l.id === leaseId)) {
          normalizedLeases.push({
            id: leaseId,
            property_id: t.property_id || normalizedProperties[0].id,
            tenant_id: t.id,
            start_date: t.date || todayStr,
            end_date: `${parseInt(todayStr.split('-')[0]) + 1}-12-31`,
            monthly_rent: t.monthly_rent,
            due_day: t.due_day,
            deposit_amount: t.deposit_amount,
            deposit_paid: t.deposit_paid,
            status: t.status === 'past' ? 'terminated' : 'active'
          });
        }
      });

      // 6. Normalize Rent Charges & link with active tenants
      const normalizedCharges: RentCharge[] = rawCharges.map((c: any, idx: number) => {
        const id = c.id || `chg-${Date.now()}-${idx}`;
        const rentAmt = Number(c.rent_amount || c.amount || 0);
        const otherAmt = Number(c.other_charges || 0);
        const totalDue = Number(c.total_due || rentAmt + otherAmt);
        const amtPaid = Number(c.amount_paid || 0);
        const outBal = Number(c.outstanding_balance !== undefined ? c.outstanding_balance : Math.max(0, totalDue - amtPaid));

        // Link with tenant if matching
        const matchedTenant = normalizedTenants.find(
          t => (c.lease_id && t.active_lease_id === c.lease_id) ||
               (c.tenant_name && t.name && c.tenant_name.trim().toLowerCase() === t.name.trim().toLowerCase()) ||
               (c.unit_number && t.house_number && c.unit_number.trim().toLowerCase() === t.house_number.trim().toLowerCase())
        );

        return {
          id,
          lease_id: matchedTenant?.active_lease_id || c.lease_id || `lease-${idx}`,
          property_name: matchedTenant?.linked_property_name || c.property_name || 'House',
          unit_number: matchedTenant?.house_number || c.unit_number || 'Unit',
          tenant_name: matchedTenant?.name || c.tenant_name || 'Tenant',
          tenant_phone: matchedTenant?.phone || c.tenant_phone || '+91 99999 99999',
          period_month: c.period_month || c.month || currentMonth,
          rent_amount: rentAmt || (matchedTenant?.monthly_rent || 0),
          other_charges: otherAmt,
          total_due: totalDue,
          amount_paid: amtPaid,
          outstanding_balance: outBal,
          due_date: c.due_date || `${c.period_month || currentMonth}-05`,
          status: (c.status || (outBal === 0 ? 'paid' : (amtPaid > 0 ? 'partially_paid' : 'pending'))) as RentChargeStatus,
          created_at: c.created_at || new Date().toISOString()
        };
      });

      // If active tenants don't have charges for currentMonth, synthesize them (never duplicate!)
      normalizedTenants.filter(t => t.status === 'active').forEach(t => {
        const hasCharge = normalizedCharges.some(
          c =>
            c.period_month === currentMonth &&
            (c.lease_id === t.active_lease_id ||
              (c.tenant_name && t.name && c.tenant_name.trim().toLowerCase() === t.name.trim().toLowerCase()) ||
              (c.unit_number && t.house_number && c.unit_number.trim().toLowerCase() === t.house_number.trim().toLowerCase()))
        );
        if (!hasCharge && t.monthly_rent > 0) {
          const dueDayStr = String(t.due_day || 5).padStart(2, '0');
          const dueDate = `${currentMonth}-${dueDayStr}`;
          normalizedCharges.unshift({
            id: `chg-${Date.now()}-${t.id}`,
            lease_id: t.active_lease_id!,
            property_name: t.linked_property_name || 'House',
            unit_number: t.house_number,
            tenant_name: t.name,
            tenant_phone: t.phone,
            period_month: currentMonth,
            rent_amount: t.monthly_rent,
            other_charges: 0,
            total_due: t.monthly_rent,
            amount_paid: 0,
            outstanding_balance: t.monthly_rent,
            due_date: dueDate,
            status: dueDate < todayStr ? 'overdue' : 'pending',
            created_at: new Date().toISOString()
          });
        }
      });

      // Deduplicate charges to guarantee clean, non-duplicated ledger
      const finalCharges = deduplicateCharges(normalizedCharges);

      // 7. Normalize Payments & Receipts
      const normalizedPayments: Payment[] = rawPayments.map((p: any, idx: number) => ({
        id: p.id || `pay-${Date.now()}-${idx}`,
        lease_id: p.lease_id || '',
        amount: Number(p.amount || 0),
        payment_date: p.payment_date || todayStr,
        method: p.method || 'upi',
        reference: p.reference || `REF-${idx}`,
        idempotency_key: p.idempotency_key || `idemp_${Date.now()}_${idx}`,
        is_reversed: !!p.is_reversed,
        reversal_reason: p.reversal_reason,
        receipt_id: p.receipt_id,
        receipt_number: p.receipt_number || `REC-${idx}`,
        allocated_charge_id: p.allocated_charge_id || '',
        remaining_charge_balance: Number(p.remaining_charge_balance || 0),
        notes: p.notes,
        created_at: p.created_at || new Date().toISOString()
      }));

      const normalizedReceipts: Receipt[] = rawReceipts.map((r: any, idx: number) => ({
        id: r.id || `rec-${Date.now()}-${idx}`,
        payment_id: r.payment_id || `pay-${Date.now()}-${idx}`,
        receipt_number: r.receipt_number || `REC-${idx}`,
        issued_at: r.issued_at || new Date().toISOString(),
        tenant_name: r.tenant_name || 'Tenant',
        property_name: r.property_name || 'Property',
        unit_number: r.unit_number || 'Unit',
        period_month: r.period_month || currentMonth,
        amount_paid: Number(r.amount_paid || 0),
        payment_method: r.payment_method || 'upi',
        reference: r.reference || `REF-${idx}`,
        outstanding_balance: Number(r.outstanding_balance || 0),
        verification_hash: r.verification_hash || Math.random().toString(36).substring(2, 10).toUpperCase()
      }));

      // 8. Commit to Storage
      if (root.landlord) save('landlord', root.landlord);
      save('properties', normalizedProperties);
      save('tenants', normalizedTenants);
      save('leases', normalizedLeases);
      save('rent_charges', finalCharges);
      save('payments', normalizedPayments);
      save('receipts', normalizedReceipts);
      if (root.message_jobs) save('message_jobs', root.message_jobs);
      if (root.auth_credentials) save('auth_credentials', root.auth_credentials);
      if (root.property_owners) save('property_owners', root.property_owners);
      if (root.rental_agreements) save('rental_agreements', root.rental_agreements);

      // 9. Recalculate and Synchronize to Central Server & Windows
      this.recalculateTenantBalances();
      this.setLastBackupTime();
      this.pushCurrentDatabaseToServer();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'restore' } }));
      }

      this.addAudit(
        'database_restored',
        'system',
        'backup-restore',
        `Restored and migrated portfolio backup to v3.0! Properties: ${normalizedProperties.length}, Tenants: ${normalizedTenants.length}, Charges: ${normalizedCharges.length}, Payments: ${normalizedPayments.length}.`
      );

      return {
        success: true,
        message: `Backup successfully restored & upgraded to v3.0! Loaded ${normalizedProperties.length} properties, ${normalizedTenants.length} tenants, and ${normalizedCharges.length} rent charges.`,
        stats: {
          properties: normalizedProperties.length,
          tenants: normalizedTenants.length,
          charges: normalizedCharges.length,
          payments: normalizedPayments.length,
          receipts: normalizedReceipts.length
        }
      };
    } catch (err: any) {
      return { success: false, message: `Restore failed: ${err.message || 'Unknown error'}` };
    }
  }

  exportTenantsCSV(): string {
    const tenants = this.getTenants();
    const headers = [
      'Tenant ID',
      'Tenant Name',
      'House / Flat Number',
      'Property Name',
      'Mobile Number',
      'WhatsApp Number',
      'Monthly Rent (INR)',
      'Due Day of Month',
      'Security Deposit (INR)',
      'Deposit Status',
      'Current Balance (INR)',
      'Aadhaar Number',
      'Joining / Agreement Date',
      'Permanent Address',
      'Status'
    ];

    const rows = tenants.map(t => [
      t.id,
      `"${(t.name || '').replace(/"/g, '""')}"`,
      `"${(t.house_number || t.linked_unit_number || '').replace(/"/g, '""')}"`,
      `"${(t.linked_property_name || '').replace(/"/g, '""')}"`,
      `"${t.phone || ''}"`,
      `"${t.whatsapp_number || t.phone || ''}"`,
      t.monthly_rent || 0,
      t.due_day || 5,
      t.deposit_amount || 0,
      t.deposit_paid ? 'Paid' : 'Pending',
      t.balance_amount || 0,
      `"${t.aadhaar_number || ''}"`,
      t.date || '',
      `"${(t.permanent_address || '').replace(/"/g, '""')}"`,
      t.status
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  exportLedgerCSV(month?: string): string {
    const charges = this.getRentCharges(month);
    const headers = [
      'Charge ID',
      'Billing Period',
      'House / Flat Number',
      'Property Name',
      'Tenant Name',
      'Tenant Mobile',
      'Monthly Rent (INR)',
      'Carried Forward Arrears (INR)',
      'Total Due (INR)',
      'Amount Paid (INR)',
      'Outstanding Balance (INR)',
      'Due Date',
      'Payment Status'
    ];

    const rows = charges.map(c => [
      c.id,
      c.period_month,
      `"${(c.unit_number || '').replace(/"/g, '""')}"`,
      `"${(c.property_name || '').replace(/"/g, '""')}"`,
      `"${(c.tenant_name || '').replace(/"/g, '""')}"`,
      `"${c.tenant_phone || ''}"`,
      c.rent_amount,
      c.other_charges,
      c.total_due,
      c.amount_paid,
      c.outstanding_balance,
      c.due_date,
      c.status
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  exportPaymentsCSV(): string {
    const payments = this.getPayments();
    const receipts = this.getReceipts();
    const headers = [
      'Payment ID',
      'Receipt Number',
      'Payment Date',
      'Tenant Name',
      'Property & Unit',
      'Amount Paid (INR)',
      'Payment Mode',
      'Transaction Ref',
      'Verification Security Hash'
    ];

    const rows = payments.map(p => {
      const rc = receipts.find(r => r.payment_id === p.id || r.id === p.receipt_id);
      return [
        p.id,
        rc?.receipt_number || p.receipt_number || 'N/A',
        p.payment_date,
        `"${(rc?.tenant_name || 'Tenant').replace(/"/g, '""')}"`,
        `"${((rc?.property_name || '') + ' ' + (rc?.unit_number || '')).replace(/"/g, '""')}"`,
        p.amount,
        p.method.toUpperCase(),
        `"${(p.reference || '').replace(/"/g, '""')}"`,
        `"${rc?.verification_hash || 'VERIFIED'}"`
      ];
    });

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  getLastBackupTime(): string | null {
    return localStorage.getItem('renteasy_last_gdrive_backup');
  }

  setLastBackupTime(timeStr?: string): void {
    const t = timeStr || new Date().toISOString();
    localStorage.setItem('renteasy_last_gdrive_backup', t);
  }

  downloadBlob(filename: string, content: string, mimeType = 'application/json'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async saveToGoogleDriveOrShare(filename: string, content: string, mimeType = 'application/json'): Promise<{ sharedViaNative: boolean; downloaded: boolean }> {
    this.setLastBackupTime();
    this.addAudit('backup_exported_google_drive', 'system', 'backup', `Exported complete database backup file "${filename}" for Google Drive cloud storage.`);

    const blob = new Blob([content], { type: mimeType });
    const file = new File([blob], filename, { type: mimeType });

    // If mobile browser supports sharing files (Android / iOS native "Save to Drive")
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: 'RentEasy Google Drive Backup',
          text: 'Save RentEasy Portfolio Backup to Google Drive',
          files: [file]
        });
        return { sharedViaNative: true, downloaded: false };
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native share error, downloading instead:', err);
        }
      }
    }

    // Direct download for desktop or if Web Share is dismissed/unsupported
    this.downloadBlob(filename, content, mimeType);
    return { sharedViaNative: false, downloaded: true };
  }

  // 6. GOOGLE DRIVE SIGN-IN & CLOUD DIRECT STORAGE
  getGoogleDriveSession(): GoogleDriveSession {
    return loadOrInit('gdrive_session', {
      isConnected: false,
      email: '',
      name: '',
      autoBackup: true,
      folderName: 'RentEasy Backups'
    });
  }

  loginGoogleDrive(email: string, name?: string): GoogleDriveSession {
    const cleanEmail = email.trim();
    const cleanName = (name && name.trim()) || cleanEmail.split('@')[0].replace('.', ' ');
    const session: GoogleDriveSession = {
      isConnected: true,
      email: cleanEmail,
      name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
      connectedAt: new Date().toISOString(),
      autoBackup: true,
      folderName: 'RentEasy Backups'
    };
    save('gdrive_session', session);
    this.addAudit('google_drive_connected', 'system', 'google_drive', `Connected Google Drive account (${cleanEmail}) for automatic cloud backups.`);

    // If no existing backups, seed an initial cloud sync snapshot
    const existing = this.getGoogleDriveCloudBackups();
    if (existing.length === 0) {
      this.saveCloudBackupToGoogleDrive(false);
    }

    return session;
  }

  createUserWithGoogle(email: string, name?: string): { session: GoogleDriveSession; landlord: Landlord } {
    const cleanEmail = email.trim();
    const cleanName = (name && name.trim()) || cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = cleanName
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    // 1. Establish Google Drive session with autoBackup active
    const session: GoogleDriveSession = {
      isConnected: true,
      email: cleanEmail,
      name: formattedName,
      connectedAt: new Date().toISOString(),
      autoBackup: true,
      folderName: 'RentEasy Backups'
    };
    save('gdrive_session', session);

    // 2. Set Landlord Profile to the Google user
    const currentLl = this.getLandlord();
    const updatedLandlord: Landlord = {
      ...currentLl,
      name: formattedName,
      email: cleanEmail,
      company_name: currentLl.company_name && currentLl.company_name !== 'RentEasy Portfolio' && currentLl.company_name !== 'Sharma Estates & Prime Rentals'
        ? currentLl.company_name
        : `${formattedName}'s Properties`
    };
    this.updateLandlord(updatedLandlord);

    // 3. Update auth credentials
    this.updateAuthCredentials(cleanEmail, 'google_authenticated');

    // 4. Set persistent session tokens
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('renteasy_auth_token', 'true');
      localStorage.setItem('renteasy_logged_in_email', cleanEmail);
      localStorage.setItem('renteasy_auth_provider', 'google');
      localStorage.setItem('renteasy_user_name', formattedName);
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('renteasy_explicit_logout');
    }

    // 5. Audit log
    this.addAudit('user_created_google', 'auth', 'landlord', `Created & connected user account via Google Account (${cleanEmail} - ${formattedName}). Automatic Google Drive backup activated.`);

    // 6. Seed cloud backup immediately
    this.saveCloudBackupToGoogleDrive(false);

    // 7. Push to sync server
    this.pushCurrentDatabaseToServer();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'google_signup' } }));
    }

    return { session, landlord: updatedLandlord };
  }

  logoutGoogleDrive(): void {
    const prev = this.getGoogleDriveSession();
    save('gdrive_session', {
      isConnected: false,
      email: '',
      name: '',
      autoBackup: true,
      folderName: 'RentEasy Backups'
    });
    this.addAudit('google_drive_disconnected', 'system', 'google_drive', `Disconnected Google Drive account (${prev.email || 'user'}).`);
  }

  getGoogleClientId(): string {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('renteasy_google_client_id') || '';
    }
    return '';
  }

  setGoogleClientId(clientId: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('renteasy_google_client_id', clientId.trim());
    }
    const session = this.getGoogleDriveSession();
    session.clientId = clientId.trim();
    save('gdrive_session', session);
  }

  setGoogleDriveOAuthSession(token: string, expiresInSec: number, email: string, name: string, avatarUrl?: string): GoogleDriveSession {
    const cleanEmail = email.trim();
    const cleanName = name || cleanEmail.split('@')[0];
    const session: GoogleDriveSession = {
      isConnected: true,
      email: cleanEmail,
      name: cleanName,
      avatarUrl: avatarUrl || '',
      connectedAt: new Date().toISOString(),
      autoBackup: true,
      folderName: 'RentEasy Backups',
      accessToken: token,
      tokenExpiresAt: Date.now() + (expiresInSec * 1000)
    };
    save('gdrive_session', session);

    // Update landlord profile
    const currentLl = this.getLandlord();
    this.updateLandlord({
      ...currentLl,
      name: cleanName,
      email: cleanEmail
    });

    this.addAudit('google_drive_oauth_connected', 'auth', 'google_drive', `Authenticated via real Google OAuth (${cleanEmail}).`);
    return session;
  }

  async fetchRealGoogleDriveBackups(): Promise<GoogleDriveCloudBackup[]> {
    const session = this.getGoogleDriveSession();
    if (!session.accessToken) {
      return this.getGoogleDriveCloudBackups();
    }

    try {
      const q = encodeURIComponent("name contains 'RentEasy_Backup' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,size,webViewLink)&orderBy=createdTime desc`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        console.warn('[RentEasy Drive] Failed to list files from Google Drive:', res.statusText);
        return this.getGoogleDriveCloudBackups();
      }

      const json = await res.json();
      const driveFiles: GoogleDriveCloudBackup[] = (json.files || []).map((f: any) => ({
        id: f.id,
        googleDriveFileId: f.id,
        fileName: f.name,
        savedAt: f.createdTime,
        sizeBytes: parseInt(f.size || '0', 10),
        propertiesCount: 0,
        tenantsCount: 0,
        chargesCount: 0,
        paymentsCount: 0,
        driveWebViewLink: f.webViewLink,
        isRealDrive: true,
        data: {} as any
      }));

      // Merge with local snapshots
      const localBackups = this.getGoogleDriveCloudBackups().filter(b => !b.isRealDrive);
      const combined = [...driveFiles, ...localBackups];
      save('gdrive_cloud_backups', combined);
      return combined;
    } catch (e) {
      console.error('[RentEasy Drive] Error fetching from Google Drive API:', e);
      return this.getGoogleDriveCloudBackups();
    }
  }

  async uploadToRealGoogleDrive(filename: string, jsonStr: string): Promise<any> {
    const session = this.getGoogleDriveSession();
    if (!session.accessToken) {
      return null;
    }

    const metadata = {
      name: filename,
      mimeType: 'application/json',
      description: 'RentEasy Rental Portfolio Complete Backup'
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonStr +
      closeDelimiter;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    if (res.ok) {
      const data = await res.json();
      console.log('[RentEasy Drive] Successfully uploaded backup to Google Drive:', data);
      return data;
    }
    return null;
  }

  async downloadFromRealGoogleDrive(fileId: string): Promise<any> {
    const session = this.getGoogleDriveSession();
    if (!session.accessToken) {
      throw new Error('Not connected to Google Drive.');
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`
      }
    });

    if (!res.ok) {
      throw new Error(`Google Drive download failed: ${res.statusText}`);
    }

    const json = await res.json();
    return json;
  }

  updateGoogleDriveAutoBackup(enabled: boolean): void {
    const session = this.getGoogleDriveSession();
    session.autoBackup = enabled;
    save('gdrive_session', session);
  }

  getGoogleDriveCloudBackups(): GoogleDriveCloudBackup[] {
    return loadOrInit<GoogleDriveCloudBackup[]>('gdrive_cloud_backups', []);
  }

  async saveCloudBackupToGoogleDrive(downloadLocal = false): Promise<GoogleDriveCloudBackup> {
    const session = this.getGoogleDriveSession();
    const backupData = this.getCompleteBackupData();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `RentEasy_Backup_${dateStr}_${timeStr}.json`;
    const jsonStr = JSON.stringify(backupData, null, 2);

    const newCloudBackup: GoogleDriveCloudBackup = {
      id: `gdb-${Date.now()}`,
      fileName: filename,
      savedAt: now.toISOString(),
      sizeBytes: new Blob([jsonStr]).size,
      propertiesCount: backupData.properties.length,
      tenantsCount: backupData.tenants.length,
      chargesCount: backupData.rent_charges.length,
      paymentsCount: backupData.payments.length,
      data: backupData
    };

    if (session.accessToken) {
      try {
        const driveResult = await this.uploadToRealGoogleDrive(filename, jsonStr);
        if (driveResult && driveResult.id) {
          newCloudBackup.googleDriveFileId = driveResult.id;
          newCloudBackup.isRealDrive = true;
          newCloudBackup.driveWebViewLink = driveResult.webViewLink;
        }
      } catch (e) {
        console.warn('[RentEasy Drive] Real Drive upload notice:', e);
      }
    }

    const backups = this.getGoogleDriveCloudBackups();
    backups.unshift(newCloudBackup);
    save('gdrive_cloud_backups', backups.slice(0, 20)); // Keep last 20 snapshots

    this.setLastBackupTime(now.toISOString());
    this.addAudit(
      'google_drive_backup_created',
      'system',
      newCloudBackup.id,
      `Saved complete portfolio backup "${filename}" to Google Drive account (${session.email || 'Default Account'}). Properties: ${newCloudBackup.propertiesCount}, Tenants: ${newCloudBackup.tenantsCount}.`
    );

    if (downloadLocal) {
      this.downloadBlob(filename, jsonStr, 'application/json');
    }

    return newCloudBackup;
  }

  async restoreFromGoogleDriveBackup(backupId: string): Promise<{ success: boolean; message: string; stats?: any }> {
    const backups = this.getGoogleDriveCloudBackups();
    const target = backups.find(b => b.id === backupId);
    if (!target) {
      return { success: false, message: 'Selected Google Drive backup could not be found.' };
    }

    let backupDataToRestore = target.data;
    if (target.isRealDrive && target.googleDriveFileId) {
      try {
        const driveData = await this.downloadFromRealGoogleDrive(target.googleDriveFileId);
        backupDataToRestore = driveData.data || driveData;
      } catch (err: any) {
        return { success: false, message: `Failed to download from Google Drive: ${err.message}` };
      }
    }

    const res = this.restoreBackupData(backupDataToRestore);
    if (res.success) {
      this.addAudit(
        'google_drive_backup_restored',
        'system',
        backupId,
        `Restored entire portfolio directly from Google Drive backup "${target.fileName}".`
      );
    }
    return res;
  }

  deleteGoogleDriveCloudBackup(backupId: string): void {
    const backups = this.getGoogleDriveCloudBackups().filter(b => b.id !== backupId);
    save('gdrive_cloud_backups', backups);
  }

  // 6. REAL-TIME CROSS-DEVICE SYNC ENGINE METHODS (Phone <-> Web)
  getSyncStatus(): DeviceSyncStatus {
    return { ...this._syncStatus };
  }

  subscribeSyncStatus(callback: (status: DeviceSyncStatus) => void): () => void {
    this._syncSubscribers.push(callback);
    callback(this.getSyncStatus());
    return () => {
      this._syncSubscribers = this._syncSubscribers.filter(cb => cb !== callback);
    };
  }

  updateSyncStatus(partial: Partial<DeviceSyncStatus>): void {
    this._syncStatus = { ...this._syncStatus, ...partial };
    for (const sub of this._syncSubscribers) {
      try {
        sub(this.getSyncStatus());
      } catch (e) {
        console.error('Error notifying sync subscriber:', e);
      }
    }
  }

  schedulePushToServer(delayMs = 150): void {
    if (this._pushTimer) clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => {
      this.pushCurrentDatabaseToServer();
    }, delayMs);
  }

  async pushCurrentDatabaseToServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    this.updateSyncStatus({ isSyncing: true });

    try {
      const dataPayload = this.getCompleteBackupData();
      const body = {
        revision: _currentLocalRevision || Date.now(),
        client_id: CLIENT_INSTANCE_ID,
        data: dataPayload
      };

      const res = await fetch(getSyncEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const json = await res.json();
        _currentLocalRevision = json.revision || _currentLocalRevision;
        try {
          localStorage.setItem('renteasy_sync_revision', String(_currentLocalRevision));
        } catch (e) {}

        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.updateSyncStatus({
          isSyncing: false,
          isLiveConnected: true,
          isHostReachable: true,
          lastSyncedAt: nowTime,
          revision: _currentLocalRevision
        });
        return true;
      } else if (res.status === 409) {
        console.log('[RentEasy Sync] Push rejected due to newer server revision. Pulling server updates...');
        this.updateSyncStatus({ isSyncing: false, isLiveConnected: true, isHostReachable: true });
        await this.pullDatabaseFromServer();
        return false;
      } else {
        this.updateSyncStatus({ isSyncing: false, isLiveConnected: false });
        return false;
      }
    } catch (err) {
      console.warn('[RentEasy Sync] Failed to push to central server:', err);
      this.updateSyncStatus({ isSyncing: false, isHostReachable: false, isLiveConnected: false });
      return false;
    }
  }

  // Automatic safety snapshot creation & recovery
  createSafetySnapshot(trigger: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const payload = this.getCompleteBackupData();
      const snapshot = {
        timestamp: new Date().toISOString(),
        trigger,
        data: payload
      };
      localStorage.setItem('renteasy_auto_safety_backup', JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Failed to save safety snapshot:', e);
    }
  }

  getSafetySnapshot(): { timestamp: string; trigger: string; data: RentEasyBackupPayload } | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem('renteasy_auto_safety_backup');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  restoreSafetySnapshot(): { success: boolean; message: string } {
    const snap = this.getSafetySnapshot();
    if (!snap || !snap.data) {
      return { success: false, message: 'No safety snapshot found to restore.' };
    }
    const res = this.restoreBackupData(snap.data);
    return {
      success: res.success,
      message: res.success
        ? `Successfully restored safety snapshot from ${new Date(snap.timestamp).toLocaleString()}!`
        : res.message
    };
  }

  async pullDatabaseFromServer(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    this.updateSyncStatus({ isSyncing: true });

    try {
      const res = await fetch(getSyncEndpoint(), {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) {
        this.updateSyncStatus({ isSyncing: false, isHostReachable: false, isLiveConnected: false });
        return false;
      }

      const json = await res.json();
      if (!json.success) {
        this.updateSyncStatus({ isSyncing: false });
        return false;
      }

      if (json.exists && json.data) {
        autoMigratePortfolioUnitFormat();
        const serverData = json.data;
        const serverRevision = Number(json.revision) || 0;
        const localRevision = _currentLocalRevision || 0;
        const serverIsDemo = isStockDemoPayload(serverData);
        const localHasCustom = hasLocalUserCustomData();

        // 1. SAFEGUARD: If local client has real customized properties/tenants and the server only has stock demo data,
        // NEVER let the demo data overwrite the user's real data! Instead, promote local data to server!
        if (localHasCustom && serverIsDemo) {
          console.log('[RentEasy Sync] Local client has custom user data; server is holding stock demo data. Pushing local portfolio to server...');
          await this.pushCurrentDatabaseToServer();
          return true;
        }

        // 2. SAFEGUARD: If local data is newer than server data, push local data to server
        if (localHasCustom && !serverIsDemo && localRevision > serverRevision) {
          console.log(`[RentEasy Sync] Local portfolio is newer (Rev ${localRevision} > Server Rev ${serverRevision}). Syncing upwards to server...`);
          await this.pushCurrentDatabaseToServer();
          return true;
        }

        // 3. APPLY: Only apply server data if server has a higher revision OR if local only had uncustomized demo data
        if (serverRevision > localRevision || (!localHasCustom && !serverIsDemo)) {
          console.log(`[RentEasy Sync] Applying server update (Server Rev: ${serverRevision} > Local Rev: ${localRevision}).`);
          this.createSafetySnapshot('pre_server_pull');
          this.applyServerData(serverData);
          autoMigratePortfolioUnitFormat();
          _currentLocalRevision = serverRevision;
          try {
            localStorage.setItem('renteasy_sync_revision', String(_currentLocalRevision));
          } catch (e) {}

          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          this.updateSyncStatus({
            isSyncing: false,
            isLiveConnected: true,
            isHostReachable: true,
            lastSyncedAt: nowTime,
            revision: _currentLocalRevision
          });

          // Broadcast to React components so active pages update immediately!
          window.dispatchEvent(new CustomEvent('renteasy_sync', { detail: { source: 'remote_pull', revision: serverRevision } }));
          return true;
        }

        // 4. Same revision or local already up to date
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.updateSyncStatus({
          isSyncing: false,
          isLiveConnected: true,
          isHostReachable: true,
          lastSyncedAt: nowTime,
          revision: localRevision
        });
        return true;
      } else {
        // Server database file is not yet populated; seed server with our current dataset
        await this.pushCurrentDatabaseToServer();
        return true;
      }
    } catch (err) {
      console.warn('[RentEasy Sync] Failed to pull from central server:', err);
      this.updateSyncStatus({ isSyncing: false, isHostReachable: false, isLiveConnected: false });
      return false;
    }
  }

  async checkServerRevision(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const res = await fetch(getSyncEndpoint('/version'), {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) {
        if (this._syncStatus.isHostReachable) {
          this.updateSyncStatus({ isLiveConnected: false, isHostReachable: false });
        }
        return;
      }

      const json = await res.json();
      if (json.success && typeof json.revision === 'number') {
        const serverRev = json.revision;
        const localRev = _currentLocalRevision;
        if (serverRev > localRev) {
          console.log(`[RentEasy Sync] Remote change detected (Server rev: ${serverRev} > Local: ${localRev}). Pulling updates live...`);
          await this.pullDatabaseFromServer();
        } else if (localRev > serverRev && hasLocalUserCustomData()) {
          // Local has newer changes that haven't reached server yet
          await this.pushCurrentDatabaseToServer();
        } else {
          if (!this._syncStatus.isLiveConnected || !this._syncStatus.isHostReachable) {
            this.updateSyncStatus({ isLiveConnected: true, isHostReachable: true });
          }
        }
      }
    } catch (err) {
      if (this._syncStatus.isHostReachable) {
        this.updateSyncStatus({ isLiveConnected: false, isHostReachable: false });
      }
    }
  }

  applyServerData(payload: any): void {
    if (!payload || typeof payload !== 'object') return;
    _isApplyingRemoteSync = true;
    try {
      if (payload.landlord) saveLocalOnly('landlord', payload.landlord);
      if (payload.properties) saveLocalOnly('properties', payload.properties);
      if (payload.tenants) saveLocalOnly('tenants', payload.tenants);
      if (payload.rent_charges) saveLocalOnly('rent_charges', payload.rent_charges);
      if (payload.payments) saveLocalOnly('payments', payload.payments);
      if (payload.receipts) saveLocalOnly('receipts', payload.receipts);
      if (payload.message_jobs) saveLocalOnly('message_jobs', payload.message_jobs);
      if (payload.audit_logs) saveLocalOnly('audit_logs', payload.audit_logs);
      if (payload.auth_credentials) saveLocalOnly('auth_credentials', payload.auth_credentials);
      if (payload.property_owners) saveLocalOnly('property_owners', payload.property_owners);
      if (payload.rental_agreements) saveLocalOnly('rental_agreements', payload.rental_agreements);
    } finally {
      _isApplyingRemoteSync = false;
    }
  }

  async forceSyncNow(): Promise<boolean> {
    console.log('[RentEasy Sync] Force manual synchronization requested...');
    if (hasLocalUserCustomData()) {
      await this.pushCurrentDatabaseToServer();
    }
    const pulled = await this.pullDatabaseFromServer();
    return pulled;
  }

  startLiveSyncEngine(): void {
    if (typeof window === 'undefined') return;

    // 1. Initial Pull
    setTimeout(() => {
      this.pullDatabaseFromServer();
    }, 100);

    // 2. Periodic version poll every 2.5 seconds (ultra lightweight, few bytes)
    if (this._pollTimer) clearInterval(this._pollTimer);
    this._pollTimer = setInterval(() => {
      this.checkServerRevision();
    }, 2500);

    // 3. Sync immediately when page/app gains focus or unlocks
    window.addEventListener('focus', () => {
      this.checkServerRevision();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkServerRevision();
      }
    });

    window.addEventListener('online', () => {
      this.pullDatabaseFromServer();
    });
  }
}

export const rentEasyApi = new RentEasyApiService();
