// src/components/ui/Skeleton.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { type AppColors, BorderRadius } from '../../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = BorderRadius.md,
  style,
}) => {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 900 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const styles = getStyles(colors);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={40} height={40} borderRadius={BorderRadius.full} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
        </View>
        <Skeleton width={60} height={14} />
      </View>
      <Skeleton width="100%" height={1} style={{ marginTop: 12 }} />
      <View style={[styles.row, { marginTop: 12 }]}>
        <Skeleton width="30%" height={12} />
        <Skeleton width="30%" height={12} />
        <Skeleton width="25%" height={12} />
      </View>
    </View>
  );
};

const getStyles = (colors: AppColors) => StyleSheet.create({
  skeleton: { backgroundColor: colors.border },
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
