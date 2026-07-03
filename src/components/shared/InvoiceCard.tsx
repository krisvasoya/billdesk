// src/components/shared/InvoiceCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FileText, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../../constants/theme';
import { Badge } from '../ui/Badge';
import type { Invoice } from '../../types';
import { CURRENCY_SYMBOL } from '../../constants';

interface InvoiceCardProps {
  invoice: Invoice;
  onPress?: () => void;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAmount = (amount: number) =>
  `${CURRENCY_SYMBOL}${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, onPress }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.top}>
        <View style={styles.iconContainer}>
          <FileText size={20} color={colors.primary} strokeWidth={1.5} />
        </View>
        <View style={styles.info}>
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          <Text style={styles.customerName} numberOfLines={1}>{invoice.customerName}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>{formatAmount(invoice.grandTotal)}</Text>
          <Badge label={invoice.status} variant={invoice.status} />
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.bottom}>
        <Text style={styles.metaText}>{formatDate(invoice.invoiceDate)}</Text>
        {invoice.pendingAmount > 0 && (
          <Text style={styles.outstanding}>Due: {formatAmount(invoice.pendingAmount)}</Text>
        )}
        <ChevronRight size={14} color={colors.textDisabled} strokeWidth={2} />
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.sm,
  },
  top: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  info: { flex: 1 },
  invoiceNumber: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  customerName: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: colors.divider, marginHorizontal: Spacing.base },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  metaText: { fontSize: FontSize.xs, color: colors.textSecondary },
  outstanding: { fontSize: FontSize.xs, color: colors.error, fontWeight: FontWeight.medium },
});
