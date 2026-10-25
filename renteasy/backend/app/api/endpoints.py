from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.entities import (
    Base,
    Landlord,
    Property,
    Tenant,
    NotificationPreference,
    Lease,
    RentCharge,
    Payment,
    PaymentAllocation,
    Receipt,
    MessageJob,
    MessageLog,
    AuditLog
)
from app.schemas.schemas import (
    LandlordLoginRequest,
    LandlordResponse,
    PropertyCreate,
    PropertyUpdate,
    PropertyResponse,
    TenantCreate,
    TenantUpdate,
    TenantResponse,
    LeaseCreate,
    LeaseResponse,
    RentChargeGenerateRequest,
    RentChargeResponse,
    PaymentCreate,
    PaymentResponse,
    PaymentReversalRequest,
    ReceiptResponse,
    MessageJobResponse,
    MessageLogResponse,
    MessageRetryRequest,
    DashboardSummaryResponse,
    MonthTrend,
    AuditLogResponse,
    WhatsAppWebhookPayload,
    SMSWebhookPayload
)
from app.services.financial_service import FinancialService
from app.messaging.services import MessagingService

router = APIRouter()

# Dependency placeholder for DB session (injected by main.py)
def get_db():
    raise NotImplementedError

# Landlord Authenticated Context (Mock session for single-landlord first release)
def get_current_landlord(db: Session = Depends(get_db)) -> Landlord:
    landlord = db.query(Landlord).first()
    if not landlord:
        landlord = Landlord(
            name="Rajesh Sharma",
            email="rajesh.sharma@renteasy.app",
            phone="+919876543210",
            company_name="Sharma Estates & Rentals",
            upi_id="sharma.rentals@okhdfcbank",
            timezone="Asia/Kolkata"
        )
        db.add(landlord)
        db.commit()
        db.refresh(landlord)
    return landlord


# 1. AUTH
@router.post("/auth/login", response_model=LandlordResponse)
def login(payload: LandlordLoginRequest, db: Session = Depends(get_db)):
    landlord = db.query(Landlord).filter(Landlord.email == payload.email).first()
    if not landlord:
        # For seamless local testing, allow login or create default landlord
        landlord = get_current_landlord(db)
    return landlord


