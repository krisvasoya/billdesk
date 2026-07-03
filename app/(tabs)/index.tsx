// app/(tabs)/index.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useTabBarHeight } from '../../src/hooks/useTabBarHeight';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { TrendingUp, CreditCard, ArrowDownLeft, Users, FileSpreadsheet, PlusCircle, ArrowUpRight, FileText, Search, Bell, UserCheck, Calendar } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius } from '../../src/constants/theme';
import { StatCard } from '../../src/components/shared/StatCard';
import { InvoiceCard } from '../../src/components/shared/InvoiceCard';
import { PaymentCard } from '../../src/components/shared/PaymentCard';
import { SkeletonCard } from '../../src/components/ui/Skeleton';
import { OfflineBanner } from '../../src/components/shared/OfflineBanner';
import { useAuth } from '../../src/contexts/AuthContext';
import { useShop } from '../../src/contexts/ShopContext';
import { invoiceService } from '../../src/services/database/invoiceService';
import { paymentService } from '../../src/services/database/paymentService';
import { DATE_FILTERS, CURRENCY_SYMBOL } from '../../src/constants';

type DateFilterVal = typeof DATE_FILTERS[number]['value'];

export function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { shopId } = useAuth();
  const { shop } = useShop();
  const { colors } = useTheme();
  const [filter, setFilter] = useState<DateFilterVal>('month');
  const [refreshing, setRefreshing] = useState(false);

  const getDates = useCallback((filterVal: DateFilterVal) => {
    const end = new Date();
    const start = new Date();
    if (filterVal === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (filterVal === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (filterVal === 'month') {
      start.setMonth(end.getMonth() - 1);
    } else if (filterVal === 'year') {
      start.setFullYear(end.getFullYear() - 1);
    } else {
      return { startStr: undefined, endStr: undefined };
    }
    return {
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
    };
  }, []);

  const { startStr, endStr } = getDates(filter);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard-stats', shopId, filter],
    queryFn: () => invoiceService.getStats(shopId || '', startStr, endStr),
    enabled: !!shopId,
  });

  const { data: recentInvoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['recent-invoices', shopId],
    queryFn: () => invoiceService.getAll(shopId || '', { page: 1, pageSize: 3 }),
    enabled: !!shopId,
  });

  const { data: recentPayments, isLoading: paymentsLoading, refetch: refetchPayments } = useQuery({
    queryKey: ['recent-payments', shopId],
    queryFn: () => paymentService.getAll(shopId || '', { page: 1, pageSize: 3 }),
    enabled: !!shopId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchInvoices(), refetchPayments()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return t('dashboard.greetingMorning', 'Good morning');
    if (hrs < 17) return t('dashboard.greetingAfternoon', 'Good afternoon');
    return t('dashboard.greetingEvening', 'Good evening');
  };

  const tabBarHeight = useTabBarHeight();
  const styles = getStyles(colors);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Banner/Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.shopName} numberOfLines={1}>{shop?.shopName || 'My Shop'}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/search' as never)} style={styles.headerIconBtn}>
            <Search size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/notifications' as never)} style={styles.headerIconBtn}>
            <Bell size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings' as never)} style={styles.shopLogoContainer}>
            {shop?.logo ? (
              <Image source={{ uri: shop.logo }} style={styles.shopLogo} />
            ) : (
              <View style={styles.shopLogoPlaceholder}>
                <Text style={styles.shopInitial}>{(shop?.shopName?.[0] ?? 'B').toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <OfflineBanner />

      {/* Date Filters selector bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {DATE_FILTERS.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[styles.filterBadge, filter === item.value && styles.filterBadgeActive]}
            onPress={() => setFilter(item.value)}
          >
            <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>
              {t(`dashboard.${item.value}`, item.label)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* KPI Cards Grid */}
      {statsLoading ? (
        <View style={styles.statsSkeletonGrid}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title={t('dashboard.totalSales', 'Total Sales')}
              value={stats?.totalSales ?? 0}
              isCurrency
              icon={<TrendingUp size={22} color={colors.primary} />}
            />
            <StatCard
              title={t('dashboard.outstanding', 'Outstanding')}
              value={stats?.totalOutstanding ?? 0}
              isCurrency
              icon={<CreditCard size={22} color={colors.error} />}
              iconBg={colors.errorLight}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title={t('dashboard.received', 'Received')}
              value={stats?.totalReceived ?? 0}
              isCurrency
              icon={<ArrowDownLeft size={22} color={colors.success} />}
              iconBg={colors.successLight}
            />
            <StatCard
              title={t('dashboard.todaySales', "Today's Sales")}
              value={stats?.todaySales ?? 0}
              isCurrency
              icon={<Calendar size={22} color={colors.accentGold} />}
              iconBg={colors.accentGoldLight}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title={t('dashboard.customers', 'Customers')}
              value={stats?.totalCustomers ?? 0}
              icon={<Users size={22} color={colors.info} />}
              iconBg={colors.infoLight}
            />
            <StatCard
              title={t('buyers.title', 'Buyers')}
              value={stats?.totalBuyers ?? 0}
              icon={<UserCheck size={22} color={colors.primary} />}
              iconBg={colors.primaryLight}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title={t('invoices.title', 'Total Invoices')}
              value={stats?.totalInvoices ?? 0}
              icon={<FileSpreadsheet size={22} color={colors.info} />}
              iconBg={colors.infoLight}
            />
            <StatCard
              title={t('dashboard.pendingBills', 'Pending Bills')}
              value={stats?.pendingInvoices ?? 0}
              icon={<FileText size={22} color={colors.warning} />}
              iconBg={colors.warningLight}
            />
          </View>
        </View>
      )}

      {/* Quick Actions Panel */}
      <Text style={styles.sectionTitle}>{t('dashboard.quickActions', 'Quick Actions')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsRow}>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/invoice/create')}>
          <View style={[styles.actionIconBg, { backgroundColor: colors.primaryLight }]}>
            <PlusCircle size={22} color={colors.primary} />
          </View>
          <Text style={styles.actionLabel}>{t('dashboard.createInvoice', 'Create Invoice')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/payments/record')}>
          <View style={[styles.actionIconBg, { backgroundColor: colors.successLight }]}>
            <ArrowUpRight size={22} color={colors.success} />
          </View>
          <Text style={styles.actionLabel}>{t('dashboard.receivePayment', 'Record Payment')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/customers')}>
          <View style={[styles.actionIconBg, { backgroundColor: colors.infoLight }]}>
            <Users size={22} color={colors.info} />
          </View>
          <Text style={styles.actionLabel}>{t('dashboard.addCustomer', 'Customers')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/reports' as never)}>
          <View style={[styles.actionIconBg, { backgroundColor: colors.accentGoldLight }]}>
            <FileText size={22} color={colors.accentGold} />
          </View>
          <Text style={styles.actionLabel}>{t('reports.title', 'Reports')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/buyers' as never)}>
          <View style={[styles.actionIconBg, { backgroundColor: colors.primaryLight }]}>
            <UserCheck size={22} color={colors.primary} />
          </View>
          <Text style={styles.actionLabel}>{t('buyers.title', 'Buyers')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/payments' as never)}>
          <View style={[styles.actionIconBg, { backgroundColor: colors.successLight }]}>
            <ArrowDownLeft size={22} color={colors.success} />
          </View>
          <Text style={styles.actionLabel}>{t('payments.title', 'Payments')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Recent Invoices list */}
      <View style={styles.listSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboard.recentInvoices', 'Recent Invoices')}</Text>
          <TouchableOpacity onPress={() => router.push('/invoices')}>
            <Text style={styles.seeAll}>{t('common.seeAll', 'See All')}</Text>
          </TouchableOpacity>
        </View>

        {invoicesLoading ? (
          <SkeletonCard />
        ) : recentInvoices?.data && recentInvoices.data.length > 0 ? (
          recentInvoices.data.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onPress={() => router.push(`/invoice/${inv.id}`)}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('invoices.noInvoices', 'No invoices yet')}</Text>
          </View>
        )}
      </View>

      {/* Recent Payments list */}
      <View style={[styles.listSection, { marginBottom: 100 }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('dashboard.recentPayments', 'Recent Payments')}</Text>
          <TouchableOpacity onPress={() => router.push('/payments')}>
            <Text style={styles.seeAll}>{t('common.seeAll', 'See All')}</Text>
          </TouchableOpacity>
        </View>

        {paymentsLoading ? (
          <SkeletonCard />
        ) : recentPayments?.data && recentPayments.data.length > 0 ? (
          recentPayments.data.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onPress={() => router.push('/payments')}
            />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('payments.noPayments', 'No payments recorded')}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    padding: Spacing.base,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.base,
  },
  headerLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  shopName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginTop: 2,
  },
  shopLogoContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  shopLogo: {
    width: '100%',
    height: '100%',
  },
  shopLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopInitial: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  filterRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  filterBadge: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: FontWeight.semibold,
  },
  statsSkeletonGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    marginBottom: Spacing.base,
    gap: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginVertical: Spacing.md,
  },
  actionsRow: {
    gap: Spacing.md,
    paddingRight: Spacing.base,
    marginBottom: Spacing.base,
  },
  actionCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.base,
    alignItems: 'center',
    width: 100,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  listSection: {
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: {
    fontSize: FontSize.sm,
    color: colors.primary,
    fontWeight: FontWeight.semibold,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
export default DashboardScreen;
