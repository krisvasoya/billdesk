// app/search.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Search } from 'lucide-react-native';
import debounce from 'debounce';
import { useTheme } from '../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { useAuth } from '../src/contexts/AuthContext';
import { customerService } from '../src/services/database/customerService';
import { buyerService } from '../src/services/database/buyerService';
import { invoiceService } from '../src/services/database/invoiceService';
import { CURRENCY_SYMBOL } from '../src/constants';

type ResultType = 'customer' | 'buyer' | 'invoice';

interface SearchResult {
  id: string;
  type: ResultType;
  primary: string;
  secondary?: string;
  meta?: string;
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { shopId } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debounceSetQuery = useCallback(
    debounce((q: string) => setDebouncedQuery(q), 300),
    []
  );

  const handleSearch = (text: string) => {
    setQuery(text);
    debounceSetQuery(text);
  };

  const isActive = debouncedQuery.trim().length >= 1;

  const { data: customerResults, isFetching: custFetching } = useQuery({
    queryKey: ['search-customers', shopId, debouncedQuery],
    queryFn: () => customerService.getAll(shopId || '', { search: debouncedQuery, pageSize: 5 }),
    enabled: !!shopId && isActive,
  });

  const { data: buyerResults, isFetching: buyerFetching } = useQuery({
    queryKey: ['search-buyers', shopId, debouncedQuery],
    queryFn: () => buyerService.getAll(shopId || '', { search: debouncedQuery, pageSize: 5 }),
    enabled: !!shopId && isActive,
  });

  const { data: invoiceResults, isFetching: invFetching } = useQuery({
    queryKey: ['search-invoices', shopId, debouncedQuery],
    queryFn: () => invoiceService.getAll(shopId || '', { search: debouncedQuery, pageSize: 5 }),
    enabled: !!shopId && isActive,
  });

  const isLoading = custFetching || buyerFetching || invFetching;

  const results: SearchResult[] = [
    ...(customerResults?.data ?? []).map(c => ({
      id: c.id,
      type: 'customer' as const,
      primary: c.name,
      secondary: c.mobile,
      meta: c.outstanding > 0 ? `${t('customers.outstanding', 'Outstanding')}: ${CURRENCY_SYMBOL}${c.outstanding.toFixed(0)}` : t('common.cleared', 'Cleared'),
    })),
    ...(buyerResults?.data ?? []).map(b => ({
      id: b.id,
      type: 'buyer' as const,
      primary: b.name,
      secondary: b.mobile,
      meta: (b.outstanding ?? 0) > 0 ? `${t('customers.outstanding', 'Outstanding')}: ${CURRENCY_SYMBOL}${(b.outstanding ?? 0).toFixed(0)}` : t('common.cleared', 'Cleared'),
    })),
    ...(invoiceResults?.data ?? []).map(i => ({
      id: i.id,
      type: 'invoice' as const,
      primary: i.invoiceNumber,
      secondary: i.customerName,
      meta: `${CURRENCY_SYMBOL}${i.grandTotal.toFixed(0)} · ${i.status.toUpperCase()}`,
    })),
  ];

  const typeConfig = {
    customer: { label: t('customers.title', 'Customer'), color: colors.info, route: (id: string) => `/customer/${id}` as const },
    buyer: { label: t('buyers.title', 'Buyer'), color: colors.primary, route: (id: string) => `/buyer/${id}` as const },
    invoice: { label: t('invoices.title', 'Invoice'), color: colors.accentGold, route: (id: string) => `/invoice/${id}` as const },
  };

  const handlePress = (item: SearchResult) => {
    const config = typeConfig[item.type];
    router.push(config.route(item.id) as never);
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchWrapper}>
          <Search size={16} color={colors.textDisabled} style={styles.searchIcon} />
          <Input
            value={query}
            onChangeText={handleSearch}
            placeholder={t('search.searchPlaceholder', 'Search customers, invoices...')}
            style={styles.searchInput}
            autoFocus
          />
        </View>
      </View>

      {!isActive ? (
        <View style={styles.hintBox}>
          <Search size={40} color={colors.textDisabled} />
          <Text style={styles.hintTitle}>{t('search.searchBilldesk', 'Search BillDesk')}</Text>
          <Text style={styles.hintSub}>{t('search.hintSub', 'Find customers, buyers, invoices by name, mobile, invoice number, or GST number')}</Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('search.searching', 'Searching...')}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>{t('search.noResults', 'No results found')}</Text>
          <Text style={styles.hintSub}>{t('search.tryDifferent', 'Try a different search term')}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={({ item }) => {
            const config = typeConfig[item.type];
            return (
              <TouchableOpacity style={styles.resultCard} onPress={() => handlePress(item)} activeOpacity={0.7}>
                <View style={[styles.typeBadge, { backgroundColor: config.color + '20' }]}>
                  <Text style={[styles.typeLabel, { color: config.color }]}>{config.label}</Text>
                </View>
                <View style={styles.resultContent}>
                  <Text style={styles.resultPrimary} numberOfLines={1}>{item.primary}</Text>
                  {item.secondary ? <Text style={styles.resultSecondary}>{item.secondary}</Text> : null}
                </View>
                {item.meta ? <Text style={styles.resultMeta}>{item.meta}</Text> : null}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.base }]}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Spacing.xl, paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: Spacing.sm,
  },
  backBtn: { padding: 4 },
  searchWrapper: { flex: 1, position: 'relative' },
  searchIcon: { position: 'absolute', left: 12, top: '50%', zIndex: 1 },
  searchInput: { paddingLeft: 36, marginBottom: 0 },
  hintBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] },
  hintTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: colors.textPrimary, marginTop: Spacing.base },
  hintSub: { fontSize: FontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.base },
  loadingText: { fontSize: FontSize.sm, color: colors.textSecondary },
  listContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  resultCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: Spacing.base, marginBottom: Spacing.sm, ...Shadow.sm,
    gap: Spacing.sm,
  },
  typeBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  typeLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textTransform: 'uppercase' },
  resultContent: { flex: 1 },
  resultPrimary: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  resultSecondary: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 1 },
  resultMeta: { fontSize: FontSize.xs, color: colors.textSecondary, textAlign: 'right' },
});
