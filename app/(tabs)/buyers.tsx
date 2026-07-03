// app/(tabs)/buyers.tsx
import React, { useState } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, Text, TouchableOpacity,
  Modal, Alert, ScrollView,
} from 'react-native';
import { useTabBarHeight } from '../../src/hooks/useTabBarHeight';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Plus, UserPlus, X, ArrowLeft } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { BuyerCard } from '../../src/components/shared/BuyerCard';
import { SearchBar } from '../../src/components/ui/SearchBar';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SkeletonCard } from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/contexts/AuthContext';
import { buyerService } from '../../src/services/database/buyerService';

const buyerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().optional().refine(val => !val || (val.length >= 10 && val.length <= 12), {
    message: 'Mobile must be 10–12 digits',
  }),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  gst: z.string().optional(),
  openingBalance: z.number().nonnegative('Cannot be negative'),
  creditLimit: z.number().nonnegative('Cannot be negative'),
  notes: z.string().optional(),
});

type BuyerFormValues = z.infer<typeof buyerSchema>;

type SortOption = 'name' | 'outstanding' | 'recent';

export default function BuyersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { shopId } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [modalVisible, setModalVisible] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<BuyerFormValues>({
    resolver: zodResolver(buyerSchema),
    defaultValues: {
      name: '', mobile: '', email: '', address: '',
      gst: '', openingBalance: 0, creditLimit: 0, notes: '',
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['buyers', shopId, search, sortBy],
    queryFn: () => buyerService.getAll(shopId || '', { search, sortBy }),
    enabled: !!shopId,
  });

  const createMutation = useMutation({
    mutationFn: (values: BuyerFormValues) =>
      buyerService.create(shopId || '', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setModalVisible(false);
      reset();
      Alert.alert(t('common.success', 'Success'), t('validation.saveSuccess', 'Buyer added successfully!'));
    },
    onError: (error: any) => Alert.alert(t('common.failed', 'Failed'), error.message || t('validation.serverError', 'Could not add buyer. Please try again.')),
  });

  const onSubmit = async (values: BuyerFormValues) => {
    try {
      const duplicate = await buyerService.checkDuplicate(shopId || '', values.name, values.mobile || undefined);
      if (duplicate) {
        Alert.alert(
          t('common.warning', 'Buyer already exists'),
          t('validation.duplicateWarning', 'A buyer with this name or mobile already exists. Use existing?'),
          [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
              text: t('common.yes', 'Use Existing'),
              onPress: () => {
                router.push(`/buyer/${duplicate.id}`);
                setModalVisible(false);
                reset();
              }
            }
          ]
        );
        return;
      }
      createMutation.mutate(values);
    } catch (e) {
      console.error('Error during duplicate check:', e);
      createMutation.mutate(values);
    }
  };

  const SORTS: { label: string; value: SortOption }[] = [
    { label: t('common.sortName', 'Name A–Z'), value: 'name' },
    { label: t('dashboard.outstanding', 'Outstanding'), value: 'outstanding' },
    { label: t('common.recent', 'Recently Added'), value: 'recent' },
  ];

  const tabBarHeight = useTabBarHeight();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backButton} hitSlop={12}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t('buyers.title', 'Buyers')}</Text>
        </View>
        <Text style={styles.subtitle}>{data?.total ?? 0} {t('buyers.title', 'Buyers').toLowerCase()}</Text>
      </View>

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('buyers.searchPlaceholder', 'Search buyers...')}
        />
      </View>

      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {SORTS.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[styles.filterChip, sortBy === s.value && styles.filterChipActive]}
              onPress={() => setSortBy(s.value)}
            >
              <Text style={[styles.filterChipText, sortBy === s.value && styles.filterChipTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BuyerCard
              buyer={item}
              onPress={() => router.push(`/buyer/${item.id}`)}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon={<UserPlus size={36} color={colors.primary} />}
              title={t('buyers.noBuyers', 'No buyers yet')}
              description={t('buyers.addFirstBuyer', 'Add your first buyer to start creating invoices')}
              actionLabel={t('buyers.addBuyer', 'Add Buyer')}
              onAction={() => setModalVisible(true)}
            />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: tabBarHeight - 24 }]} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Add Buyer Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('buyers.addBuyer', 'Add Buyer')}</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); reset(); }}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('buyers.name', 'Buyer Name')}
                    placeholder={t('placeholders.nameExample', 'e.g. Ramesh Patel')}
                    required
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.name?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="mobile"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('buyers.mobile', 'Mobile Number')}
                    placeholder={t('placeholders.mobileExample', 'e.g. 9876543210')}
                    keyboardType="phone-pad"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.mobile?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('buyers.email', 'Email Address')}
                    placeholder={t('placeholders.emailExample', 'e.g. customer@test.com')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.email?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="gst"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('buyers.gst', 'GST Number')}
                    placeholder={t('placeholders.gstExample', 'e.g. 24ABCDE1234F1Z5')}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.gst?.message}
                    autoCapitalize="characters"
                  />
                )}
              />

              <Controller
                control={control}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('buyers.address', 'Address')}
                    placeholder={t('placeholders.addressExample', 'e.g. Ring Road, Surat')}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.address?.message}
                    multiline
                  />
                )}
              />

              <Controller
                control={control}
                name="openingBalance"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={`${t('customers.openingBalance', 'Opening Balance')} (₹)`}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    onBlur={onBlur}
                    onChangeText={(v) => onChange(Number(v) || 0)}
                    value={value === 0 ? '' : String(value)}
                    error={errors.openingBalance?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="notes"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('common.notes', 'Notes')}
                    placeholder={t('placeholders.notesExample', 'e.g. Special requests')}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.notes?.message}
                    multiline
                  />
                )}
              />

              <View style={styles.modalActions}>
                <Button
                  title={t('common.cancel', 'Cancel')}
                  variant="outline"
                  onPress={() => { setModalVisible(false); reset(); }}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title={t('buyers.addBuyer', 'Add Buyer')}
                  onPress={handleSubmit(onSubmit)}
                  loading={createMutation.isPending}
                  style={{ flex: 1 }}
                />
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
  header: { marginTop: Spacing.xl, paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2, marginLeft: 40 },
  searchSection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  filterSection: { marginBottom: Spacing.base },
  filterScroll: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
  },
  listContent: { paddingHorizontal: Spacing.base },
  skeletonList: { paddingHorizontal: Spacing.base },
  fab: {
    position: 'absolute', bottom: 96, right: 16, // overridden at runtime via tabBarHeight
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    ...Shadow.md,
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.base,
    width: '100%',
    minHeight: 450,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: Spacing.base, paddingBottom: Spacing.base,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary },
  modalActions: { flexDirection: 'row', marginTop: Spacing.base, paddingBottom: Spacing.xl },
});
