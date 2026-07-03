// app/(tabs)/payments.tsx
import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { useTabBarHeight } from '../../src/hooks/useTabBarHeight';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Plus, Receipt } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, Shadow } from '../../src/constants/theme';
import { PaymentCard } from '../../src/components/shared/PaymentCard';
import { SearchBar } from '../../src/components/ui/SearchBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useAuth } from '../../src/contexts/AuthContext';
import { paymentService } from '../../src/services/database/paymentService';

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { shopId } = useAuth();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payments', shopId, search],
    queryFn: () => paymentService.getAll(shopId || '', { search }),
    enabled: !!shopId,
  });

  const tabBarHeight = useTabBarHeight();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('payments.title', 'Payments')}</Text>
      </View>

      <View style={styles.searchSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t('payments.searchPlaceholder', 'Search payments...')}
        />
      </View>

      <FlatList
        data={data?.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PaymentCard
            payment={item}
            onPress={() => router.push('/payments')}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<Receipt size={36} color={colors.primary} />}
              title={t('payments.noPayments', 'No payments recorded')}
              description={t('payments.recordFirst', 'Record payments received from customers')}
              actionLabel={t('payments.recordPayment', 'Record Payment')}
              onAction={() => router.push('/payments/record')}
            />
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight - 24 }]}
        onPress={() => router.push('/payments/record')}
        activeOpacity={0.8}
      >
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </TouchableOpacity>
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
});
