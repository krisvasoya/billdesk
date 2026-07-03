# 🧾 BillDesk — Enterprise Mobile Billing & Accounting Platform

<p align="center">
  <img src="https://raw.githubusercontent.com/krisvasoya/billdesk/main/assets/icon.png" alt="BillDesk Logo" width="120" height="120" style="border-radius: 20%;" />
</p>

<p align="center">
  <strong>Enterprise Mobile Billing & Accounting Platform for Modern Businesses</strong>
</p>

<p align="center">
  <a href="https://expo.dev"><img src="https://img.shields.io/badge/Expo-v52.0-000000?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" /></a>
  <a href="https://reactnative.dev"><img src="https://img.shields.io/badge/React_Native-v0.76-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-v5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://hono.dev"><img src="https://img.shields.io/badge/Hono-v4.12-E36002?style=for-the-badge&logo=hono&logoColor=white" alt="Hono" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-v16.2-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://www.prisma.io"><img src="https://img.shields.io/badge/Prisma-v7.8-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" /></a>
</p>

<p align="center">
  <a href="https://www.sqlite.org"><img src="https://img.shields.io/badge/SQLite-v3.0-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" /></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-v16.0-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="https://cloudinary.com"><img src="https://img.shields.io/badge/Cloudinary-v2.10-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white" alt="Cloudinary" /></a>
  <a href="https://redis.io"><img src="https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" /></a>
</p>

---

## 📖 Executive Summary

**BillDesk** is a production-ready, enterprise-grade, offline-first mobile billing and accounting suite designed specifically for Micro, Small, and Medium Enterprises (MSMEs), B2B distributors, and retail merchants. Built with a robust hybrid architecture, the platform pairs an **Expo & React Native** mobile client with an asynchronous **Next.js & Hono API** gateway powered by **Prisma** and **PostgreSQL**.

### 🌟 Business Value Proposition
* **Zero-Downtime Offline Operations:** Merchants can generate invoices, issue delivery challans, register customers, and log payments without active internet connectivity. Transactions are committed to an optimized local SQLite database and synchronized seamlessly when a connection is established.
* **Strict Tenant Isolation:** Engineered from the database level up to enforce multi-tenancy, ensuring that customer, invoice, and reporting data remains sandboxed within each merchant's shop domain.
* **PDF Utility & Document Sharing:** Integrated layout engine dynamically renders A4 invoices, delivery receipts, and quotations supporting multi-language outputs (English/Gujarati), local printer formatting, and direct sharing to WhatsApp.
* **Granular Financial Insights:** Instant generation of GST compliance statements, outstanding ledgers, and cash flow reports on-device and server-side.

---

## 🗺️ Table of Contents

