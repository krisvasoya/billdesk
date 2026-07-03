// src/components/shared/ItemSearchModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, FlatList, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Search, Plus, X, Package, Clock, BarChart3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../constants/theme';
import { productService } from '../../services/database/productService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Product } from '../../types';
import { CURRENCY_SYMBOL } from '../../constants';

interface ItemSearchModalProps {
  visible: boolean;
  onClose: () => void;
  shopId: string;
  onSelect: (product: Product) => void;
}

type TabType = 'all' | 'recent' | 'frequent';

export function ItemSearchModal({ visible, onClose, shopId, onSelect }: ItemSearchModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const styles = getStyles(colors);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Form states for quick product creation
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newPrice, setNewPrice] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('0');
  const [newStock, setNewStock] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Query products from SQLite
  const { data: allProducts, isLoading } = useQuery({
    queryKey: ['products-selector-search', shopId, debouncedQuery],
    queryFn: () => productService.getAll(shopId, debouncedQuery),
    enabled: visible && !!shopId,
  });

  const { data: recentProducts } = useQuery({
    queryKey: ['products-selector-recent', shopId],
    queryFn: () => productService.getRecentProducts(shopId),
    enabled: visible && !!shopId && !searchQuery,
  });

  const { data: frequentProducts } = useQuery({
    queryKey: ['products-selector-frequent', shopId],
    queryFn: () => productService.getFrequentProducts(shopId),
    enabled: visible && !!shopId && !searchQuery,
  });

  const handleSelectProduct = (product: Product) => {
    onSelect(product);
    onClose();
  };

  const triggerQuickCreate = () => {
    setNewName(searchQuery.trim());
    setNewUnit('pcs');
    setNewPrice('');
    setNewTaxRate('0');
    setNewStock('');
    setCreateModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!newName.trim()) {
      Alert.alert(t('common.error', 'Error'), t('validation.nameRequired', 'Product Name is required'));
      return;
    }
    if (!newPrice.trim() || Number(newPrice) < 0) {
      Alert.alert(t('common.error', 'Error'), t('validation.priceInvalid', 'Price must be 0 or greater'));
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await productService.create(shopId, {
        productName: newName.trim(),
        unit: newUnit.trim() || 'pcs',
        rate: Number(newPrice),
        gst: Number(newTaxRate),
        stock: newStock.trim() ? Number(newStock) : undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['products'] });
      onSelect(created);
      setCreateModalVisible(false);
      onClose();
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.failed', 'Failed'), t('common.error', 'Could not create product.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine what list data to render based on query and tab
  const getRenderData = () => {
    if (searchQuery) return allProducts ?? [];
    if (activeTab === 'recent') return recentProducts ?? [];
    if (activeTab === 'frequent') return frequentProducts ?? [];
    return allProducts ?? [];
  };

  const renderData = getRenderData();

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton} hitSlop={12}>
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.searchBarContainer}>
            <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('invoices.searchPlaceholder', 'Search products...')}
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

        {/* Dynamic tabs if query is empty */}
        {!searchQuery && (
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => setActiveTab('all')}
            >
              <Package size={16} color={activeTab === 'all' ? colors.primary : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                {t('common.all', 'All')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'recent' && styles.activeTab]}
              onPress={() => setActiveTab('recent')}
            >
              <Clock size={16} color={activeTab === 'recent' ? colors.primary : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.tabText, activeTab === 'recent' && styles.activeTabText]}>
                {t('dashboard.recent', 'Recent')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'frequent' && styles.activeTab]}
              onPress={() => setActiveTab('frequent')}
            >
              <BarChart3 size={16} color={activeTab === 'frequent' ? colors.primary : colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.tabText, activeTab === 'frequent' && styles.activeTabText]}>
                {t('dashboard.frequent', 'Frequent')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* List Content */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={renderData}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.listItem}
                onPress={() => handleSelectProduct(item)}
              >
                <View style={styles.avatar}>
                  <Package size={18} color={colors.primary} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemSub}>
                    {CURRENCY_SYMBOL}{item.rate.toFixed(2)} / {item.unit} {item.gst > 0 ? `· GST: ${item.gst}%` : ''}
                  </Text>
                  {item.sku ? <Text style={styles.skuBadge}>SKU: {item.sku}</Text> : null}
                </View>
                {item.stock !== undefined && item.stock !== null ? (
                  <View style={styles.stockContainer}>
                    <Text style={[styles.stockValue, { color: item.stock > 0 ? colors.textPrimary : colors.error }]}>
                      {item.stock} {item.unit}
                    </Text>
                    <Text style={styles.stockLabel}>{t('products.stock', 'Stock')}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? t('search.noResults', 'No matching item found.') : t('common.noData', 'No items yet')}
                </Text>
                {searchQuery.trim().length > 0 && (
                  <TouchableOpacity style={styles.emptyActionButton} onPress={triggerQuickCreate}>
                    <Plus size={18} color="#FFFFFF" style={{ marginRight: Spacing.xs }} />
                    <Text style={styles.emptyActionText}>
                      {t('invoices.addItem', 'Add Item')}: "{searchQuery}"
                    </Text>
                  </TouchableOpacity>
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
                <Text style={styles.dialogTitle}>{t('invoices.addItem', 'Quick Add Item')}</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)} hitSlop={8}>
                  <X size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.dialogForm}>
                <Input
                  label={t('invoices.productName', 'Product Name *')}
                  placeholder={t('placeholders.productExample', 'e.g. Wheat Flour Bag')}
                  value={newName}
                  onChangeText={setNewName}
                  required
                />

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    <Input
                      label={t('invoices.pricePerUnit', 'Price *')}
                      placeholder="0.00"
                      value={newPrice}
                      onChangeText={setNewPrice}
                      keyboardType="numeric"
                      required
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={t('invoices.unit', 'Unit *')}
                      placeholder={t('placeholders.unitDefault', 'pcs')}
                      value={newUnit}
                      onChangeText={setNewUnit}
                      required
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: Spacing.sm }}>
                    <Input
                      label={t('invoices.gstRate', 'GST Rate (%)')}
                      placeholder={t('placeholders.taxExample', 'e.g. 5')}
                      value={newTaxRate}
                      onChangeText={setNewTaxRate}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={t('products.stock', 'Initial Stock (Optional)')}
                      placeholder="0"
                      value={newStock}
                      onChangeText={setNewStock}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <Button
                  title={t('common.save', 'Save & Select')}
                  loading={isSubmitting}
                  onPress={handleSaveProduct}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surfaceVariant,
    marginRight: Spacing.sm,
  },
  activeTab: {
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: FontWeight.bold,
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
  skuBadge: {
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
  stockContainer: { alignItems: 'flex-end' },
  stockValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  stockLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  emptyContainer: { padding: Spacing.xl, alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.textSecondary, textAlign: 'center' },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    ...Shadow.sm,
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
  row: { flexDirection: 'row' },
});
