// app/(tabs)/_layout.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import {
  LayoutDashboard, Users, FileSpreadsheet, Settings, Plus,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../src/contexts/ThemeContext';
import { type AppColors, BorderRadius, Spacing, Shadow, FontSize } from '../../src/constants/theme';
import { useAuth } from '../../src/contexts/AuthContext';
import { notificationService } from '../../src/services/database/notificationService';

export default function TabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const { shopId } = useAuth();
  const { colors } = useTheme();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications', shopId],
    queryFn: () => notificationService.getUnreadCount(shopId || ''),
    enabled: !!shopId,
    refetchInterval: 30000, // poll every 30s
  });

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarItemStyle: styles.tabBarItem,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <LayoutDashboard size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="customers"
          options={{
            title: 'Customers',
            tabBarIcon: ({ color, focused }) => (
              <Users size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />

        {/* Centre FAB — Create Invoice */}
        <Tabs.Screen
          name="create-placeholder"
          options={{
            title: '',
            tabBarButton: () => (
              <View style={styles.fabContainer}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.fab}
                  onPress={() => router.push('/invoice/create')}
                >
                  <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="invoices"
          options={{
            title: 'Invoices',
            tabBarIcon: ({ color, focused }) => (
              <FileSpreadsheet size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <Settings size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            ),
          }}
        />

        {/* Hidden tabs — accessible via navigation only */}
        <Tabs.Screen name="buyers" options={{ href: null }} />
        <Tabs.Screen name="payments" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const getStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: BorderRadius.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
    ...Shadow.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBarLabel: { fontSize: FontSize.xs - 1, fontWeight: '600', marginTop: 4 },
  tabBarItem: { height: 48 },
  fabContainer: { top: -24, justifyContent: 'center', alignItems: 'center', width: 64, height: 64 },
  fab: {
    width: 56, height: 56, borderRadius: BorderRadius.full,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    ...Shadow.md, borderWidth: 3, borderColor: colors.surface,
  },
});
