import { useState, useEffect } from 'react';
import { getWishlistCount, type WishlistItem } from './WishlistButton';

interface WishlistCountProps {
  className?: string;
}

export default function WishlistCount({ className = '' }: WishlistCountProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Initial count
    setCount(getWishlistCount());

    // Listen for wishlist updates
    const handleUpdate = (e: CustomEvent) => {
      const newCount = e.detail?.count ?? e.detail?.items?.length ?? 0;
      setCount(newCount);
    };

    window.addEventListener('hercules:wishlist-updated', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('hercules:wishlist-updated', handleUpdate as EventListener);
    };
  }, []);

  // Icon styles matching cart icon
  const iconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    border: '1px solid #253461',
    borderRadius: '15px',
    color: '#253461',
    background: 'transparent',
    transition: 'all 0.3s',
    position: 'relative',
    textDecoration: 'none',
  };

  // Badge styles matching cart badge
  const badgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    background: '#10C99E',
    color: 'white',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: "'Jost', sans-serif",
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    lineHeight: 1,
  };

  return (
    <a
      href="/wishlist/"
      className={`header-icon wishlist-icon ${className}`}
      aria-label="Wishlist"
      style={iconStyle}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"
          fill="#253461"
        />
      </svg>
      {count > 0 && (
        <span style={badgeStyle}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </a>
  );
}
