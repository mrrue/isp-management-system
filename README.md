# ISP Manager Pro - Complete ISP Operations & Billing ERP

A high-performance, web-based ISP Management System built for Internet Service Providers. Designed for speed, reliability, simplicity, and zero maintenance overhead.

---

## 🚀 Quick Start

### 1. Run the Application
```bash
# Start unified server (Backend API + Frontend on port 5001)
npm start

# OR run in development mode with live hot-reloading
npm run dev
```

Open your browser at: **`http://localhost:5001`** (or `http://localhost:3000` when running `npm run dev`)

---

## 🔑 Pre-Seeded Demo Accounts

The database comes pre-populated with realistic demo data, ISP packages, active customers, tickets, expenses, and staff attendance.

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full access to all 5 portals, permissions, settings & backups |
| **Operations Manager** | `manager` | `manager123` | Full billing, help desk, finances, and attendance management |
| **Field Technician** | `tech_ali` | `password123` | Mobile-optimized field jobs, work logs, photos, in-ticket voice/chat, clock in/out |
| **Network Technician** | `tech_ahmed` | `password123` | Mobile-optimized field jobs, tickets, attendance |
| **Billing Clerk** | `billing_sara` | `password123` | Customer management, manual payment entry & thermal receipts |

---

## 🌐 System Portals & Features

### 1. Billing Portal
- **Customer Directory**: Fast search by Customer ID (`CUST-1001`), Name, Phone, CNIC, Area, or Package.
- **Package Management**: Define speed tiers (e.g. 10 Mbps, 20 Mbps, 35 Mbps, 50 Mbps, 100 Mbps) with monthly pricing.
- **Subscription History**: Changing a customer's package creates a historical subscription record without destroying past billing records.
- **Manual Payment Entry**: Record payments via Cash, JazzCash, Easypaisa, Bank Transfer, SadaPay, or Nayapay.
- **Thermal Receipts (58mm & 80mm)**: Instant printable POS thermal slips with QR/barcode data, business contact, collector name, balance due, and one-click PDF download.
- **Payment Voiding**: Void erroneous payments with a mandatory reason note and automated balance restoration with an audit trail.

### 2. Help Desk / Complaints & Ticketing
- **Ticket Queue**: Color-coded priorities (*Urgent*, *High*, *Medium*, *Low*) and categories (*Fiber Cut*, *Slow Speed*, *Router Config*, *Installation*, etc.).
- **Technician Portal**: Mobile-first screen tailored for field technicians on mobile phones.
- **Work Logs & Completion**: Record arrival time, departure time, fault found, work performed, materials/parts used, and final resolution.
- **Photo Attachments**: Upload multiple job photos (cables, fiber splicing, ONU light status).
- **In-Ticket Live Chat**: Real-time WebSocket messaging between office staff and technicians.
- **Browser WebRTC Voice Calling**: Direct peer-to-peer browser voice calls between office management and field technicians right from the ticket without third-party paid APIs.
- **Customer Complaint History**: Every customer profile shows their complete history of past complaints, photos, and resolutions.

### 3. Finances / Expense Tracking
- **Manual Expense Ledger**: Record money spent/given for fuel, bike repairs, food, fiber splicing tools, office utilities, etc.
- **Classifications**: Categorize expenses as *Business*, *Employee-related*, *Personal*, *Family*, or *Other*.
- **Employee Ledger**: View total spending for individual employees (*Today*, *This Week*, *This Month*, *All Time*).
- **No Fixed Allowance Limits**: Pure manual recording with flexible auditing.

### 4. Staff Attendance & GPS Verification
- **Clock In / Clock Out**: Fast mobile-friendly screen with camera selfie snapshot and HTML5 GPS coordinates locking.
- **Shift Rules**: Configurable shift hours (e.g. 09:00 - 18:00) with grace periods. Automatically flags *On Time*, *Late*, *Early Departure*, or *Half Day*.
- **Live Attendance Dashboard**: Real-time view of which technicians and clerks are currently on shift.

### 5. Administration & Settings
- **Business Profile & Branding**: Customize company name, address, phone numbers, WhatsApp, currency symbol (`Rs.`), and logo.
- **Thermal Receipt Customizer**: Toggle visible receipt fields, header text, footer notes, and paper size (58mm vs 80mm).
- **Master Lists Management**: Manage Payment Methods, Customer Statuses, Ticket Categories, and Expense Categories.
- **Granular Permissions Engine**: Assign custom role permissions for each employee (`billing_view`, `payment_create`, `helpdesk_manage`, `ticket_worklog`, `finance_view`, `attendance_clock`, `reports_view`, etc.).
- **Audit Logs**: Immutable log of every login, customer edit, payment, void action, and ticket assignment.
- **Database Backup & Reset**: Direct download of raw SQLite `.db` backup file, full JSON data export, or one-click demo data reset.

---

## 🛠️ Technology Architecture

- **Backend**: Node.js & Express with `node:sqlite` (SQLite with WAL mode for zero external DB server dependency and fast transactions).
- **WebSockets & WebRTC**: Native `ws` WebSocket server for live ticket chat, push notifications, and WebRTC STUN signaling.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Chart.js, jsPDF, and SheetJS (XLSX).
- **Self-Contained**: Can be deployed on any affordable Linux VPS (Ubuntu/Debian) or run locally on macOS/Windows.

---

## 🧪 Automated Test Verification

To run the complete 26-point automated verification suite:
```bash
node server/test-suite.js
```
