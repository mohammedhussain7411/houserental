export type PropertyType = '1BHK' | '2BHK' | '3BHK' | '3BHK Villa' | '1BHK Studio' | 'Independent House' | 'Commercial';
export type PropertyStatus = 'occupied' | 'vacant' | 'maintenance';
export type RentChargeStatus = 'pending' | 'partially_paid' | 'paid' | 'overdue';
export type PaymentMethod = 'upi' | 'bank_transfer' | 'cash' | 'cheque';
export type MessageChannel = 'whatsapp' | 'sms';
export type MessageType = 'upcoming_reminder' | 'due_date_reminder' | 'overdue_reminder' | 'payment_receipt';
export type MessageStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled';

export interface Landlord {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  upi_id: string;
  timezone: string;
}

export interface PropertyUnit {
  id: string;
  property_id: string;
  unit_number: string; // e.g. "Flat 101"
  property_type: PropertyType;
  default_rent: number;
  status: PropertyStatus;
  current_tenant_id?: string | null;
  current_tenant_name?: string | null;
  current_lease_id?: string | null;
  balance_amount?: number;
}

export interface Property {
  id: string;
  landlord_id: string;
  name: string; // Building / Complex Name
  address: string;
  city: string;
  pincode: string;
  total_units: number;
  units: PropertyUnit[];
  property_type: PropertyType;
  default_rent: number;
  status: PropertyStatus;
  unit_number?: string;
  current_tenant_name?: string | null;
  current_lease_id?: string | null;
  created_at: string;
}

export interface Tenant {
  id: string;
  landlord_id: string;
  name: string;
  phone: string;
  whatsapp_number: string;
  email?: string;
  emergency_contact?: string;
  status: 'active' | 'past' | 'notice';
  property_id?: string;
  linked_property_name?: string | null;
  linked_unit_number?: string | null;
  house_number: string;
  date: string; // Agreement / Joining Date
  active_lease_id?: string | null;
  monthly_rent: number;
  due_day: number; // Date of the month on which rent auto-updates
  deposit_amount: number; // Security deposit
  deposit_paid: boolean;
  aadhaar_number?: string; // 12-digit Aadhaar
  permanent_address?: string;
  initial_balance: number; // Existing balance if any
  balance_amount: number; // Live outstanding balance of the house
  whatsapp_enabled: boolean;
  sms_enabled: boolean;
  created_at: string;
}

export interface Lease {
  id: string;
  property_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  due_day: number;
  deposit_amount: number;
  deposit_paid: boolean;
  status: 'active' | 'terminated' | 'expired';
}

export interface RentCharge {
  id: string;
  lease_id: string;
  property_name: string;
  unit_number: string;
  tenant_name: string;
  tenant_phone: string;
  period_month: string; // YYYY-MM
  rent_amount: number;
  other_charges: number;
  total_due: number;
  amount_paid: number;
  outstanding_balance: number;
  due_date: string;
  status: RentChargeStatus;
  created_at: string;
}

export interface RentCalendarEvent {
  id: string;
  dateStr: string; // YYYY-MM-DD
  day: number;
  unit_number: string;
  property_name: string;
  property_id?: string;
  tenant_id?: string;
  tenant_name: string;
  tenant_phone: string;
  whatsapp_number?: string;
  amount: number;
  amount_paid: number;
  outstanding_balance: number;
  status: RentChargeStatus;
  due_date: string;
  charge_id?: string;
  charge?: RentCharge;
}

export interface Payment {
  id: string;
  lease_id: string;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  reference: string;
  idempotency_key: string;
  is_reversed: boolean;
  reversal_reason?: string;
  receipt_id?: string;
  receipt_number?: string;
  allocated_charge_id: string;
  remaining_charge_balance: number;
  notes?: string;
  created_at: string;
}

export interface Receipt {
  id: string;
  payment_id: string;
  receipt_number: string;
  issued_at: string;
  tenant_name: string;
  property_name: string;
  unit_number: string;
  period_month: string;
  amount_paid: number;
  payment_method: PaymentMethod;
  reference: string;
  outstanding_balance: number;
  verification_hash: string;
  pdf_url?: string;
}

export interface MessageJob {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_phone: string;
  property_name: string;
  rent_charge_id?: string;
  type: MessageType;
  channel: MessageChannel;
  scheduled_at: string;
  status: MessageStatus;
  retry_count: number;
  last_error?: string;
  created_at: string;
}

export interface MessageLog {
  id: string;
  job_id: string;
  provider_id: string;
  channel: MessageChannel;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  error?: string;
  message_text: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  created_at: string;
}

export interface DashboardSummary {
  period_month: string;
  expected_rent: number;
  collected_rent: number;
  outstanding_rent: number;
  collection_percentage: number;
  total_properties: number;
  occupied_properties: number;
  vacant_properties: number;
  total_tenants: number;
  total_active_rent?: number;
  overdue_count: number;
  overdue_amount: number;
  upcoming_reminders_count: number;
  monthly_trends: {
    month: string;
    expected: number;
    collected: number;
    outstanding: number;
  }[];
}

export interface RentEasyBackupPayload {
  app: string;
  version: string;
  exported_at: string;
  environment: string;
  summary: {
    total_properties: number;
    total_units: number;
    total_tenants: number;
    total_rent_charges: number;
    total_payments: number;
    total_receipts: number;
    total_audit_logs: number;
  };
  landlord: Landlord;
  properties: Property[];
  tenants: Tenant[];
  leases: Lease[];
  rent_charges: RentCharge[];
  payments: Payment[];
  receipts: Receipt[];
  message_jobs: MessageJob[];
  audit_logs: AuditLog[];
  auth_credentials: {
    email: string;
    passwordPlain: string;
  };
}

export interface GoogleDriveSession {
  isConnected: boolean;
  email: string;
  name: string;
  avatarUrl?: string;
  connectedAt?: string;
  autoBackup: boolean;
  folderName: string;
}

export interface GoogleDriveCloudBackup {
  id: string;
  fileName: string;
  savedAt: string;
  sizeBytes: number;
  propertiesCount: number;
  tenantsCount: number;
  chargesCount: number;
  paymentsCount: number;
  data: RentEasyBackupPayload;
}

