// src/types/index.ts
export interface Shop {
  id: string;
  ownerId?: string;
  shopName: string;
  ownerName: string;
  businessType: string;
  address?: string;
  logo?: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  // Settings/Metadata
  gst?: string;
  upiId?: string;
  bankDetails?: string;
  invoiceNumberFormat: string;
  currency: string;
  language: string;
  theme: string;
}

export interface User {
  id: string;
  shopId: string;
  fullName: string;
  email: string;
  mobile?: string;
  passwordHash?: string;
  role: 'owner' | 'admin' | 'staff';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  openingBalance: number;
  createdAt: string;
  updatedAt: string;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  creditLimit?: number;
  notes?: string;
  deletedAt?: string;
}

export interface Buyer {
  id: string;
  shopId: string;
  name: string;
  mobile?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // compatibility fields for reports/dashboard queries
  gst?: string;
  openingBalance?: number;
  creditLimit?: number;
  totalBilled?: number;
  totalPaid?: number;
  outstanding?: number;
}

export interface Product {
  id: string;
  shopId: string;
  productName: string;
  rate: number;
  gst: number;
  unit: string;
  stock?: number;
  createdAt: string;
  updatedAt: string;
  sku?: string;
  barcode?: string;
  deletedAt?: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  gst: number;
  total: number;
  productName: string;
  description?: string;
  altQuantity?: number;
  altUnit?: string;
}

export type InvoiceStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  shopId: string;
  customerId: string;
  buyerId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  discount: number;
  gst: number;
  transport: number;
  packing: number;
  otherCharges: number;
  advancePaid: number;
  grandTotal: number;
  paidAmount: number;
  pendingAmount: number;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  buyerName?: string;
  notes?: string;
  terms?: string;
  items: InvoiceItem[];
  deletedAt?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank' | 'cheque' | 'card';

export interface Payment {
  id: string;
  shopId: string;
  invoiceId?: string;
  customerId: string;
  amount: number;
  paymentMode: PaymentMethod;
  paymentDate: string;
  notes?: string;
  createdAt: string;
  customerName: string;
  invoiceNumber?: string;
  deletedAt?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalOutstanding: number;
  totalReceived: number;
  totalCustomers: number;
  totalBuyers: number;
  totalInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  todaySales: number;
}

export type NotificationType =
  | 'invoice_created'
  | 'payment_received'
  | 'payment_due'
  | 'outstanding_reminder'
  | 'sync_status';

export interface AppNotification {
  id: string;
  shopId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'customer' | 'buyer' | 'invoice' | 'payment' | 'product' | 'shop';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  lastError?: string;
  createdAt: string;
}

export interface DateFilter {
  type: 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

export type Language = 'en' | 'gu';

export interface ReportData {
  period: string;
  totalSales: number;
  totalReceived: number;
  totalOutstanding: number;
  totalInvoices: number;
  totalCustomers: number;
  paymentByMethod: Record<string, number>;
  topCustomers: { name: string; total: number; outstanding: number }[];
  gstSummary: { rate: number; taxable: number; tax: number }[];
}
