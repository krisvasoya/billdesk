// src/contexts/ShopContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { shopService } from '../services/database/shopService';
import type { Shop } from '../types';
import { useAuth } from './AuthContext';

interface ShopContextValue {
  shop: Shop | null;
  isLoading: boolean;
  refreshShop: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | null>(null);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { shopId } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadShop = async () => {
    if (!shopId) return;
    setIsLoading(true);
    try {
      const data = await shopService.getById(shopId);
      setShop(data);
    } catch (err) {
      console.error('Failed to load shop:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShop();
  }, [shopId]);

  return (
    <ShopContext.Provider value={{ shop, isLoading, refreshShop: loadShop }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = (): ShopContextValue => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
};