1. [📱 Product Showcases](#-product-showcases)
2. [🎯 Core Feature Matrix](#-core-feature-matrix)
3. [🛠️ Technology Stack](#️-technology-stack)
4. [📐 System Architecture](#-system-architecture)
5. [📂 Directory Blueprint](#-directory-blueprint)
6. [🚀 Onboarding & Installation](#-onboarding--installation)
7. [⚙️ Environment Configuration](#️-environment-configuration)
8. [🔐 Authentication & Role-Based Access Control](#-authentication--role-based-access-control)
9. [🗄️ Database & Schema Design](#️-database--schema-design)
10. [🔄 Offline Synchronization Engine](#-offline-synchronization-engine)
11. [🔌 API Specifications](#-api-specifications)
12. [🖨️ PDF Generation & Print Engine](#️-pdf-generation--print-engine)
13. [🔔 Notifications Pipeline](#-notifications-pipeline)
14. [🎨 Styling & Theming System](#-styling--theming-system)
15. [📈 Performance Optimization & Benchmarks](#-performance-optimization--benchmarks)
16. [🔒 Security Hardening](#-security-hardening)
17. [🚢 Deployment & DevOps](#-deployment--devops)
18. [🛡️ Backup & Disaster Recovery](#️-backup--disaster-recovery)
19. [🧪 Testing Framework](#-testing-framework)
20. [🏷️ Release & Versioning Policy](#️-release--versioning-policy)
21. [🛣️ Product Roadmap](#️-product-roadmap)
22. [🤝 Contribution Protocols](#-contribution-protocols)
23. [💬 Frequently Asked Questions (FAQ)](#-frequently-asked-questions-faq)
24. [🔧 Troubleshooting Handbook](#-troubleshooting-handbook)
25. [📝 License & Credits](#-license--credits)

---

## 📱 Product Showcases

### Interface Mockups (Adaptive Light & Dark Modes)

| Dashboard Screen | Invoice Creation |
|:---:|:---:|
| <img src="https://raw.githubusercontent.com/krisvasoya/billdesk/main/docs/assets/dashboard_mock.png" alt="Dashboard View" width="280" /> | <img src="https://raw.githubusercontent.com/krisvasoya/billdesk/main/docs/assets/invoice_mock.png" alt="Invoice Generator View" width="280" /> |
| *Visual analytics showing sales curves, receivables, and recent activity logs.* | *Responsive item lookup, automatic tax calculations, and discount sliders.* |

| Customer Directory & Ledger | Analytics & Reports |
|:---:|:---:|
| <img src="https://raw.githubusercontent.com/krisvasoya/billdesk/main/docs/assets/customer_mock.png" alt="Customer Directory" width="280" /> | <img src="https://raw.githubusercontent.com/krisvasoya/billdesk/main/docs/assets/reports_mock.png" alt="Analytics Overview" width="280" /> |
| *Historical payment ledger logs, credit limit indicators, and profiles.* | *GST calculation templates, profit charts, and CSV/PDF export configuration.* |

---

## 🎯 Core Feature Matrix

### 🧾 Billing & Document Generation
* **Multi-Format Creation:** Easily generate professional invoices, formal estimates, itemized quotations, and physical delivery challans.
* **Dynamic Calculations:** Computes subtotal, discounts, state/central GST parameters, transport, packing, and other extra fees in real-time.
* **Numeric-to-Words Translation:** On-device string interpreter maps decimal values to corresponding words in English ("Three Hundred Rupees Only") and Gujarati ("ત્રણ સો રૂપિયા પૂરા").

### 👥 Customer & Buyer Portals
* **Double-Entry Ledgers:** Tracks debit and credit history per customer automatically upon invoicing and payment logging.
* **Credit Safeguards:** Enforces customizable credit limits on customer accounts, showing instant UI alerts when exceeded.
* **Scoping Configurations:** B2B buyer accounts are scoped securely within the merchant's business ID, decoupling retail and wholesale activities.

### 💳 Payments & Receivables
* **Multi-Channel Log:** Record partial or full payments using Cash, UPI, Bank Transfer, Card, or Cheque.
* **Outstanding Debt Tracking:** Automated calculations track balance dues and identify overdue invoices dynamically.
* **Payment Reference Mapping:** Fields are available for transaction reference numbers, cheque numbers, and custom notes.

### 🔄 SQLite Sync Pipeline
* **Background Queue:** Mutations are written to a local transaction log table (`sync_queue`) with transaction isolation.
* **Optimistic Updates:** UI state reflects changes immediately, ensuring a responsive user experience.
* **Exponential Backoff:** If the sync server is unreachable, the engine backs off and schedules retries.

### 🛡️ Security & Tenant Isolation
* **Access Control:** Enforces strict role boundaries (`owner`, `manager`, `employee`, `viewer`).
* **Tenant Isolation:** Database transactions require valid shop-level context, avoiding potential data cross-leakage.
* **Request Validation:** Every payload crossing client-server boundaries is verified by strict Zod schema parsers.

---

## 🛠️ Technology Stack

| Technology | Purpose | Production Version | Platform Environment |
| :--- | :--- | :--- | :--- |
| **Expo SDK** | Mobile Framework Core | `~52.0.28` | Android, iOS, Web |
| **React Native** | Native Component Runtime | `0.76.9` | Android, iOS |
| **TypeScript** | Strict-Typed Programming Language | `^5.3` / `^5.0` | Frontend & Backend |
| **React Query** | Remote Server-State Management | `^5.101.2` | Mobile Client App |
| **React Native Paper** | Material Design Component Library | `^5.15.3` | Mobile Client UI |
| **SQLite** | Local Database (`expo-sqlite`) | `~15.1.4` | Local Android / iOS Storage |
| **MMKV** | Ultra-Fast Storage Client | `^3.2.0` | Device Metadata, Cache, Config |
| **Hono** | Lightweight API Router Gateway | `^4.12.27` | Next.js Edge Runtime |
| **Next.js** | Server-Side Host Engine | `16.2.10` | Server Environment |
| **Prisma** | Database Object Relational Mapping | `^7.8.0` | Node.js Backend Server |
| **PostgreSQL** | Primary Relational Database | `^16.0` | Dedicated Cloud Cluster |
| **Cloudinary** | Logo Asset & Document PDF CDN | `^2.10.0` | Cloud Asset Directory |
| **Redis** | Redis Rate Limiting & Session Caching | `Upstash SDK` | Edge Cache Layer |
| **JWT** | Secure Handshake & Identity Verification | `Custom` | Frontend / Backend Handshake |

---

## 📐 System Architecture

### Application Architecture

```mermaid
graph TD
    subgraph MobileClient [Mobile Client - React Native & Expo]
        UI[React Native Paper UI] <--> RQ[React Query Context]
        RQ <--> Repos[Repositories Layer]
        Repos <--> LocalDB[(SQLite Local Storage)]
        Repos <--> Storage[(MMKV Key-Value Store)]
        Repos -.-> Queue[SQLite Sync Queue]
    end

    subgraph SyncEngine [Offline Sync Engine]
        Queue --> Pipeline[Sync Pipeline Processor]
        Pipeline <--> NetworkCheck{Network Detector}
    end

    subgraph ServerHost [Backend Server - Next.js & Hono]
        NetworkCheck -- Online HTTP/S Requests --> API[Hono Router API]
        API --> Middleware[Auth & Tenant Isolation Middleware]
        Middleware --> Services[Business Logic Services]
        Services --> ORM[Prisma Client ORM]
    end

    subgraph CloudPersist [Data Storage Layer]
        ORM <--> PostgDB[(PostgreSQL Primary DB)]
        Services <--> Redis[(Upstash Redis Cache)]
        Services <--> Cloudinary[Cloudinary Media CDN]
    end
```

### Authentication Flow

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as User / Merchant
    participant App as Mobile App (MMKV)
    participant Server as Hono Auth Controller
    participant DB as PostgreSQL DB

    Merchant->>App: Submits Registration / Login Form
    App->>Server: POST /api/auth/login (Payload)
    Server->>DB: Query User & Shop Details
    DB-->>Server: Return User Data & Password Hash
    Note over Server: Verify Hash (bcrypt)<br/>Generate Access & Refresh JWTs
    Server->>DB: Store Refresh Token Record
    Server-->>App: JSON { accessToken, refreshToken, userDetails }
    App->>App: Persist tokens in MMKV Encrypted Store
    App-->>Merchant: Grant Access to Dashboard
```

### Invoice Generation & Print Flow

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as User / Merchant
    participant App as Mobile Client App
    participant Print as Expo Print Module
    participant Share as System Share (WhatsApp)

    Merchant->>App: Compiles Invoice items & triggers Print
    Note over App: Retrieve Company Logo (base64)<br/>Generate HTML Template
    App->>Print: PrintToFileAsync (HTML Template)
    Print-->>App: Local Temporary URI (.pdf)
    App->>App: Move file to document directory<br/>(Invoice_#.pdf)
    alt Share Document
        App->>Share: ShareAsync (pdf File Path)
        Share-->>Merchant: Native Share Modal open
    else Physical Print
        App->>Print: PrintAsync (HTML / Printer Interface)
        Print-->>Merchant: Print dialog displays
    end
```

### Synchronization Flow

```mermaid
sequenceDiagram
    autonumber
    participant Job as Sync Background Job
    participant Queue as SQLite Sync Queue
    participant Server as API Gateway
    participant DB as Postgres Database

    Job->>Job: Detects active network socket (online)
    Job->>Queue: Query pending changes (ORDER BY created_at ASC)
    Queue-->>Job: Return list of mutations (create/update/delete)
    loop For each mutation
        Job->>Job: Update status to 'syncing'
        Job->>Server: HTTP Request (POST/PUT/DELETE) with X-Shop-Id
        alt Success (200/201 OK)
            Server->>DB: Update remote records
            Server-->>Job: Response success payload
            Job->>Queue: DELETE queue record
        else Error (4xx/5xx)
            Server-->>Job: Error message
            Job->>Queue: Mark status 'failed', increment attempt count, log error
        end
    end
```

---

## 📂 Directory Blueprint

```
billdesk/
├── .expo/                       # Expo local cache and router configuration files
├── android/                     # Auto-generated Native Android project files (prebuild)
├── app/                         # App Routes (Expo Router v4 File System Routing)
│   ├── (auth)/                  # Authentication workflows (Login, Register, Forgot Password)
│   ├── (tabs)/                  # Main Application Dashboard Tab layouts
│   │   ├── index.tsx            # Main stats dashboard view
│   │   ├── customers.tsx        # Customer search, details, and logging index
│   │   ├── invoices.tsx         # Invoice index and management
│   │   ├── payments.tsx         # Payments overview
│   │   └── settings.tsx         # Merchant profile, language, sync setup
│   ├── buyer/                   # B2B buyer detail pages
│   ├── customer/                # Customer ledgers, statements, and contact profiles
│   ├── invoice/                 # Invoice creation panels and print preview
│   ├── payments/                # Ledger record panels
│   ├── _layout.tsx              # Main Navigation provider and Auth state listeners
│   └── __blank.tsx              # Empty fallback view
├── assets/                      # Application icons, splash screens, and localized static media
├── backend/                     # API Gateway (Next.js 16 + Hono 4 + Prisma 7)
│   ├── prisma/                  # Database definitions and migration files
│   │   ├── schema.prisma        # PostgreSQL main data schema definitions
│   │   └── seed.ts              # Seeding script for developer database setup
│   ├── public/                  # Static host files (SVG icons, placeholders)
│   ├── src/
│   │   ├── app/                 # Next.js App Router hooks & API routing endpoints
│   │   │   └── api/[[...route]] # Catch-all dynamic gateway linking Hono API route handlers
│   │   ├── config/              # Server env variable verification configuration (Zod)
│   │   ├── controllers/         # Router controllers (mapping endpoints to services)
│   │   ├── database/            # Prisma connection instances
│   │   ├── errors/              # Centralized Custom Error Classes
│   │   ├── middleware/          # JWT checks, cors wrappers, rate limits, error logging
│   │   ├── repositories/        # Database Access Layer implementations
│   │   ├── services/            # Business core services (auth, invoices, reports)
│   │   └── validators/          # Request validation validation models (Zod)
│   ├── package.json             # Backend server configuration and script manifests
│   └── tsconfig.json            # Server TypeScript runtime config
├── docs/                        # Project architectural docs, charts, and API schemas
├── src/                         # Core Frontend Application Source
│   ├── components/              # Shared reusable native controls (Dialogs, Cards, Badges)
│   ├── constants/               # Layout measurements, color systems, currency symbols
│   ├── contexts/                # State wrappers (Theme contexts, global shop models)
│   ├── hooks/                   # Custom utility React Hooks (tabs, dynamic height)
│   ├── locales/                 # JSON translation libraries (English, Gujarati)
│   ├── repositories/            # SQLite abstraction layers for data entities
│   ├── services/                # Local logic (i18n configuration, SQLite setup, PDF creation)
│   ├── storage/                 # MMKV key-value configurations
│   └── types/                   # Unified TypeScript interfaces
├── package.json                 # Expo project packages and runner configurations
└── tsconfig.json                # Frontend TypeScript configurations
```

---

## 🚀 Onboarding & Installation

### Prerequisites
Before setting up the environment, ensure you have the following installed:
* **Node.js:** `v18.0.0` or higher (LTS recommended)
* **npm** or **yarn** package manager
* **Git** CLI
* **Docker:** Recommended for running a local PostgreSQL and Redis stack

### 1. Repository Setup & Dependencies
Clone the repository and install dependencies for both the frontend client and the backend server:

```bash
# Clone the repository
git clone https://github.com/krisvasoya/billdesk.git
cd billdesk

# Install client-side node modules
npm install

# Navigate to backend directory and install server-side modules
cd backend
npm install
```

### 2. Configure Database & Seed Local Server
Make sure Docker is running, then run the database setup commands. By default, Prisma requires a running PostgreSQL instance.

```bash
# Set up environment files (Refer to the environment variables section)
cp .env.example .env

# Run Prisma migrations to configure PostgreSQL database structure
npx prisma migrate dev --name init

# Seed the database with demo users and products
npx prisma db seed
```

### 3. Running the Development Environments

#### Start the Next.js API Server
From inside the `backend/` directory:
```bash
npm run dev
```
The server starts on `http://localhost:3000`. API endpoints are accessible via `/api/*`.

#### Start the Expo Mobile Client
Open a new terminal window in the root directory:
```bash
# Start the Expo development server
npm run start
```
You can run the mobile client using these options:
* **Android:** Press `a` (requires Android Emulator or physical device with Expo Go app connected via USB/Wi-Fi).
* **iOS:** Press `i` (requires macOS and Xcode Simulator installed).
* **Web:** Press `w` (opens the web bundle in your browser).

---

## ⚙️ Environment Configuration

### Backend Configuration (`backend/.env`)
Create a `.env` file in the `backend/` directory and configure the variables below:

| Variable | Required | Description | Default | Example |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Yes | Local port for Next.js to host the Hono engine | `4000` | `4000` |
| `DATABASE_URL` | Yes | Connection string for the PostgreSQL database | *None* | `postgresql://user:pwd@host:5432/billdesk?schema=public` |
| `DIRECT_URL` | No | Direct connection string for migrations | *None* | `postgresql://user:pwd@host:5432/billdesk?sslmode=require` |
| `JWT_SECRET` | Yes | Cryptographic secret for signing access tokens | *None* | `9f67a2cd894efb81c20ab98de9e012fe` |
| `JWT_REFRESH_SECRET` | Yes | Cryptographic secret for signing refresh tokens | *None* | `5ef812cd894efb81c20ab98de9e012ab` |
| `CLOUDINARY_CLOUD_NAME`| No | Cloudinary storage bucket name for company logos | *None* | `billdesk-cloud` |
| `CLOUDINARY_API_KEY` | No | API key for authenticated file uploads | *None* | `123456789012345` |
| `CLOUDINARY_API_SECRET` | No | Secure key for file uploads | *None* | `aBcdEfGhIjKlMnOpQrStUvWxYz1` |
| `UPSTASH_REDIS_REST_URL`| No | Upstash Redis endpoint for API rate limiting | *None* | `https://chosen-mammal-12345.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN`| No | Secret token for Upstash Redis server | *None* | `AbCdEfGhIjKlMnOpQrStUvWxYz1234567890` |
| `AUTH_ENABLED` | No | Global authentication bypass switch (Development) | `true` | `false` |

---

## 🔐 Authentication & Role-Based Access Control

BillDesk implements a robust token-based authentication system featuring access/refresh token rotation and secure storage constraints.

### The Authentication Flow
1. **Access Token:** Short-lived JWT (15 minutes) signed with `JWT_SECRET`, containing `userId`, `shopId`, `email`, and `role`. It must be attached to the `Authorization` header as a `Bearer` token.
2. **Refresh Token:** Long-lived JWT (7 days) signed with `JWT_REFRESH_SECRET` and saved in the database under the `RefreshToken` model. It is rotated automatically on each refresh request to mitigate replay attacks.
3. **Logout:** Deletes the refresh token record from the database and updates user session tables.

### Tenant Isolation Scoping
Every HTTP request to a protected endpoint must supply the user's shop ID context. This is handled in one of two ways:
* **Headers:** For offline synchronization pipelines, requests pass `X-Shop-Id` directly in the request headers to scope operation contexts securely.
* **Token Payload:** For standard API actions, the `authMiddleware` validates the access token, extracts `shopId`, and binds it to the Hono request context (`c.set('shopId', ...)`).

### Role-Based Access Control (RBAC)
User permissions are categorized into four roles:
* **`owner`:** Full access, including profile changes, shop configuration modifications, invoice generation, and user management.
* **`manager`:** Access to billing, customer records, and ledger logs, with restricted user management.
* **`employee`:** Access to billing and customer directories; cannot view company-wide financial reports or delete records.
* **`viewer`:** Read-only access to invoices and stats; cannot create or update any data.

---

## 🗄️ Database & Schema Design

BillDesk utilizes a hybrid database approach: **PostgreSQL** in production for centralized, secure multi-tenant storage, and **SQLite** locally on mobile devices to support offline work.

### Entity-Relationship Diagram (Prisma DB Schema)

```
+------------------+          +------------------+          +------------------+
|       Shop       |          |     Settings     |          |       User       |
+------------------+          +------------------+          +------------------+
| id (PK) [UUID]   |1 ------ 1| id (PK) [UUID]   |1 ------ *| id (PK) [UUID]   |
| shopName         |          | shopId (FK)      |          | shopId (FK)      |
| ownerName        |          | currency         |          | email            |
| email (Unique)   |          | language         |          | passwordHash     |
| mobile           |          | upiId            |          | role             |
+------------------+          +------------------+          +------------------+
        | 1                                                         |
        |                                                           |
        |---------------------+------------------+                  |
        | *                   | *                | *                | *
+------------------+   +--------------+   +--------------+   +------------------+
|     Customer     |   |    Buyer     |   |   Invoice    |   |   ActivityLog    |
+------------------+   +--------------+   +--------------+   +------------------+
| id (PK) [UUID]   |   | id (PK)      |   | id (PK)      |   | id (PK)          |
| shopId (FK)      |   | shopId (FK)  |   | shopId (FK)  |   | shopId (FK)      |
| customerName     |   | buyerName    |   | customerId   |   | userId (FK)      |
| mobile           |   | mobile       |   | grandTotal   |   | action           |
+------------------+   +--------------+   +--------------+   +------------------+
        | 1                                      | 1
        |                                        |
        | *                                      | *
+------------------+                      +--------------+
|     Payment      |                      | InvoiceItem  |
+------------------+                      +--------------+
| id (PK) [UUID]   |                      | id (PK)      |
| shopId (FK)      |                      | invoiceId    |
| customerId (FK)  |                      | productName  |
| amount           |                      | total        |
+------------------+                      +--------------+
```

### Database Optimization & Controls
* **Index Mapping:** Foreign key lookups (`shopId`, `customerId`) are indexed to improve query performance under heavy loads.
* **Transactional Operations:** Invoice creation writes items and updates outstanding customer balances inside a `prisma.$transaction` block to guarantee atomicity.
* **Soft Delete Logic:** Relational models use a nullable `deletedAt` field. Queries filter out deleted records automatically to preserve historical billing integrity.

---

## 🔄 Offline Synchronization Engine

The sync engine uses an event-sourced transaction queue to maintain database consistency when offline.

### The Sync Queue Database Structure
Local SQLite mutations are captured in the `sync_queue` table:
```sql
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,       -- 'customer', 'buyer', 'invoice', 'payment', 'product'
  entity_id TEXT NOT NULL,         -- UUID of the mutated local record
  operation TEXT NOT NULL,         -- 'create', 'update', 'delete'
  payload TEXT NOT NULL,           -- JSON string containing the mutation fields
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'syncing', 'failed'
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
```

### Sync Pipeline Strategy
* **Chronological Order:** Queue items are processed sequentially (`ORDER BY created_at ASC`) to maintain causal dependencies (e.g., creating a customer before logging their invoice).
* **Conflict Resolution:** Uses **Last-Write-Wins (LWW)** based on `updatedAt` timestamps. If a validation error (e.g., 400 Bad Request) occurs, the sync engine flags the item as `failed`, logs the error, and stops execution to prevent data corruption.
* **Network Listener:** Detects connectivity changes automatically, initiating sync cycles as soon as the device goes online.

---

## 🔌 API Specifications

Every API request requires an `Authorization: Bearer <token>` header or `X-Shop-Id` in the request headers (specifically for background offline sync tasks).

### 1. Authentication Endpoints

#### `POST /api/auth/register`
Creates a new tenant shop and owner profile.
* **Request Payload:**
  ```json
  {
    "shopName": "Apex Wholesale",
    "ownerName": "John Doe",
    "email": "owner@apex.com",
    "mobile": "9876543210",
    "businessType": "Distributor",
    "passwordHash": "plaintextSecurePassword"
  }
  ```
* **Response Payload (201 Created):**
  ```json
  {
    "success": true,
    "message": "Shop registered successfully",
    "data": {
      "shop": { "id": "shop-uuid-1234", "shopName": "Apex Wholesale" },
      "user": { "id": "user-uuid-5678", "name": "John Doe", "role": "owner" },
      "tokens": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "eyJhbGciOi..."
      }
    }
  }
  ```

#### `POST /api/auth/login`
Authenticates a user and returns a token pair. Rate limited to 5 login requests per minute per IP.
* **Request Payload:**
  ```json
  {
    "email": "owner@apex.com",
    "passwordHash": "plaintextSecurePassword"
  }
  ```
* **Response Payload (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": { "id": "user-uuid-5678", "email": "owner@apex.com", "role": "owner" },
      "tokens": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "eyJhbGciOi..."
      }
    }
  }
  ```

---

### 2. Invoicing Endpoints

#### `POST /api/invoices`
Generates a new invoice and updates customer outstanding balances. Rate limited to 30 requests per minute.
* **Request Payload:**
  ```json
  {
    "invoiceNumber": "INV-2026-004",
    "customerId": "cust-uuid-4321",
    "invoiceDate": "2026-07-03T16:00:00.000Z",
    "dueDate": "2026-08-03T16:00:00.000Z",
    "subtotal": 1000.00,
    "discount": 50.00,
    "gst": 180.00,
    "grandTotal": 1130.00,
    "paidAmount": 200.00,
    "pendingAmount": 930.00,
    "paymentStatus": "partial",
    "items": [
      {
        "productName": "Industrial Wire Rolls",
        "quantity": 10,
        "unit": "rolls",
        "rate": 100.00,
        "gst": 18.00,
        "total": 1130.00
      }
    ]
  }
  ```
* **Response Payload (201 Created):**
  ```json
  {
    "success": true,
    "message": "Invoice generated successfully",
    "data": {
      "id": "invoice-uuid-9999",
      "invoiceNumber": "INV-2026-004",
      "grandTotal": 1130.00,
      "pendingAmount": 930.00
    }
  }
  ```

---

### 3. Customer Ledger Endpoints

#### `GET /api/customers`
Retrieves a paginated list of active customer accounts.
* **Query Parameters:**
  * `search` (string, optional)
  * `page` (number, default: 1)
  * `pageSize` (number, default: 10)
* **Response Payload (200 OK):**
  ```json
  {
    "success": true,
    "message": "Customers fetched successfully",
    "data": {
      "customers": [
        {
          "id": "cust-uuid-4321",
          "customerName": "Alice Patel",
          "mobile": "9900990099",
          "openingBalance": 1500.00,
          "creditLimit": 10000.00
        }
      ],
      "pagination": { "page": 1, "pageSize": 10, "total": 1 }
    }
  }
  ```

---

## 🖨️ PDF Generation & Print Engine

The PDF generation module dynamically constructs A4 format documents on-device, supporting custom styles and local printer formatting.

### Printing Specifications
* **Runtime Core:** Leverages `expo-print` to render HTML templates into print-ready PDF files.
* **File Management:** Saves generated PDFs in `FileSystem.documentDirectory` using structured names (`Invoice_${invoiceNumber}.pdf`) to manage local disk space.
* **Sharing Integrations:** Uses `expo-sharing` to open the system share sheet, enabling one-tap sharing to WhatsApp and email.
* **Amount in Words Conversion:** The print engine formats grand totals into written text strings in both English and Gujarati, making it highly suitable for regional business markets.

```ts
// Quick integration example:
import { pdfService } from './services/pdfService';

const handlePrint = async (invoice, shop) => {
  // Triggers OS print dialogue
  await pdfService.printInvoice(invoice, shop);
};
```

---

## 🔔 Notifications Pipeline

The notification system uses a dual pipeline to handle local transaction notifications and push notifications.

* **Local Notifications:** Triggered on-device using `expo-notifications` for immediate events, such as when data syncs complete or database backups succeed.
* **Customer Alerts:** Generates payment reminder alerts for invoices approaching or past their due date.
* **Broadcast Alerts:** Supports transactional push alerts to inform team members of database updates or invoice creations across devices.

---

## 🎨 Styling & Theming System

BillDesk features a fully responsive component theme system built on **React Native Paper**'s Material Design guidelines.

* **System Theme Sync:** Detects the device's system settings automatically to switch between Light and Dark modes.
* **Clean Theme Switcher:** Offers manually toggleable options in the settings panel, persisting preferences using MMKV storage.
* **Carefully Crafted Palettes:** Avoids standard primary colors, using clean deep slates, emeralds for positive cash flow logs, and amber highlights for receivables.

---

## 📈 Performance Optimization & Benchmarks

To ensure smooth operation on lower-spec mobile hardware, BillDesk implements several performance optimizations:

* **React Query Caching:** Caches API requests locally, preventing unnecessary network lookups.
* **Fast Storage with MMKV:** Replaces standard AsyncStorage with MMKV to reduce read/write overhead for local key-value configurations.
* **SQLite WAL Mode:** Enables **Write-Ahead Logging (WAL)** on the SQLite database, allowing parallel read/write actions for faster performance.
* **Optimized Rendering:** Uses custom FlatLists with explicit item layout sizes (`getItemLayout`) to prevent list jumps and stuttering on large directories.

---

## 🔒 Security Hardening

* **Tenant Isolation Middleware:** Checks the `X-Shop-Id` header on all server-side routes to keep tenant database queries isolated.
* **Rate Limiting:** Protects key endpoints using Redis rate limiting (e.g., `/api/auth/login` is limited to 5 requests per minute).
* **Zod Sanitization:** Filters out raw SQL input in requests using strict Zod schema parsing.
* **Encrypted Storage:** Stores JWT keys locally in encrypted MMKV sectors.

---

## 🚢 Deployment & DevOps

```
[Developer Push] ---> [GitHub Repository] ---> [GitHub Actions CI]
                                                     │
                             ┌───────────────────────┴───────────────────────┐
                             ▼                                               ▼
               [Expo Application Services]                       [Vercel Server Host]
               - Automated EAS Builds                            - API Next.js Gateway
               - Releases APK / AAB                              - Hono Server Engine
                             │                                               │
                             ▼                                               ▼
                    [Google Play Store]                             [Postgres Database]
```

### Backend API Deployment (Vercel)
The server architecture is designed to run on Vercel's serverless edge engine. Deploy the backend using the following commands:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel
```

### Mobile Application Build (EAS CLI)
Use Expo Application Services (EAS) to build production-ready Android and iOS binaries:
```bash
# Log in to Expo
npx eas login

# Run build credentials setup
npx eas build:configure

# Trigger an Android production build (generates an APK/AAB)
npx eas build --platform android --profile production
```

---

## 🛡️ Backup & Disaster Recovery

* **Database Backups:** Daily database dumps are automated using PostgreSQL cron jobs and exported to secure storage buckets.
* **Safe Migrations:** Database schema updates run inside transactional Prisma migrations, allowing quick rollbacks if an error occurs.
* **Disaster Recovery Steps:**
  1. Retrieve the latest SQL dump file.
  2. Provision a clean PostgreSQL database instance.
  3. Import the backup schema using `psql -d <db_name> -f <backup_file>.sql`.
  4. Run `npx prisma db push` to verify database health.

---

## 🧪 Testing Framework

* **Server Tests:** Run Jest integration tests on backend controllers and services.
  ```bash
  npm run test:backend
  ```
* **Frontend Tests:** Verify helper services and state rendering using Jest.
  ```bash
  npm run test:frontend
  ```
* **Production Checklist:** Verify environment variables, test database migration status, and check SSL certificates before running releases.

---

## 🏷️ Release & Versioning Policy

* **Semantic Versioning:** Follows standard Semantic Versioning (SemVer) guidelines (`MAJOR.MINOR.PATCH`).
* **Hotfixes:** Patches are branched directly from `main` to resolve high-priority production bugs, incrementing the patch version (e.g., `v1.0.1`).
* **Release Notes:** Every tag release automatically generates changelogs summarizing new features, bug fixes, and database updates.

---

## 🛣️ Product Roadmap

- [ ] **Point-of-Sale (POS) Module:** Bluetooth integration for direct thermal receipt printing.
- [ ] **On-Device Barcode Scanner:** Quick stock lookup using the device camera.
- [ ] **AI-Powered Insights:** Smart cash flow forecasting and payment collection reminders.
- [ ] **Web-Based Dashboard:** A desktop web interface for office accounting tasks.

---

## 🤝 Contribution Protocols

We welcome contributions! Please follow these standards:
* **Branching Strategy:** Use descriptive branch names prefixing features or bug fixes (e.g., `feature/sync-retry-logic` or `bugfix/pdf-rounding`).
* **Commit Conventions:** Follow the Conventional Commits specification (e.g., `feat: add support for gujarati localization`).
* **Pull Requests:** Open a PR targeting `main` and include a clear summary of your changes.

---

## 💬 Frequently Asked Questions (FAQ)

<details>
<summary><b>1. Can BillDesk run completely offline?</b></summary>
Yes. BillDesk writes changes locally to an SQLite database, allowing you to create invoices, add customers, and log payments without an internet connection. The sync engine will automatically upload all queued changes once your device is back online.
</details>

<details>
<summary><b>2. How is customer ledger data protected?</b></summary>
Customer data is isolated at the database query level. Every API route uses a secure tenant ID header (`x-shop-id`) to sandbox data accesses, preventing other merchant accounts from viewing your records.
</details>

---

## 🔧 Troubleshooting Handbook

### 1. Database Connection Failures
* **Symptom:** The backend server fails to start with the error `PrismaClientInitializationError`.
* **Fix:** Verify that PostgreSQL is running and your `DATABASE_URL` is set correctly in your `.env` file. Try running a database ping:
  ```bash
  docker-compose ps
  ```

### 2. Client Sync Stalls
* **Symptom:** Outbox mutations are not syncing to the backend server.
* **Fix:** Check that your local backend URL is set correctly in the mobile app settings. When using the Android emulator, make sure the URL points to `10.0.2.2` instead of `localhost`.

---

## 📝 License & Credits

This project is licensed under the [MIT License](./LICENSE) - see the LICENSE file for details.

### Acknowledgments
* Built with ❤️ by **Kris Vasoya**
* Special thanks to the teams behind Expo, React Native, Hono, and Prisma.

---

<p align="center">
  <strong>BillDesk — Enterprise Mobile Billing Platform</strong><br/>
  Built using React Native, Expo, Hono, Prisma, and PostgreSQL.
</p>
