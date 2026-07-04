// app/payments/record.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, FlatList, Platform, TextInput } from 'react-native';
import { useSafeAreaBottomPadding } from '../../src/hooks/useTabBarHeight';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, X } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useAuth } from '../../src/contexts/AuthContext';
import { customerService } from '../../src/services/database/customerService';
import { invoiceService } from '../../src/services/database/invoiceService';
import { paymentService } from '../../src/services/database/paymentService';
import { PAYMENT_METHODS } from '../../src/constants';
import type { PaymentMethod } from '../../src/types';

const recordPaymentSchema = z.object({
  customerId: z.string().min(1, 'Customer selection is required'),
  amount: z.number().gt(0, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  method: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  invoiceId: z.string().optional(),
});

type RecordPaymentFormValues = z.infer<typeof recordPaymentSchema>;

export function RecordPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    customerId?: string;
    customerName?: string;
    invoiceId?: string;
    invoiceNumber?: string;
    amount?: string;
  }>();

  const { shopId } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [selectedCustName, setSelectedCustName] = useState(params.customerName || '');
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState(params.invoiceNumber || '');

  // Typing customer state variables
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; isTemp?: boolean; mobile?: string; address?: string } | null>(
    params.customerId ? { id: params.customerId, name: params.customerName || '' } : null
  );
  const [customerSearchQuery, setCustomerSearchQuery] = useState(params.customerName || '');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  const { data: allCustomers } = useQuery({
    queryKey: ['customers-all', shopId],
    queryFn: () => customerService.getAll(shopId || '', { pageSize: 1000 }),
    enabled: !!shopId,
  });

  const filteredCustomers = (allCustomers?.data || []).filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())
  ).slice(0, 8);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      customerId: params.customerId || '',
      amount: params.amount ? Number(params.amount) : 0,
      date: new Date().toISOString().split('T')[0],
      method: 'cash',
      reference: '',
      notes: '',
      invoiceId: params.invoiceId || '',
    },
  });

  const selectedCustomerId = watch('customerId');



  // Load customer pending invoices
  const { data: invoices } = useQuery({
    queryKey: ['customer-pending-invoices', shopId, selectedCustomerId],
    queryFn: () => invoiceService.getAll(shopId || '', {
      customerId: selectedCustomerId,
      status: 'pending',
    }),
    enabled: !!shopId && !!selectedCustomerId,
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: RecordPaymentFormValues) => {
      let finalCustomerId = data.customerId;
      let finalCustomerName = selectedCustName;

      // Save temporary customer in background first if selectedCustomer.isTemp is true
      if (selectedCustomer?.isTemp) {
        const created = await customerService.create(shopId || '', {
          name: selectedCustomer.name,
          mobile: selectedCustomer.mobile || undefined,
          address: selectedCustomer.address || undefined,
          creditLimit: 0,
          openingBalance: 0,
          notes: `Created via Record Payment`
        });
        finalCustomerId = created.id;
        finalCustomerName = created.name;
      }

      // 1. Create payment entry
      const p = await paymentService.create(shopId || '', {
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        invoiceId: data.invoiceId || undefined,
        invoiceNumber: selectedInvoiceNumber || undefined,
        amount: data.amount,
        date: data.date,
        method: data.method as PaymentMethod,
        reference: data.reference || undefined,
        notes: data.notes || undefined,
      });

      // 2. Link payment to invoice if applicable
      if (data.invoiceId) {
        await invoiceService.addPayment(shopId || '', data.invoiceId, data.amount);
      }
      return p;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      Alert.alert(t('common.success', 'Success'), t('validation.saveSuccess', 'Payment recorded successfully!'), [
        { text: t('common.ok', 'OK'), onPress: () => router.back() }
      ]);
    },
    onError: () => {
      Alert.alert(t('common.failed', 'Failed'), t('validation.serverError', 'Failed to record payment.'));
    },
  });

  const selectCustomerObj = (cust: { id: string; name: string; isTemp?: boolean; mobile?: string; address?: string }) => {
    setValue('customerId', cust.id);
    setSelectedCustName(cust.name);
    setSelectedCustomer(cust);
    setCustomerSearchQuery(cust.name);
    setCustomerDropdownOpen(false);
    // Reset invoice selection when customer changes
    setValue('invoiceId', '');
    setSelectedInvoiceNumber('');
  };

  const clearCustomer = () => {
    setValue('customerId', '');
    setSelectedCustName('');
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
    // Reset invoice selection
    setValue('invoiceId', '');
    setSelectedInvoiceNumber('');
  };

  const selectInvoice = (id: string, num: string) => {
    setValue('invoiceId', id);
    setSelectedInvoiceNumber(num);
    setInvoiceModalVisible(false);
  };

  const bottomPadding = useSafeAreaBottomPadding(Spacing.base);
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('payments.recordPayment', 'Record Payment')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]} keyboardShouldPersistTaps="handled">

        {/* Customer typed search input */}
        <View style={{ zIndex: customerDropdownOpen ? 1000 : 10, position: 'relative', marginBottom: Spacing.base }}>
          <Text style={styles.selectorLabel}>{t('payments.customer', 'Received From Customer *')}</Text>
          <View style={[styles.selectorInputContainer, errors.customerId && { borderColor: colors.error }]}>
            <TextInput
              style={styles.selectorTextInput}
              placeholder={t('invoices.selectCustomer', 'Type customer name...')}
              placeholderTextColor={colors.textDisabled}
              value={customerSearchQuery}
              onFocus={() => setCustomerDropdownOpen(true)}
              onBlur={() => { setTimeout(() => setCustomerDropdownOpen(false), 200); }}
              onChangeText={(text) => {
                setCustomerSearchQuery(text);
                setCustomerDropdownOpen(true);
                if (text.trim() === '') {
                  clearCustomer();
                } else {
                  const match = allCustomers?.data.find(c => c.name.toLowerCase() === text.trim().toLowerCase());
                  if (match) {
                    setSelectedCustomer(match as any);
                    setSelectedCustName(match.name);
                    setValue('customerId', match.id);
                    setValue('invoiceId', '');
                    setSelectedInvoiceNumber('');
                  } else {
                    const tempId = `temp-${Date.now()}`;
                    setSelectedCustomer({ id: tempId, name: text.trim(), isTemp: true });
                    setSelectedCustName(text.trim());
                    setValue('customerId', tempId);
                    setValue('invoiceId', '');
                    setSelectedInvoiceNumber('');
                  }
                }
              }}
            />
            {selectedCustomer && (
              <TouchableOpacity onPress={clearCustomer}>
                <X size={16} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
          {errors.customerId && <Text style={styles.errorText}>{errors.customerId.message}</Text>}

          {/* Customer Dropdown */}
          {customerDropdownOpen && filteredCustomers.length > 0 && (
            <View style={styles.dropdownContainer}>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                {filteredCustomers.map((cust) => (
                  <TouchableOpacity
                    key={cust.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      selectCustomerObj(cust as any);
                    }}
                  >
                    <Text style={styles.dropdownItemName}>{cust.name}</Text>
                    {cust.mobile ? <Text style={styles.dropdownItemSub}>{cust.mobile}</Text> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* New Customer extra details if typed a new name */}
          {selectedCustomer?.isTemp && (
            <View style={styles.tempDetailsContainer}>
              <Text style={styles.tempDetailsTitle}>{t('invoices.newCustomerDetails', 'New Customer Details (Optional)')}</Text>
              <TextInput
                style={styles.tempInput}
                placeholder={t('customers.mobile', 'Mobile')}
                placeholderTextColor={colors.textDisabled}
                value={selectedCustomer.mobile || ''}
                onChangeText={(text) => setSelectedCustomer(prev => prev ? { ...prev, mobile: text } : null)}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.tempInput}
                placeholder={t('customers.address', 'Address')}
                placeholderTextColor={colors.textDisabled}
                value={selectedCustomer.address || ''}
                onChangeText={(text) => setSelectedCustomer(prev => prev ? { ...prev, address: text } : null)}
              />
            </View>
          )}
        </View>

        {/* Invoice Link selection (Optional) */}
        {selectedCustomerId !== '' && (
          <TouchableOpacity
            style={styles.selectorCard}
            onPress={() => setInvoiceModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.selectorLabel}>{t('payments.invoice', 'Link to Invoice')} ({t('common.optional', 'Optional')})</Text>
            <Text style={[styles.selectorValue, !selectedInvoiceNumber && { color: colors.textDisabled }]}>
              {selectedInvoiceNumber || t('placeholders.selectInvoice', 'Select Invoice')}
            </Text>
          </TouchableOpacity>
        )}

        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('payments.amount', 'Payment Amount (₹)')}
              placeholder="0.00"
              required
              keyboardType="numeric"
              onBlur={onBlur}
              onChangeText={text => onChange(text === '' ? 0 : Number(text))}
              value={value === 0 ? '' : String(value)}
              error={errors.amount?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="date"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('payments.date', 'Payment Date')}
              placeholder={t('placeholders.datePattern', 'YYYY-MM-DD')}
              required
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.date?.message}
            />
          )}
        />

        {/* Payment Methods Choice Grid */}
        <View style={{ marginBottom: Spacing.base }}>
          <Text style={styles.inputLabel}>{t('payments.method', 'Payment Method')} *</Text>
          <Controller
            control={control}
            name="method"
            render={({ field: { onChange, value } }) => (
              <View style={styles.methodsGrid}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.methodBadge, value === m.value && styles.methodBadgeActive]}
                    onPress={() => onChange(m.value)}
                  >
                    <Text style={[styles.methodText, value === m.value && styles.methodTextActive]}>
                      {t(`payments.methods.${m.value}`, m.label)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </View>

        <Controller
          control={control}
          name="reference"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('payments.reference', 'Reference / UTR Number')}
              placeholder={t('placeholders.referenceExample', 'e.g. UPI Transaction ID / Cheque No.')}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.reference?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('payments.notes', 'Notes')}
              placeholder={t('placeholders.remarks', 'Remarks...')}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.notes?.message}
              multiline
            />
          )}
        />

        <Button
          title={t('payments.recordPayment', 'Save Receipt')}
          loading={recordPaymentMutation.isPending}
          onPress={handleSubmit(d => recordPaymentMutation.mutate(d))}
          style={styles.saveButton}
        />
      </ScrollView>

      {/* Invoice Link modal */}
      <Modal visible={invoiceModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('invoices.selectInvoice', 'Select Invoice to Link')}</Text>
              <TouchableOpacity onPress={() => setInvoiceModalVisible(false)}>
                <X size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={invoices?.data ?? []}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerSelectItem}
                  onPress={() => selectInvoice(item.id, item.invoiceNumber)}
                >
                  <Text style={styles.customerSelectName}>{item.invoiceNumber}</Text>
                  <Text style={styles.customerSelectMobile}>{t('dashboard.outstanding', 'Outstanding')}: ₹{item.pendingAmount}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ padding: Spacing.base }}
              ListEmptyComponent={
                <View style={styles.emptyItemsCard}>
                  <Text style={styles.emptyItemsText}>{t('invoices.noInvoices', 'No pending invoices found for this customer.')}</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  scrollContent: { padding: Spacing.base },
  selectorCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  selectorCardError: { borderColor: colors.error },
  selectorLabel: { fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: FontWeight.medium, marginBottom: 4 },
  selectorValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  errorText: { fontSize: FontSize.xs, color: colors.error, marginTop: 4 },
  inputLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: colors.textPrimary, marginBottom: 8 },
  methodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  methodBadge: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  methodBadgeActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  methodText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: colors.textSecondary },
  methodTextActive: { color: colors.primary },
  saveButton: { marginTop: Spacing.base },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, borderBottomWidth: 1, borderColor: colors.border },
  modalTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },
  customerSelectItem: { paddingVertical: Spacing.base, borderBottomWidth: 1, borderColor: colors.divider },
  customerSelectName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  customerSelectMobile: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  emptyItemsCard: { padding: Spacing.xl, alignItems: 'center' },
  emptyItemsText: { color: colors.textSecondary, fontSize: FontSize.sm },
  selectorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.sm,
    height: 48,
  },
  selectorTextInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    height: '100%',
    padding: 0,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 9999,
    ...Shadow.md,
  },
  dropdownItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
  },
  dropdownItemSub: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tempDetailsContainer: {
    backgroundColor: colors.surfaceVariant || colors.background,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: Spacing.sm,
  },
  tempDetailsTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: colors.primary,
    marginBottom: 4,
  },
  tempInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    height: 40,
    color: colors.textPrimary,
    fontSize: FontSize.sm,
  },
});
export default RecordPaymentScreen;
