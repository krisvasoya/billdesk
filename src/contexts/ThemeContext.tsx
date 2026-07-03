// src/contexts/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { storage, StorageKeys } from '../storage';
import { LightColors, DarkColors, type AppColors } from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  colors: AppColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  
  // Read stored preference or default to 'system'
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = storage.getString(StorageKeys.THEME);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored as ThemeMode;
    }
    return 'system';
  });

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    storage.set(StorageKeys.THEME, mode);
  };

  // Determine if theme is dark
  const isDark = theme === 'system' ? systemScheme === 'dark' : theme === 'dark';
  const colors = isDark ? DarkColors : LightColors;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
