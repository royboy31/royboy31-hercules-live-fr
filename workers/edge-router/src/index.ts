/**
 * Hercules Edge Router
 *
 * Routes traffic between Astro (static) and WordPress (dynamic) origins
 * on the same domain for seamless cookie/session sharing.
 */

interface Env {
  ASTRO_ORIGIN: string;
  WORDPRESS_ORIGIN: string;
  PRODUCT_SYNC_WORKER_URL: string;
}

// Paths that should NEVER be cached (dynamic/personalized)
const NO_CACHE_PATHS = [
  '/cart',
  '/checkout',
  '/panier',
  '/commande',
  '/paiement',
  '/validation-de-la-commande',
  '/thank-you',
  '/merci',
  '/mon-compte',
  '/generateur-de-devis',
  '/wp-admin',
  '/wp-login.php',
  '/wp-json',
  '/wc-api',
];

// Paths that should go to WordPress
const WORDPRESS_PATHS = [
  // Shop & Cart & Checkout (French slugs - FR site)
  '/cart',
  '/checkout',
  '/panier',
  '/commande',
  '/paiement',               // WooCommerce payment page (FR)
  '/validation-de-la-commande', // WooCommerce order received (FR)
  '/thank-you',
  '/merci',

  // Account (French slug only - /my-account redirects to /mon-compte)
  '/mon-compte',

  // WordPress Core
  '/wp-admin',
  '/wp-json',
  '/wc-api',
  '/wp-login.php',
  '/wp-cron.php',
  '/?wc-ajax',
  '/wp-content/uploads',
  '/wp-content/plugins',
  '/wp-content/themes',
  '/wp-content/cache',
  '/wp-includes',

  // Product purchase (WordPress for add-to-cart functionality)
  '/buy',  // Astro links here for actual purchase - routes to WordPress /products/

  // Quote page (served by WordPress)
  '/generateur-de-devis',
];

// Paths that should always go to Astro - French
const ASTRO_PATHS = [
  '/',
  '/boutique',           // Shop index page (Astro)
  '/collections',
  '/blogs/news',
  '/products',           // Product detail pages (Astro version)
  '/liste-de-souhaits',  // Wishlist page (localStorage-based, no WordPress)
];

function shouldBypassCache(pathname: string, search: string): boolean {
  // WC AJAX should never be cached
  if (search.includes('wc-ajax')) {
    return true;
  }

  // Check no-cache paths
  for (const path of NO_CACHE_PATHS) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return true;
    }
  }

  return false;
}

