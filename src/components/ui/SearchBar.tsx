// src/components/ui/SearchBar.tsx
import React, { useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, BorderRadius, FontSize, Spacing } from '../../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
}) => {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  const styles = getStyles(colors);

  return (
    <View style={[styles.container, focused && styles.focused]}>
      <Search size={18} color={focused ? colors.primary : colors.textSecondary} strokeWidth={2} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={16} color={colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  focused: { borderColor: colors.primary },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: colors.textPrimary,
    padding: 0,
  },
});
