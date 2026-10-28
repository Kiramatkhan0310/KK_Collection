import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem, maxAvailableStock: number) => { success: boolean; message?: string };
  updateQuantity: (productId: string, variantId: string | undefined, delta: number, maxStock: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  toastMessage: string | null;
  setToastMessage: (msg: string | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'kk_collection_cart_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to sync cart items to localStorage', e);
    }
  }, [items]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const addItem = (newItem: CartItem, maxAvailableStock: number): { success: boolean; message?: string } => {
    let result = { success: true, message: 'Added to your shopping bag' };

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.productId === newItem.productId && (i.variantId || '') === (newItem.variantId || '')
      );

      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].quantity;
        const totalRequested = currentQty + newItem.quantity;

        if (totalRequested > maxAvailableStock) {
          result = {
            success: false,
            message: `Maximum stock limit reached (${maxAvailableStock} units available).`
          };
          return prev;
        }

        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: totalRequested
        };
        return updated;
      } else {
        if (newItem.quantity > maxAvailableStock) {
          result = {
            success: false,
            message: `Only ${maxAvailableStock} units available in stock.`
          };
          return prev;
        }
        return [...prev, newItem];
      }
    });

    if (result.success) {
      setToastMessage(result.message);
      setIsDrawerOpen(true);
    } else {
      setToastMessage(result.message || 'Could not add to bag');
    }

    return result;
  };

  const updateQuantity = (productId: string, variantId: string | undefined, delta: number, maxStock: number) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId && (item.variantId || '') === (variantId || '')) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > maxStock) {
              setToastMessage(`Limited to maximum available stock (${maxStock})`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (productId: string, variantId?: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && (i.variantId || '') === (variantId || '')))
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        subtotal,
        itemCount,
        isDrawerOpen,
        setIsDrawerOpen,
        toastMessage,
        setToastMessage
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
};
