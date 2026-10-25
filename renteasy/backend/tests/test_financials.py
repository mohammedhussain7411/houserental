import pytest
from datetime import date
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.entities import Base, Landlord, Property, Tenant, Lease, RentCharge, Payment, Receipt, PaymentAllocation
from app.services.financial_service import FinancialService

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    landlord = Landlord(name="Test Landlord", email="test@renteasy.app", phone="+919876543210")
    session.add(landlord)
    session.flush()

    prop = Property(landlord_id=landlord.id, name="Test Flat", unit_number="101", address="Road 1", pincode="560001")
    session.add(prop)
    session.flush()

    tenant = Tenant(landlord_id=landlord.id, name="Test Tenant", phone="+919876500000", whatsapp_number="+919876500000")
    session.add(tenant)
    session.flush()

    lease = Lease(property_id=prop.id, tenant_id=tenant.id, start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), monthly_rent=Decimal("20000.00"), due_day=5)
    session.add(lease)
    session.commit()

    yield session
    session.close()

def test_idempotent_monthly_charge_generation(db_session):
    charges_first = FinancialService.generate_monthly_charges(db_session, "2026-10")
    assert len(charges_first) == 1

    # Generating again for same month must not duplicate
    charges_second = FinancialService.generate_monthly_charges(db_session, "2026-10")
    assert len(charges_second) == 0

def test_partial_payment_and_outstanding_balance(db_session):
    FinancialService.generate_monthly_charges(db_session, "2026-10")
    charge = db_session.query(RentCharge).first()

    # Total due is 20,000. Pay 8,000 partial
    payment, receipt, remaining = FinancialService.record_payment(
        session=db_session,
        rent_charge_id=charge.id,
        amount=Decimal("8000.00"),
        payment_date=date(2026, 10, 3),
        method="upi",
        reference="UPI-REF-001",
        idempotency_key="idemp-key-001"
    )

    assert remaining == Decimal("12000.00")
    assert charge.status == "partially_paid"
    assert receipt.receipt_number.startswith("REC-2026-")

def test_full_payment_settlement(db_session):
    FinancialService.generate_monthly_charges(db_session, "2026-10")
    charge = db_session.query(RentCharge).first()

    payment, receipt, remaining = FinancialService.record_payment(
        session=db_session,
        rent_charge_id=charge.id,
        amount=Decimal("20000.00"),
        payment_date=date(2026, 10, 4),
        method="bank_transfer",
        reference="NEFT-REF-002",
        idempotency_key="idemp-key-002"
    )

    assert remaining == Decimal("0.00")
    assert charge.status == "paid"

def test_idempotency_prevention_of_duplicate_payment(db_session):
    FinancialService.generate_monthly_charges(db_session, "2026-10")
    charge = db_session.query(RentCharge).first()

    p1, r1, _ = FinancialService.record_payment(
        session=db_session,
        rent_charge_id=charge.id,
        amount=Decimal("5000.00"),
        payment_date=date(2026, 10, 4),
        method="upi",
        reference="UPI-REF-003",
        idempotency_key="unique-idemp-003"
    )

    # Submitting again with identical idempotency key returns existing payment without creating new records
    p2, r2, _ = FinancialService.record_payment(
        session=db_session,
        rent_charge_id=charge.id,
        amount=Decimal("5000.00"),
        payment_date=date(2026, 10, 4),
        method="upi",
        reference="UPI-REF-003",
        idempotency_key="unique-idemp-003"
    )

    assert p1.id == p2.id
    assert r1.id == r2.id
    assert db_session.query(Payment).count() == 1
