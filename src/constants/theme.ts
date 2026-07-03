// src/constants/theme.ts
export const LightColors = {
  primary: '#0F8B6D',
  primaryDark: '#065F46',
  primaryLight: '#D1FAE5',
  accentGold: '#C9A227',
  accentGoldLight: '#FEF3C7',

  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  overlay: 'rgba(0,0,0,0.5)',

  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse: '#FFFFFF',

  border: '#E5E7EB',
  borderFocus: '#0F8B6D',
  divider: '#F3F4F6',

  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',

  // Status
  paid: '#16A34A',
  pending: '#F59E0B',
  overdue: '#EF4444',
  partial: '#2563EB',
} as const;

export const DarkColors = {
  primary: '#0F8B6D', // brand teal remains
  primaryDark: '#065F46',
  primaryLight: '#112E2B', // dark teal tint for dark mode context
  accentGold: '#DDAF38',
  accentGoldLight: '#2C2512',

  background: '#121212', // standard material dark background
  surface: '#1E1E1E', // elevated card/surface color
  surfaceVariant: '#2A2A2A',
  overlay: 'rgba(0,0,0,0.7)',

  textPrimary: '#F5F5F5', // high contrast off-white text
  textSecondary: '#A3A3A3', // medium contrast grey
  textDisabled: '#525252',
  textInverse: '#121212', // black text on primary background

  border: '#2D2D2D',
  borderFocus: '#0F8B6D',
  divider: '#262626',

  success: '#10B981',
  successLight: '#062C21',
  warning: '#F59E0B',
  warningLight: '#352504',
  error: '#EF4444',
  errorLight: '#3A1616',
  info: '#3B82F6',
  infoLight: '#0D2147',

  // Status
  paid: '#10B981',
  pending: '#F59E0B',
  overdue: '#EF4444',
  partial: '#3B82F6',
} as const;

export const Colors = LightColors;
export type AppColors = {
  [K in keyof typeof LightColors]: string;
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export const Breakpoints = {
  sm: 375,
  md: 768,
  lg: 1024,
} as const;
