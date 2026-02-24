/**
 * Hercules Edge Router
 *
 * Routes traffic between Astro (static) and WordPress (dynamic) origins
 * on the same domain for seamless cookie/session sharing.
 */

interface Env {
  ASTRO_ORIGIN: string;
  WORDPRESS_ORIGIN: string;
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
  '/boutique',      // French WooCommerce shop slug
  '/boutique-new',  // New shop page (WordPress)
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
    // THIRD-PARTY SCRIPT PROXY - Cache with proper headers
    // ============================================
    if (pathname.startsWith('/cached-scripts/')) {
      const SCRIPT_MAP: Record<string, { url: string; maxAge: number; contentType: string }> = {
        '/cached-scripts/clarity.js': {
          url: 'https://www.clarity.ms/tag/j9gd5ystsk',
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
      const slug = pathname.replace('/blogs/fr/', '');
      return Response.redirect(new URL(`/blogs/news/${slug}`, url.origin).toString(), 301);
    }

    // /product-category/* -> /collections/* (WooCommerce default category URL)
    if (pathname === '/product-category' || pathname === '/product-category/') {
      return Response.redirect(new URL('/collections/', url.origin).toString(), 301);
    }
    if (pathname.startsWith('/product-category/')) {
      const slug = pathname.replace('/product-category/', '');
      return Response.redirect(new URL(`/collections/${slug}`, url.origin).toString(), 301);
    }

    // /product/* -> /products/* (WooCommerce default product URL - singular)
    if (pathname.startsWith('/product/') && !pathname.startsWith('/product-category/')) {
      const slug = pathname.replace('/product/', '');
      return Response.redirect(new URL(`/products/${slug}`, url.origin).toString(), 301);
    }

    // /category/* -> /collections/*
    if (pathname === '/category' || pathname === '/category/') {
      return Response.redirect(new URL('/collections/', url.origin).toString(), 301);
    }
    if (pathname.startsWith('/category/')) {
      const slug = pathname.replace('/category/', '');
      return Response.redirect(new URL(`/collections/${slug}`, url.origin).toString(), 301);
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
        pathname === '/terms-and-conditions' || pathname === '/terms-and-conditions/') {
      return Response.redirect(new URL('/conditions-generales-dutilisation/', url.origin).toString(), 301);
    }
    if (pathname === '/privacy-policy' || pathname === '/privacy-policy/') {
      return Response.redirect(new URL('/politique-de-confidentialite/', url.origin).toString(), 301);
    }
    if (pathname === '/my-account' || pathname === '/my-account/') {
      return Response.redirect(new URL('/mon-compte/', url.origin).toString(), 301);
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
    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.body,
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
