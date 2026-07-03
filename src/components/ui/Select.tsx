// src/components/ui/Select.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  FlatList, TextInput, Platform,
} from 'react-native';
import { ChevronDown, X, Check } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../../constants/theme';

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  error?: string;
  searchable?: boolean;
  disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label, value, options, placeholder = 'Select...', onChange, error, searchable = false, disabled = false,
}) => {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedLabel = options.find(o => o.value === value)?.label;

  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = (val: string) => {
    onChange(val);
    setVisible(false);
    setSearch('');
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.trigger, error ? styles.triggerError : null, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !selectedLabel && styles.placeholderText]} numberOfLines={1}>
          {selectedLabel ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label ?? 'Select'}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search..."
                  placeholderTextColor={colors.textDisabled}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                  autoFocus
                />
              </View>
            )}

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item.value === value && styles.optionSelected]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionTextSelected]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: colors.textPrimary, marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  triggerError: { borderColor: colors.error },
  triggerDisabled: { backgroundColor: colors.surfaceVariant, opacity: 0.6 },
  triggerText: { fontSize: FontSize.base, color: colors.textPrimary, flex: 1 },
  placeholderText: { color: colors.textDisabled },
  errorText: { fontSize: FontSize.xs, color: colors.error, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    ...Shadow.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sheetTitle: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: colors.textPrimary },
  searchRow: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    fontSize: FontSize.base,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  optionSelected: { backgroundColor: colors.primaryLight },
  optionText: { fontSize: FontSize.base, color: colors.textPrimary },
  optionTextSelected: { color: colors.primary, fontWeight: FontWeight.semibold },
});
