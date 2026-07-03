// src/components/ui/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, BorderRadius, FontSize } from '../../constants/theme';
import type { InvoiceStatus } from '../../types';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | InvoiceStatus;

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const getVariantMap = (colors: AppColors): Record<string, { bg: string; text: string }> => ({
  success: { bg: colors.successLight, text: colors.success },
  warning: { bg: colors.warningLight, text: colors.warning },
  error: { bg: colors.errorLight, text: colors.error },
  info: { bg: colors.infoLight, text: colors.info },
  neutral: { bg: colors.surfaceVariant, text: colors.textSecondary },
  paid: { bg: colors.successLight, text: colors.success },
  pending: { bg: colors.warningLight, text: colors.warning },
  overdue: { bg: colors.errorLight, text: colors.error },
  partial: { bg: colors.infoLight, text: colors.info },
  draft: { bg: colors.surfaceVariant, text: colors.textSecondary },
  cancelled: { bg: colors.surfaceVariant, text: colors.textSecondary },
});

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral' }) => {
  const { colors } = useTheme();
  const variantMap = getVariantMap(colors);
  const badgeColors = variantMap[variant] ?? variantMap.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
      <Text style={[styles.text, { color: badgeColors.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
