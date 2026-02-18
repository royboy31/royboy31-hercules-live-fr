/**
 * Hercules Product Sync Worker
 *
 * This Cloudflare Worker handles:
 * 1. Daily cron job to sync all products from WooCommerce
 * 2. Webhook endpoint to receive real-time product updates
 * 3. Image caching in KV storage (thumbnails)
 * 4. Product data storage in KV
 */

export interface Env {
  PRODUCTS_KV: KVNamespace;
  PRODUCTS_BUCKET?: R2Bucket;  // Optional - enable R2 in Cloudflare dashboard
  WC_STORE_URL: string;
  ASTRO_SITE_URL: string;
  WC_CONSUMER_KEY: string;
  WC_CONSUMER_SECRET: string;
  WEBHOOK_SECRET: string;
  GITHUB_TOKEN?: string;  // GitHub Personal Access Token for triggering workflow_dispatch
}

// GitHub repo for triggering auto-rebuild
const GITHUB_REPO = 'kamindu01/hercules-astro';
const GITHUB_WORKFLOW = 'deploy.yml';

// Worker base URL for image serving
const WORKER_URL = 'https://hercules-product-sync.gilles-86d.workers.dev';

interface WCProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  status: string;  // publish, draft, pending, private, trash
  type: string;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: string;
  menu_order: number;  // Product sort order in WordPress
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  images: Array<{ id: number; src: string; alt: string }>;
  attributes: Array<{
    id: number;
    name: string;
    options: string[];
  }>;
  variations: number[];
  meta_data?: Array<{ key: string; value: any }>;
  // Custom fields exposed by our REST API filter
  addon_options?: Record<string, {
    options: Array<{
      name: string;
      image?: string;
      price_table?: Array<{ qty: number; price: number }>;
    }>;
    visible_if_option?: string | null;
  }>;
  allowed_addon_ids?: number[];
  estimated_delivery_date?: string;
  // Per-category positions exposed by our REST API filter (from _cat_pos_* meta)
  category_positions?: Record<string, number>;
  // ACF PDF fields for Design Box section (exposed by our REST API filter)
  pdf_url?: string | null;
  pdf_2_url?: string | null;
  // FAQ fields (exposed by our REST API filter)
  faq?: Array<{ question: string; answer: string }>;
}

interface WCVariation {
  id: number;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  attributes: Array<{ name: string; option: string }>;
  image?: { src: string; alt: string };
  meta_data?: Array<{ key: string; value: any }>;
  // Custom fields exposed by our REST API filter
  conditional_prices?: Array<{ qty: number; price: string | number }>;
  lead_time?: string;
}

interface SyncedProduct {
  id: number;
  name: string;
  slug: string;
  type: string;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  currency: string;
  stock_status: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  images: Array<{
    id: number;
    src: string;
    local_src: string;
    thumbnail: string;
    local_thumbnail: string;
    alt: string;
  }>;
  attributes: Array<{
    id: number;
    name: string;
    slug: string;
    options: Array<{
      value: string;
      label: string;
      price_adjustment?: number;
    }>;
  }>;
  variations: Array<{
    id: number;
    attributes: Record<string, string>;
    price: string;
    regular_price: string;
    on_sale: boolean;
    conditional_prices?: Array<{ qty: number; price: number }>;
    lead_time?: string;
  }>;
  // Pearl plugin addon options
  addon_options?: Record<string, {
    options: Array<{
      name: string;
      image?: string;
      price_table?: Array<{ qty: number; price: number }>;
    }>;
    visible_if_option?: string | null;
  }>;
  allowed_addon_ids?: number[];
  estimated_delivery_date?: string;
  // Badge fields from custom meta
  made_in_europe: boolean;
  green_product: boolean;
  // USP (Unique Selling Points) for card display
  card_features: string[];
  // Product sort order (from WordPress menu_order)
  menu_order: number;
  // Per-category positions (from _cat_pos_{term_id} meta fields)
  // Key is category term_id, value is position within that category
  category_positions: Record<string, number>;
  // ACF PDF fields for Design Box section
  pdf_url: string | null;
  pdf_2_url: string | null;
  // FAQ items
  faq: Array<{ question: string; answer: string }>;
  synced_at: string;
}

// WooCommerce Category from API
interface WCCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: { id: number; src: string; alt: string } | null;
  menu_order: number;
  count: number;
  // Custom meta exposed by our REST API filter
  second_description?: string;
}

// WordPress Post from REST API
interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  categories: number[];
  tags: number[];
  // Embedded data when using _embed
  _embedded?: {
    author?: Array<{ id: number; name: string; avatar_urls?: Record<string, string> }>;
    'wp:featuredmedia'?: Array<{ id: number; source_url: string; alt_text: string; media_details?: { sizes?: Record<string, { source_url: string }> } }>;
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>;
  };
}

// Synced Post format
interface SyncedPost {
  id: number;
  title: string;
  slug: string;
  date: string;
  modified: string;
  excerpt: string;
  content: string;
  author: {
    id: number;
    name: string;
    avatar: string | null;
  };
  featuredImage: string | null;
  localFeaturedImage: string | null;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  synced_at: string;
}

// Synced Category format
interface SyncedCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  second_description: string | null;
  image: string | null;
  localImage: string | null;
  productCount: number;
  menuOrder: number;
  synced_at: string;
}

// WooCommerce REST API client
class WooCommerceClient {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor(baseUrl: string, consumerKey: string, consumerSecret: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
  }

  private getAuthHeader(): string {
    const credentials = btoa(`${this.consumerKey}:${this.consumerSecret}`);
    return `Basic ${credentials}`;
  }

