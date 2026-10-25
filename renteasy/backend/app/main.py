import os
from datetime import datetime, date
from decimal import Decimal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

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
    AuditLog
)
from app.api import endpoints

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./renteasy.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency injection for API router
def get_db_override():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

endpoints.get_db = get_db_override

app = FastAPI(
    title="RentEasy API",
    description="Landlord-only property management, rent collection & automated reminder system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router, prefix="/api")

@app.on_event("startup")
def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed initial landlord if empty
        if not db.query(Landlord).first():
            landlord = Landlord(
                name="Rajesh Sharma",
                email="rajesh.sharma@renteasy.app",
                phone="+919876543210",
                company_name="Sharma Estates & Rentals",
                upi_id="sharma.rentals@okhdfcbank",
                timezone="Asia/Kolkata"
            )
            db.add(landlord)
            db.flush()

            # Seed 3 realistic properties
            p1 = Property(
                landlord_id=landlord.id,
                name="Sunrise Residency",
                unit_number="Flat 302",
                address="12th Main, 4th Cross, Indiranagar",
                city="Bengaluru",
                pincode="560038",
                property_type="2BHK",
                default_rent=Decimal("26000.00"),
                status="occupied"
            )
            p2 = Property(
                landlord_id=landlord.id,
                name="Greenwood Heights",
                unit_number="Villa 14",
                address="Near Wipro Circle, Sarjapur Road",
                city="Bengaluru",
                pincode="560035",
                property_type="3BHK Villa",
                default_rent=Decimal("45000.00"),
                status="occupied"
            )
            p3 = Property(
                landlord_id=landlord.id,
                name="Palm Meadows Annex",
                unit_number="Studio B4",
                address="Opposite Tech Park, Whitefield",
                city="Bengaluru",
                pincode="560066",
                property_type="1BHK Studio",
                default_rent=Decimal("16500.00"),
                status="vacant"
            )
            db.add_all([p1, p2, p3])
            db.flush()

            # Seed 2 active tenants
            t1 = Tenant(
                landlord_id=landlord.id,
                name="Vikramaditya Roy",
                phone="+919845012345",
                whatsapp_number="+919845012345",
                email="vikram.roy@example.com",
                emergency_contact="Ananya Roy (+919845099999)",
                status="active"
            )
            t2 = Tenant(
                landlord_id=landlord.id,
                name="Priya Venkat",
                phone="+919988776655",
                whatsapp_number="+919988776655",
                email="priya.v@example.com",
                emergency_contact="Venkat S (+919988771122)",
                status="active"
            )
            db.add_all([t1, t2])
            db.flush()

            # Notification preferences
            db.add(NotificationPreference(tenant_id=t1.id, whatsapp_enabled=True, sms_enabled=True))
            db.add(NotificationPreference(tenant_id=t2.id, whatsapp_enabled=True, sms_enabled=True))

            # Active Leases
            l1 = Lease(
                property_id=p1.id,
                tenant_id=t1.id,
                start_date=date(2026, 1, 1),
                end_date=date(2026, 12, 31),
                monthly_rent=Decimal("26000.00"),
                due_day=5,
                deposit_amount=Decimal("100000.00"),
                deposit_paid=True,
                status="active"
            )
            l2 = Lease(
                property_id=p2.id,
                tenant_id=t2.id,
                start_date=date(2026, 4, 1),
                end_date=date(2027, 3, 31),
                monthly_rent=Decimal("45000.00"),
                due_day=7,
                deposit_amount=Decimal("200000.00"),
                deposit_paid=True,
                status="active"
            )
            db.add_all([l1, l2])
            db.flush()

            # Rent Charges for current month (2026-10)
            c1 = RentCharge(
                lease_id=l1.id,
                period_month="2026-10",
                rent_amount=Decimal("26000.00"),
                other_charges=Decimal("1500.00"), # Maintenance
                due_date=date(2026, 10, 5),
                status="partially_paid"
            )
            c2 = RentCharge(
                lease_id=l2.id,
                period_month="2026-10",
                rent_amount=Decimal("45000.00"),
                other_charges=Decimal("0.00"),
                due_date=date(2026, 10, 7),
                status="overdue"
            )
            db.add_all([c1, c2])
            db.flush()

            # Initial partial payment for c1
            pay1 = Payment(
                lease_id=l1.id,
                amount=Decimal("15000.00"),
                payment_date=date(2026, 10, 4),
                method="upi",
                reference="UPI/428719284729/HDFC",
                idempotency_key="init-idemp-001",
                notes="Part payment towards October rent"
            )
            db.add(pay1)
            db.flush()

            alloc1 = PaymentAllocation(
                payment_id=pay1.id,
                rent_charge_id=c1.id,
                allocated_amount=Decimal("15000.00")
            )
            db.add(alloc1)

            rec1 = Receipt(
                payment_id=pay1.id,
                receipt_number="REC-2026-0001",
                pdf_path="/receipts/REC-2026-0001.pdf",
                verification_hash="A7F93E1B0984C2",
                issued_at=datetime.utcnow()
            )
            db.add(rec1)

            # Sample message job & log
            job1 = MessageJob(
                tenant_id=t1.id,
                rent_charge_id=c1.id,
                type="payment_receipt",
                channel="whatsapp",
                scheduled_at=datetime.utcnow(),
                status="delivered"
            )
            db.add(job1)

            db.commit()
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "app": "RentEasy API",
        "status": "running",
        "docs": "/docs",
        "version": "1.0.0"
    }
