// app/invoice/[id].tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaBottomPadding } from '../../src/hooks/useTabBarHeight';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Share2, FileDown, Trash2, Receipt, Copy, Printer } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { invoiceService } from '../../src/services/database/invoiceService';
import { pdfService, amountToWords } from '../../src/services/pdfService';
import { useAuth } from '../../src/contexts/AuthContext';
import { useShop } from '../../src/contexts/ShopContext';
import { CURRENCY_SYMBOL } from '../../src/constants';

export function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { shopId } = useAuth();
  const { shop } = useShop();
  const { colors } = useTheme();
  const bottomPadding = useSafeAreaBottomPadding(Spacing.base);
  const queryClient = useQueryClient();

  const [pdfGenerating, setPdfGenerating] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', shopId, id],
    queryFn: () => invoiceService.getById(shopId || '', id || ''),
    enabled: !!shopId && !!id,
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: () => invoiceService.delete(shopId || '', id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      router.back();
      Alert.alert(t('common.success', 'Success'), t('validation.deleteSuccess', 'Invoice deleted successfully!'));
    },
    onError: () => {
      Alert.alert(t('common.failed', 'Failed'), t('validation.serverError', 'Failed to delete invoice.'));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: () => invoiceService.duplicate(shopId || '', id || ''),
    onSuccess: (newInv: any) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      Alert.alert(t('common.success', 'Success'), t('invoices.duplicatedSuccess', 'Invoice duplicated successfully!'), [
        { text: t('invoices.viewNewInvoice', 'View New Invoice'), onPress: () => router.push(`/invoice/${newInv.id}`) },
        { text: t('common.ok', 'OK') }
      ]);
    },
    onError: () => {
      Alert.alert(t('common.failed', 'Failed'), t('validation.serverError', 'Failed to duplicate invoice.'));
    },
  });

  const handlePdfDownload = async () => {
    if (!invoice || !shop) return;
    setPdfGenerating(true);
    try {
      const uri = await pdfService.generateInvoicePdf(invoice, shop);
      Alert.alert(t('invoices.pdfGenerated', 'PDF Generated'), `${t('invoices.savedToDocuments', 'Saved to documents')}: ${uri.split('/').pop()}`);
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.failed', 'Failed'), t('reports.failedExport', 'Failed to generate PDF'));
    } finally {
      setPdfGenerating(false);
    }
  };

  const handlePdfShare = async () => {
    if (!invoice || !shop) return;
    setPdfGenerating(true);
    try {
      await pdfService.shareInvoicePdf(invoice, shop);
    } catch (e) {
      console.error(e);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handlePrint = async () => {
    if (!invoice || !shop) return;
    setPdfGenerating(true);
    try {
      await pdfService.printInvoice(invoice, shop);
    } catch (e) {
      console.error(e);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('invoices.deleteConfirm', 'Delete Invoice?'),
      t('invoices.deleteConfirmText', 'Are you sure you want to delete this invoice? This transaction will be permanently removed.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('common.delete', 'Delete'), style: 'destructive', onPress: () => deleteInvoiceMutation.mutate() },
      ]
    );
  };

  const styles = getStyles(colors);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (isLoading || !invoice) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: colors.textPrimary }}>{t('common.loading', 'Loading invoice...')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{invoice.invoiceNumber}</Text>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => duplicateMutation.mutate()} style={styles.actionIconBtn}>
            <Copy size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        {/* Bill To & Meta Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>{t('invoices.customer', 'Bill To')}</Text>
              <Text style={styles.customerName}>{invoice.customerName}</Text>
            </View>
            <Badge label={invoice.status} variant={invoice.status} />
          </View>

          {invoice.buyerName ? (
            <View style={{ marginTop: Spacing.sm }}>
              <Text style={styles.metaLabel}>{t('pdf.shippedTo', 'Ship To (Buyer)')}</Text>
              <Text style={styles.customerName}>{invoice.buyerName}</Text>
            </View>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.metaDetailsGrid}>
            <View>
              <Text style={styles.detailLabel}>{t('invoices.date', 'Invoice Date')}</Text>
              <Text style={styles.detailVal}>{formatDate(invoice.date)}</Text>
            </View>
            {invoice.dueDate && (
              <View>
                <Text style={styles.detailLabel}>{t('invoices.dueDate', 'Due Date')}</Text>
                <Text style={styles.detailVal}>{formatDate(invoice.dueDate)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Invoice PDF and Sharing Actions */}
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBox} onPress={handlePdfDownload} disabled={pdfGenerating}>
            <FileDown size={18} color={colors.primary} />
            <Text style={styles.actionText}>{t('invoices.savePDF', 'Save PDF')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBox} onPress={handlePdfShare} disabled={pdfGenerating}>
            <Share2 size={18} color={colors.primary} />
            <Text style={styles.actionText}>{t('invoices.sharePDF', 'Share PDF')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBox} onPress={handlePrint} disabled={pdfGenerating}>
            <Printer size={18} color={colors.primary} />
            <Text style={styles.actionText}>{t('invoices.print', 'Print')}</Text>
          </TouchableOpacity>
        </View>

        {/* Line Items Card */}
        <View style={styles.itemsCard}>
          <Text style={styles.cardTitle}>{t('invoices.items', 'Line Items')}</Text>
          {invoice.items.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.productName}</Text>
                {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                <Text style={styles.itemMeta}>
                  {item.quantity} {item.unit} x {CURRENCY_SYMBOL}{item.price}
                  {item.altQuantity ? ` (${item.altQuantity} ${item.altUnit ?? ''})` : ''}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{CURRENCY_SYMBOL}{item.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals Summary Panel */}
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('invoices.subtotal', 'Subtotal')}</Text>
            <Text style={styles.totalValue}>{CURRENCY_SYMBOL}{invoice.subtotal.toFixed(2)}</Text>
          </View>
          {invoice.discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoices.discountAmount', 'Discount')}</Text>
              <Text style={[styles.totalValue, { color: colors.error }]}>-{CURRENCY_SYMBOL}{invoice.discountAmount.toFixed(2)}</Text>
            </View>
          )}
          {invoice.taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoices.taxAmount', 'Tax (GST)')}</Text>
              <Text style={styles.totalValue}>{CURRENCY_SYMBOL}{invoice.taxAmount.toFixed(2)}</Text>
            </View>
          )}
          {invoice.transportCharge > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoices.transport', 'Transport Charges')}</Text>
              <Text style={styles.totalValue}>{CURRENCY_SYMBOL}{invoice.transportCharge.toFixed(2)}</Text>
            </View>
          ) : null}
          {invoice.packingCharge > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoices.packing', 'Packing Charges')}</Text>
              <Text style={styles.totalValue}>{CURRENCY_SYMBOL}{invoice.packingCharge.toFixed(2)}</Text>
            </View>
          ) : null}
          {invoice.otherCharge > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoices.otherCharges', 'Other Charges')}</Text>
              <Text style={styles.totalValue}>{CURRENCY_SYMBOL}{invoice.otherCharge.toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={styles.divider} />
          <View style={[styles.totalRow, { marginVertical: Spacing.xs }]}>
            <Text style={[styles.totalLabel, styles.totalLabelMain]}>{t('invoices.total', 'Total')}</Text>
            <Text style={[styles.totalValue, styles.totalValueMain]}>{CURRENCY_SYMBOL}{invoice.total.toFixed(2)}</Text>
          </View>

          {invoice.paidAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('common.amountPaid', 'Amount Paid')}</Text>
              <Text style={[styles.totalValue, { color: colors.success }]}>-{CURRENCY_SYMBOL}{invoice.paidAmount.toFixed(2)}</Text>
            </View>
          )}
          {invoice.outstanding > 0 && (
            <View style={[styles.totalRow, { marginTop: Spacing.xs }]}>
              <Text style={[styles.totalLabel, { color: colors.error, fontWeight: '700' }]}>{t('invoices.outstanding', 'Outstanding')}</Text>
              <Text style={[styles.totalValue, { color: colors.error, fontWeight: '700' }]}>{CURRENCY_SYMBOL}{invoice.outstanding.toFixed(2)}</Text>
            </View>
          )}
          
          <View style={styles.wordsBox}>
            <Text style={styles.wordsLabel}>{t('common.amountInWords', 'Amount in Words')}:</Text>
            <Text style={styles.wordsText}>{amountToWords(invoice.total)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>{t('invoices.notes', 'Notes / Remarks')}</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {invoice.terms && (
          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>{t('common.terms', 'Terms & Conditions')}</Text>
            <Text style={styles.notesText}>{invoice.terms}</Text>
          </View>
        )}

        {invoice.outstanding > 0 && (
          <Button
            title={t('invoices.recordPayment', 'Record Payment')}
            icon={<Receipt size={18} color="#FFFFFF" />}
            onPress={() => router.push({
              pathname: '/payments/record',
              params: {
                customerId: invoice.customerId,
                customerName: invoice.customerName,
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                amount: String(invoice.outstanding),
              }
            })}
            style={styles.paymentButton}
          />
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },
  topActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  actionIconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  deleteButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.base },
  metaCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadow.sm,
    marginBottom: Spacing.base,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metaLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 2 },
  customerName: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: Spacing.base },
  metaDetailsGrid: { flexDirection: 'row', gap: Spacing['3xl'] },
  detailLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginBottom: 2 },
  detailVal: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  actionGrid: { flexDirection: 'row', gap: Spacing.base, marginBottom: Spacing.base },
  actionBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  actionText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: colors.primary },
  itemsCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadow.sm,
    marginBottom: Spacing.base,
  },
  cardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.base },
  itemRow: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderColor: colors.divider },
  itemName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  itemDesc: { fontSize: FontSize.xs, color: colors.textSecondary, fontStyle: 'italic', marginTop: 1 },
  itemMeta: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: colors.textPrimary, alignSelf: 'flex-end', marginTop: -20 },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadow.sm,
    marginBottom: Spacing.base,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalLabel: { fontSize: FontSize.sm, color: colors.textSecondary },
  totalValue: { fontSize: FontSize.sm, color: colors.textPrimary, fontWeight: FontWeight.semibold },
  totalLabelMain: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: colors.textPrimary },
  totalValueMain: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.primary },
  wordsBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.base,
  },
  wordsLabel: { fontSize: FontSize.xs, color: colors.primary, fontWeight: FontWeight.bold },
  wordsText: { fontSize: FontSize.xs, color: colors.primary, fontStyle: 'italic', marginTop: 2 },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.base,
  },
  notesTitle: { fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: FontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  notesText: { fontSize: FontSize.sm, color: colors.textPrimary, lineHeight: 18 },
  paymentButton: { marginTop: Spacing.sm },
});

export default InvoiceDetailScreen;
