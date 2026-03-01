// Cart Store - localStorage-based cart state management
// Updates only when cart changes (add/remove), not on every page load

const CART_KEY = 'hercules_cart';

// Strip thousand separators (spaces, dots, &nbsp;) from price strings.
// Keeps only comma before decimals + currency symbol.
function cleanPrice(s: string): string {
  // e.g. "1 234,56 €" or "1.234,56&nbsp;€" → "1234,56 €"
  return s
    .replace(/&nbsp;/g, ' ')       // decode HTML entity
    .replace(/[\s.]+(?=\d{3})/g, '') // remove thousand separators before groups of 3 digits
    .replace(/\s+€/, ' €')         // normalise space before €
    .trim();
}

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
  subtotal: '0,00 €',
  total: '0,00 €'
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
      // Normalise price strings — comma for decimals, no other punctuation
      if (cart.subtotal) cart.subtotal = cleanPrice(cart.subtotal);
      if (cart.total) cart.total = cleanPrice(cart.total);
      if (cart.items) {
        for (const item of cart.items) {
          if (item.price) item.price = cleanPrice(item.price);
          if (item.line_total) item.line_total = cleanPrice(item.line_total);
        }
      }
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
