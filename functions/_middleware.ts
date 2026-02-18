// Cloudflare Pages Middleware to set proper cache headers for static assets

const STATIC_EXTENSIONS = [
  '.js', '.css', '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.mp4', '.webm', '.ogg', '.mp3', '.wav'
];

const IMMUTABLE_PATHS = ['/_astro/', '/images/'];

export const onRequest: PagesFunction = async (context) => {
  const response = await context.next();
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Check if this is a static asset that should be cached
  const isStaticAsset = STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext));
  const isImmutablePath = IMMUTABLE_PATHS.some(path => pathname.startsWith(path));

  if (isStaticAsset || isImmutablePath) {
    // Clone the response to modify headers
    const newResponse = new Response(response.body, response);

    // Set aggressive caching for static assets (1 year, immutable)
    newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Remove any no-store headers that might have been set
    newResponse.headers.delete('Surrogate-Control');

    return newResponse;
  }

  // For HTML pages, 5 min fresh cache + 1 hour stale-while-revalidate
  if (pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.')) {
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return newResponse;
  }

  return response;
};
