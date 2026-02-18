import { useState, useEffect, useRef } from 'react';
import { cartStore, type CartData } from '../lib/cartStore';

interface UserSessionProps {
  type: 'cart' | 'account' | 'cart-count';
}

interface UserData {
  id: number;
  name: string;
  email: string;
  first_name: string;
  avatar: string;
}

// Use the same domain when accessed through Edge Router, otherwise use staging
const getBaseUrl = () => {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;

  if (
    hostname.includes('hercules-edge-router') ||
    hostname.includes('hercules-merchandising.fr') ||
    hostname === 'localhost'
  ) {
    return '';
  }

  return 'https://hercules-merchandising.fr';
};

export default function UserSession({ type }: UserSessionProps) {
  // Cart state from localStorage
  const [cart, setCart] = useState<CartData>(cartStore.get());
  const [cartLoading, setCartLoading] = useState(false);

  // User session state (only fetched for account type)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(type === 'account');

  // UI state
  const [showCartDropdown, setShowCartDropdown] = useState(false);
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch initial cart data if needed (first visit only)
  const fetchInitialCart = async () => {
    if (!cartStore.needsInitialSync()) return;

    setCartLoading(true);
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/wp-json/hercules/v1/session`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.cart) {
          cartStore.set(data.cart);
        }
        // Also update user state if available
        if (data.logged_in !== undefined) {
          setIsLoggedIn(data.logged_in);
          setUser(data.user);
        }
      }
    } catch (err) {
      console.error('[UserSession] Failed to fetch initial cart:', err);
    } finally {
      setCartLoading(false);
      setUserLoading(false);
    }
  };

  // Fetch user session (for account icon only)
  const fetchUserSession = async () => {
    try {
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/wp-json/hercules/v1/session`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(data.logged_in || false);
        setUser(data.user || null);

        // Also sync cart data while we're at it
        if (data.cart) {
          cartStore.set(data.cart);
        }
      }
    } catch (err) {
      console.error('[UserSession] Failed to fetch user session:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // Remove item from cart
  const removeFromCart = async (cartItemKey: string) => {
    setRemovingItem(cartItemKey);
    try {
      const baseUrl = getBaseUrl();

      const response = await fetch(`${baseUrl}/wp-json/hercules/v1/cart/remove`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: cartItemKey }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.cart) {
          // Update localStorage with new cart data from server
          cartStore.set(data.cart);
        }
      } else {
        console.error('Failed to remove item from cart');
      }
    } catch (err) {
      console.error('Error removing item from cart:', err);
    } finally {
      setRemovingItem(null);
    }
  };

  useEffect(() => {
    // Subscribe to cart changes from localStorage
    const unsubscribe = cartStore.subscribe((newCart) => {
      setCart(newCart);
    });

    // Fetch initial cart if needed (first visit)
    if (cartStore.needsInitialSync()) {
      fetchInitialCart();
    }

    // For account type, always fetch user session
    if (type === 'account') {
      fetchUserSession();
    }

    // Sync cart from server
    const syncCartFromServer = async () => {
      try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/wp-json/hercules/v1/session`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.cart) {
            const currentCart = cartStore.get();
            // Only update if cart count changed (avoid unnecessary re-renders)
            if (currentCart.count !== data.cart.count || currentCart.items.length !== data.cart.items.length) {
              cartStore.set(data.cart);
            }
          }
        }
      } catch (err) {
        console.error('[UserSession] Failed to sync cart from server:', err);
      }
    };

    // Refresh cart on tab visibility change AND from server
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Re-read from localStorage (might have changed in another tab)
        setCart(cartStore.get());
        // Sync from server (might have changed on WordPress pages)
        await syncCartFromServer();
      }
    };

    // Sync cart on page show (handles back/forward navigation)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was loaded from bfcache, sync cart
        syncCartFromServer();
      }
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCartDropdown(false);
      }
    };

    // Periodic cart sync every 30 seconds (for cart icon types only)
    let syncInterval: NodeJS.Timeout | null = null;
    if (type === 'cart' || type === 'cart-count') {
      syncInterval = setInterval(() => {
        syncCartFromServer();
      }, 30000); // 30 seconds
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('mousedown', handleClickOutside);
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [type]);

  // Cart count badge only
  if (type === 'cart-count') {
    const count = cart.count || 0;

    if (cartLoading) {
      return null; // Don't show anything while loading
    }

    if (count === 0) {
      return null;
    }

    return (
      <span className="cart-count-badge">
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  // Full cart icon with badge and dropdown
  if (type === 'cart') {
    const count = cart.count || 0;
    const items = cart.items || [];
    const subtotal = cart.subtotal || '£0.00';

    // Container styles
    const containerStyle: React.CSSProperties = {
      position: 'relative',
      display: 'inline-block',
    };

    // Full icon styles to match WordPress exactly
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
      cursor: 'pointer',
    };

    // Cart count badge styles
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

    // Dropdown styles matching WordPress
    const dropdownStyle: React.CSSProperties = {
      position: 'absolute',
      top: '100%',
      right: '0',
      marginTop: '10px',
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '15px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      minWidth: '375px',
      fontFamily: "'Jost', sans-serif",
      fontSize: '14px',
      color: '#253461',
    };

    const emptyCartStyle: React.CSSProperties = {
      textAlign: 'center',
      padding: '20px 10px',
      color: '#666',
    };

    const itemListStyle: React.CSSProperties = {
      listStyle: 'none',
      margin: '0 0 15px 0',
      padding: 0,
      maxHeight: '200px',
      overflowY: 'auto',
    };

    const itemStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 0',
    };

    const itemImageStyle: React.CSSProperties = {
      width: '50px',
      height: '50px',
      objectFit: 'cover',
      borderRadius: '5px',
    };

    const itemInfoStyle: React.CSSProperties = {
      flex: 1,
      minWidth: 0,
    };

    const itemNameStyle: React.CSSProperties = {
      fontSize: '13px',
      fontWeight: 500,
      color: '#253461',
      margin: '0 0 4px 0',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    };

    const itemPriceStyle: React.CSSProperties = {
      fontSize: '12px',
      color: '#666',
      margin: 0,
    };

    const removeButtonStyle: React.CSSProperties = {
      background: 'transparent',
      border: 'none',
      color: '#999',
      cursor: 'pointer',
      padding: '4px 8px',
      fontSize: '18px',
      lineHeight: '1',
      transition: 'color 0.2s',
      flexShrink: 0,
    };

    const subtotalRowStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderTop: '1px solid #e0e0e0',
      marginBottom: '15px',
      fontWeight: 500,
    };

    const buttonsContainerStyle: React.CSSProperties = {
      display: 'flex',
      gap: '8px',
    };

    const viewCartBtnStyle: React.CSSProperties = {
      flex: 1,
      display: 'inline-flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '12px 15px',
      fontSize: '12px',
      fontWeight: 500,
      fontFamily: "'Jost', sans-serif",
      textTransform: 'uppercase',
      textDecoration: 'none',
      borderRadius: '83px',
      color: '#469adc',
      background: 'transparent',
      border: '1px solid #469adc',
      cursor: 'pointer',
      transition: 'all 0.2s',
      lineHeight: 1,
    };

    const checkoutBtnStyle: React.CSSProperties = {
      flex: 1,
      display: 'inline-flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '12px 15px',
      fontSize: '12px',
      fontWeight: 500,
      fontFamily: "'Jost', sans-serif",
      textTransform: 'uppercase',
      textDecoration: 'none',
      borderRadius: '83px',
      color: '#fff',
      background: '#10c99e',
      border: '1px solid #10c99e',
      cursor: 'pointer',
      transition: 'all 0.2s',
      lineHeight: 1,
    };

    const handleCartClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setShowCartDropdown(!showCartDropdown);
    };

    return (
      <div style={containerStyle} ref={dropdownRef}>
        <button
          onClick={handleCartClick}
          className="header-icon cart-icon"
          aria-label="Cart"
          aria-expanded={showCartDropdown}
          style={iconStyle}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 31 31" fill="none">
            <path d="M12.5938 26.1562C12.5938 26.5395 12.4801 26.914 12.2672 27.2327C12.0543 27.5513 11.7517 27.7996 11.3977 27.9463C11.0437 28.0929 10.6541 28.1313 10.2783 28.0565C9.90242 27.9818 9.5572 27.7972 9.28623 27.5263C9.01527 27.2553 8.83074 26.9101 8.75598 26.5342C8.68122 26.1584 8.71959 25.7688 8.86623 25.4148C9.01288 25.0608 9.26121 24.7582 9.57983 24.5453C9.89845 24.3324 10.273 24.2188 10.6562 24.2188C11.1701 24.2188 11.6629 24.4229 12.0263 24.7862C12.3896 25.1496 12.5938 25.6424 12.5938 26.1562ZM23.25 24.2188C22.8668 24.2188 22.4922 24.3324 22.1736 24.5453C21.855 24.7582 21.6066 25.0608 21.46 25.4148C21.3133 25.7688 21.275 26.1584 21.3497 26.5342C21.4245 26.9101 21.609 27.2553 21.88 27.5263C22.1509 27.7972 22.4962 27.9818 22.872 28.0565C23.2479 28.1313 23.6374 28.0929 23.9914 27.9463C24.3455 27.7996 24.6481 27.5513 24.861 27.2327C25.0739 26.914 25.1875 26.5395 25.1875 26.1562C25.1875 25.6424 24.9834 25.1496 24.62 24.7862C24.2567 24.4229 23.7639 24.2188 23.25 24.2188ZM29.0274 8.97789L25.9225 20.1524C25.7518 20.7628 25.3867 21.3009 24.8826 21.6851C24.3784 22.0693 23.7627 22.2786 23.1289 22.2812H11.16C10.5243 22.281 9.90613 22.0728 9.39978 21.6884C8.89343 21.3041 8.52668 20.7646 8.35547 20.1524L4.1075 4.84375H1.9375C1.68057 4.84375 1.43417 4.74169 1.25249 4.56001C1.07081 4.37833 0.96875 4.13193 0.96875 3.875C0.96875 3.61807 1.07081 3.37167 1.25249 3.18999C1.43417 3.00831 1.68057 2.90625 1.9375 2.90625H4.84375C5.05554 2.90621 5.26152 2.97558 5.43014 3.10374C5.59875 3.2319 5.72073 3.41178 5.77738 3.61586L6.92535 7.75H28.0938C28.2431 7.74997 28.3904 7.78447 28.5242 7.85081C28.658 7.91714 28.7747 8.01352 28.8651 8.1324C28.9555 8.25129 29.0172 8.38946 29.0453 8.53613C29.0735 8.6828 29.0673 8.83399 29.0274 8.97789ZM26.8186 9.6875H7.46422L10.2264 19.6341C10.283 19.8382 10.405 20.0181 10.5736 20.1463C10.7422 20.2744 10.9482 20.3438 11.16 20.3438H23.1289C23.3407 20.3438 23.5467 20.2744 23.7153 20.1463C23.8839 20.0181 24.0059 19.8382 24.0625 19.6341L26.8186 9.6875Z" fill="#253461"></path>
          </svg>
          {!cartLoading && count > 0 && (
            <span style={badgeStyle}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>

        {/* Cart Dropdown */}
        {showCartDropdown && (
          <div style={dropdownStyle} className="cart-dropdown">
            {count === 0 ? (
              <div style={emptyCartStyle}>
                <p style={{ margin: 0 }}>Your cart is empty.</p>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <ul style={itemListStyle}>
                  {items.map((item) => (
                    <li key={item.key} style={itemStyle}>
                      <a href={item.permalink || `/products/`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                        {item.thumbnail && (
                          <img
                            src={item.thumbnail}
                            alt={item.name}
                            style={itemImageStyle}
                          />
                        )}
                        <div style={itemInfoStyle}>
                          <p style={itemNameStyle}>{item.name.split(' - ')[0]}</p>
                          <p style={itemPriceStyle}>
                            {item.quantity} x {item.price}
                          </p>
                        </div>
                      </a>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeFromCart(item.key);
                        }}
                        disabled={removingItem === item.key}
                        style={removeButtonStyle}
                        onMouseEnter={(e) => {
                          if (removingItem !== item.key) {
                            e.currentTarget.style.color = '#ff4444';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#999';
                        }}
                        aria-label={`Remove ${item.name}`}
                        title="Remove item"
                      >
                        {removingItem === item.key ? '...' : '×'}
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Subtotal */}
                <div style={subtotalRowStyle}>
                  <span>Subtotal:</span>
                  <strong>{subtotal}</strong>
                </div>

                {/* Buttons */}
                <div style={buttonsContainerStyle}>
                  <a
                    href="/quote-generator/"
                    style={viewCartBtnStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#469adc';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#469adc';
                    }}
                  >
                    Quote Generator
                  </a>
                  <a
                    href="/cart/"
                    style={checkoutBtnStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#10c99e';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#10c99e';
                      e.currentTarget.style.color = '#fff';
                    }}
                  >
                    View Cart
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Account link with user state
  if (type === 'account') {
    const accountUrl = '/my-account/';

    // Full icon styles to match WordPress exactly
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

    // Green dot styles - brand green (#10C99E)
    const dotStyle: React.CSSProperties = {
      position: 'absolute',
      right: '-6px',
      top: '-6px',
      width: '15px',
      height: '15px',
      borderRadius: '50%',
      background: '#10C99E',
      zIndex: 223343,
      opacity: 1,
      visibility: 'visible',
      border: 'none',
    };

    return (
      <a
        href={accountUrl}
        className="header-icon"
        aria-label={isLoggedIn ? `Hello, ${user?.first_name || user?.name}` : 'My Account'}
        title={isLoggedIn ? `Hello, ${user?.first_name || user?.name}` : 'Sign in'}
        style={iconStyle}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 29 29" fill="none">
          <path d="M26.1586 24.0156C24.4333 21.0329 21.7746 18.8942 18.6718 17.8803C20.2066 16.9667 21.399 15.5744 22.0659 13.9175C22.7329 12.2606 22.8375 10.4305 22.3637 8.70833C21.8899 6.98618 20.8639 5.46717 19.4432 4.38458C18.0226 3.30198 16.2858 2.71567 14.4997 2.71567C12.7135 2.71567 10.9768 3.30198 9.55609 4.38458C8.13542 5.46717 7.1094 6.98618 6.6356 8.70833C6.16179 10.4305 6.2664 12.2606 6.93335 13.9175C7.60031 15.5744 8.79273 16.9667 10.3275 17.8803C7.22473 18.893 4.56602 21.0318 2.84074 24.0156C2.77748 24.1188 2.73551 24.2336 2.71732 24.3532C2.69914 24.4729 2.7051 24.5949 2.73485 24.7122C2.76461 24.8295 2.81756 24.9397 2.89058 25.0362C2.9636 25.1327 3.05521 25.2136 3.16 25.2742C3.26479 25.3347 3.38065 25.3736 3.50073 25.3886C3.62081 25.4037 3.74269 25.3945 3.85917 25.3617C3.97565 25.3288 4.08437 25.273 4.17892 25.1975C4.27347 25.1219 4.35194 25.0282 4.40969 24.9219C6.54391 21.2334 10.3162 19.0312 14.4997 19.0312C18.6831 19.0312 22.4554 21.2334 24.5896 24.9219C24.6474 25.0282 24.7258 25.1219 24.8204 25.1975C24.9149 25.273 25.0237 25.3288 25.1401 25.3617C25.2566 25.3945 25.3785 25.4037 25.4986 25.3886C25.6187 25.3736 25.7345 25.3347 25.8393 25.2742C25.9441 25.2136 26.0357 25.1327 26.1087 25.0362C26.1817 24.9397 26.2347 24.8295 26.2644 24.7122C26.2942 24.5949 26.3002 24.4729 26.282 24.3532C26.2638 24.2336 26.2218 24.1188 26.1586 24.0156ZM8.1559 10.875C8.1559 9.62032 8.52795 8.39383 9.22502 7.3506C9.92208 6.30738 10.9128 5.49428 12.072 5.01414C13.2312 4.534 14.5067 4.40837 15.7373 4.65314C16.9678 4.89792 18.0982 5.5021 18.9854 6.38929C19.8725 7.27648 20.4767 8.40683 20.7215 9.6374C20.9663 10.868 20.8407 12.1435 20.3605 13.3026C19.8804 14.4618 19.0673 15.4526 18.024 16.1496C16.9808 16.8467 15.7543 17.2188 14.4997 17.2188C12.8177 17.217 11.2052 16.548 10.0159 15.3587C8.82664 14.1694 8.1577 12.5569 8.1559 10.875Z" fill="#253461"></path>
        </svg>
        {isLoggedIn && <span style={dotStyle}></span>}
      </a>
    );
  }

  return null;
}
