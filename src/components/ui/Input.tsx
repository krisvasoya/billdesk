// src/components/ui/Input.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  type TextInputProps,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, BorderRadius, FontSize, Spacing } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  required,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = useSharedValue<string>(colors.border);

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  useEffect(() => {
    if (!focused) {
      borderColor.value = error ? colors.error : colors.border;
    }
  }, [colors.border, focused, error]);

  const handleFocus = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    setFocused(true);
    borderColor.value = withSpring(colors.primary, { damping: 20 });
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setFocused(false);
    borderColor.value = withSpring(error ? colors.error : colors.border, { damping: 20 });
    onBlur?.(e);
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <Animated.View
        style={[
          styles.inputContainer,
          animatedBorder,
          error ? styles.errorBorder : null,
          focused ? styles.focusedContainer : null,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null, rightIcon ? styles.inputWithRight : null]}
          placeholderTextColor={colors.textDisabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { marginBottom: Spacing.base },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  required: { color: colors.error },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface,
    minHeight: 50,
  },
  errorBorder: { borderColor: colors.error },
  focusedContainer: { backgroundColor: colors.surface },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: colors.textPrimary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  inputWithLeft: { paddingLeft: 0 },
  inputWithRight: { paddingRight: 0 },
  leftIcon: { paddingLeft: Spacing.base },
  rightIcon: { paddingRight: Spacing.base },
  errorText: { fontSize: FontSize.xs, color: colors.error, marginTop: 4 },
  hint: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 4 },
});