  async fetchProducts(page: number = 1, perPage: number = 100): Promise<WCProduct[]> {
    // Only fetch published products (exclude drafts, private, pending, trash)
    const url = `${this.baseUrl}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}&status=publish`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async fetchAllProducts(): Promise<WCProduct[]> {
    const allProducts: WCProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const products = await this.fetchProducts(page, 100);
      allProducts.push(...products);

      if (products.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allProducts;
  }

  async fetchProductVariations(productId: number): Promise<WCVariation[]> {
    const url = `${this.baseUrl}/wp-json/wc/v3/products/${productId}/variations?per_page=100`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch variations for product ${productId}: ${response.status}`);
    }

    return response.json();
  }

  async fetchProduct(productId: number): Promise<WCProduct> {
    const url = `${this.baseUrl}/wp-json/wc/v3/products/${productId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product ${productId}: ${response.status}`);
    }

    return response.json();
  }

  async fetchCategories(): Promise<WCCategory[]> {
    // Use Hercules API endpoint which includes second_description
    const url = `${this.baseUrl}/wp-json/hercules/v1/categories`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }

    // Map Hercules API response to WCCategory format
    const herculesCategories = await response.json();
    return herculesCategories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parent: cat.parent,
      description: cat.description,
      display: 'default',
      image: null,
      menu_order: 0,
      count: cat.count,
      second_description: cat.second_description,
    }));
  }

  async fetchCategory(categoryId: number): Promise<WCCategory> {
    const url = `${this.baseUrl}/wp-json/wc/v3/products/categories/${categoryId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch category ${categoryId}: ${response.status}`);
    }

    return response.json();
  }

  // WordPress Posts API (standard WP REST API, no auth required for public posts)
  async fetchPosts(page: number = 1, perPage: number = 100): Promise<WPPost[]> {
    // Use _embed to get author, featured image, and terms in one request
    const url = `${this.baseUrl}/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}&status=publish&_embed`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async fetchAllPosts(): Promise<WPPost[]> {
    const allPosts: WPPost[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const posts = await this.fetchPosts(page, 100);
      allPosts.push(...posts);

      if (posts.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allPosts;
  }

  async fetchPost(postId: number): Promise<WPPost> {
    const url = `${this.baseUrl}/wp-json/wp/v2/posts/${postId}?_embed`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch post ${postId}: ${response.status}`);
    }

    return response.json();
  }
}

// Image sync helper - caches thumbnail in KV storage
// Optional imageIndex parameter for caching gallery images (0 = main, 1+ = gallery)
// Skips download if image already exists in KV (saves API calls when hitting daily limits)
async function syncImageToKV(
  kv: KVNamespace,
  imageUrl: string,
  productSlug: string,
  imageIndex: number = 0,
  forceRefresh: boolean = false
): Promise<boolean> {
  if (!imageUrl || !productSlug) {
    return false;
  }

  // Key format: image:{slug} for main (index 0), image:{slug}:{index} for gallery
  const kvKey = imageIndex === 0 ? `image:${productSlug}` : `image:${productSlug}:${imageIndex}`;

  try {
    // Check if image already exists in KV (skip download to save API calls)
    if (!forceRefresh) {
      const existing = await kv.get(kvKey);
      if (existing) {
        // Image already cached, skip
        return true;
      }
    }

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Hercules-Product-Sync/1.0',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${imageUrl} - ${response.status}`);
      return false;
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Store image as base64 in KV with metadata
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(imageBuffer))
    );

    await kv.put(
      kvKey,
      base64Image,
      {
        metadata: {
          contentType,
          originalUrl: imageUrl,
          syncedAt: new Date().toISOString(),
          imageIndex,
        },
      }
    );

    console.log(`Cached image ${imageIndex} for ${productSlug}`);
    return true;
  } catch (error) {
    console.error(`Error syncing image ${imageIndex} for ${productSlug}:`, error);
    return false;
  }
}

// Image sync helper (optional - only used if R2 bucket is available)
async function syncImageToR2(
  bucket: R2Bucket | undefined,
  imageUrl: string,
  productSlug: string,
  imageIndex: number,
  isThumbnail: boolean = false
): Promise<string> {
  // If no bucket available, return original URL
  if (!bucket) {
    return imageUrl;
  }

  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${imageUrl}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Generate a filename
    const extension = imageUrl.split('.').pop()?.split('?')[0] || 'png';
    const suffix = isThumbnail ? '-thumb' : '';
    const filename = `products/${productSlug}/${imageIndex}${suffix}.${extension}`;

    // Upload to R2
    await bucket.put(filename, imageBuffer, {
      httpMetadata: {
        contentType,
      },
    });

    return filename;
  } catch (error) {
    console.error(`Error syncing image ${imageUrl}:`, error);
    return imageUrl; // Return original URL on error
  }
}

// Transform WC product to synced format
async function transformProduct(
  product: WCProduct,
  variations: WCVariation[],
  bucket: R2Bucket | undefined,
  syncImages: boolean = true
): Promise<SyncedProduct> {
  // Sync images if enabled
  const images = await Promise.all(
    product.images.map(async (img, index) => {
      let localSrc = img.src;
      let localThumbnail = img.src.replace(/(\.[^.]+)$/, '-300x300$1');

      if (syncImages) {
        localSrc = await syncImageToR2(bucket, img.src, product.slug, index, false);
        localThumbnail = await syncImageToR2(bucket, localThumbnail, product.slug, index, true);
      }

      return {
        id: img.id,
        src: img.src,
        local_src: localSrc,
        thumbnail: img.src.replace(/(\.[^.]+)$/, '-300x300$1'),
        local_thumbnail: localThumbnail,
        alt: img.alt,
      };
    })
  );

  // Transform variations with conditional pricing
  const transformedVariations = variations.map(v => {
    // Parse conditional prices - convert string prices to numbers
    const conditionalPrices = v.conditional_prices?.map(cp => ({
      qty: Number(cp.qty),
      price: typeof cp.price === 'string' ? parseFloat(cp.price) : cp.price,
    }));

    return {
      id: v.id,
      attributes: Object.fromEntries(
        v.attributes.map(attr => [attr.name.toLowerCase().replace(/\s+/g, '_'), attr.option])
      ),
      price: v.price,
      regular_price: v.regular_price,
      on_sale: v.on_sale,
      conditional_prices: conditionalPrices,
      lead_time: v.lead_time,
    };
  });

  // Transform attributes
  const transformedAttributes = product.attributes.map(attr => ({
    id: attr.id,
    name: attr.name,
    slug: `pa_${attr.name.toLowerCase().replace(/\s+/g, '-')}`,
    options: attr.options.map(opt => ({
      value: opt.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, ''),
      label: opt,
    })),
  }));

  // Extract badge fields from meta_data
  const metaData = product.meta_data || [];
  const getMeta = (key: string): any => {
    const meta = metaData.find((m: any) => m.key === key);
    return meta?.value;
  };

  // Badge fields: "1" or 1 = true, "0" or 0 or undefined = false
  const madeInEurope = getMeta('made_in_europe');
  const greenProduct = getMeta('green_product');

  // USP (Unique Selling Points) for card display - up to 4 items
  const cardFeatures: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const usp = getMeta(`usp_${i}`);
    if (usp && typeof usp === 'string' && usp.trim()) {
      cardFeatures.push(usp.trim());
    }
  }

  // Per-category positions (from _cat_pos_{term_id} meta fields)
  // These are now exposed as a top-level field by our REST API filter
  const categoryPositions: Record<string, number> = product.category_positions || {};

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    type: product.type,
    featured: product.featured,
    description: product.description,
    short_description: product.short_description,
    sku: product.sku,
    price: product.price,
    regular_price: product.regular_price,
    sale_price: product.sale_price,
    on_sale: product.on_sale,
    currency: 'EUR',
    stock_status: product.stock_status,
    categories: product.categories,
    tags: product.tags,
    images,
    attributes: transformedAttributes,
    variations: transformedVariations,
    // Pearl plugin addon options from REST API
    addon_options: product.addon_options,
    allowed_addon_ids: product.allowed_addon_ids,
    estimated_delivery_date: product.estimated_delivery_date,
    // Badge fields from custom meta
    made_in_europe: madeInEurope === '1' || madeInEurope === 1 || madeInEurope === true,
    green_product: greenProduct === '1' || greenProduct === 1 || greenProduct === true,
    // USP features for card display
    card_features: cardFeatures,
    // Product sort order (from WordPress menu_order)
    menu_order: product.menu_order || 0,
    // Per-category positions
    category_positions: categoryPositions,
    // ACF PDF fields for Design Box section
    pdf_url: product.pdf_url || null,
    pdf_2_url: product.pdf_2_url || null,
    // FAQ items from ACF fields
    faq: product.faq || [],
    synced_at: new Date().toISOString(),
  };
}

