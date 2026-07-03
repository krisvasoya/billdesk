// app/(tabs)/notifications.tsx
import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useTabBarHeight } from '../../src/hooks/useTabBarHeight';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../src/constants/theme';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { SkeletonCard } from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/contexts/AuthContext';
import { notificationService } from '../../src/services/database/notificationService';
import type { AppNotification } from '../../src/types';

const getTypeIcons = (colors: AppColors): Record<string, { icon: string; color: string; bg: string }> => ({
  invoice_created: { icon: '📋', color: colors.info, bg: colors.infoLight },
  payment_received: { icon: '💰', color: colors.success, bg: colors.successLight },
  payment_due: { icon: '⏰', color: colors.warning, bg: colors.warningLight },
  outstanding_reminder: { icon: '🔔', color: colors.error, bg: colors.errorLight },
  sync_status: { icon: '☁️', color: colors.primary, bg: colors.primaryLight },
});

const fmtTime = (dt: string) => {
  try {
    const date = new Date(dt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
};

function NotificationItem({
  item,
  onMarkRead,
  onDelete,
  colors,
  styles,
}: {
  item: AppNotification;
  onMarkRead: () => void;
  onDelete: () => void;
  colors: AppColors;
  styles: any;
}) {
  const typeIcons = getTypeIcons(colors);
  const meta = typeIcons[item.type] ?? typeIcons.sync_status;

  return (
    <View style={[styles.notifCard, !item.isRead && styles.notifCardUnread]}>
      <View style={[styles.notifIcon, { backgroundColor: meta.bg }]}>
        <Text style={styles.notifEmoji}>{meta.icon}</Text>
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notifTime}>{fmtTime(item.createdAt)}</Text>
      </View>
      <View style={styles.notifActions}>
        {!item.isRead && (
          <TouchableOpacity style={styles.actionBtn} onPress={onMarkRead}>
            <Check size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
          <Trash2 size={14} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const { shopId } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', shopId],
    queryFn: () => notificationService.getAll(shopId || ''),
    enabled: !!shopId,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(shopId || ''),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const clearAllMutation = useMutation({
    mutationFn: () => notificationService.clearAll(shopId || ''),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleClearAll = () => {
    Alert.alert(t('notifications.clearAll', 'Clear All'), t('notifications.clearConfirm', 'Remove all notifications?'), [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      { text: t('notifications.clearAll', 'Clear All'), style: 'destructive', onPress: () => clearAllMutation.mutate() },
    ]);
  };

  const { t } = useTranslation();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const { colors } = useTheme();
  const tabBarHeight = useTabBarHeight();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('notifications.title', 'Notifications')}</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>{unreadCount} {t('notifications.unread', 'unread')}</Text>
          )}
        </View>
        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.headerBtn} onPress={() => markAllReadMutation.mutate()}>
                <CheckCheck size={16} color={colors.primary} />
                <Text style={styles.headerBtnText}>{t('notifications.markAllRead', 'Mark all read')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.headerBtn} onPress={handleClearAll}>
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={{ padding: Spacing.base }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationItem
              item={item}
              onMarkRead={() => markReadMutation.mutate(item.id)}
              onDelete={() => deleteMutation.mutate(item.id)}
              colors={colors}
              styles={styles}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.primary]} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={36} color={colors.primary} />}
              title={t('notifications.noNotifications', 'No notifications')}
              description={t('notifications.allCaughtUp', 'You\'re all caught up! Notifications about invoices and payments will appear here.')}
            />
          }
        />
      )}
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: Spacing.xl, paddingHorizontal: Spacing.base, marginBottom: Spacing.base,
  },
  title: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: colors.textPrimary },
  unreadCount: { fontSize: FontSize.sm, color: colors.primary, fontWeight: FontWeight.medium, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    padding: 8, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  headerBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: colors.primary },
  listContent: { paddingHorizontal: Spacing.base },
  notifCard: {
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.border,
    padding: Spacing.base, marginBottom: Spacing.sm, ...Shadow.sm,
  },
  notifCardUnread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  notifIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  notifEmoji: { fontSize: 20 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: colors.textPrimary },
  notifTitleUnread: { fontWeight: FontWeight.bold },
  notifBody: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  notifTime: { fontSize: FontSize.xs, color: colors.textDisabled, marginTop: 4 },
  notifActions: { flexDirection: 'column', gap: Spacing.xs, alignItems: 'center' },
  actionBtn: {
    padding: 6, borderRadius: BorderRadius.sm,
    borderWidth: 1, borderColor: colors.border,
  },
});
