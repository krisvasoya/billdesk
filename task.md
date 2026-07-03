# BillDesk — Implementation Task List

## Phase 1 — Schema & Types
- [x] Upgrade schema.ts (buyers, notifications tables + new invoice columns)
- [x] Upgrade types/index.ts (Buyer, Notification, updated Invoice types)
- [x] Create buyerService.ts
- [x] Create notificationService.ts
- [x] Create reportService.ts

## Phase 2 — Reusable Components
- [x] Create Select.tsx (dropdown/picker component)
- [x] Create BuyerCard.tsx
- [x] Implement Amount in Words helper

## Phase 3 — PDF Service
- [x] Create pdfService.ts (HTML template + expo-print)
- [x] Professional invoice template with GST / amount in words
- [x] WhatsApp share + expo-sharing integration

## Phase 4 — Buyer Module
- [x] app/(tabs)/buyers.tsx
- [x] app/buyer/[id].tsx

## Phase 5 — Upgrade Invoice Create
- [x] Fix compiler & type config errors
  - [x] Add exclude to `tsconfig.json`
  - [x] Fix `DarkColors` typing in `src/constants/theme.ts`
- [x] Add buyer selection
- [x] Add description + alt-qty per item
- [x] Add transport/packing/other charges
- [x] Add advance payment field
- [x] Amount in words
- [x] Redirection to newly created invoice

## Phase 6 — Upgrade Invoice Detail
- [x] Save PDF (to documents)
- [x] Share PDF (WhatsApp or system share)
- [x] Duplicate action
- [x] Delete with confirm
- [x] Print invoice

## Phase 7 — Dashboard Upgrades
- [x] Add customer count KPI
- [x] Add buyer count KPI
- [x] Add today's sales KPI
- [x] Add pending bills count
- [x] Add overall outstanding & received totals

## Phase 8 — Reports Upgrade
- [x] Full sales report table
- [x] Customer outstanding table
- [x] Payment method breakdown
- [x] GST report summary
- [x] Export to PDF

## Phase 9 — Settings Upgrade
- [x] Shop info edit form redirection
- [x] Logo upload (expo-image-picker integration on Profile)
- [x] Backup data as JSON export
- [x] Restore data from JSON

## Phase 10 — New Screens
- [x] app/(tabs)/notifications.tsx
- [x] app/profile.tsx (shop settings / profile)
- [x] app/search.tsx (global search)

## Phase 11 — Navigation
- [x] Reconfigure (tabs)/_layout.tsx for all tabs
- [x] Add all Stack.Screen routes in _layout.tsx
- [x] Keep primary actions easily accessible

## Phase 12 — Sync Engine
- [x] src/services/syncService.ts (queue + retry)
- [x] Integration with local database services (write operations auto-queue)

## Phase 13 — Verification
- [x] Run compilation checks, confirm zero typescript syntax errors in source files