// Batch size for product sync (to stay under subrequest limit)
// With fallback logic, each image can use up to 3 subrequests (kv.get, fetch, fallback fetch)
// Reduced batch size to allow more images per product
const BATCH_SIZE = 1;

// Max gallery images to cache per product (to stay within 50 subrequest limit)
// 1 product × 10 images × 2 subrequests = 20 (leaving room for API + KV ops)
const MAX_GALLERY_IMAGES = 10;

// Main sync function with batching support
// forceImageRefresh: if true, re-download all images even if already cached (for upgrading image sizes)
async function syncAllProducts(env: Env, offset: number = 0, forceImageRefresh: boolean = false): Promise<{ synced: number; errors: string[]; hasMore: boolean; nextOffset: number }> {
  const client = new WooCommerceClient(
    env.WC_STORE_URL,
    env.WC_CONSUMER_KEY,
    env.WC_CONSUMER_SECRET
  );

  const errors: string[] = [];
  let synced = 0;

  try {
    // Fetch all products (first request)
    console.log('Fetching all products...');
    const allProducts = await client.fetchAllProducts();
    console.log(`Found ${allProducts.length} products total, syncing from offset ${offset}`);

    // Fetch categories only on first batch
    if (offset === 0) {
      console.log('Fetching categories...');
      const categories = await client.fetchCategories();
      await env.PRODUCTS_KV.put('categories', JSON.stringify(categories));
    }

    // Get batch of products
    const products = allProducts.slice(offset, offset + BATCH_SIZE);
    const hasMore = offset + BATCH_SIZE < allProducts.length;
    const nextOffset = offset + BATCH_SIZE;

    // Process each product in batch
    for (const product of products) {
      try {
        console.log(`Syncing product ${product.id}: ${product.name}`);

        // Fetch variations for variable products
        let variations: WCVariation[] = [];
        if (product.type === 'variable' && product.variations?.length > 0) {
          variations = await client.fetchProductVariations(product.id);
        }

        // Transform and sync (skip image sync since R2 not enabled)
        const syncedProduct = await transformProduct(
          product,
          variations,
          env.PRODUCTS_BUCKET,
          false // Don't sync images - no R2 bucket
        );

        // Store in KV
        await env.PRODUCTS_KV.put(
          `product:${product.id}`,
          JSON.stringify(syncedProduct)
        );

        // Also store by slug for easy lookup
        await env.PRODUCTS_KV.put(
          `product:slug:${product.slug}`,
          JSON.stringify(syncedProduct)
        );

        // Cache gallery images in KV (limited to MAX_GALLERY_IMAGES to stay within subrequest limits)
        // forceRefresh parameter passed from sync endpoint to re-download all images
        if (product.slug && product.images?.length > 0) {
          const imagesToCache = Math.min(product.images.length, MAX_GALLERY_IMAGES);
          for (let i = 0; i < imagesToCache; i++) {
            const img = product.images[i];
            if (img?.src) {
              // Try 600x600 thumbnail first (higher quality for display at 361x361), fallback to original if 404
              const thumbnailUrl = img.src.replace(/(\.[^.]+)$/, '-600x600$1');
              const success = await syncImageToKV(env.PRODUCTS_KV, thumbnailUrl, product.slug, i, forceImageRefresh);
              if (!success && img.src !== thumbnailUrl) {
                // Fallback to original image if thumbnail doesn't exist
                // Force refresh since we know it's not cached (just failed above)
                await syncImageToKV(env.PRODUCTS_KV, img.src, product.slug, i, true);
              }
            }
          }
        }

        synced++;
      } catch (error) {
        const errorMsg = `Error syncing product ${product.id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Update product index with full list on first batch
    if (offset === 0) {
      const productIndex = allProducts.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        featured: p.featured,
        categories: p.categories.map(c => c.slug),
        menu_order: p.menu_order || 0,
      }));
      await env.PRODUCTS_KV.put('product:index', JSON.stringify(productIndex));
    }

    // Store sync timestamp only when complete
    if (!hasMore) {
      await env.PRODUCTS_KV.put('last_sync', new Date().toISOString());
    }

    console.log(`Batch complete. Synced ${synced} products, ${errors.length} errors. HasMore: ${hasMore}`);
    return { synced, errors, hasMore, nextOffset };
  } catch (error) {
    const errorMsg = `Fatal sync error: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { synced, errors, hasMore: false, nextOffset: 0 };
  }
}

// Delete a product from KV storage
async function deleteProduct(env: Env, productId: number): Promise<void> {
  // Get product to find slug for image deletion
  const productStr = await env.PRODUCTS_KV.get(`product:${productId}`);
  if (productStr) {
    const product = JSON.parse(productStr);
    // Delete by slug
    await env.PRODUCTS_KV.delete(`product:slug:${product.slug}`);
    // Delete cached image
    await env.PRODUCTS_KV.delete(`image:${product.slug}`);
  }

  // Delete by ID
  await env.PRODUCTS_KV.delete(`product:${productId}`);

  // Update index (remove product)
  const indexStr = await env.PRODUCTS_KV.get('product:index');
  if (indexStr) {
    const index = JSON.parse(indexStr);
    const filtered = index.filter((p: any) => p.id !== productId);
    await env.PRODUCTS_KV.put('product:index', JSON.stringify(filtered));
  }

  console.log(`Deleted product ${productId} from KV`);
}

// Sync a single product (for webhook updates)
async function syncSingleProduct(env: Env, productId: number): Promise<SyncedProduct | null> {
  const client = new WooCommerceClient(
    env.WC_STORE_URL,
    env.WC_CONSUMER_KEY,
    env.WC_CONSUMER_SECRET
  );

  const product = await client.fetchProduct(productId);

  // If product is not published (draft, pending, private, trash), remove from KV
  if (product.status !== 'publish') {
    console.log(`Product ${productId} is not published (status: ${product.status}), removing from KV`);
    await deleteProduct(env, productId);
    return null;
  }

  let variations: WCVariation[] = [];
  if (product.type === 'variable') {
    variations = await client.fetchProductVariations(productId);
  }

  const syncedProduct = await transformProduct(
    product,
    variations,
    env.PRODUCTS_BUCKET,
    false // Don't sync images - no R2 bucket
  );

  // Store in KV
  await env.PRODUCTS_KV.put(
    `product:${product.id}`,
    JSON.stringify(syncedProduct)
  );
  await env.PRODUCTS_KV.put(
    `product:slug:${product.slug}`,
    JSON.stringify(syncedProduct)
  );

  // Cache thumbnail image in KV (600x600 for higher quality display)
  if (product.slug && product.images?.[0]?.src) {
    const thumbnailUrl = product.images[0].src.replace(/(\.[^.]+)$/, '-600x600$1');
    await syncImageToKV(env.PRODUCTS_KV, thumbnailUrl, product.slug);
  }

  // Update index
  const indexStr = await env.PRODUCTS_KV.get('product:index');
  if (indexStr) {
    const index = JSON.parse(indexStr);
    const existingIndex = index.findIndex((p: any) => p.id === productId);
    const newEntry = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      featured: product.featured,
      categories: product.categories.map(c => c.slug),
      menu_order: product.menu_order || 0,
    };

    if (existingIndex >= 0) {
      index[existingIndex] = newEntry;
    } else {
      index.push(newEntry);
    }

    await env.PRODUCTS_KV.put('product:index', JSON.stringify(index));
  }

  return syncedProduct;
}

// Transform WC category to synced format
function transformCategory(category: WCCategory): SyncedCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    parent: category.parent,
    description: category.description,
    second_description: category.second_description || null,
    image: category.image?.src || null,
    localImage: category.slug ? `${WORKER_URL}/category-image/${category.slug}` : null,
    productCount: category.count,
    menuOrder: category.menu_order,
    synced_at: new Date().toISOString(),
  };
}

