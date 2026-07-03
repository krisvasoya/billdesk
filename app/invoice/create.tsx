// app/invoice/create.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Platform, TextInput } from 'react-native';
import { useSafeAreaBottomPadding } from '../../src/hooks/useTabBarHeight';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Trash2, X, Search } from 'lucide-react-native';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useAuth } from '../../src/contexts/AuthContext';
import { customerService } from '../../src/services/database/customerService';
import { buyerService } from '../../src/services/database/buyerService';
import { invoiceService } from '../../src/services/database/invoiceService';
import { productService } from '../../src/services/database/productService';
import { amountToWords } from '../../src/services/pdfService';
import { CURRENCY_SYMBOL } from '../../src/constants';
import { getDatabase } from '../../src/services/database/db';

import { CustomerSearchModal } from '../../src/components/shared/CustomerSearchModal';
import { BuyerSearchModal } from '../../src/components/shared/BuyerSearchModal';
import { ItemSearchModal } from '../../src/components/shared/ItemSearchModal';
import type { Customer, Buyer, Product } from '../../src/types';

const itemSchema = z.object({
  productName: z.string().min(1, 'Product Name is required'),
  description: z.string().optional(),
  quantity: z.coerce.number().gt(0, 'Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required'),
  altQuantity: z.coerce.number().nullable().optional(),
  altUnit: z.string().optional().nullable(),
  price: z.coerce.number().gt(0, 'Price must be greater than 0'),
  taxRate: z.coerce.number().nonnegative('Tax cannot be negative').default(0),
  discount: z.coerce.number().nonnegative('Discount cannot be negative').default(0),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Customer selection is required'),
  buyerId: z.string().optional().nullable(),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().optional(),
  transportCharge: z.number().nonnegative('Cannot be negative').default(0),
  packingCharge: z.number().nonnegative('Cannot be negative').default(0),
  otherCharge: z.number().nonnegative('Cannot be negative').default(0),
  advancePayment: z.number().nonnegative('Cannot be negative').default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Please add at least one item'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export function CreateInvoiceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { shopId } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [customerSearchVisible, setCustomerSearchVisible] = useState(false);
  const [buyerSearchVisible, setBuyerSearchVisible] = useState(false);
  const [productSearchVisible, setProductSearchVisible] = useState(false);
  const [itemModalVisible, setItemModalVisible] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; isTemp?: boolean; mobile?: string; address?: string; gst?: string } | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<{ id: string; name: string; isTemp?: boolean; mobile?: string; address?: string; email?: string } | null>(null);

  // Search and dropdown state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [buyerSearchQuery, setBuyerSearchQuery] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [buyerDropdownOpen, setBuyerDropdownOpen] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  const { data: allCustomers } = useQuery({
    queryKey: ['customers-all', shopId],
    queryFn: () => customerService.getAll(shopId || '', { pageSize: 1000 }),
    enabled: !!shopId,
  });

  const { data: allBuyers } = useQuery({
    queryKey: ['buyers-all', shopId],
    queryFn: () => buyerService.getAll(shopId || '', { pageSize: 1000 }),
    enabled: !!shopId,
  });

  const { data: allProducts } = useQuery({
    queryKey: ['products-all', shopId],
    queryFn: () => productService.getAll(shopId || '', ''),
    enabled: !!shopId,
  });

  const filteredCustomers = (allCustomers?.data || []).filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase())
  ).slice(0, 8);

  const filteredBuyers = (allBuyers?.data || []).filter(b =>
    b.name.toLowerCase().includes(buyerSearchQuery.toLowerCase())
  ).slice(0, 8);

  const filteredProducts = (allProducts || []).filter(p =>
    p.productName.toLowerCase().includes(watchedProductName.toLowerCase())
  ).slice(0, 8);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      customerId: '',
      buyerId: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      transportCharge: 0,
      packingCharge: 0,
      otherCharge: 0,
      advancePayment: 0,
      notes: '',
      terms: '',
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

