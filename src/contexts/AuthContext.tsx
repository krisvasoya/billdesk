// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { storage, StorageKeys, clearStorage, loadStorageCache } from '../storage';
import type { User } from '../types';
import { UserRepository, hashPassword } from '../repositories/UserRepository';

interface AuthContextValue {
  user: User | null;
  shopId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  devMode: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await loadStorageCache();
        const rememberMe = storage.getBoolean(StorageKeys.REMEMBER_ME) ?? false;
        const storedUserId = storage.getString(StorageKeys.USER_ID);

        if (rememberMe && storedUserId) {
          const dbUser = await UserRepository.getById(storedUserId);
          if (dbUser) {
            setUser(dbUser);
          } else {
            clearStorage();
          }
        } else {
          clearStorage();
        }
      } catch {
        clearStorage();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    const dbUser = await UserRepository.getByEmail(email);
    if (!dbUser) {
      throw new Error('No account found with that email address.');
    }
    const inputHash = hashPassword(password);
    if (dbUser.passwordHash && dbUser.passwordHash !== inputHash) {
      throw new Error('Incorrect password. Please try again.');
    }
    // Persist session identifiers
    storage.set(StorageKeys.USER_ID, dbUser.id);
    storage.set(StorageKeys.SHOP_ID, dbUser.shopId);
    storage.set(StorageKeys.REMEMBER_ME, rememberMe);
    // Update last login timestamp
    await UserRepository.updateLastLogin(dbUser.id);
    setUser(dbUser);
  }, []);

  const logout = useCallback(async () => {
    clearStorage();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        shopId: user?.shopId ?? null,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        devMode: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
