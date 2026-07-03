// app/buyer/[id].tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, RefreshControl,
} from 'react-native';
import { useSafeAreaBottomPadding } from '../../src/hooks/useTabBarHeight';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Phone, Mail, MapPin, Building2, Edit2, Trash2, X, FileText, Receipt,
} from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { InvoiceCard } from '../../src/components/shared/InvoiceCard';
import { PaymentCard } from '../../src/components/shared/PaymentCard';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { SkeletonCard } from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/contexts/AuthContext';
import { buyerService } from '../../src/services/database/buyerService';
import { invoiceService } from '../../src/services/database/invoiceService';
import { paymentService } from '../../src/services/database/paymentService';
import { CURRENCY_SYMBOL } from '../../src/constants';

const editSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  mobile: z.string().optional().refine(val => !val || val.length >= 10, { message: 'Invalid mobile' }),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  gst: z.string().optional(),
  notes: z.string().optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

type Tab = 'invoices' | 'payments';

export default function BuyerProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shopId } = useAuth();
  const { colors } = useTheme();
  const bottomPadding = useSafeAreaBottomPadding(Spacing.base);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('invoices');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: buyer, isLoading, refetch } = useQuery({
    queryKey: ['buyer', shopId, id],
    queryFn: () => buyerService.getById(shopId || '', id || ''),
    enabled: !!shopId && !!id,
  });

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['buyer-invoices', shopId, id],
    queryFn: () => invoiceService.getAll(shopId || '', { buyerId: id }),
    enabled: !!shopId && !!id,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['buyer-payments', shopId, id],
    queryFn: () => paymentService.getAll(shopId || '', { customerId: id }),
    enabled: !!shopId && !!id,
  });

  const { control, handleSubmit, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: {
      name: buyer?.name ?? '',
      mobile: buyer?.mobile ?? '',
      email: buyer?.email ?? '',
      address: buyer?.address ?? '',
      gst: buyer?.gst ?? '',
      notes: buyer?.notes ?? '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: EditFormValues) => buyerService.update(shopId || '', id || '', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer'] });
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      setEditModalVisible(false);
    },
    onError: () => Alert.alert(t('common.failed', 'Failed'), t('validation.serverError', 'Could not update buyer.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => buyerService.delete(shopId || '', id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      router.back();
    },
    onError: () => Alert.alert(t('common.failed', 'Failed'), t('buyers.deleteFailedActive', 'Could not delete buyer. Buyer may have active invoices.')),
  });

  const handleDelete = () => {
    Alert.alert(
      t('buyers.deleteBuyer', 'Delete Buyer'),
      t('buyers.deleteConfirm', 'Are you sure you want to delete this buyer? This cannot be undone.'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('common.delete', 'Delete'), style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const styles = getStyles(colors);

  if (isLoading || !buyer) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: Spacing.base }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{t('buyers.buyerDetails', 'Buyer Profile')}</Text>
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setEditModalVisible(true)}>
            <Edit2 size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleDelete}>
            <Trash2 size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Name Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{buyer.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.buyerName}>{buyer.name}</Text>
          {buyer.mobile ? (
            <View style={styles.infoRow}>
              <Phone size={14} color={colors.textSecondary} />
              <Text style={styles.infoText}>{buyer.mobile}</Text>
            </View>
          ) : null}
          {buyer.email ? (
            <View style={styles.infoRow}>
              <Mail size={14} color={colors.textSecondary} />
              <Text style={styles.infoText}>{buyer.email}</Text>
            </View>
          ) : null}
          {buyer.address ? (
            <View style={styles.infoRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.infoText}>{buyer.address}</Text>
            </View>
          ) : null}
          {buyer.gst ? (
            <View style={styles.infoRow}>
              <Building2 size={14} color={colors.textSecondary} />
              <Text style={styles.infoText}>GSTIN: {buyer.gst}</Text>
            </View>
          ) : null}
        </View>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{CURRENCY_SYMBOL}{(buyer.totalBilled ?? 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>{t('customers.totalBilled', 'Total Billed')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>{CURRENCY_SYMBOL}{(buyer.totalPaid ?? 0).toFixed(0)}</Text>
            <Text style={styles.statLabel}>{t('customers.totalPaid', 'Total Paid')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: (buyer.outstanding ?? 0) > 0 ? colors.error : colors.success }]}>
              {CURRENCY_SYMBOL}{(buyer.outstanding ?? 0).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>{t('customers.outstanding', 'Outstanding')}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['invoices', 'payments'] as Tab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              {tab === 'invoices'
                ? <FileText size={16} color={activeTab === tab ? colors.primary : colors.textSecondary} />
                : <Receipt size={16} color={activeTab === tab ? colors.primary : colors.textSecondary} />}
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'invoices' ? t('customers.invoices', 'Invoices') : t('customers.payments', 'Payments')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={{ paddingHorizontal: Spacing.base, paddingBottom: bottomPadding }}>
          {activeTab === 'invoices' ? (
            invoicesLoading ? <SkeletonCard /> :
            invoices?.data.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t('invoices.noInvoices', 'No invoices for this buyer yet')}</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/invoice/create')}>
                  <Text style={styles.createBtnText}>{t('invoices.createInvoice', 'Create Invoice')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              invoices?.data.map(inv => (
                <InvoiceCard key={inv.id} invoice={inv} onPress={() => router.push(`/invoice/${inv.id}`)} />
              ))
            )
          ) : (
            paymentsLoading ? <SkeletonCard /> :
            payments?.data.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{t('payments.noPayments', 'No payments recorded yet')}</Text>
              </View>
            ) : (
              payments?.data.map(p => (
                <PaymentCard key={p.id} payment={p} onPress={() => {}} />
              ))
            )
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('buyers.editBuyer', 'Edit Buyer')}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Controller control={control} name="name" render={({ field }) => (
                <Input label={`${t('buyers.name', 'Name')} *`} value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
              )} />
              <Controller control={control} name="mobile" render={({ field }) => (
                <Input label={t('register.mobile', 'Mobile')} value={field.value ?? ''} onChangeText={field.onChange} keyboardType="phone-pad" />
              )} />
              <Controller control={control} name="email" render={({ field }) => (
                <Input label={t('auth.email', 'Email')} value={field.value ?? ''} onChangeText={field.onChange} keyboardType="email-address" />
              )} />
              <Controller control={control} name="address" render={({ field }) => (
                <Input label={t('register.address', 'Address')} value={field.value ?? ''} onChangeText={field.onChange} multiline numberOfLines={2} />
              )} />
              <Controller control={control} name="gst" render={({ field }) => (
                <Input label={t('register.gst', 'GST Number')} value={field.value ?? ''} onChangeText={field.onChange} autoCapitalize="characters" />
              )} />
              <Controller control={control} name="notes" render={({ field }) => (
                <Input label={t('payments.notes', 'Notes')} value={field.value ?? ''} onChangeText={field.onChange} multiline numberOfLines={2} />
              )} />
              <View style={styles.modalActions}>
                <Button title={t('common.cancel', 'Cancel')} variant="outline" onPress={() => setEditModalVisible(false)} style={{ flex: 1, marginRight: 8 }} />
                <Button title={t('common.save', 'Save Changes')} onPress={handleSubmit(v => updateMutation.mutate(v))} loading={updateMutation.isPending} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Spacing.xl, paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  topTitle: { flex: 1, fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary, marginHorizontal: Spacing.sm },
  topActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    padding: 8, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  profileCard: {
    backgroundColor: colors.surface, margin: Spacing.base,
    borderRadius: BorderRadius.lg, padding: Spacing.xl, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, ...Shadow.sm,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  avatarText: { fontSize: 28, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  buyerName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary, marginBottom: Spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  infoText: { fontSize: FontSize.sm, color: colors.textSecondary },
  statsRow: {
    flexDirection: 'row', paddingHorizontal: Spacing.base, gap: Spacing.sm, marginBottom: Spacing.base,
  },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: colors.border, padding: Spacing.base,
    alignItems: 'center', ...Shadow.sm,
  },
  statValue: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  tabs: {
    flexDirection: 'row', marginHorizontal: Spacing.base, marginBottom: Spacing.base,
    backgroundColor: colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
  },
  tabActive: { backgroundColor: colors.primaryLight },
  tabText: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: FontWeight.semibold },
  emptyBox: {
    alignItems: 'center', padding: Spacing.xl,
    backgroundColor: colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyText: { color: colors.textSecondary, fontSize: FontSize.sm },
  createBtn: { marginTop: Spacing.base, backgroundColor: colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.base, paddingVertical: 10 },
  createBtnText: { color: '#FFFFFF', fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl, padding: Spacing.base, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.base, paddingBottom: Spacing.base,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary },
  modalActions: { flexDirection: 'row', marginTop: Spacing.base, paddingBottom: Spacing.xl },
});
