// src/components/shared/OfflineBanner.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CloudOff, RefreshCw } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius } from '../../constants/theme';
import { syncService } from '../../services/syncService';
import { useAuth } from '../../contexts/AuthContext';

export function OfflineBanner() {
  const { shopId } = useAuth();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [syncing, setSyncing] = useState(false);

  const { data: pendingCount = 0, refetch } = useQuery({
    queryKey: ['sync-pending-count', shopId],
    queryFn: () => syncService.getPendingCount(),
    enabled: !!shopId,
    refetchInterval: 10000, // poll every 10s
  });

  const handleSync = async () => {
    if (!shopId || syncing) return;
    setSyncing(true);
    try {
      const res = await syncService.runSync(shopId);
      if (res.success && res.syncedCount > 0) {
        queryClient.invalidateQueries();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
      refetch();
    }
  };

  if (pendingCount === 0) return null;

  const styles = getStyles(colors);

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <CloudOff size={16} color={colors.warning} />
        <Text style={styles.text}>
          {pendingCount} operation{pendingCount > 1 ? 's' : ''} pending sync
        </Text>
      </View>
      <TouchableOpacity
        style={styles.syncBtn}
        onPress={handleSync}
        disabled={syncing}
        activeOpacity={0.7}
      >
        {syncing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <RefreshCw size={12} color="#FFFFFF" />
            <Text style={styles.btnText}>Sync Now</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningLight,
    borderColor: colors.warning + '30',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  text: {
    fontSize: FontSize.xs,
    color: colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  btnText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: FontWeight.bold,
  },
});
