// src/components/shared/PaymentCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Banknote, Smartphone, Building2, FileText, CreditCard } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import type { Payment } from '../../types';
import { CURRENCY_SYMBOL } from '../../constants';

interface PaymentCardProps {
  payment: Payment;
  onPress?: () => void;
}

const getMethodIcons = (colors: AppColors): Record<string, React.ReactNode> => ({
  cash: <Banknote size={18} color={colors.success} strokeWidth={1.5} />,
  upi: <Smartphone size={18} color={colors.info} strokeWidth={1.5} />,
  bank: <Building2 size={18} color={colors.primary} strokeWidth={1.5} />,
  cheque: <FileText size={18} color={colors.warning} strokeWidth={1.5} />,
  card: <CreditCard size={18} color={colors.accentGold} strokeWidth={1.5} />,
});

const getMethodColors = (colors: AppColors): Record<string, string> => ({
  cash: colors.successLight,
  upi: colors.infoLight,
  bank: colors.primaryLight,
  cheque: colors.warningLight,
  card: colors.accentGoldLight,
});

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const PaymentCard: React.FC<PaymentCardProps> = ({ payment, onPress }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const methodColors = getMethodColors(colors);
  const methodIcons = getMethodIcons(colors);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.icon, { backgroundColor: methodColors[payment.paymentMode] ?? colors.surfaceVariant }]}>
        {methodIcons[payment.paymentMode] ?? <Banknote size={18} color={colors.textSecondary} />}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{payment.customerName}</Text>
        <Text style={styles.meta}>
          {payment.paymentMode.toUpperCase()}{payment.invoiceNumber ? ` · ${payment.invoiceNumber}` : ''}
        </Text>
        <Text style={styles.date}>{formatDate(payment.paymentDate)}</Text>
      </View>
      <Text style={styles.amount}>
        {CURRENCY_SYMBOL}{payment.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </Text>
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
  icon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  info: { flex: 1 },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  meta: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  date: { fontSize: FontSize.xs, color: colors.textDisabled, marginTop: 2 },
  amount: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: colors.success },
});
