# 🏠 RentEasy — House Rent Collection & Reminder App

> **Landlord-only property management system with automated WhatsApp & Indian DLT-compliant SMS payment reminders, idempotent payment recording, and tamper-proof digital receipts.**

---

## 🎯 Architecture Overview

RentEasy unites rent tracking, payment recording, reminder scheduling, and receipt generation into **one unified financial source of truth**. Both the **Web Dashboard** and **Mobile App** communicate with the exact same data model, guaranteeing zero discrepancies between interfaces.

```
renteasy/
├── web/                  # React 19 + TypeScript + Vite Dashboard (with interactive Mobile View)
│   ├── src/
│   │   ├── components/   # ReceiptModal, RecordPaymentModal, AddPropertyModal, AddTenantModal, MobileFrame, SettingsModal
│   │   ├── pages/        # Dashboard, Properties, Tenants, Monthly Ledger, Reminder Centre, Receipts & Reports
│   │   ├── services/     # rentEasyApi (idempotent transactions, balance carry-forward, live webhooks)
│   │   └── types/        # TypeScript interfaces matching backend models
├── backend/              # Python FastAPI Application
│   ├── app/
│   │   ├── api/          # REST endpoints (/auth, /dashboard, /properties, /tenants, /leases, /payments, etc.)
│   │   ├── models/       # SQLAlchemy PostgreSQL/SQLite models (UUID PKs, NUMERIC(12,2), foreign keys)
│   │   ├── schemas/      # Pydantic V2 schemas
│   │   ├── services/     # Financial calculation & allocation engine, receipt generator
│   │   ├── messaging/    # WhatsApp Cloud API & Indian DLT SMS template dispatchers
│   │   └── main.py       # FastAPI application entry point with startup seed data
│   ├── tests/            # Automated financial unit tests covering the 10-point checklist
│   └── requirements.txt  # Python backend dependencies
└── mobile/               # Expo React Native App
    ├── app/              # Expo router screens: Dashboard, Properties, Tenants, Ledger, Payments, Receipts
    └── package.json
```

---

## 💼 Core Financial Safeguards & Business Logic

1. **Reminder ≠ Payment**: Sending a reminder is never treated as proof of payment.
2. **Pre-Send Balance Verification**: Scheduled reminders check the outstanding balance immediately prior to dispatch. If settled (₹0.00), the reminder is automatically cancelled/skipped.
3. **Idempotency Key**: Every payment submission requires a unique `idempotency_key` preventing duplicate charges.
4. **Strict Partial Allocations**: Partial payments reduce the rent charge balance strictly by the allocated amount:
   $$\text{Outstanding Balance} = (\text{Rent Amount} + \text{Other Charges}) - \sum \text{Allocated Payments}$$
5. **Reversal over Deletion**: Mistakes are corrected through an explicit reversal/void action with an immutable audit log trail.
6. **Unique Digital Receipts**: Issued sequentially (`REC-YYYY-XXXX`) with cryptographic SHA-256 verification hash and landlord authorized stamp.

---

## 📱 The 6 Complete Application Screens

| Screen | Key Features |
|---|---|
| **Screen 1 — Dashboard** | Expected, collected, and outstanding rent KPI cards, collection percentage bar, overdue follow-up alerts, monthly trend charts, quick actions. |
| **Screen 2 — Properties** | Property inventory with unit numbers, address, property type (1BHK/2BHK/Villa), monthly rent, occupancy badge, and unit payment history drawer. |
| **Screen 3 — Tenant Management** | Tenant directory, linked property, lease dates, deposit status, WhatsApp/SMS consent toggles, and tenancy history. |
| **Screen 4 — Monthly Rent Ledger** | Monthly financial grid with Paid, Partially Paid, Pending, and Overdue status badges. Multi-payment allocation, unpaid balance carry-forward, and payment reversal. |
| **Screen 5 — Reminder Centre** | 4 Automated reminder rules (3 days before due, on due date, 3 days overdue, every 7 days). Live WhatsApp chat bubble & Indian DLT SMS preview sandbox. Message outbox log with delivery status & safe retry. |
| **Screen 6 — Receipts & Reports** | Searchable digital receipt archive, printable PDF modal with landlord signature & QR code verification, resend via WhatsApp/SMS, and CSV transaction export. |

---

## 🚀 Running RentEasy Locally

### 1. Web Dashboard & Mobile Preview (Ready Now)

The web dashboard is already compiled and running locally:
```bash
cd renteasy/web
npm install
npm run dev
```
Open **[http://localhost:5174/](http://localhost:5174/)** in your browser.

- Use the top navigation bar toggle **"Desktop Dashboard" ↔ "Mobile App Preview"** to experience the app in full widescreen desktop view or inside an interactive smartphone mockup!

### 2. Python FastAPI Backend

```bash
cd renteasy/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- API Docs: **http://localhost:8000/docs**
- Automated Unit Tests:
```bash
pytest tests/
```

### 3. Mobile Expo App

```bash
cd renteasy/mobile
npm install
npx expo start
```
