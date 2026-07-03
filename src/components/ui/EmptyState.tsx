// src/components/ui/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, FontSize, FontWeight, Spacing } from '../../constants/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="md"
          style={{ marginTop: Spacing.lg }}
        />
      )}
    </View>
  );
};

// src/components/ui/ErrorState.tsx
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Please try again.',
  onRetry,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.error }]}>{title}</Text>
      <Text style={styles.description}>{message}</Text>
      {onRetry && (
        <Button
          title="Retry"
          onPress={onRetry}
          variant="outline"
          size="md"
          style={{ marginTop: Spacing.lg }}
        />
      )}
    </View>
  );
};

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['4xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
