# BillDesk — Backup, Recovery & Maintenance Guide

Maintaining database backups, environment variables sheets, and media assets is critical for the stability of a production billing application.

---

## 💾 1. Neon PostgreSQL Backup Strategy

Neon provides built-in Point-in-Time Recovery (PITR) and automatic daily backups.

### Restoring Database via Neon Dashboard
1. Log into your [Neon Console](https://console.neon.tech).
2. Select your Project and click **Branches**.
3. Create a new branch from a historical point-in-time (PITR recovery point) or a daily snapshot.
4. Update your backend Vercel environment variables with the connection string pointing to the new branch.

---

## 🖼️ 2. Cloudinary Media Asset Backups

Shop Logos and generated PDF invoices should be replicated or backed up regularly:
- **Cloudinary Backup Tool:** Cloudinary supports automatic backups to AWS S3 or Google Cloud Storage buckets. Configure this inside your Cloudinary account dashboard under **Settings > Uploads > Backup**.

---

## 🔐 3. Environment Variable Recovery

Keep a secure copy of all environment variables inside a password manager (e.g. 1Password, Bitwarden) formatted as:
```env
# Production Config
PORT=4000
DATABASE_URL="postgres://..."
DIRECT_URL="postgres://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

---

## 📲 4. Rolling Back App Updates

If an update pushed to Google Play Console or Apple App Store contains fatal bugs:
1. **EAS Rollback:** EAS supports instant rollbacks via Expo Updates.
   ```bash
   eas update:rollback --platform all
   ```
2. **Play Store / App Store:** Build the previous stable version tag inside git, increment the version code, compile the build, and push it to the release track.
