// src/components/shared/CustomerSearchModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, FlatList, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Plus, X, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../constants/theme';
import { customerService } from '../../services/database/customerService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Customer } from '../../types';
import { CURRENCY_SYMBOL } from '../../constants';

interface CustomerSearchModalProps {
  visible: boolean;
  onClose: () => void;
  shopId: string;
  onSelect: (customer: Customer | { id: string; name: string; isTemp: boolean; mobile?: string; address?: string; gst?: string }) => void;
}

export function CustomerSearchModal({ visible, onClose, shopId, onSelect }: CustomerSearchModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const styles = getStyles(colors);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Form states for quick creation
  const [newName, setNewName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newGst, setNewGst] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query customers from SQLite
  const { data, isLoading } = useQuery({
    queryKey: ['customers-selector-search', shopId, debouncedQuery],
    queryFn: () => customerService.getAll(shopId, { search: debouncedQuery, pageSize: 50 }),
    enabled: visible && !!shopId,
  });

  const customersList = data?.data ?? [];

  const handleSelectCustomer = (customer: Customer) => {
    onSelect(customer);
    onClose();
  };

  const handleContinueWithoutSaving = () => {
    if (!searchQuery.trim()) return;
    onSelect({
      id: `temp-${Date.now()}`,
      name: searchQuery.trim(),
      isTemp: true,
      mobile: '',
      address: '',
      gst: '',
    });
    onClose();
  };

  const triggerQuickCreate = () => {
    setNewName(searchQuery.trim());
    setNewMobile('');
    setNewAddress('');
    setNewGst('');
    setCreateModalVisible(true);
  };

  const handleSaveCustomer = async () => {
    if (!newName.trim()) {
      Alert.alert(t('common.error', 'Error'), t('validation.nameRequired', 'Name is required'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Duplicate prevention check
      const duplicate = await customerService.checkDuplicate(shopId, newName.trim(), newMobile.trim() || undefined);
      if (duplicate) {
        Alert.alert(
          t('common.warning', 'Warning'),
          t('validation.duplicateWarning', 'A customer with this name or mobile already exists. Would you like to select them instead?'),
          [
            { text: t('common.cancel', 'Cancel'), style: 'cancel', onPress: () => setIsSubmitting(false) },
            {
              text: t('common.yes', 'Yes, Select'),
              onPress: () => {
                onSelect(duplicate);
                setCreateModalVisible(false);
                onClose();
              },
            },
          ]
        );
        return;
      }

      // Create new customer
      const created = await customerService.create(shopId, {
        name: newName.trim(),
        mobile: newMobile.trim() || undefined,
        address: newAddress.trim() || undefined,
        gstNumber: newGst.trim() || undefined,
        creditLimit: 0,
        openingBalance: 0,
      });

      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSelect(created);
      setCreateModalVisible(false);
      onClose();
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.failed', 'Failed'), t('common.error', 'Could not create customer.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Search Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton} hitSlop={12}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.searchBarContainer}>
            <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('customers.searchPlaceholder', 'Search customers...')}
              placeholderTextColor={colors.textDisabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List Content */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={customersList}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleSelectCustomer(item)}
              >
                <View style={styles.avatar}>
                  <User size={18} color={colors.primary} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.mobile ? <Text style={styles.itemSub}>{item.mobile}</Text> : null}
                  {item.gstNumber ? <Text style={styles.gstBadge}>{t('customers.gst', 'GST')}: {item.gstNumber}</Text> : null}
                </View>
                {item.outstanding !== 0 ? (
                  <View style={styles.amountContainer}>
                    <Text style={[styles.amount, { color: item.outstanding > 0 ? colors.error : colors.success }]}>
                      {CURRENCY_SYMBOL}{Math.abs(item.outstanding).toFixed(2)}
                    </Text>
                    <Text style={styles.amountLabel}>
                      {item.outstanding > 0 ? t('dashboard.outstanding', 'Due') : t('dashboard.received', 'Cr')}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? t('search.noResults', 'No customer found.') : t('customers.noCustomers', 'No customers yet')}
                </Text>
                {searchQuery.trim().length > 0 && (
                  <View style={styles.emptyActions}>
                    <TouchableOpacity style={styles.emptyActionButton} onPress={triggerQuickCreate}>
                      <Plus size={18} color="#FFFFFF" style={{ marginRight: Spacing.xs }} />
                      <Text style={styles.emptyActionText}>
                        {t('customers.addCustomer', 'Create New Customer')}: "{searchQuery}"
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.emptyActionButton, styles.continueBtn]} onPress={handleContinueWithoutSaving}>
                      <Text style={[styles.emptyActionText, { color: colors.primary }]}>
                        {t('common.continueWithoutSaving', 'Continue Without Saving')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            }
          />
        )}

        {/* Floating Add Button */}
        {searchQuery.trim().length === 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={triggerQuickCreate}
            activeOpacity={0.8}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Lightweight Quick Creation Dialog */}
        <Modal
          visible={createModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.dialogOverlay}
            activeOpacity={1}
            onPress={() => setCreateModalVisible(false)}
          >
            <View
              style={styles.dialogCard}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.dialogHeader}>
                <Text style={styles.dialogTitle}>{t('customers.addCustomer', 'Quick Add Customer')}</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)} hitSlop={8}>
                  <X size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogForm}>
                <Input
                  label={t('customers.name', 'Customer Name *')}
                  placeholder={t('placeholders.nameExample', 'e.g. Ramesh Patel')}
                  value={newName}
                  onChangeText={setNewName}
                  required
                />
                <Input
                  label={t('customers.mobile', 'Mobile Number (Optional)')}
                  placeholder={t('placeholders.mobileExample', 'e.g. 9876543210')}
                  value={newMobile}
                  onChangeText={setNewMobile}
                  keyboardType="phone-pad"
                />
                <Input
                  label={t('customers.gst', 'GST Number (Optional)')}
                  placeholder={t('placeholders.gstExample', 'e.g. 24ABCDE1234F1Z5')}
                  value={newGst}
                  onChangeText={setNewGst}
                  autoCapitalize="characters"
                />
                <Input
                  label={t('customers.address', 'Address (Optional)')}
                  placeholder={t('placeholders.addressExample', 'e.g. Ring Road, Surat')}
                  value={newAddress}
                  onChangeText={setNewAddress}
                  multiline
                />

                <Button
                  title={t('common.save', 'Save & Select')}
                  loading={isSubmitting}
                  onPress={handleSaveCustomer}
                  style={{ marginTop: Spacing.md }}
                />
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...Shadow.sm,
  },
  backButton: { marginRight: Spacing.sm },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchIcon: { marginRight: Spacing.xs },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    padding: 0,
  },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  itemSub: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
  gstBadge: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amountContainer: { alignItems: 'flex-end' },
  amount: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  amountLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  emptyContainer: { padding: Spacing.xl, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textSecondary, textAlign: 'center' },
  emptyActions: { marginTop: Spacing.lg, width: '100%', alignItems: 'center' },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    width: '100%',
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  continueBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyActionText: { color: '#FFFFFF', fontWeight: FontWeight.bold, fontSize: FontSize.base },
  fab: {
    position: 'absolute',
    right: Spacing.xl,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.md,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  dialogCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '80%',
    ...Shadow.lg,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dialogTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textPrimary },
  dialogForm: { paddingBottom: Spacing.lg },
});
