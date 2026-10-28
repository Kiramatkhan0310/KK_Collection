import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { useCart } from './CartContext';

interface CompareContextType {
  compareIds: string[];
  addToCompare: (product: Product) => { success: boolean; message: string };
  removeFromCompare: (productId: string) => void;
  toggleCompare: (product: Product) => void;
  isInCompare: (productId: string) => boolean;
  clearCompare: () => void;
  isCompareOpen: boolean;
  setIsCompareOpen: (open: boolean) => void;
  maxItems: number;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

const COMPARE_STORAGE_KEY = 'kk_collection_compare_v1';
const MAX_COMPARE_ITEMS = 4;

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setToastMessage } = useCart();

  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(COMPARE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, MAX_COMPARE_ITEMS);
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compareIds));
    } catch (e) {
      console.error('Failed to sync comparison items to localStorage', e);
    }
  }, [compareIds]);

  const isInCompare = useCallback(
    (productId: string) => compareIds.includes(productId),
    [compareIds]
  );

  const addToCompare = useCallback(
    (product: Product): { success: boolean; message: string } => {
      if (compareIds.includes(product.id)) {
        return { success: false, message: `"${product.name}" is already in your comparison.` };
      }

      if (compareIds.length >= MAX_COMPARE_ITEMS) {
        const msg = `You can compare up to ${MAX_COMPARE_ITEMS} formulations simultaneously. Please remove one first.`;
        if (setToastMessage) setToastMessage(msg);
        return { success: false, message: msg };
      }

      setCompareIds((prev) => [...prev, product.id]);
      const successMsg = `Added "${product.name}" to formulation comparison.`;
      if (setToastMessage) setToastMessage(successMsg);
      return { success: true, message: successMsg };
    },
    [compareIds, setToastMessage]
  );

  const removeFromCompare = useCallback(
    (productId: string) => {
      setCompareIds((prev) => prev.filter((id) => id !== productId));
      if (setToastMessage) {
        setToastMessage('Removed formulation from comparison.');
      }
    },
    [setToastMessage]
  );

  const toggleCompare = useCallback(
    (product: Product) => {
      if (isInCompare(product.id)) {
        removeFromCompare(product.id);
      } else {
        addToCompare(product);
      }
    },
    [isInCompare, removeFromCompare, addToCompare]
  );

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    if (setToastMessage) {
      setToastMessage('Cleared all compared formulations.');
    }
  }, [setToastMessage]);

  return (
    <CompareContext.Provider
      value={{
        compareIds,
        addToCompare,
        removeFromCompare,
        toggleCompare,
        isInCompare,
        clearCompare,
        isCompareOpen,
        setIsCompareOpen,
        maxItems: MAX_COMPARE_ITEMS
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
};
