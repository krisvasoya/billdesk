// src/components/ui/Button.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  type TouchableOpacityProps,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  onPress,
  style,
  ...rest
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const isDisabled = disabled || loading;
  const styles = getStyles();
  const variantStyle = getVariantStyles(colors)[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        variantStyle.container,
        sizeStyle.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.textInverse}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={[styles.text, variantStyle.text, sizeStyle.text]}>{title}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </AnimatedTouchable>
  );
};

const getStyles = () => StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: FontWeight.semibold },
  iconLeft: { marginRight: Spacing.sm },
  iconRight: { marginLeft: Spacing.sm },
});

const getVariantStyles = (colors: AppColors) => ({
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.textInverse },
  },
  secondary: {
    container: { backgroundColor: colors.primaryDark },
    text: { color: colors.textInverse },
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
    text: { color: colors.primary },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.primary },
  },
  danger: {
    container: { backgroundColor: colors.error },
    text: { color: colors.textInverse },
  },
});

const sizeStyles = {
  sm: {
    container: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 36 },
    text: { fontSize: FontSize.sm },
  },
  md: {
    container: { paddingHorizontal: Spacing.lg, paddingVertical: 14, minHeight: 48 },
    text: { fontSize: FontSize.base },
  },
  lg: {
    container: { paddingHorizontal: Spacing.xl, paddingVertical: 16, minHeight: 56 },
    text: { fontSize: FontSize.md },
  },
};
