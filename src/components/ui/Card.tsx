// src/components/ui/Card.tsx
import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, BorderRadius, Spacing, Shadow } from '../../constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  shadow = 'sm',
  style,
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  return (
    <View
      style={[
        styles.card,
        paddingStyles[padding],
        shadow !== 'none' ? (isDark ? { ...Shadow[shadow], shadowOpacity: 0.2, elevation: 0 } : Shadow[shadow]) : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const getStyles = (colors: AppColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

const paddingStyles = {
  none: {},
  sm: { padding: Spacing.md },
  md: { padding: Spacing.base },
  lg: { padding: Spacing.xl },
};