// Sync all categories
async function syncAllCategories(env: Env): Promise<{ synced: number; errors: string[] }> {
  const client = new WooCommerceClient(
    env.WC_STORE_URL,
    env.WC_CONSUMER_KEY,
    env.WC_CONSUMER_SECRET
  );

  const errors: string[] = [];
  let synced = 0;

  try {
    console.log('Fetching all categories...');
    const categories = await client.fetchCategories();
    console.log(`Found ${categories.length} categories`);

    // Build category index
    const categoryIndex: Array<{ id: number; name: string; slug: string; parent: number; productCount: number }> = [];

    for (const category of categories) {
      try {
        console.log(`Syncing category ${category.id}: ${category.name}`);

        const syncedCategory = transformCategory(category);

        // Store in KV by ID
        await env.PRODUCTS_KV.put(
          `category:${category.id}`,
          JSON.stringify(syncedCategory)
        );

        // Store by slug for easy lookup
        await env.PRODUCTS_KV.put(
          `category:slug:${category.slug}`,
          JSON.stringify(syncedCategory)
        );

        // Cache category image if it exists
        if (category.image?.src && category.slug) {
          await syncImageToKV(env.PRODUCTS_KV, category.image.src, `category:${category.slug}`);
        }

        // Add to index
        categoryIndex.push({
          id: category.id,
          name: category.name,
          slug: category.slug,
          parent: category.parent,
          productCount: category.count,
        });

        synced++;
      } catch (error) {
        const errorMsg = `Error syncing category ${category.id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Store category index
    await env.PRODUCTS_KV.put('category:index', JSON.stringify(categoryIndex));

    // Also store the old format for backward compatibility
    await env.PRODUCTS_KV.put('categories', JSON.stringify(categories));

    console.log(`Category sync complete. Synced ${synced} categories, ${errors.length} errors`);
    return { synced, errors };
  } catch (error) {
    const errorMsg = `Fatal category sync error: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { synced, errors };
  }
}

// Sync a single category (for webhook updates)
async function syncSingleCategory(env: Env, categoryId: number): Promise<SyncedCategory> {
  const client = new WooCommerceClient(
    env.WC_STORE_URL,
    env.WC_CONSUMER_KEY,
    env.WC_CONSUMER_SECRET
  );

  const category = await client.fetchCategory(categoryId);
  const syncedCategory = transformCategory(category);

  // Store in KV
  await env.PRODUCTS_KV.put(
    `category:${category.id}`,
    JSON.stringify(syncedCategory)
  );
  await env.PRODUCTS_KV.put(
    `category:slug:${category.slug}`,
    JSON.stringify(syncedCategory)
  );

  // Cache category image if it exists
  if (category.image?.src && category.slug) {
    await syncImageToKV(env.PRODUCTS_KV, category.image.src, `category:${category.slug}`);
  }

  // Update index
  const indexStr = await env.PRODUCTS_KV.get('category:index');
  if (indexStr) {
    const index = JSON.parse(indexStr);
    const existingIndex = index.findIndex((c: any) => c.id === categoryId);
    const newEntry = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parent: category.parent,
      productCount: category.count,
    };

    if (existingIndex >= 0) {
      index[existingIndex] = newEntry;
    } else {
      index.push(newEntry);
    }

    await env.PRODUCTS_KV.put('category:index', JSON.stringify(index));
  }

  return syncedCategory;
}

// Delete a category from KV
async function deleteCategory(env: Env, categoryId: number): Promise<void> {
  // Get category to find slug
  const categoryStr = await env.PRODUCTS_KV.get(`category:${categoryId}`);
  if (categoryStr) {
    const category = JSON.parse(categoryStr);
    // Delete by slug
    await env.PRODUCTS_KV.delete(`category:slug:${category.slug}`);
    // Delete image
    await env.PRODUCTS_KV.delete(`image:category:${category.slug}`);
  }

  // Delete by ID
  await env.PRODUCTS_KV.delete(`category:${categoryId}`);

  // Update index
  const indexStr = await env.PRODUCTS_KV.get('category:index');
  if (indexStr) {
    const index = JSON.parse(indexStr);
    const filtered = index.filter((c: any) => c.id !== categoryId);
    await env.PRODUCTS_KV.put('category:index', JSON.stringify(filtered));
  }
}

// ============================================
// BLOG POST SYNC FUNCTIONS
// ============================================

// Transform WordPress post to synced format
function transformPost(post: WPPost): SyncedPost {
  // Extract author from embedded data
  const authorData = post._embedded?.author?.[0];
  const author = {
    id: authorData?.id || post.author,
    name: authorData?.name || 'Unknown',
    avatar: authorData?.avatar_urls?.['96'] || authorData?.avatar_urls?.['48'] || null,
  };

  // Extract featured image from embedded data
  const mediaData = post._embedded?.['wp:featuredmedia']?.[0];
  const featuredImage = mediaData?.source_url || null;
  // Get medium or large size if available for better performance
  const featuredImageMedium = mediaData?.media_details?.sizes?.['medium_large']?.source_url
    || mediaData?.media_details?.sizes?.['large']?.source_url
    || featuredImage;

  // Extract categories and tags from embedded terms
  const terms = post._embedded?.['wp:term'] || [];
  const categories = terms[0]?.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })) || [];
  const tags = terms[1]?.map((t: any) => ({ id: t.id, name: t.name, slug: t.slug })) || [];

  // Clean excerpt (remove HTML tags and extra whitespace)
  const cleanExcerpt = post.excerpt.rendered
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    id: post.id,
    title: post.title.rendered,
    slug: post.slug,
    date: post.date,
    modified: post.modified,
    excerpt: cleanExcerpt,
    content: post.content.rendered,
    author,
    featuredImage: featuredImageMedium,
    localFeaturedImage: post.slug ? `${WORKER_URL}/post-image/${post.slug}` : null,
    categories,
    tags,
    synced_at: new Date().toISOString(),
  };
}

