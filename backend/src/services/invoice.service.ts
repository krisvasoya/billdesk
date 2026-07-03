// backend/src/services/invoice.service.ts
import { invoiceRepository, type InvoiceWithItems } from '../repositories/invoice.repository';
import { activityLogRepository } from '../repositories/activity-log.repository';
import { cloudinaryService } from './cloudinary.service';
import type { Prisma, Invoice } from '@prisma/client';
import { prisma } from '../database/db';

export const invoiceService = {
  async getInvoices(
    shopId: string,
    params: {
      customerId?: string;
      buyerId?: string;
      status?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ data: Invoice[]; total: number }> {
    return invoiceRepository.findAll(shopId, params);
  },

  async getInvoiceById(shopId: string, id: string): Promise<InvoiceWithItems | null> {
    return invoiceRepository.findById(shopId, id);
  },

  async getInvoiceStats(shopId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return invoiceRepository.getStats(shopId, start, end);
  },

  async createInvoice(
    shopId: string,
    userId: string,
    invoiceData: Omit<Prisma.InvoiceUncheckedCreateInput, 'shopId' | 'grandTotal' | 'pendingAmount' | 'paidAmount' | 'invoiceNumber' | 'subtotal' | 'discount' | 'gst'>,
    itemsData: Omit<Prisma.InvoiceItemUncheckedCreateInput, 'invoiceId' | 'total'>[]
  ): Promise<InvoiceWithItems> {
    // 1. Fetch next sequential invoice number
    const invoiceNumber = await invoiceRepository.findNextInvoiceNumber(shopId);

    // 2. Insert invoice and items in database transaction
    const invoice = await invoiceRepository.create(
      shopId,
      {
        ...invoiceData,
        invoiceNumber,
      },
      itemsData
    );

    // 3. Generate Simple Invoice PDF Buffer
    const pdfBuffer = Buffer.from(
      `%PDF-1.4\n%Invoice No: ${invoice.invoiceNumber}\n%Shop ID: ${shopId}\n%Customer ID: ${invoice.customerId || invoice.buyerId || 'N/A'}\n%Total: ${invoice.grandTotal}\n%%EOF`
    );

    // 4. Upload PDF to Cloudinary
    let pdfUrl = '';
    try {
      pdfUrl = await cloudinaryService.uploadInvoicePDF(pdfBuffer, `invoice_${invoice.id}`);
      
      // Update PDF URL in DB
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl },
      });
      invoice.pdfUrl = pdfUrl;
    } catch (error) {
      console.error('Failed to upload invoice PDF:', error);
    }

    // 5. Write activity audit
    await activityLogRepository.log({
      shopId,
      userId,
      action: 'INVOICE_CREATED',
      details: `Invoice ${invoiceNumber} created. Grand Total: ${invoice.grandTotal}`,
    });

    return invoice;
  },

  async deleteInvoice(shopId: string, id: string, userId: string): Promise<Invoice> {
    const invoice = await invoiceRepository.delete(shopId, id, userId);

    await activityLogRepository.log({
      shopId,
      userId,
      action: 'INVOICE_DELETED',
      details: `Invoice ${invoice.invoiceNumber} deleted. Outstanding balance adjusted.`,
    });

    return invoice;
  },
};
