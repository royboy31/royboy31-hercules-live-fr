import { useState, useEffect } from 'react';

export interface WishlistItem {
  id: number;
  name: string;
  slug: string;
  price?: string;
  thumbnail?: string;
  addedAt: number;
}

interface WishlistButtonProps {
  productId: number;
  productName?: string;
  productSlug?: string;
  productPrice?: string;
  productThumbnail?: string;
  className?: string;
  size?: number;
}

const WISHLIST_KEY = 'hercules_wishlist_items';

// Get wishlist from localStorage
export function getWishlist(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(WISHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save wishlist to localStorage
export function saveWishlist(items: WishlistItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('hercules:wishlist-updated', {
      detail: { items, count: items.length }
    }));
  } catch {
    // Ignore storage errors
  }
}

// Check if product is in wishlist
export function isInWishlist(productId: number): boolean {
  const items = getWishlist();
  return items.some(item => item.id === productId);
}

// Add to wishlist
export function addToWishlist(item: WishlistItem): void {
  const items = getWishlist();
  if (!items.some(i => i.id === item.id)) {
    items.push({ ...item, addedAt: Date.now() });
    saveWishlist(items);
  }
}

// Remove from wishlist
export function removeFromWishlist(productId: number): void {
  const items = getWishlist().filter(item => item.id !== productId);
  saveWishlist(items);
}

// Toggle wishlist
export function toggleWishlist(item: WishlistItem): boolean {
  if (isInWishlist(item.id)) {
    removeFromWishlist(item.id);
    return false;
  } else {
    addToWishlist(item);
    return true;
  }
}

// Get wishlist count
export function getWishlistCount(): number {
  return getWishlist().length;
}

export default function WishlistButton({
  productId,
  productName = '',
  productSlug = '',
  productPrice = '',
  productThumbnail = '',
  className = '',
  size = 20
}: WishlistButtonProps) {
  const [inWishlist, setInWishlist] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Check initial state
  useEffect(() => {
    setInWishlist(isInWishlist(productId));
  }, [productId]);

  // Listen for wishlist updates from other components
  useEffect(() => {
    const handleUpdate = (e: CustomEvent) => {
      const items = e.detail?.items || [];
      setInWishlist(items.some((item: WishlistItem) => item.id === productId));
    };

    window.addEventListener('hercules:wishlist-updated', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('hercules:wishlist-updated', handleUpdate as EventListener);
    };
  }, [productId]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setAnimating(true);
    setTimeout(() => setAnimating(false), 300);

    const newState = toggleWishlist({
      id: productId,
      name: productName,
      slug: productSlug,
      price: productPrice,
      thumbnail: productThumbnail,
      addedAt: Date.now(),
    });

    setInWishlist(newState);
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size + 16}px`,
    height: `${size + 16}px`,
    background: 'white',
    border: '1px solid #dcdcdc',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    padding: 0,
    position: 'relative',
    transform: animating ? 'scale(1.2)' : 'scale(1)',
  };

  const heartFilledPath = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
  const heartOutlinePath = "M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z";

  return (
    <button
      onClick={handleClick}
      className={`wishlist-button ${inWishlist ? 'in-wishlist' : ''} ${className}`}
      style={buttonStyle}
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        style={{ transition: 'all 0.2s ease' }}
      >
        <path
          d={inWishlist ? heartFilledPath : heartOutlinePath}
          fill={inWishlist ? '#10C99E' : 'none'}
          stroke={inWishlist ? '#10C99E' : '#666'}
          strokeWidth={inWishlist ? 0 : 1.5}
        />
      </svg>
      <style>{`
        .wishlist-button:hover {
          border-color: #10C99E !important;
          transform: scale(1.1);
        }
        .wishlist-button:hover svg path {
          stroke: #10C99E;
        }
      `}</style>
    </button>
  );
}