// Sync all blog posts
async function syncAllPosts(env: Env): Promise<{ synced: number; errors: string[] }> {
  const client = new WooCommerceClient(
    env.WC_STORE_URL,
    env.WC_CONSUMER_KEY,
    env.WC_CONSUMER_SECRET
  );

  const errors: string[] = [];
  let synced = 0;

  try {
    console.log('Fetching all blog posts...');
    const posts = await client.fetchAllPosts();
    console.log(`Found ${posts.length} posts`);

    // Build post index
    const postIndex: Array<{ id: number; title: string; slug: string; date: string; excerpt: string; featuredImage: string | null }> = [];

    for (const post of posts) {
      try {
        console.log(`Syncing post ${post.id}: ${post.title.rendered}`);

        const syncedPost = transformPost(post);

        // Store in KV by ID
        await env.PRODUCTS_KV.put(
          `post:${post.id}`,
          JSON.stringify(syncedPost)
        );

        // Store by slug for easy lookup
        await env.PRODUCTS_KV.put(
          `post:slug:${post.slug}`,
          JSON.stringify(syncedPost)
        );

        // Cache featured image if it exists
        if (syncedPost.featuredImage && post.slug) {
          await syncImageToKV(env.PRODUCTS_KV, syncedPost.featuredImage, `post:${post.slug}`);
        }

        // Add to index
        postIndex.push({
          id: post.id,
          title: syncedPost.title,
          slug: post.slug,
          date: syncedPost.date,
          excerpt: syncedPost.excerpt.substring(0, 200) + (syncedPost.excerpt.length > 200 ? '...' : ''),
          featuredImage: syncedPost.localFeaturedImage,
        });

        synced++;
      } catch (error) {
        const errorMsg = `Error syncing post ${post.id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Store post index (sorted by date, newest first)
    postIndex.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    await env.PRODUCTS_KV.put('post:index', JSON.stringify(postIndex));

    // Store last sync timestamp for posts
    await env.PRODUCTS_KV.put('last_post_sync', new Date().toISOString());

    console.log(`Post sync complete. Synced ${synced} posts, ${errors.length} errors`);
    return { synced, errors };
  } catch (error) {
    const errorMsg = `Fatal post sync error: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { synced, errors };
  }
}

// Sync a single blog post (for webhook updates)
async function syncSinglePost(env: Env, postId: number): Promise<SyncedPost | null> {
  const client = new WooCommerceClient(
    env.WC_STORE_URL,
    env.WC_CONSUMER_KEY,
    env.WC_CONSUMER_SECRET
  );

  try {
    const post = await client.fetchPost(postId);

    // If post is not published, remove from KV
    if (post.status !== 'publish') {
      console.log(`Post ${postId} is not published (status: ${post.status}), removing from KV`);
      await deletePost(env, postId);
      return null;
    }

    const syncedPost = transformPost(post);

    // Store in KV
    await env.PRODUCTS_KV.put(
      `post:${post.id}`,
      JSON.stringify(syncedPost)
    );
    await env.PRODUCTS_KV.put(
      `post:slug:${post.slug}`,
      JSON.stringify(syncedPost)
    );

    // Cache featured image
    if (syncedPost.featuredImage && post.slug) {
      await syncImageToKV(env.PRODUCTS_KV, syncedPost.featuredImage, `post:${post.slug}`);
    }

    // Update index
    const indexStr = await env.PRODUCTS_KV.get('post:index');
    if (indexStr) {
      const index = JSON.parse(indexStr);
      const existingIndex = index.findIndex((p: any) => p.id === postId);
      const newEntry = {
        id: post.id,
        title: syncedPost.title,
        slug: post.slug,
        date: syncedPost.date,
        excerpt: syncedPost.excerpt.substring(0, 200) + (syncedPost.excerpt.length > 200 ? '...' : ''),
        featuredImage: syncedPost.localFeaturedImage,
      };

      if (existingIndex >= 0) {
        index[existingIndex] = newEntry;
      } else {
        index.push(newEntry);
      }

      // Re-sort by date
      index.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      await env.PRODUCTS_KV.put('post:index', JSON.stringify(index));
    }

    return syncedPost;
  } catch (error) {
    console.error(`Error syncing single post ${postId}:`, error);
    return null;
  }
}

// Delete a blog post from KV
async function deletePost(env: Env, postId: number): Promise<void> {
  // Get post to find slug for image deletion
  const postStr = await env.PRODUCTS_KV.get(`post:${postId}`);
  if (postStr) {
    const post = JSON.parse(postStr);
    // Delete by slug
    await env.PRODUCTS_KV.delete(`post:slug:${post.slug}`);
    // Delete cached image
    await env.PRODUCTS_KV.delete(`image:post:${post.slug}`);
  }

  // Delete by ID
  await env.PRODUCTS_KV.delete(`post:${postId}`);

  // Update index
  const indexStr = await env.PRODUCTS_KV.get('post:index');
  if (indexStr) {
    const index = JSON.parse(indexStr);
    const filtered = index.filter((p: any) => p.id !== postId);
    await env.PRODUCTS_KV.put('post:index', JSON.stringify(filtered));
  }

  console.log(`Deleted post ${postId} from KV`);
}

// Debounce interval for site rebuilds (5 minutes)
const REBUILD_DEBOUNCE_MS = 5 * 60 * 1000;

// Trigger GitHub Actions workflow to rebuild and deploy the site
// Uses workflow_dispatch API to trigger the deploy.yml workflow
// Prevents excessive rebuilds when multiple products are updated in quick succession
async function triggerSiteRebuild(env: Env): Promise<{ triggered: boolean; reason: string }> {
  // Skip if no GitHub token configured
  if (!env.GITHUB_TOKEN) {
    return { triggered: false, reason: 'No GITHUB_TOKEN configured' };
  }

  try {
    // Check last rebuild timestamp for debouncing
    const lastRebuildStr = await env.PRODUCTS_KV.get('last_rebuild');
    const now = Date.now();

    if (lastRebuildStr) {
      const lastRebuild = parseInt(lastRebuildStr, 10);
      const elapsed = now - lastRebuild;

      if (elapsed < REBUILD_DEBOUNCE_MS) {
        const remainingSeconds = Math.ceil((REBUILD_DEBOUNCE_MS - elapsed) / 1000);
        console.log(`Skipping rebuild - ${remainingSeconds}s remaining in debounce window`);
        return { triggered: false, reason: `Debounced (${remainingSeconds}s remaining)` };
      }
    }

    // Update last rebuild timestamp BEFORE triggering to prevent race conditions
    await env.PRODUCTS_KV.put('last_rebuild', now.toString());

    // Trigger GitHub Actions workflow via workflow_dispatch
    const workflowUrl = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW}/dispatches`;

    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Hercules-Product-Sync-Worker',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          reason: 'WooCommerce product sync webhook',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub workflow trigger failed: ${response.status} ${errorText}`);
      return { triggered: false, reason: `GitHub API failed: ${response.status}` };
    }

    console.log('GitHub Actions workflow triggered successfully');
    return { triggered: true, reason: 'GitHub workflow triggered' };
  } catch (error) {
    console.error('Error triggering site rebuild:', error);
    return { triggered: false, reason: `Error: ${error}` };
  }
}

