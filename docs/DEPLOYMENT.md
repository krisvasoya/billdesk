# BillDesk — Production Deployment Guide

This guide describes how to deploy the BillDesk serverless backend on Vercel and build release-ready Android APK/AAB or iOS binaries using Expo EAS.

---

## 🛰️ 1. Deploying the Backend on Vercel

Vercel offers native, scalable support for Next.js App Router applications. Hono handlers compile to serverless edge routes.

### Automated GitHub Pipeline
1. Push your BillDesk code to a private GitHub repository.
2. Log into the [Vercel Dashboard](https://vercel.com).
3. Import your project repository.
4. Set the **Root Directory** to `backend`.
5. Configure the **Environment Variables** (see `docs/ENV_VARIABLES.md`).
6. Click **Deploy**. Vercel will trigger automatic builds upon every push to the `main` branch.

### Manual Vercel CLI Deploy
```bash
cd backend
npm install -g vercel
vercel login
vercel --prod
```

---

## 📱 2. Building Release Binaries using Expo EAS

Expo Application Services (EAS) compiles signed binaries directly on cloud builders.

### Prerequisites
1. Log into your Expo account via the CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Initialize EAS configuration in the project:
   ```bash
   eas project:init
   ```

### Building Android Binaries (AAB / APK)
- **App Bundle (Play Store Production):**
  ```bash
  eas build --platform android --profile production
  ```
  This creates a signed `.aab` file ready for submission to the Google Play Console.
- **Testing APK (Direct Installation):**
  ```bash
  eas build --platform android --profile production-apk
  ```
  This generates an installable `.apk` file that can be distributed to QA devices or sideloaded.

### Building iOS Binaries (IPA)
```bash
eas build --platform ios --profile production
```
Requires an Apple Developer Account to configure app identifiers and provisioning profiles.
