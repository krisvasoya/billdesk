# BillDesk — Local Installation & Setup Guide

This guide details the step-by-step process for getting the BillDesk mobile client and backend Hono/Next.js API server running on your local development system.

---

## 📋 Prerequisites
Ensure you have the following installed on your machine:
- **Node.js:** v18.x or v20.x (v20+ recommended)
- **PackageManager:** npm (comes with Node) or yarn
- **Git**

---

## 🛠️ Step 1 — Local Database Setup

The backend utilizes Prisma to connect to a PostgreSQL database. For local development, you can spin up a local PostgreSQL instance or configure a free Neon PostgreSQL sandbox.

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Duplicate `.env.example` as `.env` and insert your database details:
   ```env
   PORT=4000
   DATABASE_URL="postgresql://user:pass@localhost:5432/billdesk?schema=public"
   JWT_SECRET="super-secret-development-access-key-2024"
   JWT_REFRESH_SECRET="super-secret-development-refresh-key-2024"
   ```
3. Run the Prisma migrations to create the database schemas locally:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Run the seed script to create a default shop, test user, and dummy catalog items:
   ```bash
   npm run seed
   ```

---

## 🛰️ Step 2 — Running the Backend API Server

1. Install backend dependencies:
   ```bash
   npm install
   ```
2. Start the API server in hot-reload development mode:
   ```bash
   npm run dev
   ```
   The backend Hono API router will start running at `http://localhost:3000/api`.

---

## 📱 Step 3 — Running the React Native Client (Expo)

1. Open a new terminal window and navigate to the project root:
   ```bash
   cd ..
   ```
2. Install client dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Duplicate the client `.env.example` as `.env`:
   ```env
   EXPO_PUBLIC_API_URL="http://localhost:3000/api"
   ```
4. Start the Expo development server:
   ```bash
   npm run start
   ```
5. Press `a` to run on a connected Android Emulator, `i` to run on iOS Simulator, or scan the QR code using the Expo Go application.