// Verify webhook signature using HMAC-SHA256
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  try {
    // WooCommerce sends base64-encoded HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    // Convert to base64
    const expectedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signatureBuffer))
    );

    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Request handler
export default {
  // HTTP request handler
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-WC-Webhook-Signature',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Webhook endpoint for product updates (create/update)
    if ((url.pathname === '/webhook/product-update' || url.pathname === '/webhook/product-create') && request.method === 'POST') {
      try {
        const signature = request.headers.get('X-WC-Webhook-Signature') || '';
        const payload = await request.text();

        // Verify HMAC-SHA256 signature
        const isValid = await verifyWebhookSignature(payload, signature, env.WEBHOOK_SECRET);
        if (!isValid) {
          console.log('Invalid webhook signature received');
          return new Response('Invalid signature', { status: 401 });
        }

        const data = JSON.parse(payload);
        const productId = data.id;

        if (!productId) {
          return new Response('Missing product ID', { status: 400 });
        }

        console.log(`Webhook received: syncing product ${productId}`);

        // Sync the product in background
        ctx.waitUntil(syncSingleProduct(env, productId));

        // Trigger site rebuild (debounced)
        ctx.waitUntil(triggerSiteRebuild(env));

        return new Response(JSON.stringify({ success: true, productId, action: 'sync' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Webhook error:', error);
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Webhook endpoint for product deletion
    if (url.pathname === '/webhook/product-delete' && request.method === 'POST') {
      try {
        const signature = request.headers.get('X-WC-Webhook-Signature') || '';
        const payload = await request.text();

        // Verify HMAC-SHA256 signature
        const isValid = await verifyWebhookSignature(payload, signature, env.WEBHOOK_SECRET);
        if (!isValid) {
          console.log('Invalid webhook signature received');
          return new Response('Invalid signature', { status: 401 });
        }

        const data = JSON.parse(payload);
        const productId = data.id;

        if (!productId) {
          return new Response('Missing product ID', { status: 400 });
        }

        console.log(`Webhook received: deleting product ${productId}`);

        // Delete product from KV (including slug and cached image)
        await deleteProduct(env, productId);

        // Trigger site rebuild (debounced)
        ctx.waitUntil(triggerSiteRebuild(env));

        return new Response(JSON.stringify({ success: true, productId, action: 'delete' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Webhook delete error:', error);
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Webhook endpoint for category updates (create/update)
    if ((url.pathname === '/webhook/category-update' || url.pathname === '/webhook/category-create') && request.method === 'POST') {
      try {
        const signature = request.headers.get('X-WC-Webhook-Signature') || '';
        const payload = await request.text();

        // Verify HMAC-SHA256 signature
        const isValid = await verifyWebhookSignature(payload, signature, env.WEBHOOK_SECRET);
        if (!isValid) {
          console.log('Invalid webhook signature received');
          return new Response('Invalid signature', { status: 401 });
        }

        const data = JSON.parse(payload);
        const categoryId = data.id;

        if (!categoryId) {
          return new Response('Missing category ID', { status: 400 });
        }

        console.log(`Webhook received: syncing category ${categoryId}`);

        // Sync the category in background
        ctx.waitUntil(syncSingleCategory(env, categoryId));

        // Trigger site rebuild (debounced)
        ctx.waitUntil(triggerSiteRebuild(env));

        return new Response(JSON.stringify({ success: true, categoryId, action: 'sync' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Category webhook error:', error);
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Webhook endpoint for category deletion
    if (url.pathname === '/webhook/category-delete' && request.method === 'POST') {
      try {
        const signature = request.headers.get('X-WC-Webhook-Signature') || '';
        const payload = await request.text();

        // Verify HMAC-SHA256 signature
        const isValid = await verifyWebhookSignature(payload, signature, env.WEBHOOK_SECRET);
        if (!isValid) {
          console.log('Invalid webhook signature received');
          return new Response('Invalid signature', { status: 401 });
        }

        const data = JSON.parse(payload);
        const categoryId = data.id;

        if (!categoryId) {
          return new Response('Missing category ID', { status: 400 });
        }

        console.log(`Webhook received: deleting category ${categoryId}`);

        // Delete category from KV
        await deleteCategory(env, categoryId);

        // Trigger site rebuild (debounced)
        ctx.waitUntil(triggerSiteRebuild(env));

        return new Response(JSON.stringify({ success: true, categoryId, action: 'delete' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Category webhook delete error:', error);
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // ============================================
    // BLOG POST WEBHOOK ENDPOINTS
    // ============================================

    // Webhook endpoint for blog post updates (create/update)
    if ((url.pathname === '/webhook/post-update' || url.pathname === '/webhook/post-create') && request.method === 'POST') {
      try {
        const signature = request.headers.get('X-WC-Webhook-Signature') || '';
        const payload = await request.text();

        // Verify HMAC-SHA256 signature
        const isValid = await verifyWebhookSignature(payload, signature, env.WEBHOOK_SECRET);
        if (!isValid) {
          console.log('Invalid webhook signature received');
          return new Response('Invalid signature', { status: 401 });
        }

        const data = JSON.parse(payload);
        const postId = data.id || data.post_id;

        if (!postId) {
          return new Response('Missing post ID', { status: 400 });
        }

        console.log(`Webhook received: syncing post ${postId}`);

        // Sync the post in background
        ctx.waitUntil(syncSinglePost(env, postId));

        // Trigger site rebuild (debounced)
        ctx.waitUntil(triggerSiteRebuild(env));

        return new Response(JSON.stringify({ success: true, postId, action: 'sync' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Post webhook error:', error);
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Webhook endpoint for blog post deletion
    if (url.pathname === '/webhook/post-delete' && request.method === 'POST') {
      try {
        const signature = request.headers.get('X-WC-Webhook-Signature') || '';
        const payload = await request.text();

        // Verify HMAC-SHA256 signature
        const isValid = await verifyWebhookSignature(payload, signature, env.WEBHOOK_SECRET);
        if (!isValid) {
          console.log('Invalid webhook signature received');
          return new Response('Invalid signature', { status: 401 });
        }

        const data = JSON.parse(payload);
        const postId = data.id || data.post_id;

        if (!postId) {
          return new Response('Missing post ID', { status: 400 });
        }

        console.log(`Webhook received: deleting post ${postId}`);

        // Delete post from KV
        await deletePost(env, postId);

        // Trigger site rebuild (debounced)
        ctx.waitUntil(triggerSiteRebuild(env));

        return new Response(JSON.stringify({ success: true, postId, action: 'delete' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Post webhook delete error:', error);
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Manual sync trigger (protected) - supports batching with offset
    // Use ?force_images=true to re-download all images (for upgrading image sizes)
    if (url.pathname === '/sync' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.WEBHOOK_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Get offset from query string for batch syncing
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const forceImages = url.searchParams.get('force_images') === 'true';
      const result = await syncAllProducts(env, offset, forceImages);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Manual category sync trigger (protected)
    if (url.pathname === '/sync-categories' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.WEBHOOK_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      const result = await syncAllCategories(env);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Manual blog posts sync trigger (protected)
    if (url.pathname === '/sync-posts' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.WEBHOOK_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      const result = await syncAllPosts(env);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get product by ID or slug
    if (url.pathname.startsWith('/product/')) {
      const identifier = url.pathname.replace('/product/', '');

      let productStr: string | null = null;
      if (/^\d+$/.test(identifier)) {
        productStr = await env.PRODUCTS_KV.get(`product:${identifier}`);
      } else {
        productStr = await env.PRODUCTS_KV.get(`product:slug:${identifier}`);
      }

      if (!productStr) {
        return new Response('Product not found', { status: 404 });
      }

      // Parse and add local image URLs
      const product = JSON.parse(productStr);
      if (product.slug) {
        product.localThumbnail = `${WORKER_URL}/image/${product.slug}`;
      }

      return new Response(JSON.stringify(product), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all products (index)
    if (url.pathname === '/products') {
      const index = await env.PRODUCTS_KV.get('product:index');
      return new Response(index || '[]', {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get product configuration for steps form (Pearl WC Steps data)
    // This endpoint fetches from WordPress and caches in KV
    if (url.pathname.startsWith('/product-config/')) {
      const identifier = url.pathname.replace('/product-config/', '');

      // Try to get from cache first
      let configStr = await env.PRODUCTS_KV.get(`product-config:${identifier}`);

      if (!configStr) {
        // Fetch from WordPress API
        const wpUrl = identifier.match(/^\d+$/)
          ? `${env.WC_STORE_URL}/wp-json/hercules/v1/product-config/${identifier}`
          : `${env.WC_STORE_URL}/wp-json/hercules/v1/product-config-by-slug/${identifier}`;

        try {
          const response = await fetch(wpUrl, {
            headers: { 'Content-Type': 'application/json' },
          });

          if (!response.ok) {
            return new Response('Product config not found', { status: 404 });
          }

          const config = await response.json();

          // Cache in KV for 1 hour (will be refreshed on product sync)
          configStr = JSON.stringify(config);
          await env.PRODUCTS_KV.put(`product-config:${identifier}`, configStr, {
            expirationTtl: 3600, // 1 hour
          });

          // Also cache by ID and slug for easy lookup
          if (config.product_id) {
            await env.PRODUCTS_KV.put(`product-config:${config.product_id}`, configStr, {
              expirationTtl: 3600,
            });
          }
          if (config.product_slug) {
            await env.PRODUCTS_KV.put(`product-config:${config.product_slug}`, configStr, {
              expirationTtl: 3600,
            });
          }
        } catch (error) {
          console.error('Error fetching product config:', error);
          return new Response('Error fetching product config', { status: 500 });
        }
      }

      return new Response(configStr, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get categories (new format with index)
    if (url.pathname === '/categories') {
      const index = await env.PRODUCTS_KV.get('category:index');
      return new Response(index || '[]', {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get category by ID or slug
    if (url.pathname.startsWith('/category/')) {
      const identifier = url.pathname.replace('/category/', '');

      let categoryStr: string | null = null;
      if (/^\d+$/.test(identifier)) {
        categoryStr = await env.PRODUCTS_KV.get(`category:${identifier}`);
      } else {
        categoryStr = await env.PRODUCTS_KV.get(`category:slug:${identifier}`);
      }

      if (!categoryStr) {
        return new Response('Category not found', { status: 404 });
      }

      return new Response(categoryStr, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // BLOG POST API ENDPOINTS
    // ============================================

    // Get all blog posts (index)
    if (url.pathname === '/posts') {
      const index = await env.PRODUCTS_KV.get('post:index');
      return new Response(index || '[]', {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get blog post by ID or slug
    if (url.pathname.startsWith('/post/')) {
      const identifier = url.pathname.replace('/post/', '');

      let postStr: string | null = null;
      if (/^\d+$/.test(identifier)) {
        postStr = await env.PRODUCTS_KV.get(`post:${identifier}`);
      } else {
        postStr = await env.PRODUCTS_KV.get(`post:slug:${identifier}`);
      }

      if (!postStr) {
        return new Response('Post not found', { status: 404 });
      }

      return new Response(postStr, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Serve cached blog post featured images
    if (url.pathname.startsWith('/post-image/')) {
      const slug = url.pathname.replace('/post-image/', '');

      if (!slug) {
        return new Response('Missing post slug', { status: 400 });
      }

      // Get image from KV with metadata (post images are stored with 'post:' prefix)
      const { value: base64Image, metadata } = await env.PRODUCTS_KV.getWithMetadata<{
        contentType: string;
        originalUrl: string;
        syncedAt: string;
      }>(`image:post:${slug}`);

      if (!base64Image) {
        // Image not cached - try to get original URL from post data and redirect
        const post = await env.PRODUCTS_KV.get<SyncedPost>(`post:slug:${slug}`, 'json');
        if (post && post.featuredImage) {
          // Redirect to original WordPress image
          return Response.redirect(post.featuredImage, 302);
        }
        return new Response('Post image not found', { status: 404 });
      }

      // Decode base64 to binary
      const binaryString = atob(base64Image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Return image with caching headers
      return new Response(bytes, {
        headers: {
          'Content-Type': metadata?.contentType || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get sync status
    if (url.pathname === '/status') {
      const lastSync = await env.PRODUCTS_KV.get('last_sync');
      const lastPostSync = await env.PRODUCTS_KV.get('last_post_sync');
      const lastRebuild = await env.PRODUCTS_KV.get('last_rebuild');
      const hasGithubToken = !!env.GITHUB_TOKEN;
      return new Response(JSON.stringify({
        last_sync: lastSync,
        last_post_sync: lastPostSync,
        last_rebuild: lastRebuild,
        last_rebuild_date: lastRebuild ? new Date(parseInt(lastRebuild)).toISOString() : null,
        github_token_configured: hasGithubToken,
        current_time: Date.now(),
        current_time_iso: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Manual rebuild trigger (for testing)
    if (url.pathname === '/trigger-rebuild' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.WEBHOOK_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Clear debounce first
      await env.PRODUCTS_KV.delete('last_rebuild');

      const result = await triggerSiteRebuild(env);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Serve cached product images
    // Supports: /image/{slug} (main image) or /image/{slug}/{index} (gallery image)
    if (url.pathname.startsWith('/image/')) {
      const pathParts = url.pathname.replace('/image/', '').split('/');
      const slug = pathParts[0];
      const imageIndex = pathParts[1] ? parseInt(pathParts[1], 10) : 0;

      if (!slug) {
        return new Response('Missing product slug', { status: 400 });
      }

      // Key format: image:{slug} for main (index 0), image:{slug}:{index} for gallery
      const kvKey = imageIndex === 0 ? `image:${slug}` : `image:${slug}:${imageIndex}`;

      // Get image from KV with metadata
      const { value: base64Image, metadata } = await env.PRODUCTS_KV.getWithMetadata<{
        contentType: string;
        originalUrl: string;
        syncedAt: string;
        imageIndex?: number;
      }>(kvKey);

      if (!base64Image) {
        // Image not cached - return 404 or redirect to original
        return new Response('Image not found', { status: 404 });
      }

      // Decode base64 to binary
      const binaryString = atob(base64Image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Return image with caching headers
      return new Response(bytes, {
        headers: {
          'Content-Type': metadata?.contentType || 'image/png',
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Serve cached category images
    if (url.pathname.startsWith('/category-image/')) {
      const slug = url.pathname.replace('/category-image/', '');

      if (!slug) {
        return new Response('Missing category slug', { status: 400 });
      }

      // Get image from KV with metadata (category images are stored with 'category:' prefix)
      const { value: base64Image, metadata } = await env.PRODUCTS_KV.getWithMetadata<{
        contentType: string;
        originalUrl: string;
        syncedAt: string;
      }>(`image:category:${slug}`);

      if (!base64Image) {
        // Image not cached - return 404
        return new Response('Category image not found', { status: 404 });
      }

      // Decode base64 to binary
      const binaryString = atob(base64Image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Return image with caching headers
      return new Response(bytes, {
        headers: {
          'Content-Type': metadata?.contentType || 'image/png',
          'Cache-Control': 'public, max-age=86400', // Cache for 1 day
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Search products - enhanced with full product data
    if (url.pathname === '/search') {
      const query = url.searchParams.get('q')?.toLowerCase();
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);

      if (!query || query.length < 2) {
        return new Response(JSON.stringify({ success: true, data: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const indexStr = await env.PRODUCTS_KV.get('product:index');
      if (!indexStr) {
        return new Response(JSON.stringify({ success: true, data: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const index = JSON.parse(indexStr);

      // Score-based search: prioritize name matches over category matches
      // Also filter out test products and products without slugs
      const scoredProducts = index
        .filter((p: any) => {
          // Filter out test products and products without slugs
          if (!p.slug || p.slug === '') return false;
          if (p.name.toLowerCase().includes('(copy)') || p.name.toLowerCase() === 'test') return false;
          return true;
        })
        .map((p: any) => {
          let score = 0;
          const nameLower = p.name.toLowerCase();
          const slugLower = p.slug.toLowerCase();

          // Exact name match (highest priority)
          if (nameLower === query) score += 100;
          // Name starts with query
          else if (nameLower.startsWith(query)) score += 50;
          // Name contains query word (not just substring)
          else if (nameLower.includes(query)) score += 30;

          // Slug match (secondary)
          if (slugLower.includes(query)) score += 20;

          // Category match (lowest priority - only if query is the main category name)
          // Only count as category match if query is at least 4 chars (avoid partial matches)
          if (query.length >= 4 && p.categories?.some((cat: string) => cat.toLowerCase().includes(query))) {
            score += 5;
          }

          return { ...p, score };
        })
        .filter((p: any) => p.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, limit);

      const matchingProducts = scoredProducts;

      // Fetch full product data for each match
      const results = await Promise.all(
        matchingProducts.map(async (p: any) => {
          const productStr = await env.PRODUCTS_KV.get(`product:${p.id}`);
          if (!productStr) return null;

          const product = JSON.parse(productStr);

          // Calculate min/max price from conditional_prices
          let minPrice: number | null = null;
          let maxPrice: number | null = null;

          if (product.variations?.length > 0) {
            for (const variation of product.variations) {
              if (variation.conditional_prices?.length > 0) {
                for (const cp of variation.conditional_prices) {
                  const price = typeof cp.price === 'string' ? parseFloat(cp.price) : cp.price;
                  if (minPrice === null || price < minPrice) minPrice = price;
                  if (maxPrice === null || price > maxPrice) maxPrice = price;
                }
              }
            }
          }

          // Format price display
          let priceDisplay = '';
          if (minPrice !== null && maxPrice !== null) {
            if (minPrice === maxPrice) {
              priceDisplay = `€${minPrice.toFixed(2)}`;
            } else {
              priceDisplay = `€${minPrice.toFixed(2)} – €${maxPrice.toFixed(2)}`;
            }
          } else if (product.price) {
            priceDisplay = `€${parseFloat(product.price).toFixed(2)}`;
          }

          // Get thumbnail - use local cached image URL
          const thumbnail = product.slug ? `${WORKER_URL}/image/${product.slug}` : '';

          return {
            id: product.id,
            title: product.name,
            slug: product.slug,
            url: `/produkte/${product.slug}`,
            price: priceDisplay,
            minPrice,
            maxPrice,
            thumbnail,
            categories: product.categories?.map((c: any) => c.name) || [],
          };
        })
      );

      // Filter out nulls
      const validResults = results.filter(Boolean);

      return new Response(JSON.stringify({ success: true, data: validResults }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },

  // Scheduled (cron) handler - runs multiple batches
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Starting scheduled sync...');

    // Sync categories first (smaller, no batching needed)
    console.log('Syncing categories...');
    const categoryResult = await syncAllCategories(env);
    console.log(`Categories synced: ${categoryResult.synced}, errors: ${categoryResult.errors.length}`);

    // Sync blog posts (smaller, no batching needed)
    console.log('Syncing blog posts...');
    const postResult = await syncAllPosts(env);
    console.log(`Posts synced: ${postResult.synced}, errors: ${postResult.errors.length}`);

    // Sync products in batches
    console.log('Syncing products...');
    let offset = 0;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      const result = await syncAllProducts(env, offset);
      totalSynced += result.synced;
      hasMore = result.hasMore;
      offset = result.nextOffset;

      if (result.errors.length > 0) {
        console.log(`Batch had ${result.errors.length} errors`);
      }
    }

    console.log(`Scheduled sync complete. Products: ${totalSynced}, Categories: ${categoryResult.synced}, Posts: ${postResult.synced}`);

    // Trigger site rebuild after full sync (force rebuild, ignore debounce for scheduled sync)
    if (totalSynced > 0 || categoryResult.synced > 0 || postResult.synced > 0) {
      // Clear the debounce timestamp to force a rebuild after scheduled sync
      await env.PRODUCTS_KV.delete('last_rebuild');
      const rebuildResult = await triggerSiteRebuild(env);
      console.log(`Site rebuild: ${rebuildResult.reason}`);
    }
  },
};
