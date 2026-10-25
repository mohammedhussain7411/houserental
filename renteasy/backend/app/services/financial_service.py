import hashlib
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.entities import (
    Payment,
    PaymentAllocation,
    RentCharge,
    Receipt,
    Lease,
    AuditLog,
    MessageJob,
    generate_uuid
)

class FinancialService:
    @staticmethod
    def calculate_charge_status(charge: RentCharge, session: Session) -> str:
        """
        Recalculates status based on outstanding balance and due date.
        Never treat sending a reminder as proof of payment.
        """
        total_allocated = session.query(func.sum(PaymentAllocation.allocated_amount))\
            .join(Payment, PaymentAllocation.payment_id == Payment.id)\
            .filter(PaymentAllocation.rent_charge_id == charge.id, Payment.is_reversed == False)\
            .scalar() or Decimal("0.00")

        total_due = charge.rent_amount + charge.other_charges
        outstanding = total_due - total_allocated

        today = date.today()
        if outstanding <= Decimal("0.00"):
            return "paid"
        elif total_allocated > Decimal("0.00") and outstanding > Decimal("0.00"):
            return "partially_paid"
        elif today > charge.due_date:
            return "overdue"
        else:
            return "pending"

    @staticmethod
    def get_charge_balance(charge_id: str, session: Session) -> Tuple[Decimal, Decimal, Decimal]:
        """Returns (total_due, total_allocated, outstanding_balance)"""
        charge = session.query(RentCharge).filter(RentCharge.id == charge_id).first()
        if not charge:
            raise ValueError(f"Rent charge {charge_id} not found")

        total_allocated = session.query(func.sum(PaymentAllocation.allocated_amount))\
            .join(Payment, PaymentAllocation.payment_id == Payment.id)\
            .filter(PaymentAllocation.rent_charge_id == charge.id, Payment.is_reversed == False)\
            .scalar() or Decimal("0.00")

        total_due = charge.rent_amount + charge.other_charges
        outstanding = max(Decimal("0.00"), total_due - total_allocated)
        return total_due, total_allocated, outstanding

    @staticmethod
    def record_payment(
        session: Session,
        rent_charge_id: str,
        amount: Decimal,
        payment_date: date,
        method: str,
        reference: str,
        idempotency_key: str,
        landlord_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Tuple[Payment, Receipt, Decimal]:
        """
        Transactional payment processing:
        1. Checks idempotency key to prevent double submissions
        2. Validates outstanding balance
        3. Inserts payment record
        4. Allocates payment to rent charge
        5. Updates charge status
        6. Generates unique receipt number and record
        7. Logs to audit trail
        8. Returns payment, receipt, and remaining balance
        """
        # Idempotency check
        existing_payment = session.query(Payment).filter(Payment.idempotency_key == idempotency_key).first()
        if existing_payment:
            receipt = session.query(Receipt).filter(Receipt.payment_id == existing_payment.id).first()
            _, _, remaining = FinancialService.get_charge_balance(rent_charge_id, session)
            return existing_payment, receipt, remaining

        # Validate charge
        charge = session.query(RentCharge).filter(RentCharge.id == rent_charge_id).with_for_update().first()
        if not charge:
            raise ValueError("Rent charge not found")

        total_due, total_allocated, outstanding = FinancialService.get_charge_balance(rent_charge_id, session)
        if outstanding <= Decimal("0.00"):
            raise ValueError("Rent charge is already fully settled")

        # Allocation amount cannot exceed outstanding balance
        alloc_amount = min(amount, outstanding)

        payment = Payment(
            lease_id=charge.lease_id,
            amount=amount,
            payment_date=payment_date,
            method=method,
            reference=reference,
            idempotency_key=idempotency_key,
            notes=notes
        )
        session.add(payment)
        session.flush()

        allocation = PaymentAllocation(
            payment_id=payment.id,
            rent_charge_id=charge.id,
            allocated_amount=alloc_amount
        )
        session.add(allocation)

        # Update charge status
        new_status = FinancialService.calculate_charge_status(charge, session)
        charge.status = new_status

        # Generate unique receipt number
        year = payment_date.year
        count = session.query(func.count(Receipt.id)).scalar() or 0
        receipt_num = f"REC-{year}-{count + 1:04d}"

        # Hash for integrity verification
        verification_raw = f"{payment.id}:{receipt_num}:{amount}:{payment_date}"
        ver_hash = hashlib.sha256(verification_raw.encode("utf-8")).hexdigest()[:16].upper()

        receipt = Receipt(
            payment_id=payment.id,
            receipt_number=receipt_num,
            pdf_path=f"/receipts/{receipt_num}.pdf",
            verification_hash=ver_hash,
            issued_at=datetime.utcnow()
        )
        session.add(receipt)

        # Audit log
        audit = AuditLog(
            landlord_id=landlord_id,
            action="payment_recorded",
            entity_type="payment",
            entity_id=payment.id,
            details=f"Payment {receipt_num} of INR {amount} recorded via {method}. Allocated: {alloc_amount}. New charge status: {new_status}."
        )
        session.add(audit)

        session.commit()
        session.refresh(payment)
        session.refresh(receipt)

        _, _, remaining_after = FinancialService.get_charge_balance(rent_charge_id, session)
        return payment, receipt, remaining_after

    @staticmethod
    def reverse_payment(
        session: Session,
        payment_id: str,
        reason: str,
        landlord_id: Optional[str] = None
    ) -> Payment:
        """
        Safely reverses a payment without deleting historical records.
        Recalculates all linked rent charge statuses.
        """
        payment = session.query(Payment).filter(Payment.id == payment_id).with_for_update().first()
        if not payment:
            raise ValueError("Payment not found")
        if payment.is_reversed:
            raise ValueError("Payment is already reversed")

        payment.is_reversed = True
        payment.reversal_reason = reason

        allocations = session.query(PaymentAllocation).filter(PaymentAllocation.payment_id == payment.id).all()
        for alloc in allocations:
            charge = session.query(RentCharge).filter(RentCharge.id == alloc.rent_charge_id).first()
            if charge:
                charge.status = FinancialService.calculate_charge_status(charge, session)

        audit = AuditLog(
            landlord_id=landlord_id,
            action="payment_reversed",
            entity_type="payment",
            entity_id=payment.id,
            details=f"Payment {payment.id} reversed. Reason: {reason}."
        )
        session.add(audit)
        session.commit()
        session.refresh(payment)
        return payment

    @staticmethod
    def generate_monthly_charges(
        session: Session,
        period_month: str,
        landlord_id: Optional[str] = None
    ) -> List[RentCharge]:
        """
        Generates rent charges for all active leases for period_month (YYYY-MM).
        Guarantees idempotency (UniqueConstraint lease_id + period_month).
        Carries forward unpaid balance from prior month into other_charges.
        """
        year, month = map(int, period_month.split("-"))
        active_leases = session.query(Lease).filter(Lease.status == "active").all()
        created_charges = []

        for lease in active_leases:
            # Check if charge already exists
            existing = session.query(RentCharge).filter(
                RentCharge.lease_id == lease.id,
                RentCharge.period_month == period_month
            ).first()
            if existing:
                continue

            # Calculate due date based on lease.due_day
            import calendar
            max_day = calendar.monthrange(year, month)[1]
            day = min(lease.due_day, max_day)
            due_date = date(year, month, day)

            # Check carry forward balance from previous month
            prev_month_int = month - 1 if month > 1 else 12
            prev_year_int = year if month > 1 else year - 1
            prev_period = f"{prev_year_int:04d}-{prev_month_int:02d}"

            prev_charge = session.query(RentCharge).filter(
                RentCharge.lease_id == lease.id,
                RentCharge.period_month == prev_period
            ).first()

            carry_forward = Decimal("0.00")
            if prev_charge:
                _, _, outstanding_prev = FinancialService.get_charge_balance(prev_charge.id, session)
                carry_forward = outstanding_prev

            charge = RentCharge(
                lease_id=lease.id,
                period_month=period_month,
                rent_amount=lease.monthly_rent,
                other_charges=carry_forward,
                due_date=due_date,
                status="pending" if date.today() <= due_date else "overdue"
            )
            session.add(charge)
            created_charges.append(charge)

        session.commit()
        return created_charges
