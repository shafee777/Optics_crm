# Optics CRM — Offline-First Optical Retail ERP & POS

[![Status](https://img.shields.io/badge/status-active--production-success.svg)](#real-world-deployment--impact)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64%20(Electron)-blue.svg)](#architecture)
[![Database](https://img.shields.io/badge/database-PostgreSQL%2016-336791.svg)](#architecture)
[![Architecture](https://img.shields.io/badge/architecture-100%25%20Offline--First-orange.svg)](#architecture)
[![Tests](https://img.shields.io/badge/tests-68%20passed%20%7C%200%20failed-brightgreen.svg)](#automated-testing--reliability)

**Optics CRM** is a production-grade, offline-first desktop ERP, CRM, and Point-of-Sale (POS) system engineered specifically for optical retail stores and optometry practices.

Unlike generic retail software or cloud SaaS tools that freeze when internet connectivity fluctuates, Optics CRM embeds a full relational **PostgreSQL cluster** inside an **Electron** desktop shell, guaranteeing **100% offline operational continuity** with zero monthly cloud or API subscription costs.

---

## 📌 Real-World Deployment & Impact

Optics CRM is **actively deployed in a live optical retail store**, powering its daily customer-facing counter operations:

* **100+ Walk-In Customers Processed Daily**: Handles high-volume retail traffic with instant database lookups (<5ms latency) and zero midday crashes.
* **70% Faster Checkout (5 mins $\rightarrow$ <90s)**: Unified screen captures clinical refraction parameters, deducts inventory, computes Indian GST, and prints branded PDF invoices in seconds.
* **₹0 Recurring Overhead**: Operates entirely on the shop's local hardware—no cloud database subscriptions (AWS/Supabase) and zero per-message WhatsApp API fees.
* **100% Offline Resilience**: Retains complete functionality (billing, clinical lookups, PDF generation, inventory tracking) during network and internet outages.

---

## 🏗️ Architecture

```
+-----------------------------------------------------------------------------------+
|                        ELECTRON DESKTOP RUNTIME (Windows x64)                     |
|                                                                                   |
|  +-----------------------------------+     +-----------------------------------+  |
|  |         REACT 19 FRONTEND         |     |       NODE / EXPRESS BACKEND      |  |
|  | - Pre-compiled static Vite bundle |     | - Modular monolith on 127.0.0.1   |  |
|  | - Tailwind CSS & Lucide icons     | --> | - Zod validation schemas          |  |
|  | - Client-side jsPDF in memory     |     | - JWT sessions & role auth        |  |
|  | - System fonts (Zero remote CDNs) |     | - Transactional order locking     |  |
|  +-----------------------------------+     +-----------------------------------+  |
|                                                              |                    |
|                                                              v                    |
|                                            +-----------------------------------+  |
|                                            |   BUNDLED LOCAL POSTGRESQL DB     |  |
|                                            | - 18 relational tables            |  |
|                                            | - 14 schema migrations            |  |
|                                            | - Atomic triggers & audit trail   |  |
|                                            | - Stored in %APPDATA%/Optics CRM  |  |
|                                            +-----------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## ✨ Key Features

### 1. Optical Prescription & Clinical Management
* **Complete Refraction Matrix**: Logs clinical eye parameters for both eyes (**OD** - Right Eye, **OS** - Left Eye):
  * Spherical (**SPH**), Cylindrical (**CYL**), **Axis**, Addition (**ADD**), and Pupillary Distance (**PD**).
* **Distance & Near Vision**: Supports separate distance, intermediate, and reading/bifocal prescriptions.
* **Patient Power History**: Instant access to previous prescriptions to monitor vision progression across visits.
* **Instant Slip Generation**: One-click branded prescription PDF printing and WhatsApp sharing.

### 2. POS, Optical Billing & Invoicing
* **End-to-End Order Workflow**: Tracks jobs across phases: `Pending` $\rightarrow$ `In Lab / Production` $\rightarrow$ `Ready for Pickup` $\rightarrow$ `Delivered` $\rightarrow$ `Cancelled`.
* **Indian GST & Tax Engine**:
  * GST-inclusive retail pricing.
  * Sub-paisa discount allocation algorithm applied across line items *before* splitting **CGST** and **SGST**, eliminating round-off tax audit errors.
* **Mixed Line Items**: Handles both tracked physical inventory (frames/lenses) and untracked custom lab fitting charges on the same invoice.
* **Client-Side PDF Invoices**: Programmatically generated in browser memory using `jsPDF` and `jspdf-autotable` in <100ms with zero heavy headless browser (Puppeteer) overhead.

### 3. Customer Relationship Management (CRM)
* **Customer Directory & Unique Codes**: Fast indexed search by name, unique customer code, or phone number.
* **Flexible Phone Requirements**: Supports elderly or minor patients without phone numbers without blocking billing records.
* **Customer Segmentation**: Tags high-value, recurring, or corporate clients for tailored service.
* **Annual Eye Exam Alerts**: Flags returning patients due for annual checkups to drive store footfall.

### 4. Zero-Cost Customer Communication (`wa.me`)
* **Pre-Filled WhatsApp Drafts**: One-click actions that open direct `wa.me` links in WhatsApp Web / Desktop for:
  * Order confirmation and digital bill dispatch.
  * "Ready for Pickup" lens-fitted notifications.
  * Pending balance payment reminders.
  * Prescription charts and annual checkup reminders.
* **Offline Safeguard**: Built-in network check warns staff if the machine is disconnected before launching drafts.

### 5. Inventory & Stock Control
* **Categorized Catalog**: Separate management for spectacle frames, prescription lenses, contact lenses, sunglasses, and cleaning accessories.
* **Non-Negative Stock Constraints**: Database-level guardrails preventing phantom or negative stock writes.
* **200-Event Inventory Movement Ledger**: Automatically audits opening balances, customer sales, supplier purchases, manual edits, and cancellation returns.
* **Atomic Order Cancellations**: Row-locked database transactions that log cancellation reasons and restore inventory stock **once and only once**.

### 6. Payments & Supplier Management
* **Flexible Payment Methods**: Supports Cash, UPI, Credit/Debit Cards, and Split Payments.
* **Deposit & Balance Tracking**: Tracks advance deposits taken at booking and calculates remaining balances at pickup with concurrency locking.
* **Supplier & Vendor Management**: Logs incoming supplier purchase orders, inventory additions, and vendor payables with overpayment protection.
* **Store Expense Tracker**: Tracks operational heads (shop rent, lab edging fees, utilities, staff salaries) against daily revenue.

### 7. Enterprise Disaster Recovery & Data Safety
* **100% Local Data Sovereignty**: Confidential customer records and shop financials never leave the store computer.
* **Automated Backup & Restore Harness**:
  * CLI tools (`npm run db:backup` / `npm run db:restore`) using PostgreSQL custom-format dumps.
  * Automatic verification: restore drills restore into an isolated database and validate **100% row-parity across all 18 tables** before committing changes.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Shell** | Electron 44.x, Electron-Builder (NSIS Installer) |
| **Frontend UI** | React 19, Vite, Tailwind CSS, Lucide React, React Router 7 |
| **Backend API** | Node.js (ES Modules), Express.js (Modular Monolith) |
| **Database** | PostgreSQL 16 (18 tables, 14 SQL migrations), `pg` driver |
| **PDF Generation** | `jsPDF`, `jspdf-autotable` (client-side in-memory rendering) |
| **Validation & Auth** | Zod schema validation, JWT sessions, bcrypt password hashing |
| **Logging & Security** | Pino, Pino-HTTP, Helmet, Express-Rate-Limit |
| **Testing** | Node.js Test Runner, Vitest, Oxlint, Supertest |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* **Node.js**: `v22.12.0` or higher LTS
* **PostgreSQL**: `v16.x` (or use the provided Docker Compose file)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/[your-username]/Optics_crm.git
cd Optics_crm

# Install backend dependencies
cd backend
npm ci

# Install frontend dependencies
cd ../frontend
npm ci

# Install desktop dependencies
cd ../desktop
npm ci
```

### 2. Configure Environment
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
HOST=127.0.0.1
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/optics_crm
JWT_SECRET=your_super_strong_jwt_secret_key_here
REFRESH_TOKEN_SECRET=your_super_strong_refresh_token_secret_here
NODE_ENV=development
```

### 3. Run Database Migrations
```bash
cd backend
npm run migrate
```

### 4. Start Development Servers
From the root directory:
```powershell
# Run the automated local startup script (Windows PowerShell)
.\Start-Local.ps1
```
* Or start manually:
  * **Backend**: `cd backend && npm run dev` (Runs on `http://127.0.0.1:5000`)
  * **Frontend**: `cd frontend && npm run dev` (Runs on `http://localhost:5173`)
  * **Desktop**: `cd desktop && npm start`

---

## 📦 Building the Windows Desktop Installer

To compile the self-contained Windows NSIS installer (`.exe`) bundling the React frontend, Express backend, and PostgreSQL runtime:

```powershell
# 1. Build and stage the frontend bundle
cd frontend
npm run build

# 2. Package the Windows installer
cd ../desktop
npm run dist
```
The compiled installer will be available at:
`desktop/release/Optics-CRM-Setup-1.0.0.exe`

---

## 🧪 Automated Testing & Reliability

The application includes an extensive test suite verifying business logic, database migrations, and offline safeguards:

```bash
cd backend

# Run unit tests (Billing, WhatsApp drafts, PDF generation, safeguards)
npm run test:unit

# Run full isolated database integration tests
npm run test:isolated
```

* **Test Coverage**: 68 passed tests across 6 suites verifying:
  * Atomic stock deduction and cancellation restoration.
  * Sub-paisa GST-inclusive discount calculation.
  * Prevention of duplicate cancellations and payment race conditions.
  * 18-table row-parity verification across backup and restore cycles.
  * Sandboxed offline smoke execution with `navigator.onLine = false`.

---

## 📄 Documentation Links
* [Local Setup & Workflow Guide](LOCAL_SETUP.md)
* [Release Verification Evidence (P2)](P2_RELEASE_VERIFICATION.md)
* [Desktop Portable App Guide](desktop/PORTABLE-README.txt)

---

## 📜 License
Private & Proprietary. Developed for optical retail operations.
