// src/components/shared/StatCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../ui/Card';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, FontSize, FontWeight, Spacing, BorderRadius } from '../../constants/theme';
import { CURRENCY_SYMBOL } from '../../constants';

interface StatCardProps {
  title: string;
  value: number | string;
  isCurrency?: boolean;
  icon: React.ReactNode;
  iconBg?: string;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  isCurrency = false,
  icon,
  iconBg,
  trend,
  subtitle,
}) => {
  const { colors } = useTheme();
  const displayValue = isCurrency
    ? `${CURRENCY_SYMBOL}${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : String(value);

  const activeIconBg = iconBg || colors.primaryLight;
  const styles = getStyles(colors);

  return (
    <Card style={styles.card} shadow="md">
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: activeIconBg }]}>{icon}</View>
        {trend && (
          <View style={[styles.trend, { backgroundColor: trend.isPositive ? colors.successLight : colors.errorLight }]}>
            <Text style={[styles.trendText, { color: trend.isPositive ? colors.success : colors.error }]}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {displayValue}
      </Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Card>
  );
};

const getStyles = (colors: AppColors) => StyleSheet.create({
  card: { flex: 1, minWidth: 150, padding: Spacing.base },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trend: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  trendText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  value: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  title: { fontSize: FontSize.sm, color: colors.textSecondary, fontWeight: FontWeight.medium },
  subtitle: { fontSize: FontSize.xs, color: colors.textDisabled, marginTop: 2 },
});
