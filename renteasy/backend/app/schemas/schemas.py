from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# Base & Auth Schemas
class LandlordLoginRequest(BaseModel):
    email: EmailStr
    password: str

class LandlordResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    company_name: Optional[str] = None
    upi_id: Optional[str] = None
    timezone: str
    created_at: datetime

    class Config:
        from_attributes = True

# Property Unit Schemas
class PropertyUnitCreate(BaseModel):
    unit_number: str
    property_type: str = "2BHK"
    default_rent: Decimal = Field(default=Decimal("0.00"), decimal_places=2)
    status: str = "vacant"

class PropertyUnitResponse(BaseModel):
    id: str
    property_id: str
    unit_number: str
    property_type: str
    default_rent: Decimal
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Property Schemas
class PropertyCreate(BaseModel):
    name: str
    total_units: Optional[int] = 1
    unit_prefix: Optional[str] = "Flat "
    start_number: Optional[int] = 101
    custom_unit_names: Optional[List[str]] = None
    unit_number: Optional[str] = None
    address: str
    city: str = "Bengaluru"
    pincode: str
    property_type: str = "2BHK"
    default_rent: Decimal = Field(default=Decimal("0.00"), decimal_places=2)
    status: str = "vacant"

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    unit_number: Optional[str] = None
    total_units: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    property_type: Optional[str] = None
    default_rent: Optional[Decimal] = None
    status: Optional[str] = None

class PropertyResponse(BaseModel):
    id: str
    landlord_id: str
    name: str
    total_units: int = 1
    unit_number: Optional[str] = None
    address: str
    city: str
    pincode: str
    property_type: str
    default_rent: Decimal
    status: str
    units: List[PropertyUnitResponse] = []
    current_tenant_name: Optional[str] = None
    current_lease_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Notification Preference Schemas
class NotificationPreferenceResponse(BaseModel):
    tenant_id: str
    whatsapp_enabled: bool
    sms_enabled: bool
    consent_at: datetime
    dlt_consent_verified: bool

    class Config:
        from_attributes = True

class NotificationPreferenceUpdate(BaseModel):
    whatsapp_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None

# Tenant Schemas
class TenantCreate(BaseModel):
    name: str
    phone: str
    whatsapp_number: str
    email: Optional[EmailStr] = None
    emergency_contact: Optional[str] = None
    property_id: Optional[str] = None
    house_number: Optional[str] = None
    date: Optional[date] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    monthly_rent: Optional[Decimal] = None
    due_day: Optional[int] = 5
    deposit_amount: Optional[Decimal] = Decimal("0.00")
    deposit_paid: Optional[bool] = False
    aadhaar_number: Optional[str] = None
    permanent_address: Optional[str] = None
    initial_balance: Optional[Decimal] = Decimal("0.00")

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[str] = None
    emergency_contact: Optional[str] = None
    aadhaar_number: Optional[str] = None
    permanent_address: Optional[str] = None

class TenantResponse(BaseModel):
    id: str
    landlord_id: str
    name: str
    phone: str
    whatsapp_number: str
    email: Optional[str] = None
    status: str
    emergency_contact: Optional[str] = None
    linked_property_name: Optional[str] = None
    linked_unit_number: Optional[str] = None
    house_number: Optional[str] = None
    active_lease_id: Optional[str] = None
    date: Optional[date] = None
    monthly_rent: Optional[Decimal] = None
    due_day: Optional[int] = None
    deposit_amount: Optional[Decimal] = None
    deposit_paid: Optional[bool] = None
    aadhaar_number: Optional[str] = None
    permanent_address: Optional[str] = None
    initial_balance: Optional[Decimal] = Decimal("0.00")
    balance_amount: Optional[Decimal] = None
    whatsapp_enabled: bool = True
    sms_enabled: bool = True
    created_at: datetime

    class Config:
        from_attributes = True

