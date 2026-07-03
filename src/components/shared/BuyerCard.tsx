// src/components/shared/BuyerCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, User } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../constants/theme';
import type { Buyer } from '../../types';
import { CURRENCY_SYMBOL } from '../../constants';

interface BuyerCardProps {
  buyer: Buyer;
  onPress?: () => void;
}

export const BuyerCard: React.FC<BuyerCardProps> = ({ buyer, onPress }) => {
  const { colors } = useTheme();
  const hasOutstanding = (buyer.outstanding ?? 0) > 0;
  const styles = getStyles(colors);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <User size={20} color={colors.primary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>{buyer.name}</Text>
        {buyer.mobile ? <Text style={styles.mobile}>{buyer.mobile}</Text> : null}
        {buyer.gst ? <Text style={styles.gst}>GST: {buyer.gst}</Text> : null}
      </View>

      <View style={styles.right}>
        {hasOutstanding ? (
          <>
            <Text style={styles.outstandingLabel}>Outstanding</Text>
            <Text style={styles.outstanding}>{CURRENCY_SYMBOL}{(buyer.outstanding ?? 0).toFixed(2)}</Text>
          </>
        ) : (
          <View style={styles.clearedBadge}>
            <Text style={styles.clearedText}>Cleared</Text>
          </View>
        )}
        <ChevronRight size={16} color={colors.textDisabled} style={{ marginTop: 4 }} />
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
    padding: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  content: { flex: 1 },
  name: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  mobile: { fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 2 },
  gst: { fontSize: FontSize.xs, color: colors.textDisabled, marginTop: 1 },
  right: { alignItems: 'flex-end' },
  outstandingLabel: { fontSize: FontSize.xs, color: colors.textDisabled },
  outstanding: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: colors.error },
  clearedBadge: {
    backgroundColor: colors.successLight,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  clearedText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: colors.success },
});
