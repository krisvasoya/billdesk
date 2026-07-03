// src/storage/index.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// Synchronous in-memory cache to support MMKV's synchronous signature
const memoryCache = new Map<string, string>();

export const StorageKeys = {
  AUTH_TOKEN: 'auth_token',
  USER_ID: 'user_id',
  SHOP_ID: 'shop_id',
  LANGUAGE: 'app_language',
  THEME: 'app_theme',
  ONBOARDING_DONE: 'onboarding_done',
  REMEMBER_ME: 'remember_me',
  LAST_INVOICE_NUMBER: 'last_invoice_number',
  PUSH_TOKEN: 'push_token',
} as const;

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys];

// Expose a mock storage object with the same interface as MMKV
export const storage = {
  getString: (key: string): string | undefined => {
    return memoryCache.get(key);
  },
  set: (key: string, value: string | boolean | number): void => {
    const strValue = typeof value === 'string' ? value : String(value);
    memoryCache.set(key, strValue);
    AsyncStorage.setItem(key, strValue).catch(err =>
      console.error('Storage write error:', err)
    );
  },
  getBoolean: (key: string): boolean | undefined => {
    const value = memoryCache.get(key);
    return value !== undefined ? value === 'true' : undefined;
  },
  delete: (key: string): void => {
    memoryCache.delete(key);
    AsyncStorage.removeItem(key).catch(err =>
      console.error('Storage delete error:', err)
    );
  },
  clearAll: (): void => {
    memoryCache.clear();
    AsyncStorage.clear().catch(err =>
      console.error('Storage clear error:', err)
    );
  },
};

// Loads all stored key-value pairs into the in-memory cache at boot time
export const loadStorageCache = async (): Promise<void> => {
  try {
    const keys = Object.values(StorageKeys);
    // Also load any custom keys that might be written dynamically (like telemetry opt-out)
    const allKeys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(allKeys);
    for (const [key, value] of pairs) {
      if (value !== null) {
        memoryCache.set(key, value);
      }
    }
  } catch (error) {
    console.error('Failed to load storage cache:', error);
  }
};

// Typed helpers
export const getStoredString = (key: StorageKey): string | undefined => {
  return storage.getString(key);
};

export const setStoredString = (key: StorageKey, value: string): void => {
  storage.set(key, value);
};

export const getStoredBool = (key: StorageKey): boolean | undefined => {
  return storage.getBoolean(key);
};

export const setStoredBool = (key: StorageKey, value: boolean): void => {
  storage.set(key, value);
};

export const removeStored = (key: StorageKey): void => {
  storage.delete(key);
};

export const clearStorage = (): void => {
  storage.clearAll();
};
