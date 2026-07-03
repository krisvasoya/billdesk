// app/_layout.tsx
import 'react-native-gesture-handler';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ShopProvider } from '../src/contexts/ShopContext';
import { initDatabase } from '../src/services/database/db';
import { loadStorageCache } from '../src/storage';
import '../src/services/i18n';
import { telemetry } from '../src/services/telemetryService';

import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import {
  ThemeProvider as NavigationThemeProvider,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { StartupScreen } from '../src/components/StartupScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

// ─── Inner layout (has access to all context values) ─────────────────────────
function RootLayoutContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // DB initialization state
  const [dbReady, setDbReady] = useState(false);

  // Whether startup overlay has been dismissed
  const [startupDone, setStartupDone] = useState(false);

  // isReady = both DB and auth context have settled
  const isReady = dbReady && !authLoading;

  useEffect(() => {
    if (isReady) {
      if (!isAuthenticated) {
        router.replace('/(auth)/login');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isReady, isAuthenticated]);

  useEffect(() => {
    let mounted = true;
    async function setup() {
      try {
        await loadStorageCache();
        await initDatabase();
      } catch (err) {
        console.error('[BillDesk] DB init error:', err);
      } finally {
        if (mounted) setDbReady(true);
      }
    }
    setup();
    return () => { mounted = false; };
  }, []);

  // ── Theme objects ─────────────────────────────────────────────────────────
  const paperTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: colors.primary,
      secondary: colors.primaryDark,
      background: colors.background,
      surface: colors.surface,
      error: colors.error,
    },
  };

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.error,
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationThemeProvider value={navTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/*
          Stack MUST always be mounted — Expo Router requires it to initialise
          navigation. The startup overlay sits on top of it as an absolute layer.
        */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="__blank" options={{ animation: 'none' }} />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="invoice/create" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="invoice/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="customer/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="buyer/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="payments/record" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="reports" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="search" options={{ animation: 'slide_from_right' }} />
        </Stack>

        {/*
          StartupScreen overlay — absolute on top of everything, z=999.
          It receives isReady so it knows when real initialization is done.
          Once its exit animation completes it calls onFinish → we remove it.
        */}
        {!startupDone && (
          <StartupScreen
            isReady={isReady}
            onFinish={() => setStartupDone(true)}
          />
        )}
      </NavigationThemeProvider>
    </PaperProvider>
  );
}

// ─── Root export (providers) ──────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ShopProvider>
            <RootLayoutContent />
          </ShopProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
