// src/constants/index.ts
export const APP_NAME = 'BillDesk';
export const APP_VERSION = '1.0.0';
export const COMPANY_NAME = 'Shayona Group';
export const SUPPORT_EMAIL = 'support@shayonagroup.com';
export const SUPPORT_PHONE = '+91 98765 43210';

export const INVOICE_PREFIX = 'INV';
export const DEFAULT_TAX_RATE = 18;
export const DEFAULT_CURRENCY = 'INR';
export const CURRENCY_SYMBOL = '₹';

export const PAYMENT_METHODS = [
  { label: 'Cash', value: 'cash', icon: 'banknote' },
  { label: 'UPI', value: 'upi', icon: 'smartphone' },
  { label: 'Bank Transfer', value: 'bank', icon: 'building-2' },
  { label: 'Cheque', value: 'cheque', icon: 'file-text' },
  { label: 'Card', value: 'card', icon: 'credit-card' },
] as const;

export const BUSINESS_TYPES = [
  'Retailer',
  'Wholesaler',
  'Manufacturer',
  'Distributor',
  'Trading Company',
  'Service Provider',
  'Other',
] as const;

export const INVOICE_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export const DATE_FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
] as const;

export const PAGE_SIZE = 20;
