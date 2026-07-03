// app/(tabs)/invoices.tsx
import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTabBarHeight } from '../../src/hooks/useTabBarHeight';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants/theme';
import { InvoiceCard } from '../../src/components/shared/InvoiceCard';
import { SearchBar } from '../../src/components/ui/SearchBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/contexts/AuthContext';
import { invoiceService } from '../../src/services/database/invoiceService';
import type { InvoiceStatus } from '../../src/types';

export default function InvoicesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { shopId } = useAuth();
  const { colors } = useTheme();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoices', shopId, search, statusFilter],
    queryFn: () => invoiceService.getAll(shopId || '', {
      search,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    enabled: !!shopId,
  });

  const statuses: (InvoiceStatus | 'all')[] = ['all', 'paid', 'pending', 'partial', 'overdue', 'cancelled'];
  const tabBarHeight = useTabBarHeight();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('invoices.title', 'Invoices')}</Text>
      </View>

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('invoices.searchPlaceholder', 'Search invoices...')}
        />
      </View>

      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {statuses.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterChipText, statusFilter === status && styles.filterChipTextActive]}>
                {status === 'all' ? t('common.all', 'All') : t(`invoices.status.${status}`, status)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <InvoiceCard
            invoice={item}
            onPress={() => router.push(`/invoice/${item.id}`)}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<FileSpreadsheet size={36} color={colors.primary} />}
              title={t('invoices.noInvoices', 'No invoices yet')}
              description={t('invoices.createFirst', 'Create your first invoice to bill customers')}
              actionLabel={t('invoices.createInvoice', 'Create Invoice')}
              onAction={() => router.push('/invoice/create')}
            />
          ) : null
        }
      />
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { marginTop: Spacing.xl, paddingHorizontal: Spacing.base, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary },
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
});
