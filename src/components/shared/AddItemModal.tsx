// src/components/shared/AddItemModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../constants/theme';
import { Input } from '../ui/Input';
import { productService } from '../../services/database/productService';

const itemSchema = z.object({
  productName: z.string().min(1, 'Product Name is required'),
  description: z.string().optional(),
  quantity: z.coerce.number().gt(0, 'Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  altQuantity: z.coerce.number().nullable().optional(),
  altUnit: z.string().optional().nullable(),
  rate: z.coerce.number().gt(0, 'Rate must be greater than 0'),
  gst: z.coerce.number().nonnegative('Tax cannot be negative').default(0),
  discount: z.coerce.number().nonnegative('Discount cannot be negative').default(0),
});

export interface ItemSchemaValues {
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  altQuantity?: number | null;
  altUnit?: string | null;
  rate: number;
  gst: number;
  discount: number;
}

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  shopId: string;
  onAdd: (values: ItemSchemaValues) => void;
  initialData?: ItemSchemaValues;
}

export function AddItemModal({ visible, onClose, shopId, onAdd, initialData }: AddItemModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ItemSchemaValues>({
    resolver: zodResolver(itemSchema) as any,
    defaultValues: {
      productName: '',
      description: '',
      quantity: undefined as any,
      unit: 'pcs',
      altQuantity: null,
      altUnit: '',
      rate: undefined as any,
      gst: 0,
      discount: 0
    },
  });

  // Reset form when modal becomes visible or initialData changes
  useEffect(() => {
    if (visible) {
      console.log('[BillDesk] Add Item Modal opened and reset. Editing:', !!initialData);
      reset(initialData || {
        productName: '',
        description: '',
        quantity: undefined as any,
        unit: 'pcs',
        altQuantity: null,
        altUnit: '',
        rate: undefined as any,
        gst: 0,
        discount: 0
      });
      setProductDropdownOpen(false);
    }
  }, [visible, reset, initialData]);

  // Watch inputs for live preview
  const watchedRate = watch('rate') || 0;
  const watchedQuantity = watch('quantity') || 0;
  const watchedDiscount = watch('discount') || 0;
  const watchedGst = watch('gst') || 0;
  const watchedProductName = watch('productName') || '';

  // Query products from SQLite
  const { data: allProducts } = useQuery({
    queryKey: ['products-all', shopId],
    queryFn: () => productService.getAll(shopId || '', ''),
    enabled: visible && !!shopId,
  });

  // Safeguard array coercion
  const productsArray = Array.isArray(allProducts) 
    ? allProducts 
    : (allProducts as any)?.data ?? [];

  // Safe product filtering
  const filteredProducts = productsArray.filter((p: any) => {
    try {
      const name = p?.productName;
      if (!name) return false;
      const searchStr = watchedProductName || '';
      return name.toLowerCase().includes(searchStr.toLowerCase());
    } catch (e) {
      console.error('[BillDesk] Error in filteredProducts item:', p, e);
      return false;
    }
  }).slice(0, 8);

  const itemBase = (Number(watchedRate || 0) * Number(watchedQuantity || 0)) - Number(watchedDiscount || 0);
  const calculatedTotal = itemBase + (itemBase * Number(watchedGst || 0)) / 100;
  const itemPreviewTotal = isNaN(calculatedTotal) ? 0 : Math.max(0, calculatedTotal);

  const handleSave = (values: ItemSchemaValues) => {
    console.log('[BillDesk] Item Saved clicked:', values);
    onAdd(values);
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={() => {
                  console.log('[BillDesk] AddItemModal: Header Back button pressed');
                  onClose();
                }} 
                style={{ marginRight: Spacing.sm }}
                hitSlop={12}
              >
                <ArrowLeft size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {initialData ? t('invoices.editItem', 'Edit Line Item') : t('invoices.addItem', 'Add Line Item')}
              </Text>
            </View>
          </View>

          {/* Form Content */}
          <ScrollView
            contentContainerStyle={styles.modalForm}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Product Name Search with Dropdown */}
            <View style={{ zIndex: productDropdownOpen ? 1000 : 10, position: 'relative', marginBottom: Spacing.sm }}>
              <Controller
                control={control}
                name="productName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <Input
                      label={t('invoices.productName', 'Product Name *')}
                      placeholder={t('placeholders.productExample', 'e.g. Wheat Flour Bag')}
                      required
                      onBlur={() => {
                        onBlur();
                        setTimeout(() => setProductDropdownOpen(false), 250);
                      }}
                      onFocus={() => setProductDropdownOpen(true)}
                      onChangeText={(text) => {
                        onChange(text);
                        setProductDropdownOpen(true);
                      }}
                      value={value}
                      error={errors.productName?.message}
                    />
                    {productDropdownOpen && (value || '').trim().length > 0 && (
                      <View style={styles.dropdownContainer}>
                        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
                          {filteredProducts.map((p: any) => (
                            <TouchableOpacity
                              key={p.id}
                              style={styles.dropdownItem}
                              onPress={() => {
                                console.log(`[BillDesk] Product selected: ${p.productName}`);
                                setValue('productName', p.productName);
                                setValue('rate', p.rate);
                                setValue('gst', p.gst);
                                setValue('unit', p.unit);
                                setProductDropdownOpen(false);
                              }}
                            >
                              <Text style={styles.dropdownItemName}>{p.productName}</Text>
                              <Text style={styles.dropdownItemSub}>
                                {p.unit} · ₹{p.rate.toFixed(2)} · GST: {p.gst}%
                              </Text>
                            </TouchableOpacity>
                          ))}
                          {filteredProducts.length === 0 && (
                            <TouchableOpacity
                              style={[styles.dropdownItem, { backgroundColor: colors.primaryLight }]}
                              onPress={() => {
                                console.log(`[BillDesk] Creating New Product placeholder: ${value}`);
                                setProductDropdownOpen(false);
                              }}
                            >
                              <Text style={[styles.dropdownItemName, { color: colors.primary, fontSize: FontSize.sm }]}>
                                ✨ {t('products.createNewProduct', 'Create New Product')}: "{value}"
                              </Text>
                            </TouchableOpacity>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
              />
            </View>

            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={`${t('invoices.description', 'Description')} (${t('common.optional', 'Optional')})`}
                  placeholder={t('placeholders.descExample', 'e.g. Batch #A12, Grade Premium')}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value ?? ''}
                  error={errors.description?.message}
                />
              )}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <Controller
                  control={control}
                  name="quantity"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label={`${t('invoices.quantity', 'Quantity')} *`}
                      placeholder="1"
                      required
                      keyboardType="numeric"
                      onBlur={onBlur}
                      onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                      value={value === undefined || value === null ? '' : String(value)}
                      error={errors.quantity?.message}
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="unit"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label={`${t('invoices.unit', 'Unit')} *`}
                      placeholder={t('placeholders.unitDefault', 'pcs')}
                      required
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.unit?.message}
                    />
                  )}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <Controller
                  control={control}
                  name="altQuantity"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label={t('invoices.altQuantity', 'Alternative Qty')}
                      placeholder="e.g. 50"
                      keyboardType="numeric"
                      onBlur={onBlur}
                      onChangeText={(text) => onChange(text === '' ? null : Number(text))}
                      value={value === undefined || value === null ? '' : String(value)}
                      error={errors.altQuantity?.message}
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="altUnit"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label={t('invoices.altUnit', 'Alternative Unit')}
                      placeholder="e.g. kg"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value ?? ''}
                      error={errors.altUnit?.message}
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="rate"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={`${t('invoices.pricePerUnit', 'Price per Unit')} (₹) *`}
                  placeholder="0.00"
                  required
                  keyboardType="numeric"
                  onBlur={onBlur}
                  onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                  value={value === undefined || value === null ? '' : String(value)}
                  error={errors.rate?.message}
                />
              )}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: Spacing.sm }}>
                <Controller
                  control={control}
                  name="gst"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label={`${t('invoices.gstRate', 'GST Rate')} (%)`}
                      placeholder="e.g. 5"
                      keyboardType="numeric"
                      onBlur={onBlur}
                      onChangeText={(text) => onChange(text === '' ? 0 : Number(text))}
                      value={value === undefined || value === null ? '' : String(value)}
                      error={errors.gst?.message}
                    />
                  )}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Controller
                  control={control}
                  name="discount"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label={`${t('invoices.discount', 'Discount')} (₹)`}
                      placeholder="0.00"
                      keyboardType="numeric"
                      onBlur={onBlur}
                      onChangeText={(text) => onChange(text === '' ? 0 : Number(text))}
                      value={value === undefined || value === null ? '' : String(value)}
                      error={errors.discount?.message}
                    />
                  )}
                />
              </View>
            </View>

            {/* Estimated Total */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>
                {t('invoices.itemTotal', 'Estimated Total:')}
              </Text>
              <Text style={styles.previewValue}>
                ₹{itemPreviewTotal.toFixed(2)}
              </Text>
            </View>

            {/* Save / Cancel Buttons */}
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  console.log('[BillDesk] AddItemModal: Cancel button pressed');
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit(handleSave)}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>
                  {initialData ? t('common.update', 'Update') : t('common.add', 'Save')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 9999,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.border,
    ...Shadow.sm,
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
  },
  modalForm: {
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? 40 : 60,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    ...Shadow.md,
    zIndex: 1100,
  },
  dropdownItem: {
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  dropdownItemName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
  },
  dropdownItemSub: {
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  previewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.base,
  },
  previewLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
  },
  previewValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: colors.primary,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.base,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  cancelButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },
});
