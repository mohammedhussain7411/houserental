import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from sqlalchemy import (
    Column,
    String,
    Numeric,
    Integer,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Text,
    Index,
    UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Landlord(Base):
    __tablename__ = "landlords"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    company_name = Column(String(255), nullable=True)
    upi_id = Column(String(100), nullable=True)
    timezone = Column(String(50), default="Asia/Kolkata", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    properties = relationship("Property", back_populates="landlord", cascade="all, delete-orphan")
    tenants = relationship("Tenant", back_populates="landlord", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="landlord")


class Property(Base):
    __tablename__ = "properties"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    landlord_id = Column(String(36), ForeignKey("landlords.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    unit_number = Column(String(50), nullable=True, default="")
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False, default="Bengaluru")
    pincode = Column(String(10), nullable=False)
    property_type = Column(String(50), nullable=False, default="2BHK")  # 1BHK, 2BHK, 3BHK, Independent House, Villa, Commercial
    default_rent = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    total_units = Column(Integer, default=1, nullable=False)
    status = Column(String(20), nullable=False, default="vacant")  # occupied, vacant, maintenance
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    landlord = relationship("Landlord", back_populates="properties")
    units = relationship("PropertyUnit", back_populates="property", cascade="all, delete-orphan")
    leases = relationship("Lease", back_populates="property", cascade="all, delete-orphan")


class PropertyUnit(Base):
    __tablename__ = "property_units"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    property_id = Column(String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_number = Column(String(50), nullable=False)
    property_type = Column(String(50), nullable=False, default="2BHK")
    default_rent = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    status = Column(String(20), nullable=False, default="vacant")  # occupied, vacant, maintenance
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    property = relationship("Property", back_populates="units")
    leases = relationship("Lease", back_populates="unit")


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    landlord_id = Column(String(36), ForeignKey("landlords.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False, index=True)
    whatsapp_number = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="active")  # active, past, notice
    emergency_contact = Column(String(100), nullable=True)
    aadhaar_number = Column(String(20), nullable=True)
    permanent_address = Column(Text, nullable=True)
    initial_balance = Column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    landlord = relationship("Landlord", back_populates="tenants")
    leases = relationship("Lease", back_populates="tenant")
    notification_preference = relationship("NotificationPreference", uselist=False, back_populates="tenant", cascade="all, delete-orphan")
    message_jobs = relationship("MessageJob", back_populates="tenant")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True)
    whatsapp_enabled = Column(Boolean, default=True, nullable=False)
    sms_enabled = Column(Boolean, default=True, nullable=False)
    consent_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    dlt_consent_verified = Column(Boolean, default=True, nullable=False)

    tenant = relationship("Tenant", back_populates="notification_preference")


class Lease(Base):
    __tablename__ = "leases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    property_id = Column(String(36), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_id = Column(String(36), ForeignKey("property_units.id", ondelete="SET NULL"), nullable=True, index=True)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    monthly_rent = Column(Numeric(12, 2), nullable=False)
    due_day = Column(Integer, nullable=False, default=5)  # e.g., 5th of each month
    deposit_amount = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    deposit_paid = Column(Boolean, default=False, nullable=False)
    status = Column(String(20), nullable=False, default="active")  # active, terminated, expired
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    property = relationship("Property", back_populates="leases")
    unit = relationship("PropertyUnit", back_populates="leases")
    tenant = relationship("Tenant", back_populates="leases")
    rent_charges = relationship("RentCharge", back_populates="lease", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="lease", cascade="all, delete-orphan")


class RentCharge(Base):
    __tablename__ = "rent_charges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    lease_id = Column(String(36), ForeignKey("leases.id", ondelete="CASCADE"), nullable=False, index=True)
    period_month = Column(String(7), nullable=False)  # YYYY-MM
    rent_amount = Column(Numeric(12, 2), nullable=False)
    other_charges = Column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    due_date = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending, partially_paid, paid, overdue
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("lease_id", "period_month", name="uq_lease_period_month"),
        Index("idx_rent_charges_lease_status", "lease_id", "status"),
    )

    lease = relationship("Lease", back_populates="rent_charges")
    allocations = relationship("PaymentAllocation", back_populates="rent_charge")
    message_jobs = relationship("MessageJob", back_populates="rent_charge")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    lease_id = Column(String(36), ForeignKey("leases.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_date = Column(Date, nullable=False)
    method = Column(String(50), nullable=False)  # upi, bank_transfer, cash, cheque
    reference = Column(String(100), nullable=False)
    idempotency_key = Column(String(100), unique=True, nullable=False, index=True)
    is_reversed = Column(Boolean, default=False, nullable=False)
    reversal_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    lease = relationship("Lease", back_populates="payments")
    allocations = relationship("PaymentAllocation", back_populates="payment", cascade="all, delete-orphan")
    receipt = relationship("Receipt", uselist=False, back_populates="payment")


class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    payment_id = Column(String(36), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    rent_charge_id = Column(String(36), ForeignKey("rent_charges.id", ondelete="CASCADE"), nullable=False, index=True)
    allocated_amount = Column(Numeric(12, 2), nullable=False)

    payment = relationship("Payment", back_populates="allocations")
    rent_charge = relationship("RentCharge", back_populates="allocations")


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    payment_id = Column(String(36), ForeignKey("payments.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    receipt_number = Column(String(50), unique=True, nullable=False, index=True)  # REC-2026-0001
    pdf_path = Column(String(500), nullable=True)
    verification_hash = Column(String(64), nullable=True)
    issued_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    payment = relationship("Payment", back_populates="receipt")


class MessageJob(Base):
    __tablename__ = "message_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    rent_charge_id = Column(String(36), ForeignKey("rent_charges.id", ondelete="CASCADE"), nullable=True, index=True)
    type = Column(String(50), nullable=False)  # upcoming_reminder, due_date_reminder, overdue_reminder, payment_receipt
    channel = Column(String(20), nullable=False)  # whatsapp, sms
    scheduled_at = Column(DateTime, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="queued")  # queued, sending, sent, delivered, failed, cancelled
    retry_count = Column(Integer, default=0, nullable=False)
    last_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    tenant = relationship("Tenant", back_populates="message_jobs")
    rent_charge = relationship("RentCharge", back_populates="message_jobs")
    logs = relationship("MessageLog", back_populates="job", cascade="all, delete-orphan")


class MessageLog(Base):
    __tablename__ = "message_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("message_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(String(100), nullable=True)
    channel = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False)  # sent, delivered, read, failed
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    message_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    job = relationship("MessageJob", back_populates="logs")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    landlord_id = Column(String(36), ForeignKey("landlords.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False)  # payment_created, payment_reversed, lease_created, charge_generated
    entity_type = Column(String(50), nullable=False)  # payment, lease, rent_charge, tenant, property
    entity_id = Column(String(36), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    landlord = relationship("Landlord", back_populates="audit_logs")
