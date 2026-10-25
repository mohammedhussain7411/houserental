from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.entities import (
    MessageJob,
    MessageLog,
    Tenant,
    RentCharge,
    Payment,
    Receipt,
    NotificationPreference
)
from app.services.financial_service import FinancialService

class MessagingService:
    WHATSAPP_TEMPLATES = {
        "upcoming_reminder": (
            "Hello {tenant_name},\n"
            "This is a friendly reminder that your house rent of ₹{outstanding_amount:,.2f} "
            "is due on {due_date} for {property_name}.\n"
            "If you have already paid, please ignore this message.\n"
            "Regards,\n{landlord_name}"
        ),
        "due_date_reminder": (
            "Hello {tenant_name},\n"
            "Your house rent of ₹{outstanding_amount:,.2f} for {property_name} "
            "is due today ({due_date}).\n"
            "Kindly make the payment via UPI or Net Banking and share the reference.\n"
            "Regards,\n{landlord_name}"
        ),
        "overdue_reminder": (
            "Hello {tenant_name},\n"
            "Important: Your rent payment of ₹{outstanding_amount:,.2f} for {property_name} "
            "was due on {due_date} and is currently OVERDUE.\n"
            "Please clear the pending dues immediately to avoid late fees.\n"
            "Regards,\n{landlord_name}"
        ),
        "payment_receipt": (
            "Hello {tenant_name},\n"
            "Your payment of ₹{payment_amount:,.2f} has been received for {rent_period}.\n"
            "Property: {property_name}\n"
            "Payment Date: {payment_date}\n"
            "Receipt Number: {receipt_number}\n"
            "Remaining Balance: ₹{outstanding_amount:,.2f}\n"
            "Your official digital rent receipt is available at: {receipt_link}\n"
            "Thank you.\n{landlord_name}"
        )
    }

    SMS_TEMPLATES = {
        "upcoming_reminder": "RentEasy: Hello {tenant_name}, rent of Rs.{outstanding_amount} for {property_name} is due on {due_date}. Ignore if already paid.",
        "due_date_reminder": "RentEasy: Hello {tenant_name}, rent of Rs.{outstanding_amount} for {property_name} is due today. Please remit to Landlord UPI.",
        "overdue_reminder": "RentEasy: Rent of Rs.{outstanding_amount} for {property_name} is OVERDUE since {due_date}. Kindly settle immediately.",
        "payment_receipt": "RentEasy: Payment of Rs.{payment_amount} received for {rent_period}. Receipt {receipt_number}. Balance: Rs.{outstanding_amount}. Link: {receipt_link}"
    }

    @staticmethod
    def format_message(
        template_type: str,
        channel: str,
        data: Dict[str, Any]
    ) -> str:
        templates = MessagingService.WHATSAPP_TEMPLATES if channel == "whatsapp" else MessagingService.SMS_TEMPLATES
        template = templates.get(template_type, "RentEasy notification for {tenant_name}")
        return template.format(**data)

    @staticmethod
    def queue_reminder(
        session: Session,
        tenant_id: str,
        rent_charge_id: str,
        reminder_type: str,
        channel: str
    ) -> Optional[MessageJob]:
        """
        Queues reminder only if tenant has enabled the channel and balance is > 0.
        """
        pref = session.query(NotificationPreference).filter(NotificationPreference.tenant_id == tenant_id).first()
        if pref:
            if channel == "whatsapp" and not pref.whatsapp_enabled:
                return None
            if channel == "sms" and not pref.sms_enabled:
                return None

        # Check balance
        _, _, outstanding = FinancialService.get_charge_balance(rent_charge_id, session)
        if outstanding <= Decimal("0.00"):
            return None  # Settled, no reminder needed

        job = MessageJob(
            tenant_id=tenant_id,
            rent_charge_id=rent_charge_id,
            type=reminder_type,
            channel=channel,
            scheduled_at=datetime.utcnow(),
            status="queued"
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        return job

    @staticmethod
    def process_job(
        session: Session,
        job_id: str,
        receipt_link_base: str = "https://renteasy.app/receipts/verify"
    ) -> MessageLog:
        """
        Processes message job:
        1. Recalculates balance immediately before sending.
        2. Cancels job if balance is zero (for reminder types).
        3. Simulates provider delivery or handles API call.
        4. Logs to message_logs.
        """
        job = session.query(MessageJob).filter(MessageJob.id == job_id).with_for_update().first()
        if not job:
            raise ValueError("Message job not found")

        tenant = session.query(Tenant).filter(Tenant.id == job.tenant_id).first()
        if not tenant:
            job.status = "failed"
            job.last_error = "Tenant not found"
            session.commit()
            raise ValueError("Tenant not found")

        charge = session.query(RentCharge).filter(RentCharge.id == job.rent_charge_id).first() if job.rent_charge_id else None

        # Re-check balance before sending any reminder
        if job.type in ["upcoming_reminder", "due_date_reminder", "overdue_reminder"]:
            if charge:
                _, _, outstanding = FinancialService.get_charge_balance(charge.id, session)
                if outstanding <= Decimal("0.00"):
                    job.status = "cancelled"
                    job.last_error = "Rent settled prior to send. Reminder skipped."
                    session.commit()
                    return None

        # Build context
        landlord = tenant.landlord
        lease = charge.lease if charge else None
        prop = lease.property if lease else None

        outstanding_val = Decimal("0.00")
        if charge:
            _, _, outstanding_val = FinancialService.get_charge_balance(charge.id, session)

        context = {
            "tenant_name": tenant.name,
            "property_name": f"{prop.name} (Unit {prop.unit_number})" if prop else "Rental Unit",
            "due_date": charge.due_date.strftime("%d-%b-%Y") if charge else "Due Date",
            "outstanding_amount": outstanding_val,
            "payment_amount": Decimal("0.00"),
            "rent_period": charge.period_month if charge else "Monthly Rent",
            "receipt_number": "N/A",
            "receipt_link": receipt_link_base,
            "landlord_name": landlord.name if landlord else "Landlord"
        }

        # If payment receipt type, populate receipt details
        if job.type == "payment_receipt" and charge:
            latest_alloc = charge.allocations[-1] if charge.allocations else None
            if latest_alloc and latest_alloc.payment:
                payment = latest_alloc.payment
                receipt = payment.receipt
                context["payment_amount"] = payment.amount
                context["payment_date"] = payment.payment_date.strftime("%d-%b-%Y")
                if receipt:
                    context["receipt_number"] = receipt.receipt_number
                    context["receipt_link"] = f"{receipt_link_base}?rec={receipt.receipt_number}&hash={receipt.verification_hash}"

        message_content = MessagingService.format_message(job.type, job.channel, context)

        # Simulate provider dispatch
        import uuid
        provider_id = f"prov_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow()

        job.status = "sent"
        log = MessageLog(
            job_id=job.id,
            provider_id=provider_id,
            channel=job.channel,
            status="delivered",
            sent_at=now,
            delivered_at=now,
            message_text=message_content
        )
        session.add(log)
        session.commit()
        return log