# Lease Schemas
class LeaseCreate(BaseModel):
    property_id: str
    tenant_id: str
    start_date: date
    end_date: date
    monthly_rent: Decimal
    due_day: int = 5
    deposit_amount: Decimal = Decimal("0.00")
    deposit_paid: bool = False

class LeaseResponse(BaseModel):
    id: str
    property_id: str
    tenant_id: str
    start_date: date
    end_date: date
    monthly_rent: Decimal
    due_day: int
    deposit_amount: Decimal
    deposit_paid: bool
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# Rent Charge Schemas
class RentChargeGenerateRequest(BaseModel):
    period_month: str = Field(description="Format YYYY-MM, e.g. 2026-10")

class RentChargeResponse(BaseModel):
    id: str
    lease_id: str
    property_name: str
    unit_number: str
    tenant_name: str
    tenant_phone: str
    period_month: str
    rent_amount: Decimal
    other_charges: Decimal
    total_due: Decimal
    amount_paid: Decimal
    outstanding_balance: Decimal
    due_date: date
    status: str
    created_at: datetime

# Payment & Allocation Schemas
class PaymentCreate(BaseModel):
    rent_charge_id: str
    amount: Decimal = Field(gt=Decimal("0.00"), decimal_places=2)
    payment_date: date
    method: str = Field(default="upi", description="upi, bank_transfer, cash, cheque")
    reference: str = Field(min_length=3)
    idempotency_key: str = Field(min_length=8)
    notes: Optional[str] = None

class PaymentReversalRequest(BaseModel):
    reason: str

class PaymentResponse(BaseModel):
    id: str
    lease_id: str
    amount: Decimal
    payment_date: date
    method: str
    reference: str
    idempotency_key: str
    is_reversed: bool
    receipt_id: Optional[str] = None
    receipt_number: Optional[str] = None
    allocated_charge_id: str
    remaining_charge_balance: Decimal
    created_at: datetime

# Receipt Schemas
class ReceiptResponse(BaseModel):
    id: str
    payment_id: str
    receipt_number: str
    issued_at: datetime
    tenant_name: str
    property_name: str
    unit_number: str
    period_month: str
    amount_paid: Decimal
    payment_method: str
    reference: str
    outstanding_balance: Decimal
    verification_hash: Optional[str] = None
    pdf_url: Optional[str] = None

# Message Jobs & Logs
class MessageJobResponse(BaseModel):
    id: str
    tenant_id: str
    tenant_name: str
    tenant_phone: str
    property_name: str
    rent_charge_id: Optional[str] = None
    type: str
    channel: str
    scheduled_at: datetime
    status: str
    retry_count: int
    last_error: Optional[str] = None
    created_at: datetime

class MessageLogResponse(BaseModel):
    id: str
    job_id: str
    provider_id: Optional[str] = None
    channel: str
    status: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error: Optional[str] = None
    message_text: Optional[str] = None

class MessageRetryRequest(BaseModel):
    job_id: str

# Webhook Callback Schemas
class WhatsAppWebhookPayload(BaseModel):
    message_id: str
    status: str  # sent, delivered, read, failed
    timestamp: datetime
    recipient_phone: str
    error: Optional[str] = None

class SMSWebhookPayload(BaseModel):
    message_id: str
    status: str  # DELIVRD, FAILED, UNDELIV
    timestamp: datetime
    mobile_no: str
    error_code: Optional[str] = None

# Dashboard Summary Schema
class MonthTrend(BaseModel):
    month: str
    expected: Decimal
    collected: Decimal
    outstanding: Decimal

class DashboardSummaryResponse(BaseModel):
    period_month: str
    expected_rent: Decimal
    collected_rent: Decimal
    outstanding_rent: Decimal
    collection_percentage: float
    total_properties: int
    occupied_properties: int
    vacant_properties: int
    total_tenants: int
    overdue_count: int
    overdue_amount: Decimal
    upcoming_reminders_count: int
    monthly_trends: List[MonthTrend]

# Audit Log Schema
class AuditLogResponse(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: str
    details: Optional[str] = None
    created_at: datetime
