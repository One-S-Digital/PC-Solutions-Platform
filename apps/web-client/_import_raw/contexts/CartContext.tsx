
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { CartItem, Product, Organization, StockStatus } from '../types';

interface CartContextType {
  cartItems: CartItem[];
  cartSupplierInfo: { id: string; name: string } | null;
  addToCart: (product: Product, quantity: number, supplier: Organization) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartItemCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSupplierInfo, setCartSupplierInfo] = useState<{ id: string; name: string } | null>(null);

  // Load cart from localStorage on initial render
  useEffect(() => {
    const storedCartItems = localStorage.getItem('cartItems');
    const storedSupplierInfo = localStorage.getItem('cartSupplierInfo');
    if (storedCartItems) {
      setCartItems(JSON.parse(storedCartItems));
    }
    if (storedSupplierInfo) {
      setCartSupplierInfo(JSON.parse(storedSupplierInfo));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
    localStorage.setItem('cartSupplierInfo', JSON.stringify(cartSupplierInfo));
  }, [cartItems, cartSupplierInfo]);


  const addToCart = (product: Product, quantity: number, supplier: Organization) => {
    if (cartSupplierInfo && cartSupplierInfo.id !== supplier.id) {
      if (window.confirm(`Your current cart contains items from ${cartSupplierInfo.name}. Would you like to clear it and add items from ${supplier.name}?`)) {
        setCartItems([]);
        setCartSupplierInfo(null);
      } else {
        return; // User cancelled
      }
    }

    if (!cartSupplierInfo || cartItems.length === 0) {
      setCartSupplierInfo({ id: supplier.id, name: supplier.name });
    }
    
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.productId === product.id);
      if (existingItem) {
        // Check stock before increasing quantity
        const newQuantity = existingItem.quantity + quantity;
        if (product.stockStatus === 'Out of Stock') {
            alert(`Sorry, ${product.title} is out of stock.`);
            return prevItems;
        }
        // Add more sophisticated stock checking if needed (e.g., against a max available quantity)
        return prevItems.map(item =>
          item.productId === product.id ? { ...item, quantity: newQuantity } : item
        );
      } else {
        if (product.stockStatus === 'Out of Stock') {
            alert(`Sorry, ${product.title} is out of stock.`);
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
            stockStatus: product.stockStatus 
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
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider value={{ 
        cartItems, 
        cartSupplierInfo,
        addToCart, 
        updateItemQuantity, 
        removeFromCart, 
        clearCart, 
        getCartTotal, 
        getCartItemCount 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
