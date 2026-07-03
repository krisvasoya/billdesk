// src/components/shared/CustomerCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import type { Customer } from '../../types';
import { CURRENCY_SYMBOL } from '../../constants';

interface CustomerCardProps {
  customer: Customer;
  onPress?: () => void;
}

const formatAmount = (amount: number) =>
  `${CURRENCY_SYMBOL}${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const getAvatarColor = (name: string) => {
  const colors = ['#0F8B6D', '#065F46', '#2563EB', '#7C3AED', '#DC2626', '#D97706'];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
};

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer, onPress }) => {
  const { colors } = useTheme();
  const outstanding = customer.outstanding;
  const isCredit = outstanding < 0;
  const styles = getStyles(colors);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(customer.name) }]}>
        <Text style={styles.initials}>{getInitials(customer.name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{customer.name}</Text>
        <Text style={styles.mobile}>{customer.mobile ?? 'No phone'}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.outstanding, { color: outstanding > 0 ? colors.error : colors.success }]}>
          {outstanding > 0 ? formatAmount(outstanding) : outstanding < 0 ? `+${formatAmount(outstanding)}` : '₹0'}
        </Text>
        <Text style={styles.balanceLabel}>
          {outstanding > 0 ? 'Outstanding' : outstanding < 0 ? 'Advance' : 'Clear'}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.textDisabled} strokeWidth={2} style={styles.chevron} />
    </TouchableOpacity>
  );
};

const getStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.md,
    padding: Spacing.base,
    ...Shadow.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  initials: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#FFFFFF' },
  info: { flex: 1 },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  mobile: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', marginRight: Spacing.sm },
  outstanding: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  balanceLabel: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  chevron: { marginLeft: 4 },
});
