
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { CartItem, Product, Organization, StockStatus } from '../types';
import { useTranslation } from 'react-i18next';

export type AppliedPromoCode = {
  supplierId: string;
  supplierName?: string;
  code: string;
  discountType: 'Percentage' | 'FixedAmount' | 'FreeMinutes';
  value: number;
  description?: string;
};

interface CartContextType {
  cartItems: CartItem[];
  cartSupplierInfo: { id: string; name: string } | null;
  appliedPromoCode: AppliedPromoCode | null;
  addToCart: (product: Product, quantity: number, supplier: Organization) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  applyPromoCode: (promo: AppliedPromoCode) => void;
  clearPromoCode: () => void;
  getCartTotal: () => number; // subtotal (before discount)
  getDiscountAmount: () => number;
  getTotalAfterDiscount: () => number;
  getCartItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSupplierInfo, setCartSupplierInfo] = useState<{ id: string; name: string } | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState<AppliedPromoCode | null>(null);
  const { t } = useTranslation(['dashboard', 'common', 'marketplace']);

  // Load cart from localStorage on initial render
  useEffect(() => {
    const storedCartItems = localStorage.getItem('cartItems');
    const storedSupplierInfo = localStorage.getItem('cartSupplierInfo');
    const storedPromo = localStorage.getItem('cartPromoCode');
    if (storedCartItems) {
      setCartItems(JSON.parse(storedCartItems));
    }
    if (storedSupplierInfo) {
      setCartSupplierInfo(JSON.parse(storedSupplierInfo));
    }
    if (storedPromo) {
      setAppliedPromoCode(JSON.parse(storedPromo));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    localStorage.setItem('cartSupplierInfo', JSON.stringify(cartSupplierInfo));
    localStorage.setItem('cartPromoCode', JSON.stringify(appliedPromoCode));
  }, [cartItems, cartSupplierInfo, appliedPromoCode]);

  // If cart becomes empty, clear supplier info and promo code
  useEffect(() => {
    if (cartItems.length === 0) {
      setCartSupplierInfo(null);
      setAppliedPromoCode(null);
    }
  }, [cartItems.length]);

  const clearPromoCode = useCallback(() => {
    setAppliedPromoCode(null);
  }, []);

  const applyPromoCode = useCallback((promo: AppliedPromoCode) => {
    setAppliedPromoCode(promo);
  }, []);

  const addToCart = (product: Product, quantity: number, supplier: Organization) => {
    if (cartSupplierInfo && cartSupplierInfo.id !== supplier.id) {
      const confirmed = window.confirm(
        t('marketplace:cart.confirmSwitchSupplier', {
          currentSupplier: cartSupplierInfo.name,
          newSupplier: supplier.name,
        }),
      );
      if (confirmed) {
        setCartItems([]);
        setCartSupplierInfo(null);
        setAppliedPromoCode(null);
      } else {
        return; // User cancelled
      }
    }

    if (!cartSupplierInfo || cartItems.length === 0) {
      setCartSupplierInfo({ id: supplier.id, name: supplier.name });
    }

    // If a promo code is applied for a different supplier, clear it.
    if (appliedPromoCode && appliedPromoCode.supplierId !== supplier.id) {
      setAppliedPromoCode(null);
    }
    
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.productId === product.id);
      if (existingItem) {
        // Check stock before increasing quantity
        const newQuantity = existingItem.quantity + quantity;
        if (product.stockStatus === 'Out of Stock') {
          alert(
            t('marketplace:cart.outOfStock', {
              productName: product.title,
            }),
          );
          return prevItems;
        }
        // Add more sophisticated stock checking if needed (e.g., against a max available quantity)
        return prevItems.map(item =>
          item.productId === product.id ? { ...item, quantity: newQuantity } : item
        );
      } else {
        if (product.stockStatus === 'Out of Stock') {
          alert(
            t('marketplace:cart.outOfStock', {
              productName: product.title,
            }),
          );
          return prevItems;
        }
        return [...prevItems, { 
            productId: product.id, 
            title: product.title, 
            price: product.price || 0, 
            quantity, 
            supplierId: supplier.id, 
            supplierName: supplier.name,
            imageUrl: product.imageUrl,
            stockStatus: product.stockStatus as StockStatus
        }];
      }
    });
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    setCartItems(prevItems => {
      if (quantity <= 0) {
        return prevItems.filter(item => item.productId !== productId);
      }
      return prevItems.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      );
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setCartSupplierInfo(null);
    setAppliedPromoCode(null);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getDiscountAmount = () => {
    if (!appliedPromoCode) {
      return 0;
    }
    const subtotal = getCartTotal();
    if (subtotal <= 0) {
      return 0;
    }

    let discount = 0;
    if (appliedPromoCode.discountType === 'Percentage') {
      discount = (subtotal * appliedPromoCode.value) / 100;
    } else if (appliedPromoCode.discountType === 'FixedAmount') {
      discount = appliedPromoCode.value;
    } else {
      discount = 0;
    }

    if (!Number.isFinite(discount) || discount < 0) {
      return 0;
    }
    return Math.min(discount, subtotal);
  };

  const getTotalAfterDiscount = () => {
    const subtotal = getCartTotal();
    const discount = getDiscountAmount();
    return Math.max(0, subtotal - discount);
  };

  const getCartItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{ 
        cartItems, 
        cartSupplierInfo,
        appliedPromoCode,
        addToCart, 
        updateItemQuantity, 
        removeFromCart, 
        clearCart, 
        applyPromoCode,
        clearPromoCode,
        getCartTotal, 
        getDiscountAmount,
        getTotalAfterDiscount,
        getCartItemCount 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const { t } = useTranslation(['dashboard', 'common']);
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error(t('cartContext.useCartError'));
  }
  return context;
};
