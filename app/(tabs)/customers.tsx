// app/(tabs)/customers.tsx
import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { useTabBarHeight } from '../../src/hooks/useTabBarHeight';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Plus, UserPlus, X } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { CustomerCard } from '../../src/components/shared/CustomerCard';
import { SearchBar } from '../../src/components/ui/SearchBar';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/contexts/AuthContext';
import { customerService } from '../../src/services/database/customerService';

const customerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  mobile: z.string().optional().refine(val => !val || (val.length >= 10 && val.length <= 12), {
    message: 'Mobile number must be between 10 to 12 digits',
  }),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  gst: z.string().optional(),
  openingBalance: z.number().nonnegative('Opening balance must be 0 or greater'),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function CustomersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { shopId } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: '', mobile: '', email: '', address: '', gst: '', openingBalance: 0 },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', shopId, search],
    queryFn: () => customerService.getAll(shopId || '', { search }),
    enabled: !!shopId,
  });

  const createCustomerMutation = useMutation({
    mutationFn: (newCust: Omit<CustomerFormValues, 'openingBalance'> & { openingBalance: number }) =>
      customerService.create(shopId || '', {
        name: newCust.name,
        mobile: newCust.mobile,
        email: newCust.email,
        address: newCust.address,
        gstNumber: newCust.gst, // map gst from form schema to gstNumber in Database
        openingBalance: newCust.openingBalance,
        creditLimit: 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setModalVisible(false);
      reset();
      Alert.alert(t('common.success', 'Success'), t('customers.addSuccess', 'Customer added successfully!'));
    },
    onError: (err) => {
      console.error('Error creating customer:', err);
      Alert.alert(t('common.failed', 'Failed'), `${t('common.error', 'Could not add customer')}: ${(err as Error).message}`);
    },
  });

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      const duplicate = await customerService.checkDuplicate(shopId || '', values.name, values.mobile || undefined);
      if (duplicate) {
        Alert.alert(
          t('common.warning', 'Customer already exists'),
          t('validation.duplicateWarning', 'A customer with this name or mobile already exists. Use existing?'),
          [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
              text: t('common.yes', 'Use Existing'),
              onPress: () => {
                router.push(`/customer/${duplicate.id}`);
                setModalVisible(false);
                reset();
              }
            }
          ]
        );
        return;
      }
      createCustomerMutation.mutate(values);
    } catch (e) {
      console.error('Error during duplicate check:', e);
      // Fallback to mutate directly if check fails
      createCustomerMutation.mutate(values);
    }
  };

  const tabBarHeight = useTabBarHeight();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('customers.title', 'Customers')}</Text>
      </View>

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('customers.searchPlaceholder', 'Search customers...')}
        />
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            onPress={() => router.push(`/customer/${item.id}`)}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<UserPlus size={36} color={colors.primary} />}
              title={t('customers.noCustomers', 'No customers yet')}
              description={t('customers.addFirstCustomer', 'Add your first customer to get started')}
              actionLabel={t('customers.addCustomer', 'Add Customer')}
              onAction={() => setModalVisible(true)}
            />
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight - 24 }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Add Customer Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('customers.addCustomer', 'Add Customer')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('customers.name', 'Customer Name')}
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
                    label={t('customers.mobile', 'Mobile Number')}
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
                    label={t('customers.email', 'Email Address')}
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
                    label={t('customers.gst', 'GST Number')}
                    placeholder={t('placeholders.gstExample', 'e.g. 24ABCDE1234F1Z5')}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    error={errors.gst?.message}
                  />
                )}
              />

              <Controller
                control={control}
                name="address"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('customers.address', 'Address')}
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
                    label={t('customers.openingBalance', 'Opening Balance (₹)')}
                    placeholder={t('placeholders.balanceExample', 'e.g. 5000')}
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={text => onChange(text === '' ? 0 : Number(text))}
                    value={value === 0 ? '' : String(value)}
                    error={errors.openingBalance?.message}
                  />
                )}
              />

              <Button
                title={t('common.save', 'Save')}
                loading={createCustomerMutation.isPending}
                onPress={handleSubmit(onSubmit)}
                style={styles.modalSubmit}
              />
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
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary },
  searchSection: { paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  listContent: { paddingHorizontal: Spacing.base },
  fab: {
    position: 'absolute',
    bottom: 96, // overridden at runtime via tabBarHeight
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.md,
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    width: '100%',
    minHeight: 450,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  modalForm: {
    padding: Spacing.base,
  },
  modalSubmit: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
});