# 2. DASHBOARD
@router.get("/dashboard/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    month: Optional[str] = Query(None, description="YYYY-MM"),
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    target_month = month or datetime.now().strftime("%Y-%m")
    charges = db.query(RentCharge).join(Lease).join(Property).filter(
        Property.landlord_id == landlord.id,
        RentCharge.period_month == target_month
    ).all()

    expected = sum((c.rent_amount + c.other_charges for c in charges), Decimal("0.00"))
    
    total_paid = Decimal("0.00")
    overdue_count = 0
    overdue_amount = Decimal("0.00")

    for c in charges:
        _, allocated, outstanding = FinancialService.get_charge_balance(c.id, db)
        total_paid += allocated
        if c.status == "overdue" or (outstanding > 0 and date.today() > c.due_date):
            overdue_count += 1
            overdue_amount += outstanding

    outstanding_rent = max(Decimal("0.00"), expected - total_paid)
    collection_rate = float((total_paid / expected * 100)) if expected > 0 else 0.0

    total_props = db.query(Property).filter(Property.landlord_id == landlord.id).count()
    occupied_props = db.query(Property).filter(Property.landlord_id == landlord.id, Property.status == "occupied").count()
    vacant_props = total_props - occupied_props
    total_tenants = db.query(Tenant).filter(Tenant.landlord_id == landlord.id, Tenant.status == "active").count()
    
    upcoming_reminders = db.query(MessageJob).filter(
        MessageJob.status.in_(["queued", "sending"])
    ).count()

    # Past 4 months trends
    trends: List[MonthTrend] = []
    current_year = datetime.now().year
    for m in range(7, 11):
        p_month = f"{current_year}-{m:02d}"
        m_charges = db.query(RentCharge).join(Lease).join(Property).filter(
            Property.landlord_id == landlord.id,
            RentCharge.period_month == p_month
        ).all()
        m_exp = sum((c.rent_amount + c.other_charges for c in m_charges), Decimal("0.00"))
        m_col = Decimal("0.00")
        for c in m_charges:
            _, alloc, _ = FinancialService.get_charge_balance(c.id, db)
            m_col += alloc
        trends.append(MonthTrend(
            month=datetime.strptime(p_month, "%Y-%m").strftime("%b %y"),
            expected=m_exp,
            collected=m_col,
            outstanding=max(Decimal("0.00"), m_exp - m_col)
        ))

    return DashboardSummaryResponse(
        period_month=target_month,
        expected_rent=expected,
        collected_rent=total_paid,
        outstanding_rent=outstanding_rent,
        collection_percentage=round(collection_rate, 1),
        total_properties=total_props,
        occupied_properties=occupied_props,
        vacant_properties=vacant_props,
        total_tenants=total_tenants,
        overdue_count=overdue_count,
        overdue_amount=overdue_amount,
        upcoming_reminders_count=upcoming_reminders,
        monthly_trends=trends
    )


# 3. PROPERTIES
@router.get("/properties", response_model=List[PropertyResponse])
def list_properties(
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    props = db.query(Property).filter(Property.landlord_id == landlord.id).all()
    results = []
    for p in props:
        active_lease = db.query(Lease).filter(Lease.property_id == p.id, Lease.status == "active").first()
        tenant_name = active_lease.tenant.name if active_lease and active_lease.tenant else None
        results.append(PropertyResponse(
            id=p.id,
            landlord_id=p.landlord_id,
            name=p.name,
            unit_number=p.unit_number,
            address=p.address,
            city=p.city,
            pincode=p.pincode,
            property_type=p.property_type,
            default_rent=p.default_rent,
            status=p.status,
            current_tenant_name=tenant_name,
            current_lease_id=active_lease.id if active_lease else None,
            created_at=p.created_at
        ))
    return results

@router.post("/properties", response_model=PropertyResponse)
def create_property(
    payload: PropertyCreate,
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    p = Property(
        landlord_id=landlord.id,
        name=payload.name,
        unit_number=payload.unit_number,
        address=payload.address,
        city=payload.city,
        pincode=payload.pincode,
        property_type=payload.property_type,
        default_rent=payload.default_rent,
        status=payload.status
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return PropertyResponse(
        id=p.id,
        landlord_id=p.landlord_id,
        name=p.name,
        unit_number=p.unit_number,
        address=p.address,
        city=p.city,
        pincode=p.pincode,
        property_type=p.property_type,
        default_rent=p.default_rent,
        status=p.status,
        current_tenant_name=None,
        current_lease_id=None,
        created_at=p.created_at
    )


# 4. TENANTS
@router.get("/tenants", response_model=List[TenantResponse])
def list_tenants(
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    tenants = db.query(Tenant).filter(Tenant.landlord_id == landlord.id).all()
    results = []
    for t in tenants:
        pref = t.notification_preference
        active_lease = next((l for l in t.leases if l.status == "active"), None)
        prop = active_lease.property if active_lease else None

        results.append(TenantResponse(
            id=t.id,
            landlord_id=t.landlord_id,
            name=t.name,
            phone=t.phone,
            whatsapp_number=t.whatsapp_number,
            email=t.email,
            status=t.status,
            emergency_contact=t.emergency_contact,
            linked_property_name=prop.name if prop else None,
            linked_unit_number=prop.unit_number if prop else None,
            active_lease_id=active_lease.id if active_lease else None,
            monthly_rent=active_lease.monthly_rent if active_lease else None,
            due_day=active_lease.due_day if active_lease else None,
            deposit_amount=active_lease.deposit_amount if active_lease else None,
            deposit_paid=active_lease.deposit_paid if active_lease else None,
            whatsapp_enabled=pref.whatsapp_enabled if pref else True,
            sms_enabled=pref.sms_enabled if pref else True,
            created_at=t.created_at
        ))
    return results

@router.post("/tenants", response_model=TenantResponse)
def create_tenant(
    payload: TenantCreate,
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    t = Tenant(
        landlord_id=landlord.id,
        name=payload.name,
        phone=payload.phone,
        whatsapp_number=payload.whatsapp_number,
        email=payload.email,
        emergency_contact=payload.emergency_contact
    )
    db.add(t)
    db.flush()

    # Preferences
    pref = NotificationPreference(
        tenant_id=t.id,
        whatsapp_enabled=True,
        sms_enabled=True
    )
    db.add(pref)

    # If linked property & rent details provided, create active lease immediately
    linked_prop_name = None
    linked_unit = None
    lease_id = None
    if payload.property_id and payload.monthly_rent:
        prop = db.query(Property).filter(Property.id == payload.property_id).first()
        if prop:
            prop.status = "occupied"
            linked_prop_name = prop.name
            linked_unit = prop.unit_number

            lease = Lease(
                property_id=prop.id,
                tenant_id=t.id,
                start_date=payload.start_date or date.today(),
                end_date=payload.end_date or date(date.today().year + 1, date.today().month, 1),
                monthly_rent=payload.monthly_rent,
                due_day=payload.due_day or 5,
                deposit_amount=payload.deposit_amount or Decimal("0.00"),
                deposit_paid=payload.deposit_paid or False,
                status="active"
            )
            db.add(lease)
            db.flush()
            lease_id = lease.id

            # Auto-generate current month charge
            current_month = datetime.now().strftime("%Y-%m")
            FinancialService.generate_monthly_charges(db, current_month, landlord.id)

    db.commit()
    db.refresh(t)

    return TenantResponse(
        id=t.id,
        landlord_id=t.landlord_id,
        name=t.name,
        phone=t.phone,
        whatsapp_number=t.whatsapp_number,
        email=t.email,
        status=t.status,
        emergency_contact=t.emergency_contact,
        linked_property_name=linked_prop_name,
        linked_unit_number=linked_unit,
        active_lease_id=lease_id,
        monthly_rent=payload.monthly_rent,
        due_day=payload.due_day,
        deposit_amount=payload.deposit_amount,
        deposit_paid=payload.deposit_paid,
        whatsapp_enabled=True,
        sms_enabled=True,
        created_at=t.created_at
    )


# 5. RENT LEDGER & CHARGES
@router.get("/rent-charges", response_model=List[RentChargeResponse])
def get_rent_ledger(
    month: Optional[str] = Query(None, description="YYYY-MM"),
    property_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    query = db.query(RentCharge).join(Lease).join(Property).filter(Property.landlord_id == landlord.id)
    if month:
        query = query.filter(RentCharge.period_month == month)
    if property_id:
        query = query.filter(Property.id == property_id)
    if status_filter and status_filter != "all":
        query = query.filter(RentCharge.status == status_filter)

    charges = query.order_by(desc(RentCharge.period_month), RentCharge.due_date).all()
    results = []

    for c in charges:
        total_due, allocated, outstanding = FinancialService.get_charge_balance(c.id, db)
        lease = c.lease
        prop = lease.property
        tenant = lease.tenant

        results.append(RentChargeResponse(
            id=c.id,
            lease_id=lease.id,
            property_name=prop.name,
            unit_number=prop.unit_number,
            tenant_name=tenant.name,
            tenant_phone=tenant.phone,
            period_month=c.period_month,
            rent_amount=c.rent_amount,
            other_charges=c.other_charges,
            total_due=total_due,
            amount_paid=allocated,
            outstanding_balance=outstanding,
            due_date=c.due_date,
            status=c.status,
            created_at=c.created_at
        ))
    return results

@router.post("/rent-charges/generate")
def generate_rent_charges(
    payload: RentChargeGenerateRequest,
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    created = FinancialService.generate_monthly_charges(db, payload.period_month, landlord.id)
    return {
        "status": "success",
        "period_month": payload.period_month,
        "charges_generated": len(created)
    }


# 6. PAYMENTS & ALLOCATIONS
@router.post("/payments", response_model=PaymentResponse)
def record_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    try:
        payment, receipt, remaining = FinancialService.record_payment(
            session=db,
            rent_charge_id=payload.rent_charge_id,
            amount=payload.amount,
            payment_date=payload.payment_date,
            method=payload.method,
            reference=payload.reference,
            idempotency_key=payload.idempotency_key,
            landlord_id=landlord.id,
            notes=payload.notes
        )

        # Automatically queue receipt delivery via WhatsApp & SMS
        charge = db.query(RentCharge).filter(RentCharge.id == payload.rent_charge_id).first()
        if charge:
            tenant = charge.lease.tenant
            MessagingService.queue_reminder(db, tenant.id, charge.id, "payment_receipt", "whatsapp")
            MessagingService.queue_reminder(db, tenant.id, charge.id, "payment_receipt", "sms")

        return PaymentResponse(
            id=payment.id,
            lease_id=payment.lease_id,
            amount=payment.amount,
            payment_date=payment.payment_date,
            method=payment.method,
            reference=payment.reference,
            idempotency_key=payment.idempotency_key,
            is_reversed=payment.is_reversed,
            receipt_id=receipt.id if receipt else None,
            receipt_number=receipt.receipt_number if receipt else None,
            allocated_charge_id=payload.rent_charge_id,
            remaining_charge_balance=remaining,
            created_at=payment.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/payments/{id}/reverse", response_model=PaymentResponse)
def reverse_payment(
    id: str,
    payload: PaymentReversalRequest,
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    try:
        payment = FinancialService.reverse_payment(db, id, payload.reason, landlord.id)
        alloc = payment.allocations[0] if payment.allocations else None
        charge_id = alloc.rent_charge_id if alloc else ""
        _, _, remaining = FinancialService.get_charge_balance(charge_id, db) if charge_id else (0, 0, 0)

        return PaymentResponse(
            id=payment.id,
            lease_id=payment.lease_id,
            amount=payment.amount,
            payment_date=payment.payment_date,
            method=payment.method,
            reference=payment.reference,
            idempotency_key=payment.idempotency_key,
            is_reversed=payment.is_reversed,
            receipt_id=payment.receipt.id if payment.receipt else None,
            receipt_number=payment.receipt.receipt_number if payment.receipt else None,
            allocated_charge_id=charge_id,
            remaining_charge_balance=remaining,
            created_at=payment.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# 7. RECEIPTS
@router.get("/receipts", response_model=List[ReceiptResponse])
def list_receipts(
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    receipts = db.query(Receipt).join(Payment).join(Lease).join(Property).filter(
        Property.landlord_id == landlord.id
    ).order_by(desc(Receipt.issued_at)).all()

    results = []
    for r in receipts:
        payment = r.payment
        lease = payment.lease
        prop = lease.property
        tenant = lease.tenant
        alloc = payment.allocations[0] if payment.allocations else None
        charge = alloc.rent_charge if alloc else None
        _, _, remaining = FinancialService.get_charge_balance(charge.id, db) if charge else (0, 0, Decimal("0.00"))

        results.append(ReceiptResponse(
            id=r.id,
            payment_id=r.payment_id,
            receipt_number=r.receipt_number,
            issued_at=r.issued_at,
            tenant_name=tenant.name,
            property_name=prop.name,
            unit_number=prop.unit_number,
            period_month=charge.period_month if charge else "Monthly Rent",
            amount_paid=payment.amount,
            payment_method=payment.method,
            reference=payment.reference,
            outstanding_balance=remaining,
            verification_hash=r.verification_hash,
            pdf_url=r.pdf_path
        ))
    return results


# 8. REMINDER CENTRE & MESSAGING
@router.get("/messages", response_model=List[MessageJobResponse])
def list_message_jobs(
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    jobs = db.query(MessageJob).join(Tenant).filter(Tenant.landlord_id == landlord.id).order_by(desc(MessageJob.scheduled_at)).all()
    results = []
    for j in jobs:
        tenant = j.tenant
        charge = j.rent_charge
        prop = charge.lease.property if charge else None

        results.append(MessageJobResponse(
            id=j.id,
            tenant_id=j.tenant_id,
            tenant_name=tenant.name,
            tenant_phone=tenant.phone,
            property_name=prop.name if prop else "Rental Unit",
            rent_charge_id=j.rent_charge_id,
            type=j.type,
            channel=j.channel,
            scheduled_at=j.scheduled_at,
            status=j.status,
            retry_count=j.retry_count,
            last_error=j.last_error,
            created_at=j.created_at
        ))
    return results

@router.post("/messages/{id}/retry")
def retry_message(
    id: str,
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    job = db.query(MessageJob).filter(MessageJob.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Message job not found")

    job.retry_count += 1
    job.status = "queued"
    log = MessagingService.process_job(db, job.id)
    return {"status": "retried", "job_id": job.id, "delivery_status": log.status if log else "cancelled"}

@router.post("/messages/dispatch-all")
def dispatch_pending_messages(
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    jobs = db.query(MessageJob).filter(MessageJob.status == "queued").all()
    processed = 0
    for j in jobs:
        MessagingService.process_job(db, j.id)
        processed += 1
    return {"status": "success", "processed_count": processed}


# 9. AUDIT LOGS
@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    landlord: Landlord = Depends(get_current_landlord)
):
    logs = db.query(AuditLog).filter(AuditLog.landlord_id == landlord.id).order_by(desc(AuditLog.created_at)).limit(50).all()
    return logs


# 10. WEBHOOKS
@router.post("/webhooks/whatsapp")
def whatsapp_webhook(payload: WhatsAppWebhookPayload, db: Session = Depends(get_db)):
    return {"status": "received", "message_id": payload.message_id}

@router.post("/webhooks/sms")
def sms_webhook(payload: SMSWebhookPayload, db: Session = Depends(get_db)):
    return {"status": "received", "message_id": payload.message_id}