function shouldRouteToWordPress(pathname: string, search: string): boolean {
  // Check for WooCommerce AJAX calls
  if (search.includes('wc-ajax')) {
    return true;
  }

  // Check WordPress paths
  for (const wpPath of WORDPRESS_PATHS) {
    if (pathname === wpPath || pathname.startsWith(wpPath + '/') || pathname.startsWith(wpPath + '?')) {
      return true;
    }
  }

  // Check for WordPress file extensions
  if (pathname.endsWith('.php')) {
    return true;
  }

  return false;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, search } = url;

    // Staging: block all search engine indexing
    if (url.hostname.startsWith('staging.')) {
      if (pathname === '/robots.txt') {
        return new Response('User-Agent: *\nDisallow: /\n', {
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    // Redirect /boutique-new → /boutique (migrated to Astro)
    if (pathname === '/boutique-new' || pathname === '/boutique-new/') {
      return Response.redirect(new URL('/boutique/', url.origin).toString(), 301);
    }

    // Debug endpoint to check what cookies Edge Router receives
    if (pathname === '/_edge-debug') {
      const cookieHeader = request.headers.get('Cookie') || '';
      return new Response(JSON.stringify({
        cookies_received: cookieHeader,
        headers: Object.fromEntries(request.headers.entries()),
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // ============================================
    // PRODUCT IMAGE PROXY — serve Worker images from same origin to eliminate
    // cross-origin overhead (DNS + TCP + TLS) for LCP on collection/product pages
    // ============================================
    if (pathname.startsWith('/product-image/')) {
      // /product-image/{slug} → Worker /image/{slug}
      // /product-image/{slug}/{index} → Worker /image/{slug}/{index}
      // /product-image/{slug}?size=thumb → Worker /image/{slug}?size=thumb
      const imagePath = pathname.replace('/product-image/', '/image/');
      const workerUrl = `${env.PRODUCT_SYNC_WORKER_URL}${imagePath}${search}`;

      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      const cachedResponse = await cache.match(cacheKey);

      if (cachedResponse) {
        return cachedResponse;
      }

      const imageResponse = await fetch(workerUrl, {
        headers: { 'Accept': request.headers.get('Accept') || 'image/webp,image/*,*/*' },
      });

      if (!imageResponse.ok) {
        return new Response('Image not found', { status: 404 });
      }

      const response = new Response(imageResponse.body, {
        headers: {
          'Content-Type': imageResponse.headers.get('Content-Type') || 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': '*',
          'X-Edge-Router': 'hercules',
          'X-Image-Proxy': 'true',
        },
      });

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    // ============================================
    // THIRD-PARTY SCRIPT PROXY - Cache with proper headers
    // ============================================
    if (pathname.startsWith('/cached-scripts/')) {
      const SCRIPT_MAP: Record<string, { url: string; maxAge: number; contentType: string }> = {
        '/cached-scripts/clarity.js': {
          url: 'https://www.clarity.ms/tag/pc87sb9mdj',
          maxAge: 604800, // 7 days
          contentType: 'application/javascript',
        },
        '/cached-scripts/trustindex-loader.js': {
          url: 'https://cdn.trustindex.io/loader.js?cb5ae3e497fe7730a8269155c1e',
          maxAge: 86400, // 1 day
          contentType: 'application/javascript',
        },
        '/cached-scripts/clickcease-stat.js': {
          url: 'https://www.clickcease.com/monitor/stat.js',
          maxAge: 86400, // 1 day
          contentType: 'application/javascript',
        },
        '/cached-scripts/cf-beacon.js': {
          url: 'https://static.cloudflareinsights.com/beacon.min.js/vcd15cbe7772f49c399c6a5babf22c1241717689176015',
          maxAge: 604800, // 7 days
          contentType: 'application/javascript',
        },
      };

      const scriptConfig = SCRIPT_MAP[pathname];
      if (scriptConfig) {
        // Check Cloudflare cache first
        const cache = caches.default;
        const cacheKey = new Request(url.toString(), request);
        let cachedResponse = await cache.match(cacheKey);

        if (cachedResponse) {
          return cachedResponse;
        }

        // Fetch from origin
        const originResponse = await fetch(scriptConfig.url, {
          headers: { 'User-Agent': request.headers.get('User-Agent') || '' },
        });

        if (!originResponse.ok) {
          return new Response('Script not available', { status: 502 });
        }

        const scriptBody = await originResponse.text();
        const response = new Response(scriptBody, {
          headers: {
            'Content-Type': scriptConfig.contentType,
            'Cache-Control': `public, max-age=${scriptConfig.maxAge}, stale-while-revalidate=${scriptConfig.maxAge * 2}`,
            'Access-Control-Allow-Origin': '*',
            'X-Proxied-From': scriptConfig.url,
          },
        });

        // Store in Cloudflare edge cache
        ctx.waitUntil(cache.put(cacheKey, response.clone()));

        return response;
      }
    }

    // ============================================
    // 301 REDIRECTS - Old/alternate URLs to FR URL structure
    // ============================================

    // /blog, /blogs -> /blogs/news/ (FR blog)
    if (pathname === '/blog' || pathname === '/blog/' || pathname === '/blogs' || pathname === '/blogs/') {
      return Response.redirect(new URL('/blogs/news/', url.origin).toString(), 301);
    }

    // /blogs/fr -> /blogs/news/ (old blog path)
    if (pathname === '/blogs/fr' || pathname === '/blogs/fr/') {
      return Response.redirect(new URL('/blogs/news/', url.origin).toString(), 301);
    }
    if (pathname.startsWith('/blogs/fr/')) {
      const slug = pathname.replace('/blogs/fr/', '').replace(/\/+$/, '');
      return Response.redirect(new URL(`/blogs/news/${slug}/`, url.origin).toString(), 301);
    }

    // /product-category/* -> /collections/* (WooCommerce default category URL)
    if (pathname === '/product-category' || pathname === '/product-category/') {
      return Response.redirect(new URL('/collections/', url.origin).toString(), 301);
    }
    if (pathname.startsWith('/product-category/')) {
      const slug = pathname.replace('/product-category/', '').replace(/\/+$/, '');
      return Response.redirect(new URL(`/collections/${slug}/`, url.origin).toString(), 301);
    }

    // /product/* -> /products/* (WooCommerce default product URL - singular)
    if (pathname.startsWith('/product/') && !pathname.startsWith('/product-category/')) {
      const slug = pathname.replace('/product/', '').replace(/\/+$/, '');
      return Response.redirect(new URL(`/products/${slug}/`, url.origin).toString(), 301);
    }

    // /category/* -> /collections/*
    if (pathname === '/category' || pathname === '/category/') {
      return Response.redirect(new URL('/collections/', url.origin).toString(), 301);
    }
    if (pathname.startsWith('/category/')) {
      const slug = pathname.replace('/category/', '').replace(/\/+$/, '');
      return Response.redirect(new URL(`/collections/${slug}/`, url.origin).toString(), 301);
    }

    // Old English quote URL -> French
    if (pathname === '/quote-generator' || pathname === '/quote-generator/') {
      return Response.redirect(new URL('/generateur-de-devis/', url.origin).toString(), 301);
    }

    // Old English page slugs -> French slugs
    if (pathname === '/about' || pathname === '/about/' || pathname === '/about-us' || pathname === '/about-us/') {
      return Response.redirect(new URL('/a-propos/', url.origin).toString(), 301);
    }
    if (pathname === '/contact' || pathname === '/contact/' || pathname === '/contact-us' || pathname === '/contact-us/') {
      return Response.redirect(new URL('/contactez-nous/', url.origin).toString(), 301);
    }
    if (pathname === '/wishlist' || pathname === '/wishlist/') {
      return Response.redirect(new URL('/liste-de-souhaits/', url.origin).toString(), 301);
    }
    if (pathname === '/deliveries-and-returns' || pathname === '/deliveries-and-returns/' ||
        pathname === '/delivery-and-returns' || pathname === '/delivery-and-returns/') {
      return Response.redirect(new URL('/livraisons-et-retours/', url.origin).toString(), 301);
    }
    if (pathname === '/payment-methods' || pathname === '/payment-methods/') {
      return Response.redirect(new URL('/moyens-de-paiement/', url.origin).toString(), 301);
    }
    if (pathname === '/legal-notice' || pathname === '/legal-notice/') {
      return Response.redirect(new URL('/mentions-legales/', url.origin).toString(), 301);
    }
    if (pathname === '/terms-of-service' || pathname === '/terms-of-service/' ||
        pathname === '/terms-and-conditions' || pathname === '/terms-and-conditions/' ||
        pathname === '/conditions-generales-dutilisation' || pathname === '/conditions-generales-dutilisation/') {
      return Response.redirect(new URL('/conditions-generales-de-vente/', url.origin).toString(), 301);
    }
    if (pathname === '/privacy-policy' || pathname === '/privacy-policy/' ||
        pathname === '/politique-de-confidentialite' || pathname === '/politique-de-confidentialite/') {
      return Response.redirect(new URL('/politique-de-confidentialite-et-de-cookies/', url.origin).toString(), 301);
    }
    if (pathname === '/my-account' || pathname === '/my-account/') {
      return Response.redirect(new URL('/mon-compte/', url.origin).toString(), 301);
    }

    // Old English collection slugs -> French slugs
    if (pathname === '/collections/football-scarves' || pathname === '/collections/football-scarves/') {
      return Response.redirect(new URL('/collections/echarpes-de-football/', url.origin).toString(), 301);
    }
    if (pathname === '/collections/fan-items' || pathname === '/collections/fan-items/') {
      return Response.redirect(new URL('/collections/articles-de-supporters/', url.origin).toString(), 301);
    }
    if (pathname === '/collections/basketball' || pathname === '/collections/basketball/') {
      return Response.redirect(new URL('/collections/basket-ball/', url.origin).toString(), 301);
    }
    if (pathname === '/collections/teamwear' || pathname === '/collections/teamwear/') {
      return Response.redirect(new URL('/collections/tenues-de-sport/', url.origin).toString(), 301);
    }

    // Old slug redirects
    if (pathname === '/pages/livraisons-et-retours' || pathname === '/pages/livraisons-et-retours/' ||
        pathname.startsWith('/pages/livraisons-et-retours#')) {
      return Response.redirect(new URL('/livraisons-et-retours/', url.origin).toString(), 301);
    }
    if (pathname === '/boutique-2' || pathname === '/boutique-2/') {
      return Response.redirect(new URL('/boutique/', url.origin).toString(), 301);
    }
    if (pathname === '/blogs/news/category/blogs' || pathname === '/blogs/news/category/blogs/') {
      return Response.redirect(new URL('/blogs/news/', url.origin).toString(), 301);
    }

    // Handle CORS preflight for API requests
    if (request.method === 'OPTIONS' && pathname.startsWith('/wp-json/')) {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': url.origin,
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-WP-Nonce',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Determine which origin to use
    const isWordPress = shouldRouteToWordPress(pathname, search);
    const bypassCache = shouldBypassCache(pathname, search);
    const origin = isWordPress ? env.WORDPRESS_ORIGIN : env.ASTRO_ORIGIN;

    // Check if this is a product page and if the product is missive-only (hidden from website)
    const productMatch = pathname.match(/^\/products\/([^/]+)\/?$/);
    if (productMatch && !isWordPress) {
      const productSlug = productMatch[1];
      try {
        // Use exclude_missive=true - returns 404 for missive-only products
        const checkUrl = `${env.PRODUCT_SYNC_WORKER_URL}/product/${productSlug}?exclude_missive=true`;
        const checkResp = await fetch(checkUrl);
        if (!checkResp.ok) {
          // Product is missive-only or not found - return 404
          return new Response('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=/404/"><title>Page non trouvée</title></head><body><p>Produit non trouvé</p></body></html>', {
            status: 404,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
          });
        }
      } catch (e) {
        // On error, allow request to proceed (fail open)
        console.error('Missive-only check failed:', e);
      }
    }

    // Rewrite /buy/ to /products/ for WordPress (product purchase flow)
    let targetPath = pathname;
    if (isWordPress && pathname.startsWith('/buy/')) {
      targetPath = pathname.replace('/buy/', '/products/');
    }

    // Build target URL
    const targetUrl = new URL(targetPath + search, origin);

    // Clone headers and adjust Host
    const headers = new Headers(request.headers);
    const targetHost = new URL(origin).host;
    headers.set('Host', targetHost);

    // Forward the original host for WordPress to use in redirects
    headers.set('X-Forwarded-Host', url.host);
    headers.set('X-Forwarded-Proto', url.protocol.replace(':', ''));

    // APO strips cookies - send them via custom header as backup
    // WordPress mu-plugin will read from X-Edge-Cookies if Cookie header is missing WC session
    const originalCookies = request.headers.get('Cookie') || '';
    if (originalCookies && isWordPress) {
      headers.set('X-Edge-Cookies', originalCookies);
    }

    // Create the proxied request
    // Note: GET/HEAD requests cannot have a body in the Workers runtime.
    // Some clients (e.g. Exact Online) send GET with Content-Length: 0, which
    // causes a TypeError if we pass request.body through.
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual', // Handle redirects ourselves
    });

    // Debug: Log what cookies we're sending to the origin
    const cookiesSent = headers.get('Cookie') || 'NONE';

    try {
      // For WordPress requests, bypass Cloudflare's edge to preserve cookies
      // APO strips WooCommerce session cookies - direct to origin bypasses this
      const fetchOptions: RequestInit = isWordPress ? {
        cf: {
          // Resolve directly to origin server IP to bypass Cloudflare's APO cookie stripping
          resolveOverride: 'origin.hercules-merchandising.fr',
          cacheTtl: 0,
          cacheEverything: false,
        } as any,
      } : (bypassCache ? {
        cf: {
          cacheTtl: 0,
          cacheEverything: false,
        } as any,
      } : {});

      let response = await fetch(proxyRequest, fetchOptions);

      // Handle redirects - rewrite to keep on same domain
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (location) {
          const redirectUrl = new URL(location, targetUrl);

          // Check if redirect is to our WordPress origin
          const wpOriginHost = new URL(env.WORDPRESS_ORIGIN).host;
          const wpOriginUrlHost = wpOriginHost;
          const astroOriginHost = new URL(env.ASTRO_ORIGIN).host;

          if (redirectUrl.host === wpOriginHost || redirectUrl.host === wpOriginUrlHost) {
            // Rewrite WordPress redirects to our domain
            redirectUrl.host = url.host;
            redirectUrl.protocol = url.protocol;
          } else if (redirectUrl.host === astroOriginHost) {
            // Rewrite Astro/Pages redirects to our domain
            redirectUrl.host = url.host;
            redirectUrl.protocol = url.protocol;
          }

          // Create new response with rewritten location and cookies
          const newHeaders = new Headers();

          // Copy all non-Set-Cookie headers (except Location which we handle separately)
          for (const [key, value] of response.headers.entries()) {
            if (key.toLowerCase() !== 'set-cookie' && key.toLowerCase() !== 'location') {
              newHeaders.set(key, value);
            }
          }

          // Set the rewritten location
          newHeaders.set('Location', redirectUrl.toString());

          // Handle Set-Cookie headers specially - getSetCookie() returns all cookies
          const setCookies = response.headers.getSetCookie();
          for (const cookie of setCookies) {
            let newCookie = cookie.replace(/;\s*domain=[^;]+/gi, '');
            newCookie = newCookie.replace(new RegExp(wpOriginHost, 'g'), url.host);
            newHeaders.append('Set-Cookie', newCookie);
          }

          // Security headers for redirects
          newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
          newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
          newHeaders.set('X-Content-Type-Options', 'nosniff');

          // Debug headers for redirects
          newHeaders.set('X-Edge-Router', 'hercules');
          newHeaders.set('X-Routed-To', isWordPress ? 'wordpress' : 'astro');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        }
      }

      // Rewrite WordPress origin URLs and cookies
      const wpHost = new URL(env.WORDPRESS_ORIGIN).host;
      const wpOriginUrlHost = wpHost;
      const ourOrigin = url.origin;
      const ourHost = url.host;

      // Create new headers and rewrite Set-Cookie domains
      const newHeaders = new Headers();

      // First, copy all non-Set-Cookie headers
      for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase() !== 'set-cookie') {
          newHeaders.set(key, value);
        }
      }

      // Handle Set-Cookie headers specially - getSetCookie() returns all cookies
      // This is necessary because headers.entries() may not return all Set-Cookie headers
      const setCookies = response.headers.getSetCookie();
      for (const cookie of setCookies) {
        // Rewrite cookie domain from WordPress to our domain
        let newCookie = cookie;
        // Remove domain restriction so cookie works on Edge Router domain
        newCookie = newCookie.replace(/;\s*domain=[^;]+/gi, '');
        // Also rewrite any WordPress URLs in the cookie path
        newCookie = newCookie.replace(new RegExp(wpHost, 'g'), ourHost);
        newHeaders.append('Set-Cookie', newCookie);
      }

      // Add CORS headers for session/API requests to allow credentials
      if (pathname.startsWith('/wp-json/')) {
        newHeaders.set('Access-Control-Allow-Origin', ourOrigin);
        newHeaders.set('Access-Control-Allow-Credentials', 'true');
        newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-WP-Nonce');
      }

      // For non-redirect responses, we may need to rewrite content
      // that contains absolute URLs to WordPress origin
      const contentType = response.headers.get('Content-Type') || '';

      // Skip rewriting for hashed static assets — they use relative paths only,
      // never contain domain URLs, and must stream to avoid blocking load event
      const isStaticAsset =
        pathname.startsWith('/_astro/') ||
        pathname.startsWith('/images/') ||
        pathname.startsWith('/fonts/');

      // Rewrite URLs in HTML, JSON, CSS, and JavaScript files (but not static assets)
      const shouldRewriteContent = !isStaticAsset && (
        contentType.includes('text/html') ||
        contentType.includes('application/json') ||
        contentType.includes('text/css') ||
        contentType.includes('application/javascript') ||
        contentType.includes('text/javascript'));

      if (shouldRewriteContent) {
        let body = await response.text();

        // Replace all URL formats for WordPress host:
        // 1. Full HTTPS URLs: https://staging.hercules-merchandising.fr
        body = body.replaceAll(`https://${wpHost}`, ourOrigin);

        // 2. Full HTTP URLs: http://staging.hercules-merchandising.fr
        body = body.replaceAll(`http://${wpHost}`, ourOrigin);

        // 3. Protocol-relative URLs: //staging.hercules-merchandising.fr
        body = body.replaceAll(`//${wpHost}`, `//${ourHost}`);

        // 4. Escaped URLs in JSON: https:\/\/staging.hercules-merchandising.fr
        body = body.replaceAll(`https:\\/\\/${wpHost}`, `https:\\/\\/${ourHost}`);
        body = body.replaceAll(`http:\\/\\/${wpHost}`, `https:\\/\\/${ourHost}`);

        // Also rewrite origin-staging URLs if different from wpHost
        if (wpOriginUrlHost !== wpHost) {
          body = body.replaceAll(`https://${wpOriginUrlHost}`, ourOrigin);
          body = body.replaceAll(`http://${wpOriginUrlHost}`, ourOrigin);
          body = body.replaceAll(`//${wpOriginUrlHost}`, `//${ourHost}`);
        }

        // Also rewrite Astro/Pages URLs to our domain
        const astroHost = new URL(env.ASTRO_ORIGIN).host;
        body = body.replaceAll(`https://${astroHost}`, ourOrigin);
        body = body.replaceAll(`http://${astroHost}`, ourOrigin);
        body = body.replaceAll(`//${astroHost}`, `//${ourHost}`);

        // Staging: inject noindex meta tag into HTML to prevent indexing
        if (url.hostname.startsWith('staging.') && contentType.includes('text/html')) {
          body = body.replace(
            /<meta\s+name="robots"\s+content="[^"]*">/i,
            '<meta name="robots" content="noindex, nofollow">'
          );
        }

        newHeaders.delete('Content-Length'); // Length may have changed

        // Set appropriate caching headers
        if (bypassCache) {
          // Dynamic pages should never be cached
          newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
          newHeaders.set('Pragma', 'no-cache');
        } else if (!isWordPress) {
          // Astro static assets (/_astro/*) have content hashes - preserve their 1-year cache
          // Only set short cache for HTML pages
          if (!pathname.startsWith('/_astro/')) {
            newHeaders.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600'); // 5 min fresh + 1hr stale-while-revalidate
          }
          // Note: /_astro/* files keep their original Cache-Control from Cloudflare Pages
        }
        // Note: For cacheable WordPress pages, preserve their original Cache-Control

        // Security headers for WCAG/PageSpeed compliance
        newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
        newHeaders.set('X-Content-Type-Options', 'nosniff');
        newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        newHeaders.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        // Debug headers to confirm Edge Router is processing requests
        newHeaders.set('X-Edge-Router', 'hercules');
        newHeaders.set('X-Routed-To', isWordPress ? 'wordpress' : 'astro');
        newHeaders.set('X-Cookies-Sent', cookiesSent.substring(0, 200)); // First 200 chars

        return new Response(body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }

      // For non-rewritten content, still apply cache headers if needed
      if (bypassCache) {
        newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        newHeaders.set('Pragma', 'no-cache');
      }

      // Security headers for WCAG/PageSpeed compliance
      newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
      newHeaders.set('X-Content-Type-Options', 'nosniff');
      newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      newHeaders.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

      // Staging: block search engine indexing via HTTP header
      if (url.hostname.startsWith('staging.')) {
        newHeaders.set('X-Robots-Tag', 'noindex, nofollow');
      }

      // Debug headers to confirm Edge Router is processing requests
      newHeaders.set('X-Edge-Router', 'hercules');
      newHeaders.set('X-Routed-To', isWordPress ? 'wordpress' : 'astro');
      newHeaders.set('X-Cookies-Sent', cookiesSent.substring(0, 200)); // First 200 chars

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      console.error('Edge router error:', error);
      return new Response(`Edge Router Error: ${error}`, { status: 502 });
    }
  },
};
