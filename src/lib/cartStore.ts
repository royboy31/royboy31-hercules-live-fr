// Cart Store - localStorage-based cart state management
// Updates only when cart changes (add/remove), not on every page load

const CART_KEY = 'hercules_cart';

export interface CartItem {
  key: string;
  product_id: number;
  name: string;
  quantity: number;
  price: string;
  line_total: string;
  thumbnail: string | null;
  permalink?: string;
}

export interface CartData {
  count: number;
  items: CartItem[];
  subtotal: string;
  total: string;
}

const DEFAULT_CART: CartData = {
  count: 0,
  items: [],
  subtotal: '£0.00',
  total: '£0.00'
};

export const cartStore = {
  /**
   * Get cart data from localStorage
   */
  get(): CartData {
    if (typeof window === 'undefined') return DEFAULT_CART;
    try {
      const data = localStorage.getItem(CART_KEY);
      return data ? JSON.parse(data) : DEFAULT_CART;
    } catch {
      return DEFAULT_CART;
    }
  },

  /**
   * Set cart data in localStorage and dispatch change event
   */
  set(cart: CartData) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('hercules:cart-changed'));
      // Also dispatch storage event for other tabs
      window.dispatchEvent(new StorageEvent('storage', {
        key: CART_KEY,
        newValue: JSON.stringify(cart),
      }));
    } catch (e) {
      console.error('[cartStore] Failed to save cart:', e);
    }
  },

  /**
   * Increment cart count (used when adding items)
   */
  incrementCount(by = 1) {
    const cart = this.get();
    cart.count += by;
    this.set(cart);
  },

  /**
   * Decrement cart count (used when removing items)
   */
  decrementCount(by = 1) {
    const cart = this.get();
    cart.count = Math.max(0, cart.count - by);
    this.set(cart);
  },

  /**
   * Clear cart data
   */
  clear() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(CART_KEY);
      window.dispatchEvent(new CustomEvent('hercules:cart-changed'));
    } catch (e) {
      console.error('[cartStore] Failed to clear cart:', e);
    }
  },

  /**
   * Check if initial sync is needed (first visit, no localStorage data)
   */
  needsInitialSync(): boolean {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(CART_KEY);
  },

  /**
   * Subscribe to cart changes
   * Returns unsubscribe function
   */
  subscribe(callback: (cart: CartData) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleChange = () => {
      callback(this.get());
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_KEY) {
        callback(this.get());
      }
    };

    // Listen for custom cart change events (same tab)
    window.addEventListener('hercules:cart-changed', handleChange);
    // Listen for storage events (other tabs)
    window.addEventListener('storage', handleStorageChange);

    // Return unsubscribe function
    return () => {
      window.removeEventListener('hercules:cart-changed', handleChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }
};
