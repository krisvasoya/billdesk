# BillDesk — Enterprise Mobile Billing Solution

BillDesk is a production-ready, cross-platform accounting and mobile billing application built for independent shops and businesses. It features tenant-isolated multi-tenant operations, offline-first SQLite synchronization, automated A4 PDF invoice generations, WhatsApp sharing pipelines, GST reports, and ledger payments.

---

## 📂 Documentation Directory

To prepare this project for launch or customization, please refer to the detailed sections below:

1. ⚙️ **[Local Installation & Setup Guide](./INSTALLATION.md)** — Guide to running frontend and backend servers locally.
2. 🚀 **[Production Deployment Guide](./DEPLOYMENT.md)** — Complete pipelines for deploying Next.js/Hono backend on Vercel and compiled release builds using Expo EAS.
3. 🔐 **[Environment Variables Reference](./ENV_VARIABLES.md)** — Comprehensive variables sheet for Database, Redis, and Cloudinary.
4. 🛰️ **[REST API Specifications](./API_DOCUMENTATION.md)** — Fully documented routes for Auth, Ledger, Invoicing, and Payments.
5. 💾 **[Database Design & Indexes](./DATABASE.md)** — Neon PostgreSQL mapping, schema keys, and index configurations.
6. 🏗️ **[System Architecture & Offline Sync](./ARCHITECTURE.md)** — Tenant security models, retry loops, and SQLite sync workflows.
7. 🛡️ **[Backup, Recovery & Maintenance](./MAINTENANCE.md)** — Recovery workflows and backup guidelines.

---

## ⚡ Tech Stack

### Mobile Client (Frontend)
- **Framework:** Expo (React Native) SDK 57 (New Architecture enabled)
- **Database:** Local SQLite (`expo-sqlite`)
- **State & MMKV:** React Query + `react-native-mmkv`
- **Styling:** Material Design 3 (Vanilla React Native + React Native Paper)

### Server & Services (Backend)
- **Engine:** Hono Router running on Next.js 16 Serverless runtime
- **Database ORM:** Prisma 7 + `pg` driver
- **Cache & Rate-limiting:** Upstash Redis
- **Media Uploads:** Cloudinary SDK
