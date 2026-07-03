// backend/prisma/seed.ts
import { prisma } from '../src/database/db';
import bcrypt from 'bcrypt';

async function main() {
  const demoUserId = '00000000-0000-0000-0000-000000000001';
  const demoShopId = '00000000-0000-0000-0000-000000000002';

  console.log('Seeding Demo Shop & User...');

  // 1. Create or Update Shop
  const shop = await prisma.shop.upsert({
    where: { id: demoShopId },
    update: {
      shopName: 'Shayona Enterprise (Demo)',
      ownerName: 'Krish Vasoya',
      email: 'owner@shayonagroup.com',
      mobile: '9876543210',
      gstNumber: '24ABCDE1234F1Z5',
      address: 'Ring Road, Surat, Gujarat',
      businessType: 'wholesaler',
      logoUrl: 'https://res.cloudinary.com/mock_cloudinary_cloud/image/upload/v1/logos/demo-logo.png',
      currency: 'INR',
      language: 'en',
      isActive: true,
    },
    create: {
      id: demoShopId,
      shopName: 'Shayona Enterprise (Demo)',
      ownerName: 'Krish Vasoya',
      email: 'owner@shayonagroup.com',
      mobile: '9876543210',
      gstNumber: '24ABCDE1234F1Z5',
      address: 'Ring Road, Surat, Gujarat',
      businessType: 'wholesaler',
      logoUrl: 'https://res.cloudinary.com/mock_cloudinary_cloud/image/upload/v1/logos/demo-logo.png',
      currency: 'INR',
      language: 'en',
      isActive: true,
    },
  });

  console.log('✓ Seeding Shop complete:', shop.shopName);

  // 2. Create or Update User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password', salt);

  const user = await prisma.user.upsert({
    where: { email: 'owner@shayonagroup.com' },
    update: {
      name: 'Krish Vasoya',
      mobile: '9876543210',
      passwordHash,
      role: 'owner',
      isActive: true,
      shopId: demoShopId,
    },
    create: {
      id: demoUserId,
      shopId: demoShopId,
      name: 'Krish Vasoya',
      email: 'owner@shayonagroup.com',
      mobile: '9876543210',
      passwordHash,
      role: 'owner',
      isActive: true,
    },
  });

  console.log('✓ Seeding User complete:', user.name);

  // 3. Create Shop Settings
  const settings = await prisma.settings.upsert({
    where: { shopId: demoShopId },
    update: {
      invoiceNumberFormat: 'INV-{YYYY}-{NUMBER}',
      currency: 'INR',
      language: 'en',
      theme: 'light',
      upiId: 'shayona@paytm',
      bankDetails: 'Bank: SBI, A/C: 1234567890, IFSC: SBIN0001234',
    },
    create: {
      shopId: demoShopId,
      invoiceNumberFormat: 'INV-{YYYY}-{NUMBER}',
      currency: 'INR',
      language: 'en',
      theme: 'light',
      upiId: 'shayona@paytm',
      bankDetails: 'Bank: SBI, A/C: 1234567890, IFSC: SBIN0001234',
    },
  });

  console.log('✓ Seeding Settings complete');

  // 4. Create Demo Customer & Buyer
  const demoCust = await prisma.customer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      shopId: demoShopId,
      customerName: 'Ahmadabad Retailer Pvt Ltd',
      mobile: '9988776655',
      email: 'retailer@test.com',
      address: 'Kalupur Market, Ahmedabad',
      gstNumber: '24GHIJK5678L2Z9',
      openingBalance: 15000.0,
      creditLimit: 50000.0,
      notes: 'Trusted client since 2022',
    },
  });

  const demoBuyer = await prisma.buyer.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      shopId: demoShopId,
      buyerName: 'Surat Distributing Hub',
      mobile: '9900112233',
      email: 'distributor@test.com',
      address: 'Textile Market, Surat',
      gstNumber: '24MNOPQ1234A3Z1',
      openingBalance: 0.0,
      creditLimit: 100000.0,
      notes: 'Distributes in southern region',
    },
  });

  console.log('✓ Seeding Customer & Buyer complete');
}

main()
  .catch((e) => {
    console.error('Error during seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
