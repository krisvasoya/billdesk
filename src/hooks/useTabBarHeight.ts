// src/hooks/useTabBarHeight.ts
//
// Returns the total bottom padding that every scrollable screen must apply
// so content never hides behind the floating tab bar, FAB, or device safe area.
//
// Tab bar layout (from (tabs)/_layout.tsx):
//   height: 64  |  bottom: iOS=24, Android=16  |  FAB protrudes 24px above

import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Mirror exactly what (tabs)/_layout.tsx declares
const TAB_BAR_HEIGHT     = 64;
const TAB_BOTTOM_IOS     = 24;   // bottom offset on iOS
const TAB_BOTTOM_ANDROID = 16;   // bottom offset on Android
const FAB_PROTRUSION     = 24;   // fabContainer top: -24
const BREATHING_ROOM     = 12;   // comfortable gap above the bar

/**
 * Total clearance = tab height + bottom offset + FAB protrusion + breathing room
 * + device-specific safe area inset (home indicator / gesture bar).
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  const safeBottom = insets.bottom;

  if (Platform.OS === 'ios') {
    // iOS safe area is already baked into the TAB_BOTTOM_IOS offset visually,
    // but the content still scrolls beneath it, so we need the inset.
    return TAB_BAR_HEIGHT + TAB_BOTTOM_IOS + FAB_PROTRUSION + BREATHING_ROOM + safeBottom;
  }

  // Android: safeBottom = 0 on 3-button nav, or gesture-bar height (~24px on gesture nav)
  return TAB_BAR_HEIGHT + TAB_BOTTOM_ANDROID + FAB_PROTRUSION + BREATHING_ROOM + safeBottom;
}

/**
 * Returns safe bottom padding for standard stack screens (outside tabs).
 */
export function useSafeAreaBottomPadding(extra = 16): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + extra;
}

