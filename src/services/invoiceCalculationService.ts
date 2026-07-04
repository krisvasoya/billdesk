// src/services/invoiceCalculationService.ts

export interface CalculationItemInput {
  rate: number;
  quantity: number;
  discount?: number;
  gst?: number;
}

export interface CalculationInvoiceInput {
  items: CalculationItemInput[];
  transport?: number;
  packing?: number;
  otherCharges?: number;
  advancePaid?: number;
  paidAmount?: number;
}

export interface CalculationInvoiceResult {
  subtotal: number;
  discount: number;
  gst: number;
  grandTotal: number;
  pendingAmount: number;
  itemTotals: number[];
}

export const InvoiceCalculationService = {
  /**
   * Calculates subtotal, discount, gst, and total for a single line item.
   */
  calculateItem(item: CalculationItemInput): { base: number; gstAmount: number; total: number } {
    const rate = item.rate || 0;
    const quantity = item.quantity || 0;
    const discount = item.discount || 0;
    const gstRate = item.gst || 0;

    const base = rate * quantity - discount;
    const gstAmount = (base * gstRate) / 100;
    const total = base + gstAmount;

    return { base, gstAmount, total };
  },

  /**
   * Computes invoice subtotals, grand totals, and outstanding pending balances from database records.
   */
  calculateInvoice(input: CalculationInvoiceInput): CalculationInvoiceResult {
    const items = input.items || [];
    const transport = input.transport || 0;
    const packing = input.packing || 0;
    const otherCharges = input.otherCharges || 0;
    const advancePaid = input.advancePaid || 0;
    const paidAmount = input.paidAmount || 0;

    let subtotal = 0;
    let discount = 0;
    let gst = 0;
    const itemTotals: number[] = [];

    items.forEach(item => {
      const rate = item.rate || 0;
      const quantity = item.quantity || 0;
      const itemDiscount = item.discount || 0;

      // Add to subtotal based on rate * quantity before discount
      subtotal += rate * quantity;
      discount += itemDiscount;

      const { base, gstAmount, total } = this.calculateItem(item);
      gst += gstAmount;
      itemTotals.push(total);
    });

    const grandTotal = subtotal - discount + gst + transport + packing + otherCharges;
    const pendingAmount = Math.max(0, grandTotal - advancePaid - paidAmount);

    return {
      subtotal,
      discount,
      gst,
      grandTotal,
      pendingAmount,
      itemTotals,
    };
  },
};
