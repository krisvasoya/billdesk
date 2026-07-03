// src/components/shared/BuyerSearchModal.tsx
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
import { buyerService } from '../../services/database/buyerService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Buyer } from '../../types';

interface BuyerSearchModalProps {
  visible: boolean;
  onClose: () => void;
  shopId: string;
  onSelect: (buyer: Buyer | { id: string; name: string; isTemp: boolean; mobile?: string; address?: string; email?: string }) => void;
}

export function BuyerSearchModal({ visible, onClose, shopId, onSelect }: BuyerSearchModalProps) {
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
  const [newEmail, setNewEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query buyers from SQLite
  const { data, isLoading } = useQuery({
    queryKey: ['buyers-selector-search', shopId, debouncedQuery],
    queryFn: () => buyerService.getAll(shopId, { search: debouncedQuery, pageSize: 50 }),
    enabled: visible && !!shopId,
  });

  const buyersList = data?.data ?? [];

  const handleSelectBuyer = (buyer: Buyer) => {
    onSelect(buyer);
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
      email: '',
    });
    onClose();
  };

  const triggerQuickCreate = () => {
    setNewName(searchQuery.trim());
    setNewMobile('');
    setNewAddress('');
    setNewEmail('');
    setCreateModalVisible(true);
  };

  const handleSaveBuyer = async () => {
    if (!newName.trim()) {
      Alert.alert(t('common.error', 'Error'), t('validation.nameRequired', 'Name is required'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Duplicate prevention check
      const duplicate = await buyerService.checkDuplicate(shopId, newName.trim(), newMobile.trim() || undefined);
      if (duplicate) {
        Alert.alert(
          t('common.warning', 'Warning'),
          t('validation.duplicateWarning', 'A buyer with this name or mobile already exists. Would you like to select them instead?'),
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

      // Create new buyer
      const created = await buyerService.create(shopId, {
        name: newName.trim(),
        mobile: newMobile.trim() || undefined,
        address: newAddress.trim() || undefined,
        email: newEmail.trim() || undefined,
        openingBalance: 0,
        creditLimit: 0,
      });

      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      onSelect(created);
      setCreateModalVisible(false);
      onClose();
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.failed', 'Failed'), t('common.error', 'Could not create buyer.'));
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
              placeholder={t('buyers.searchPlaceholder', 'Search buyers...')}
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
            data={buyersList}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleSelectBuyer(item)}
              >
                <View style={styles.avatar}>
                  <User size={18} color={colors.primary} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.mobile ? <Text style={styles.itemSub}>{item.mobile}</Text> : null}
                  {item.address ? <Text style={styles.itemSub}>{item.address}</Text> : null}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? t('search.noResults', 'No buyer found.') : t('buyers.noBuyers', 'No buyers yet')}
                </Text>
                {searchQuery.trim().length > 0 && (
                  <View style={styles.emptyActions}>
                    <TouchableOpacity style={styles.emptyActionButton} onPress={triggerQuickCreate}>
                      <Plus size={18} color="#FFFFFF" style={{ marginRight: Spacing.xs }} />
                      <Text style={styles.emptyActionText}>
                        {t('buyers.addBuyer', 'Create New Buyer')}: "{searchQuery}"
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
                <Text style={styles.dialogTitle}>{t('buyers.addBuyer', 'Quick Add Buyer')}</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)} hitSlop={8}>
                  <X size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogForm}>
                <Input
                  label={t('buyers.name', 'Buyer Name *')}
                  placeholder={t('placeholders.nameExample', 'e.g. Ramesh Patel')}
                  value={newName}
                  onChangeText={setNewName}
                  required
                />
                <Input
                  label={t('buyers.mobile', 'Mobile Number (Optional)')}
                  placeholder={t('placeholders.mobileExample', 'e.g. 9876543210')}
                  value={newMobile}
                  onChangeText={setNewMobile}
                  keyboardType="phone-pad"
                />
                <Input
                  label={t('buyers.email', 'Email (Optional)')}
                  placeholder={t('placeholders.emailExample', 'e.g. customer@test.com')}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Input
                  label={t('buyers.address', 'Address (Optional)')}
                  placeholder={t('placeholders.addressExample', 'e.g. Ring Road, Surat')}
                  value={newAddress}
                  onChangeText={setNewAddress}
                  multiline
                />

                <Button
                  title={t('common.save', 'Save & Select')}
                  loading={isSubmitting}
                  onPress={handleSaveBuyer}
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