interface ItemSchemaValues {
  productName: string;
  description?: string;
  quantity: number;
  unit: string;
  altQuantity?: number | null;
  altUnit?: string | null;
  price: number;
  taxRate: number;
  discount: number;
}

  // Line Item Form
  const {
    control: itemFormCtrl,
    handleSubmit: handleItemSubmit,
    reset: resetItemForm,
    watch: watchItem,
    setValue: setItemValue,
    formState: { errors: itemFormErrors }
  } = useForm<ItemSchemaValues>({
    resolver: zodResolver(itemSchema) as any,
    defaultValues: { productName: '', description: '', quantity: undefined as any, unit: 'pcs', altQuantity: null, altUnit: '', price: undefined as any, taxRate: 0, discount: 0 },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      // Filter out null/undefined from items
      const processedItems = data.items.map(item => ({
        productName: item.productName,
        description: item.description || undefined,
        quantity: item.quantity,
        unit: item.unit,
        altQuantity: item.altQuantity ?? undefined,
        altUnit: item.altUnit || undefined,
        price: item.price,
        taxRate: item.taxRate,
        discount: item.discount,
      }));

      let finalCustomerId = data.customerId;
      let finalCustomerName = selectedCustomer?.name ?? '';

      // Save temporary customer background check
      if (selectedCustomer?.isTemp) {
        const db = getDatabase();
        const countRow = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM invoices WHERE shop_id = ?',
          [shopId || '']
        );
        const count = (countRow?.count ?? 0) + 1;
        const predictedInvNum = `INV-${String(count).padStart(4, '0')}`;

        const created = await customerService.create(shopId || '', {
          name: selectedCustomer.name,
          mobile: selectedCustomer.mobile || undefined,
          address: selectedCustomer.address || undefined,
          gstNumber: (selectedCustomer as any).gst || (selectedCustomer as any).gstNumber || undefined,
          creditLimit: 0,
          openingBalance: 0,
          notes: `Created via Invoice: ${predictedInvNum}`
        });
        finalCustomerId = created.id;
        finalCustomerName = created.name;
      }

      let finalBuyerId = data.buyerId || undefined;
      let finalBuyerName = selectedBuyer?.name || undefined;

      // Save temporary buyer background check
      if (selectedBuyer?.isTemp) {
        const db = getDatabase();
        const countRow = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM invoices WHERE shop_id = ?',
          [shopId || '']
        );
        const count = (countRow?.count ?? 0) + 1;
        const predictedInvNum = `INV-${String(count).padStart(4, '0')}`;

        const created = await buyerService.create(shopId || '', {
          name: selectedBuyer.name,
          mobile: selectedBuyer.mobile || undefined,
          address: selectedBuyer.address || undefined,
          email: selectedBuyer.email || undefined,
          openingBalance: 0,
          creditLimit: 0,
          notes: `Created via Invoice: ${predictedInvNum}`
        });
        finalBuyerId = created.id;
        finalBuyerName = created.name;
      }

      // Check and automatically create missing products in database
      for (const item of processedItems) {
        try {
          const duplicate = await productService.checkDuplicate(shopId || '', item.productName.trim());
          if (!duplicate) {
            console.log(`[BillDesk] Auto-creating new product: ${item.productName}`);
            await productService.create(shopId || '', {
              productName: item.productName.trim(),
              unit: item.unit,
              rate: item.price,
              gst: item.taxRate,
            });
          }
        } catch (err) {
          console.error('[BillDesk] Error auto-creating new product:', err);
        }
      }

      return invoiceService.create(shopId || '', {
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        buyerId: finalBuyerId,
        buyerName: finalBuyerName,
        date: data.date,
        dueDate: data.dueDate || undefined,
        items: processedItems,
        transportCharge: data.transportCharge,
        packingCharge: data.packingCharge,
        otherCharge: data.otherCharge,
        advancePayment: data.advancePayment,
        notes: data.notes,
        terms: data.terms,
      });
    },
    onSuccess: (newInv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customer-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-all'] });
      Alert.alert(t('common.success', 'Success'), 'Invoice created successfully!', [
        { text: 'OK', onPress: () => router.replace(`/invoice/${newInv.id}`) }
      ]);
    },
    onError: () => {
      Alert.alert(t('common.failed', 'Failed'), 'Failed to create invoice.');
    },
  });

  const onAddItem = (values: ItemSchemaValues) => {
    append(values as any);
    setItemModalVisible(false);
    resetItemForm({ productName: '', description: '', quantity: undefined as any, unit: 'pcs', altQuantity: null, altUnit: '', price: undefined as any, taxRate: 0, discount: 0 });
  };

  const handleProductSelect = (product: Product) => {
    setItemValue('productName', product.productName);
    setItemValue('price', product.rate);
    setItemValue('taxRate', product.gst);
    setItemValue('unit', product.unit);
  };

  const selectCustomerObj = (cust: Customer | { id: string; name: string; isTemp: boolean; mobile?: string; address?: string; gst?: string }) => {
    setValue('customerId', cust.id);
    setSelectedCustomer(cust as any);
    setCustomerSearchQuery(cust.name);
  };

  const selectBuyerObj = (buy: Buyer | { id: string; name: string; isTemp: boolean; mobile?: string; address?: string; email?: string }) => {
    setValue('buyerId', buy.id);
    setSelectedBuyer(buy as any);
    setBuyerSearchQuery(buy.name);
  };

  const clearCustomer = () => {
    setValue('customerId', '');
    setSelectedCustomer(null);
    setCustomerSearchQuery('');
  };

  const clearBuyer = () => {
    setValue('buyerId', '');
    setSelectedBuyer(null);
    setBuyerSearchQuery('');
  };

  const formItems = watch('items') || [];
  const subtotal = formItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const discountAmount = formItems.reduce((acc, curr) => acc + curr.discount, 0);
  const taxAmount = formItems.reduce((acc, curr) => {
    const base = curr.price * curr.quantity - curr.discount;
    return acc + (base * curr.taxRate) / 100;
  }, 0);

  const transport = watch('transportCharge') || 0;
  const packing = watch('packingCharge') || 0;
  const other = watch('otherCharge') || 0;
  const total = subtotal - discountAmount + taxAmount + transport + packing + other;
  
  const advance = watch('advancePayment') || 0;
  const balanceDue = total - advance;

  // Watching item modal inputs for live preview
  const watchedPrice = watchItem('price') || 0;
  const watchedQuantity = watchItem('quantity') || 0;
  const watchedDiscount = watchItem('discount') || 0;
  const watchedTaxRate = watchItem('taxRate') || 0;
  const watchedProductName = watchItem('productName') || '';

  const itemBase = (Number(watchedPrice || 0) * Number(watchedQuantity || 0)) - Number(watchedDiscount || 0);
  const itemPreviewTotal = Math.max(0, itemBase + (itemBase * Number(watchedTaxRate || 0)) / 100);

  const bottomPadding = useSafeAreaBottomPadding(Spacing.base);
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('invoices.createInvoice', 'Create Invoice')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]} keyboardShouldPersistTaps="handled">
        {/* Parties Card */}
        <View style={styles.partyBox}>
          {/* Customer Selection */}
          <View style={{ zIndex: customerDropdownOpen ? 1000 : 10, position: 'relative', marginBottom: Spacing.sm }}>
            <Text style={styles.selectorLabel}>{t('invoices.customer', 'Bill To Customer *')}</Text>
            <View style={[styles.selectorInputContainer, errors.customerId && styles.selectorCardError]}>
              <TextInput
                style={styles.selectorTextInput}
                placeholder={t('invoices.selectCustomer', 'Select or Add Customer')}
                placeholderTextColor={colors.textDisabled}
                value={customerSearchQuery}
                onFocus={() => setCustomerDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => setCustomerDropdownOpen(false), 200);
                }}
                onChangeText={(text) => {
                  setCustomerSearchQuery(text);
                  setCustomerDropdownOpen(true);
                  if (text.trim() === '') {
                    setSelectedCustomer(null);
                    setValue('customerId', '');
                  } else {
                    const match = allCustomers?.data.find(c => c.name.toLowerCase() === text.trim().toLowerCase());
                    if (match) {
                      setSelectedCustomer(match);
                      setValue('customerId', match.id);
                    } else {
                      const tempId = `temp-${Date.now()}`;
                      setSelectedCustomer({
                        id: tempId,
                        name: text.trim(),
                        isTemp: true,
                        mobile: selectedCustomer?.isTemp ? selectedCustomer.mobile : '',
                        address: selectedCustomer?.isTemp ? selectedCustomer.address : '',
                        gst: selectedCustomer?.isTemp ? selectedCustomer.gst : '',
                      });
                      setValue('customerId', tempId);
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
                        setSelectedCustomer(cust);
                        setCustomerSearchQuery(cust.name);
                        setValue('customerId', cust.id);
                        setCustomerDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownItemName}>{cust.name}</Text>
                      {cust.mobile ? <Text style={styles.dropdownItemSub}>{cust.mobile}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Inlined New Customer Details if isTemp */}
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
                  placeholder={t('customers.gst', 'GST Number')}
                  placeholderTextColor={colors.textDisabled}
                  value={selectedCustomer.gst || ''}
                  onChangeText={(text) => setSelectedCustomer(prev => prev ? { ...prev, gst: text } : null)}
                  autoCapitalize="characters"
                />
                <TextInput
                  style={[styles.tempInput, { height: 60 }]}
                  placeholder={t('customers.address', 'Address')}
                  placeholderTextColor={colors.textDisabled}
                  value={selectedCustomer.address || ''}
                  onChangeText={(text) => setSelectedCustomer(prev => prev ? { ...prev, address: text } : null)}
                  multiline
                />
              </View>
            )}
          </View>

          {/* Buyer Selection (Optional) */}
          <View style={{ zIndex: buyerDropdownOpen ? 999 : 5, position: 'relative', marginTop: Spacing.sm }}>
            <Text style={styles.selectorLabel}>{t('invoices.shipToBuyer', 'Ship To Buyer')} ({t('common.optional', 'Optional')})</Text>
            <View style={styles.selectorInputContainer}>
              <TextInput
                style={styles.selectorTextInput}
                placeholder={t('placeholders.selectBuyer', 'Select or Add Buyer')}
                placeholderTextColor={colors.textDisabled}
                value={buyerSearchQuery}
                onFocus={() => setBuyerDropdownOpen(true)}
                onBlur={() => {
                  setTimeout(() => setBuyerDropdownOpen(false), 200);
                }}
                onChangeText={(text) => {
                  setBuyerSearchQuery(text);
                  setBuyerDropdownOpen(true);
                  if (text.trim() === '') {
                    setSelectedBuyer(null);
                    setValue('buyerId', '');
                  } else {
                    const match = allBuyers?.data.find(b => b.name.toLowerCase() === text.trim().toLowerCase());
                    if (match) {
                      setSelectedBuyer(match);
                      setValue('buyerId', match.id);
                    } else {
                      const tempId = `temp-${Date.now()}`;
                      setSelectedBuyer({
                        id: tempId,
                        name: text.trim(),
                        isTemp: true,
                        mobile: selectedBuyer?.isTemp ? selectedBuyer.mobile : '',
                        address: selectedBuyer?.isTemp ? selectedBuyer.address : '',
                      });
                      setValue('buyerId', tempId);
                    }
                  }
                }}
              />
              {selectedBuyer && (
                <TouchableOpacity onPress={clearBuyer}>
                  <X size={16} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>

            {/* Buyer Dropdown */}
            {buyerDropdownOpen && filteredBuyers.length > 0 && (
              <View style={styles.dropdownContainer}>
                <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                  {filteredBuyers.map((buy) => (
                    <TouchableOpacity
                      key={buy.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedBuyer(buy);
                        setBuyerSearchQuery(buy.name);
                        setValue('buyerId', buy.id);
                        setBuyerDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownItemName}>{buy.name}</Text>
                      {buy.mobile ? <Text style={styles.dropdownItemSub}>{buy.mobile}</Text> : null}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Inlined New Buyer Details if isTemp */}
            {selectedBuyer?.isTemp && (
              <View style={styles.tempDetailsContainer}>
                <Text style={styles.tempDetailsTitle}>{t('invoices.newBuyerDetails', 'New Buyer Details (Optional)')}</Text>
                <TextInput
                  style={styles.tempInput}
                  placeholder={t('buyers.mobile', 'Mobile')}
                  placeholderTextColor={colors.textDisabled}
                  value={selectedBuyer.mobile || ''}
                  onChangeText={(text) => setSelectedBuyer(prev => prev ? { ...prev, mobile: text } : null)}
                  keyboardType="phone-pad"
                />
                <TextInput
                  style={[styles.tempInput, { height: 60 }]}
                  placeholder={t('buyers.address', 'Address')}
                  placeholderTextColor={colors.textDisabled}
                  value={selectedBuyer.address || ''}
                  onChangeText={(text) => setSelectedBuyer(prev => prev ? { ...prev, address: text } : null)}
                  multiline
                />
              </View>
            )}
          </View>
        </View>

        {/* Date Row */}
        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('invoices.date', 'Invoice Date')}
                  placeholder={t('placeholders.datePattern', 'YYYY-MM-DD')}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.date?.message}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="dueDate"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('invoices.dueDate', 'Due Date')}
                  placeholder={t('placeholders.datePattern', 'YYYY-MM-DD')}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  error={errors.dueDate?.message}
                />
              )}
            />
          </View>
        </View>

        {/* Items Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('invoices.items', 'Line Items')}</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setItemModalVisible(true)}>
            <Plus size={16} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.addButtonText}>{t('invoices.addItem', 'Add Item')}</Text>
          </TouchableOpacity>
        </View>

        {errors.items && <Text style={[styles.errorText, { marginBottom: Spacing.sm }]}>{errors.items.message}</Text>}

        {/* Added Items List */}
        {fields.length === 0 ? (
          <View style={styles.emptyItemsCard}>
            <Text style={styles.emptyItemsText}>{t('invoices.noItems', 'No items added. Click Add Item to start billing.')}</Text>
          </View>
        ) : (
          fields.map((item, index) => {
            const itemTotal = item.price * item.quantity - item.discount + (item.price * item.quantity - item.discount) * item.taxRate / 100;
            return (
              <View key={item.id} style={styles.itemRowCard}>
                <View style={styles.itemRowLeft}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                  <Text style={styles.itemMeta}>
                    {item.quantity} {item.unit} x {CURRENCY_SYMBOL}{item.price} 
                    {item.discount > 0 ? ` · Disc: ${CURRENCY_SYMBOL}${item.discount}` : ''}
                    {item.taxRate > 0 ? ` · Tax: ${item.taxRate}%` : ''}
                  </Text>
                  {item.altQuantity ? (
                    <Text style={styles.itemAltQty}>
                      Alt Qty: {item.altQuantity} {item.altUnit ?? ''}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.itemRowRight}>
                  <Text style={styles.itemAmount}>{CURRENCY_SYMBOL}{itemTotal.toFixed(2)}</Text>
                  <TouchableOpacity onPress={() => remove(index)} hitSlop={8}>
                    <Trash2 size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* Extra Charges Section */}
        <Text style={styles.sectionTitle}>{t('invoices.extraCharges', 'Extra Charges & Payments')}</Text>
        <View style={styles.chargesGrid}>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="transportCharge"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('invoices.transport', 'Transport')}
                    placeholder="0.00"
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={text => onChange(text === '' ? 0 : Number(text))}
                    value={value === 0 ? '' : String(value)}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="packingCharge"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('invoices.packing', 'Packing')}
                    placeholder="0.00"
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={text => onChange(text === '' ? 0 : Number(text))}
                    value={value === 0 ? '' : String(value)}
                  />
                )}
              />
            </View>
          </View>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="otherCharge"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('invoices.other', 'Other')}
                    placeholder="0.00"
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={text => onChange(text === '' ? 0 : Number(text))}
                    value={value === 0 ? '' : String(value)}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="advancePayment"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('invoices.advance', 'Advance Paid')}
                    placeholder="0.00"
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={text => onChange(text === '' ? 0 : Number(text))}
                    value={value === 0 ? '' : String(value)}
                  />
                )}
              />
            </View>
          </View>
        </View>

        {/* Totals Section */}
        <Text style={styles.sectionTitle}>{t('invoices.totalsSummary', 'Totals Summary')}</Text>
        <View style={styles.totalsCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('invoices.subtotal', 'Subtotal')}</Text>
            <Text style={styles.totalValue}>{CURRENCY_SYMBOL}{subtotal.toFixed(2)}</Text>
          </View>
          {discountAmount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoices.discount', 'Discount')}</Text>
              <Text style={[styles.totalValue, { color: colors.error }]}>-{CURRENCY_SYMBOL}{discountAmount.toFixed(2)}</Text>
            </View>
          ) : null}
          {taxAmount > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoices.gstRate', 'GST Tax')}</Text>
              <Text style={styles.totalValue}>+{CURRENCY_SYMBOL}{taxAmount.toFixed(2)}</Text>
            </View>
          ) : null}
          {(transport + packing + other) > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoices.extraCharges', 'Other Charges')}</Text>
              <Text style={styles.totalValue}>+{CURRENCY_SYMBOL}{(transport + packing + other).toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelMain}>{t('invoices.total', 'Grand Total')}</Text>
            <Text style={styles.totalValueMain}>{CURRENCY_SYMBOL}{total.toFixed(2)}</Text>
          </View>
          {advance > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('invoices.advance', 'Paid/Advance')}</Text>
              <Text style={[styles.totalValue, { color: colors.success }]}>-{CURRENCY_SYMBOL}{advance.toFixed(2)}</Text>
            </View>
          ) : null}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabelMain, { fontSize: FontSize.sm }]}>{t('invoices.balance', 'Balance Due')}</Text>
            <Text style={[styles.totalValueMain, { fontSize: FontSize.md, color: balanceDue > 0 ? colors.error : colors.success }]}>
              {CURRENCY_SYMBOL}{balanceDue.toFixed(2)}
            </Text>
          </View>
          <View style={styles.wordsBox}>
            <Text style={styles.wordsLabel}>{t('invoices.amountInWords', 'Amount in words')}:</Text>
            <Text style={styles.wordsText}>{amountToWords(total)}</Text>
          </View>
        </View>

        {/* Note / Terms */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('invoices.notes', 'Notes')}
              placeholder={t('placeholders.thanksExample', 'e.g. Thank you for your business!')}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
              multiline
            />
          )}
        />

        <Controller
          control={control}
          name="terms"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('invoices.terms', 'Terms & Conditions')}
              placeholder="e.g. Goods once sold will not be taken back."
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
              multiline
            />
          )}
        />

        <Button
          title={t('invoices.createInvoice', 'Save Invoice')}
          loading={createInvoiceMutation.isPending}
          onPress={handleSubmit(d => createInvoiceMutation.mutate(d))}
          style={styles.saveButton}
        />
      </ScrollView>

      {/* Customer Selection Modal */}
      <CustomerSearchModal
        visible={customerSearchVisible}
        onClose={() => setCustomerSearchVisible(false)}
        shopId={shopId || ''}
        onSelect={selectCustomerObj}
      />

      {/* Buyer Selection Modal */}
      <BuyerSearchModal
        visible={buyerSearchVisible}
        onClose={() => setBuyerSearchVisible(false)}
        shopId={shopId || ''}
        onSelect={selectBuyerObj}
      />

      {/* Item Selection Search Modal */}
      <ItemSearchModal
        visible={productSearchVisible}
        onClose={() => setProductSearchVisible(false)}
        shopId={shopId || ''}
        onSelect={handleProductSelect}
      />
      {/* Add Line Item Form Modal */}
      <Modal visible={itemModalVisible} animationType="slide" transparent={true} onRequestClose={() => setItemModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('invoices.addItem', 'Add Line Item')}</Text>
              <TouchableOpacity onPress={() => setItemModalVisible(false)}>
                <X size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.modalForm}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              
              {/* Product Name Search with Inline Dropdown */}
              <View style={{ zIndex: productDropdownOpen ? 1000 : 10, position: 'relative', marginBottom: Spacing.sm }}>
                <Controller
                  control={itemFormCtrl}
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
                        error={itemFormErrors.productName?.message}
                      />
                      {productDropdownOpen && value.trim().length > 0 && (
                        <View style={[styles.dropdownContainer, { top: 72 }]}>
                          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
                            {filteredProducts.map((p) => (
                              <TouchableOpacity
                                key={p.id}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  onChange(p.productName);
                                  setItemValue('price', p.rate);
                                  setItemValue('taxRate', p.gst);
                                  setItemValue('unit', p.unit);
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
                              <View style={[styles.dropdownItem, { backgroundColor: colors.primaryLight }]}>
                                <Text style={[styles.dropdownItemName, { color: colors.primary, fontSize: FontSize.sm }]}>
                                  ✨ {t('products.createNewProduct', 'Create New Product')}: "{value}"
                                </Text>
                              </View>
                            )}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  )}
                />
              </View>

              <Controller
                control={itemFormCtrl}
                name="description"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={`${t('invoices.description', 'Description')} (${t('common.optional', 'Optional')})`}
                    placeholder={t('placeholders.descExample', 'e.g. Batch #A12, Grade Premium')}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value ?? ''}
                    error={itemFormErrors.description?.message}
                  />
                )}
              />

              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={itemFormCtrl}
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
                        error={itemFormErrors.quantity?.message}
                      />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={itemFormCtrl}
                    name="unit"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={`${t('invoices.unit', 'Unit')} *`}
                        placeholder={t('placeholders.unitDefault', 'pcs')}
                        required
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value}
                        error={itemFormErrors.unit?.message}
                      />
                    )}
                  />
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={itemFormCtrl}
                    name="altQuantity"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('invoices.altQuantity', 'Alternative Qty')}
                        placeholder={t('placeholders.qtyExample', 'e.g. 50')}
                        keyboardType="numeric"
                        onBlur={onBlur}
                        onChangeText={(text) => onChange(text === '' ? null : Number(text))}
                        value={value === undefined || value === null ? '' : String(value)}
                        error={itemFormErrors.altQuantity?.message}
                      />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={itemFormCtrl}
                    name="altUnit"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={t('invoices.altUnit', 'Alternative Unit')}
                        placeholder={t('placeholders.unitExample', 'e.g. kg')}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        value={value ?? ''}
                        error={itemFormErrors.altUnit?.message}
                      />
                    )}
                  />
                </View>
              </View>

              <Controller
                control={itemFormCtrl}
                name="price"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={`${t('invoices.pricePerUnit', 'Price per Unit')} (₹) *`}
                    placeholder="0.00"
                    required
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={(text) => onChange(text === '' ? undefined : Number(text))}
                    value={value === undefined || value === null ? '' : String(value)}
                    error={itemFormErrors.price?.message}
                  />
                )}
              />

              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={itemFormCtrl}
                    name="taxRate"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={`${t('invoices.gstRate', 'GST Rate')} (%)`}
                        placeholder={t('placeholders.taxExample', 'e.g. 5')}
                        keyboardType="numeric"
                        onBlur={onBlur}
                        onChangeText={(text) => onChange(text === '' ? 0 : Number(text))}
                        value={value === undefined || value === null ? '' : String(value)}
                        error={itemFormErrors.taxRate?.message}
                      />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Controller
                    control={itemFormCtrl}
                    name="discount"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input
                        label={`${t('invoices.discount', 'Discount')} (₹)`}
                        placeholder="0.00"
                        keyboardType="numeric"
                        onBlur={onBlur}
                        onChangeText={(text) => onChange(text === '' ? 0 : Number(text))}
                        value={value === undefined || value === null ? '' : String(value)}
                        error={itemFormErrors.discount?.message}
                      />
                    )}
                  />
                </View>
              </View>

              {/* Automatic Amount Preview Badge */}
              <View style={{
                backgroundColor: colors.primaryLight,
                padding: Spacing.sm,
                borderRadius: BorderRadius.md,
                marginTop: Spacing.md,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.primary,
              }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: colors.primary }}>
                  {t('invoices.itemTotal', 'Estimated Total:')}
                </Text>
                <Text style={{ fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.primary }}>
                  ₹{itemPreviewTotal.toFixed(2)}
                </Text>
              </View>

              {/* Buttons side-by-side */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.xl }}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setItemModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveModalButton}
                  onPress={handleItemSubmit(onAddItem)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.saveModalButtonText}>{t('common.add', 'Save')}</Text>
                </TouchableOpacity>
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
  partyBox: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  selectorCard: {
    backgroundColor: colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  selectorCardError: { borderColor: colors.error },
  selectorLabel: { fontSize: FontSize.xs, color: colors.textSecondary, fontWeight: FontWeight.medium, marginBottom: 4 },
  selectorValue: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
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
    backgroundColor: colors.surfaceVariant,
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
  errorText: { fontSize: FontSize.xs, color: colors.error, marginTop: 4 },
  dateRow: { flexDirection: 'row', gap: Spacing.base },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: Spacing.base },
  sectionTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary, marginTop: Spacing.base, marginBottom: Spacing.sm },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: 4 },
  addButtonText: { fontSize: FontSize.sm, color: colors.primary, fontWeight: FontWeight.bold },
  emptyItemsCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyItemsText: { color: colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center' },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  itemRowLeft: { flex: 1 },
  itemName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: colors.textPrimary },
  itemDesc: { fontSize: FontSize.xs, color: colors.textSecondary, fontStyle: 'italic', marginTop: 1 },
  itemMeta: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  itemAltQty: { fontSize: FontSize.xs, color: colors.primary, fontWeight: FontWeight.medium, marginTop: 1 },
  itemRowRight: { alignItems: 'flex-end', gap: Spacing.xs, flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'flex-end' },
  itemAmount: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: colors.textPrimary, marginRight: 8 },
  chargesGrid: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadow.sm,
  },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.base,
    ...Shadow.sm,
    marginBottom: Spacing.base,
    marginTop: Spacing.sm,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: FontSize.sm, color: colors.textSecondary },
  totalValue: { fontSize: FontSize.sm, color: colors.textPrimary, fontWeight: FontWeight.semibold },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: Spacing.sm },
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
  saveButton: { marginTop: Spacing.base },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },
  modalForm: { padding: Spacing.base, paddingBottom: 120 },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  cancelButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: colors.textSecondary,
  },
  saveModalButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModalButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
});

export default CreateInvoiceScreen;
