// Global Session Manager - Ensures only ONE API call for session data
// All UserSession components share this singleton

interface CartItem {
  key: string;
  product_id: number;
  name: string;
  quantity: number;
  price: string;
  line_total: string;
  thumbnail: string | null;
  permalink?: string;
}

interface SessionData {
  logged_in: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    first_name: string;
    avatar: string;
  } | null;
  cart: {
    count: number;
    total: string;
    subtotal: string;
    items: CartItem[];
  };
}

type SessionListener = (session: SessionData | null, loading: boolean, error: string | null) => void;

const CACHE_KEY = 'hercules_session';
const CACHE_DURATION = 10000; // 10 seconds

class SessionManager {
  private static instance: SessionManager;
  private session: SessionData | null = null;
  private loading = true;
  private error: string | null = null;
  private listeners: Set<SessionListener> = new Set();
  private fetchPromise: Promise<void> | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  private getApiUrl(): string {
    if (typeof window === 'undefined') return '';

    const hostname = window.location.hostname;

    if (
      hostname.includes('hercules-edge-router') ||
      hostname.includes('hercules-merchandising.fr') ||
      hostname === 'localhost'
    ) {
      return '/wp-json/hercules/v1/session';
    }

    return 'https://hercules-merchandising.fr/wp-json/hercules/v1/session';
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.session, this.loading, this.error);
    });
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);

    // Immediately notify with current state
    listener(this.session, this.loading, this.error);

    // Initialize fetch if not done yet
    if (!this.initialized && typeof window !== 'undefined') {
      this.initialized = true;
      this.fetchSession();
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  async fetchSession(force = false): Promise<void> {
    // If already fetching, return the existing promise (deduplication)
    if (this.fetchPromise && !force) {
      return this.fetchPromise;
    }

    // Check cache first
    if (!force && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            this.session = data;
            this.loading = false;
            this.error = null;
            this.notifyListeners();
            return;
          }
        }
      } catch (e) {
        // Ignore cache errors
      }
    }

    const apiUrl = this.getApiUrl();
    if (!apiUrl) {
      this.loading = false;
      this.notifyListeners();
      return;
    }

    this.loading = true;
    this.notifyListeners();

    this.fetchPromise = (async () => {
      try {
        const response = await fetch(apiUrl, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: SessionData = await response.json();
        this.session = data;
        this.error = null;

        // Cache the response
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              data,
              timestamp: Date.now(),
            }));
          } catch (e) {
            // Ignore localStorage errors
          }
        }
      } catch (err) {
        console.error('Failed to fetch session:', err);
        this.error = err instanceof Error ? err.message : 'Unknown error';
        // Set default session on error
        this.session = {
          logged_in: false,
          user: null,
          cart: { count: 0, total: '£0.00', subtotal: '£0.00', items: [] },
        };
      } finally {
        this.loading = false;
        this.fetchPromise = null;
        this.notifyListeners();
      }
    })();

    return this.fetchPromise;
  }

  // Update session locally (e.g., after cart modification)
  updateSession(updater: (session: SessionData | null) => SessionData | null) {
    this.session = updater(this.session);

    // Update cache
    if (this.session && typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: this.session,
          timestamp: Date.now(),
        }));
      } catch (e) {
        // Ignore localStorage errors
      }
    }

    this.notifyListeners();
  }

  // Update cart data specifically
  updateCart(cart: SessionData['cart']) {
    this.updateSession(session => {
      if (!session) return session;
      return { ...session, cart };
    });
  }

  getSession(): SessionData | null {
    return this.session;
  }

  isLoading(): boolean {
    return this.loading;
  }

  getError(): string | null {
    return this.error;
  }
}

// Export singleton instance
export const sessionManager = SessionManager.getInstance();
export type { SessionData, CartItem };
