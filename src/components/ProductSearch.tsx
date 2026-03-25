import { useState, useRef, useEffect, useCallback } from 'react';

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  url: string;
  price: string;
  minPrice: number | null;
  maxPrice: number | null;
  thumbnail: string;
  categories: string[];
}

interface ProductSearchProps {
  placeholder?: string;
  apiUrl?: string;
}

export default function ProductSearch({
  placeholder = 'Rechercher des produits...',
  apiUrl = 'https://hercules-product-sync-fr.gilles-86d.workers.dev'
}: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchProducts = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setResults([]);
      setIsOpen(false);
      setNoResults(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/search?q=${encodeURIComponent(searchTerm)}&limit=10&exclude_missive=true`
      );
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        // Fix thumbnail URLs to use correct worker domain
        const fixedResults = data.data.map((product: SearchResult) => ({
          ...product,
          thumbnail: product.thumbnail?.replace(
            'hercules-product-sync-fr-production.gilles-86d.workers.dev',
            'hercules-product-sync-fr.gilles-86d.workers.dev'
          ) || ''
        }));
        setResults(fixedResults);
        setNoResults(false);
      } else {
        setResults([]);
        setNoResults(true);
      }
      setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setNoResults(true);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search
    debounceRef.current = setTimeout(() => {
      searchProducts(value);
    }, 300);
  };

  const handleFocus = () => {
    if (query.length >= 2 && (results.length > 0 || noResults)) {
      setIsOpen(true);
    }
  };

  return (
    <div className="product-search-wrapper" ref={wrapperRef}>
      <div className="product-search-input-wrapper">
        <input
          type="text"
          className="product-search-input"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          aria-label="Product search"
        />
        {isLoading && (
          <span className="product-search-spinner" aria-label="Searching..." />
        )}
        <svg
          className="product-search-icon"
          viewBox="0 0 22 22"
          fill="none"
        >
          <path d="M21.3248 20.1752L16.2396 15.0909C17.7135 13.3214 18.4485 11.0518 18.2916 8.75419C18.1347 6.45658 17.0981 4.3079 15.3974 2.75513C13.6967 1.20236 11.4628 0.365042 9.16039 0.417367C6.85803 0.469692 4.66448 1.40763 3.03605 3.03606C1.40761 4.6645 0.469677 6.85805 0.417352 9.16041C0.365027 11.4628 1.20234 13.6967 2.75512 15.3974C4.30789 17.0981 6.45657 18.1348 8.75417 18.2916C11.0518 18.4485 13.3214 17.7135 15.0909 16.2396L20.1751 21.3249C20.2506 21.4003 20.3403 21.4602 20.4389 21.5011C20.5375 21.5419 20.6432 21.563 20.75 21.563C20.8567 21.563 20.9625 21.5419 21.0611 21.5011C21.1597 21.4602 21.2493 21.4003 21.3248 21.3249C21.4003 21.2494 21.4602 21.1597 21.5011 21.0611C21.5419 20.9625 21.5629 20.8568 21.5629 20.75C21.5629 20.6432 21.5419 20.5375 21.5011 20.4389C21.4602 20.3403 21.4003 20.2507 21.3248 20.1752ZM2.06249 9.375C2.06249 7.92873 2.49136 6.51493 3.29487 5.3124C4.09837 4.10986 5.24043 3.1726 6.57662 2.61913C7.9128 2.06567 9.3831 1.92086 10.8016 2.20301C12.2201 2.48517 13.523 3.18161 14.5457 4.20428C15.5684 5.22696 16.2648 6.52992 16.547 7.94841C16.8291 9.36689 16.6843 10.8372 16.1309 12.1734C15.5774 13.5096 14.6401 14.6516 13.4376 15.4551C12.2351 16.2586 10.8213 16.6875 9.37499 16.6875C7.43625 16.6854 5.57754 15.9142 4.20664 14.5433C2.83575 13.1725 2.06464 11.3137 2.06249 9.375Z" fill="#253461"/>
        </svg>
      </div>

      <div className={`product-search-results ${isOpen ? 'active' : ''}`}>
        {noResults ? (
          <p className="product-search-no-results">No products found.</p>
        ) : (
          <ul className="product-result-list">
            {results.map((product) => (
              <li key={product.id} className="product-result-item">
                <a href={product.url}>
                  {product.thumbnail && (
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      className="product-thumb"
                      loading="lazy"
                    />
                  )}
                  <div className="product-info">
                    <div className="product-title">{product.title}</div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <style>{`
        .product-search-wrapper {
          position: relative;
          width: 100%;
        }

        .product-search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .product-search-input {
          width: 100%;
          padding: 12px 45px 12px 18px;
          border: 1px solid #253461;
          border-radius: 15px;
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease;
          background-color: #fff;
        }

        .product-search-input:focus {
          border-color: #469ADC;
        }

        .product-search-input::placeholder {
          color: #888;
        }

        .product-search-icon {
          position: absolute;
          right: 18px;
          width: 20px;
          height: 20px;
          pointer-events: none;
        }

        .product-search-spinner {
          position: absolute;
          right: 12px;
          width: 16px;
          height: 16px;
          border: 2px solid #e0e0e0;
          border-top-color: #469ADC;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .product-search-results {
          position: absolute;
          z-index: 232;
          background: white;
          width: 100%;
          min-width: 350px;
          padding: 25px 15px;
          box-shadow: 0 10px 10px rgba(0, 0, 0, 0.16);
          max-height: 455px;
          overflow-y: auto;
          opacity: 0;
          visibility: hidden;
          transition: all 0.6s ease;
          margin-top: 0;
        }

        .product-search-results.active {
          opacity: 1;
          visibility: visible;
          display: block;
        }

        .product-result-list {
          padding: 0;
          margin: 0;
          display: flex;
          flex-flow: column;
          row-gap: 10px;
        }

        .product-result-item {
          list-style: none;
        }

        .product-result-item a {
          display: flex;
          align-items: center;
          column-gap: 20px;
          color: #253461;
          text-decoration: none;
          transition: opacity 0.2s ease;
        }

        .product-result-item a:hover {
          opacity: 0.7;
        }

        .product-thumb {
          max-width: 100px;
          width: 100px;
          height: auto;
          object-fit: cover;
          background-color: #f5f5f5;
        }

        .product-info {
          flex: 1;
          min-width: 0;
        }

        .product-title {
          font-family: 'Jost', sans-serif;
          font-weight: 500;
          font-size: 14px;
          color: #253461;
          line-height: 1.3;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .product-search-no-results {
          font-family: 'Jost', sans-serif;
          font-size: 14px;
          color: #666;
          text-align: center;
          padding: 20px;
          margin: 0;
        }

        /* Scrollbar styling */
        .product-search-results::-webkit-scrollbar {
          width: 6px;
        }

        .product-search-results::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }

        .product-search-results::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .product-search-results::-webkit-scrollbar-thumb:hover {
          background: #a1a1a1;
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .product-search-results {
            min-width: 100%;
            left: 0;
            right: 0;
          }

          .product-thumb {
            width: 60px;
            height: 60px;
          }
        }
      `}</style>
    </div>
  );
}
