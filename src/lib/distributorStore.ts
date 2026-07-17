// Distributor Store - localStorage-based distributor state management
// Bridges UserSession and ProductConfigurator React islands via localStorage + custom events

const DISTRIBUTOR_KEY = 'hercules_distributor';

export interface DistributorData {
  isDistributor: boolean;
  discount: number;
}

const DEFAULT: DistributorData = {
  isDistributor: false,
  discount: 0,
};

export const distributorStore = {
  get(): DistributorData {
    if (typeof window === 'undefined') return DEFAULT;
    try {
      const data = localStorage.getItem(DISTRIBUTOR_KEY);
      return data ? JSON.parse(data) : DEFAULT;
    } catch {
      return DEFAULT;
    }
  },

  set(data: DistributorData) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(DISTRIBUTOR_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('hercules:distributor-changed'));
    } catch (e) {
      console.error('[distributorStore] Failed to save:', e);
    }
  },

  clear() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(DISTRIBUTOR_KEY);
      window.dispatchEvent(new CustomEvent('hercules:distributor-changed'));
    } catch (e) {
      console.error('[distributorStore] Failed to clear:', e);
    }
  },

  onChange(callback: (data: DistributorData) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handle = () => callback(this.get());

    window.addEventListener('hercules:distributor-changed', handle);
    return () => window.removeEventListener('hercules:distributor-changed', handle);
  },
};
