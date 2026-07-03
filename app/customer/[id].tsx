// app/customer/[id].tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useSafeAreaBottomPadding } from '../../src/hooks/useTabBarHeight';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Phone, Mail, MapPin, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { customerService } from '../../src/services/database/customerService';
import { invoiceService } from '../../src/services/database/invoiceService';
import { paymentService } from '../../src/services/database/paymentService';
import { useAuth } from '../../src/contexts/AuthContext';
import { InvoiceCard } from '../../src/components/shared/InvoiceCard';
import { PaymentCard } from '../../src/components/shared/PaymentCard';
import { CURRENCY_SYMBOL } from '../../src/constants';

export function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { shopId } = useAuth();
  const { colors } = useTheme();
  const bottomPadding = useSafeAreaBottomPadding(Spacing.base);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  const { data: customer, isLoading: custLoading } = useQuery({
    queryKey: ['customer', shopId, id],
    queryFn: () => customerService.getById(shopId || '', id || ''),
    enabled: !!shopId && !!id,
  });

  const { data: invoices } = useQuery({
    queryKey: ['customer-invoices', shopId, id],
    queryFn: () => invoiceService.getAll(shopId || '', { customerId: id }),
    enabled: !!shopId && !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ['customer-payments', shopId, id],
    queryFn: () => paymentService.getAll(shopId || '', { customerId: id }),
    enabled: !!shopId && !!id,
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: () => customerService.delete(shopId || '', id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      router.back();
      Alert.alert(t('common.success', 'Success'), t('validation.deleteSuccess', 'Customer deleted successfully!'));
    },
    onError: () => {
      Alert.alert(t('common.failed', 'Failed'), t('customers.deleteFailedActive', 'Cannot delete customer as they have active transactions.'));
    },
  });

  const handleDelete = () => {
    Alert.alert(
      t('customers.deleteCustomer', 'Delete Customer'),
      t('customers.deleteConfirm', 'Are you sure you want to delete this customer?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('common.delete', 'Delete'), style: 'destructive', onPress: () => deleteCustomerMutation.mutate() },
      ]
    );
  };

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  const styles = getStyles(colors);

  if (custLoading || !customer) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: colors.textPrimary }}>{t('common.loading', 'Loading details...')}</Text>
      </View>
    );
  }

  const outstanding = customer.outstanding;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('customers.customerDetails', 'Customer Details')}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Trash2 size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}>
        {/* Customer Profile Head Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(customer.name)}</Text>
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>

          {customer.gstNumber && (
            <Text style={styles.gstText}>GST: {customer.gstNumber}</Text>
          )}

          <View style={styles.contactRow}>
            {customer.mobile && (
              <View style={styles.contactItem}>
                <Phone size={14} color={colors.textSecondary} />
                <Text style={styles.contactText}>{customer.mobile}</Text>
              </View>
            )}
            {customer.email && (
              <View style={styles.contactItem}>
                <Mail size={14} color={colors.textSecondary} />
                <Text style={styles.contactText}>{customer.email}</Text>
              </View>
            )}
          </View>

          {customer.address && (
            <View style={styles.addressRow}>
              <MapPin size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <Text style={styles.addressText}>{customer.address}</Text>
            </View>
          )}
        </View>

        {/* Financial Overview Metrics */}
        <View style={styles.statsCard}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{CURRENCY_SYMBOL}{customer.totalBilled.toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>{t('customers.totalBilled', 'Billed')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{CURRENCY_SYMBOL}{customer.totalPaid.toLocaleString('en-IN')}</Text>
            <Text style={styles.statLabel}>{t('customers.totalPaid', 'Paid')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: outstanding > 0 ? colors.error : colors.success }]}>
              {CURRENCY_SYMBOL}{outstanding.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>{t('customers.outstanding', 'Outstanding')}</Text>
          </View>
        </View>

        {/* Segmented Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'invoices' && styles.tabActive]}
            onPress={() => setActiveTab('invoices')}
          >
            <Text style={[styles.tabText, activeTab === 'invoices' && styles.tabTextActive]}>
              {t('customers.invoices', 'Invoices')} ({invoices?.data?.length ?? 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'payments' && styles.tabActive]}
            onPress={() => setActiveTab('payments')}
          >
            <Text style={[styles.tabText, activeTab === 'payments' && styles.tabTextActive]}>
              {t('customers.payments', 'Payments')} ({payments?.data?.length ?? 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab content listings */}
        <View style={styles.tabContent}>
          {activeTab === 'invoices' ? (
            invoices?.data && invoices.data.length > 0 ? (
              invoices.data.map(item => (
                <InvoiceCard
                  key={item.id}
                  invoice={item}
                  onPress={() => router.push(`/invoice/${item.id}`)}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('invoices.noInvoices', 'No invoices found')}</Text>
              </View>
            )
          ) : (
            payments?.data && payments.data.length > 0 ? (
              payments.data.map(item => (
                <PaymentCard
                  key={item.id}
                  payment={item}
                  onPress={() => router.push('/payments')}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('payments.noPayments', 'No payments found')}</Text>
              </View>
            )
          )}
        </View>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },
  deleteButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.base },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadow.sm,
    marginBottom: Spacing.base,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  customerName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary, marginBottom: 4 },
  gstText: { fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 8 },
  contactRow: { flexDirection: 'row', gap: Spacing.base, marginVertical: Spacing.sm },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  contactText: { fontSize: FontSize.sm, color: colors.textSecondary },
  addressRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.sm, paddingHorizontal: Spacing.md },
  addressText: { fontSize: FontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: Spacing.base,
    ...Shadow.sm,
    marginBottom: Spacing.lg,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: colors.border },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.base,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: FontSize.sm, color: colors.textSecondary, fontWeight: FontWeight.semibold },
  tabTextActive: { color: '#FFFFFF' },
  tabContent: { gap: Spacing.sm },
  emptyContainer: {
    backgroundColor: colors.surface,
    padding: Spacing.xl,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textSecondary, fontSize: FontSize.sm },
});

export default CustomerDetailsScreen;
