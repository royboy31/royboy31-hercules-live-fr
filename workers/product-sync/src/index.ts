/**
 * Hercules Product Sync Worker
 *
 * This Cloudflare Worker handles:
 * 1. Daily cron job to sync all products from WooCommerce
 * 2. Webhook endpoint to receive real-time product updates
 * 3. Image caching in KV storage (thumbnails)
 * 4. Product data storage in KV
 */

/**
 * Decode common HTML entities returned by WordPress rendered fields.
 * Used for title and excerpt (plain text fields) to avoid showing raw entities.
 */
function decodeHtmlEntities(str: string): string {
  if (!str || !str.includes('&')) return str;
  return str
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '\u00A0')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export interface Env {
  PRODUCTS_KV: KVNamespace;
  PRODUCTS_BUCKET?: R2Bucket;  // Optional - enable R2 in Cloudflare dashboard
  CLIENT_LOGOS_BUCKET?: R2Bucket;  // R2 bucket for client trust logos
  WC_STORE_URL: string;
  ASTRO_SITE_URL: string;
  WC_CONSUMER_KEY: string;
  WC_CONSUMER_SECRET: string;
  WEBHOOK_SECRET: string;
  GITHUB_TOKEN?: string;  // GitHub Personal Access Token for triggering workflow_dispatch
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_WORKFLOW?: string;
  GITHUB_REF?: string;
  WORKER_BASE_URL: string; // This worker's public URL for image serving
  CLOUDFLARE_ZONE_ID?: string;  // For cache purging on product delete
  CLOUDFLARE_API_TOKEN?: string;  // For cache purging on product delete
}

// Worker base URL for image serving — set via WORKER_BASE_URL env var
// Falls back to staging URL if not set (backwards compat)
let WORKER_URL = 'https://hercules-product-sync-fr.gilles-86d.workers.dev';

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
  // Missive-only flag (exposed by hercules-missive-only plugin)
  missive_only?: boolean;
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
  primary_category: { id: number; name: string; slug: string } | null;
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
  made_in_uk: boolean;
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
  // Number of images successfully cached in KV (for frontend to know how many thumbnails to show)
  cached_image_count: number;
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
  // FAQ items from category custom fields
  faq?: Array<{ question: string; answer: string }>;
  // SEO override fields
  seo_h1?: string;
  seo_title?: string;
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
  // FAQ items from category custom fields
  faq: Array<{ question: string; answer: string }>;
  // SEO override fields
  seo_h1: string | null;
  seo_title: string | null;
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

  async fetchProducts(page: number = 1, perPage: number = 100, modifiedAfter?: string): Promise<WCProduct[]> {
    // Only fetch published products (exclude drafts, private, pending, trash)
    let url = `${this.baseUrl}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}&status=publish`;
    if (modifiedAfter) {
      url += `&modified_after=${encodeURIComponent(modifiedAfter)}`;
    }

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

  async fetchAllProducts(modifiedAfter?: string): Promise<WCProduct[]> {
    const allProducts: WCProduct[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const products = await this.fetchProducts(page, 100, modifiedAfter);
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
      // FAQ items from category custom fields
      faq: cat.faq || [],
      // SEO override fields
      seo_h1: cat.seo_h1,
      seo_title: cat.seo_title,
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

    const wcCategory: WCCategory = await response.json();

    // Enrich with custom fields from Hercules API (seo_h1, seo_title, second_description, faq)
    try {
      const herculesRes = await fetch(`${this.baseUrl}/wp-json/hercules/v1/category/${wcCategory.slug}`);
      if (herculesRes.ok) {
        const herculesData: any = await herculesRes.json();
        wcCategory.seo_h1 = herculesData.seo_h1 || undefined;
        wcCategory.seo_title = herculesData.seo_title || undefined;
        wcCategory.second_description = herculesData.second_description || undefined;
        wcCategory.faq = herculesData.faq || [];
      }
    } catch (e) {
      console.error(`Failed to enrich category ${categoryId} from Hercules API: ${e}`);
    }

    return wcCategory;
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

// Image sync helper - caches images in KV storage
// Supports both full size (600x600) and thumbnail (300x300) versions
// Optional imageIndex parameter for caching gallery images (0 = main, 1+ = gallery)
// Skips download if image already exists in KV (saves API calls when hitting daily limits)
async function syncImageToKV(
  kv: KVNamespace,
  imageUrl: string,
  productSlug: string,
  imageIndex: number = 0,
  forceRefresh: boolean = false,
  size: 'full' | 'thumb' = 'full'
): Promise<boolean> {
  if (!imageUrl || !productSlug) {
    return false;
  }

  // Key format: image:{slug} for main (index 0), image:{slug}:{index} for gallery
  // Add :thumb suffix for thumbnail versions
  let kvKey = imageIndex === 0 ? `image:${productSlug}` : `image:${productSlug}:${imageIndex}`;
  if (size === 'thumb') {
    kvKey += ':thumb';
  }

  try {
    // Check if image already exists in KV (skip download to save API calls)
    if (!forceRefresh) {
      const existing = await kv.get(kvKey);
      if (existing) {
        // Image already cached, skip
        return true;
      }
    }

    // Try to fetch WebP version first (pre-converted on WordPress server)
    // WordPress stores WebP alongside originals with .webp APPENDED (e.g., image.png.webp)
    const webpUrl = /\.(png|jpe?g)$/i.test(imageUrl) ? imageUrl + '.webp' : imageUrl;
    let response: Response;
    let contentType: string;

    // Try WebP first
    if (webpUrl !== imageUrl) {
      response = await fetch(webpUrl, {
        headers: {
          'User-Agent': 'Hercules-Product-Sync/1.0',
        },
      });

      if (response.ok) {
        contentType = 'image/webp';
        console.log(`Using WebP: ${webpUrl}`);
      } else {
        // Fall back to original format
        response = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Hercules-Product-Sync/1.0',
          },
        });
        contentType = response.headers.get('content-type') || 'image/png';
      }
    } else {
      // No WebP conversion possible (URL doesn't end in png/jpg)
      response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Hercules-Product-Sync/1.0',
        },
      });
      contentType = response.headers.get('content-type') || 'image/png';
    }

    if (!response.ok) {
      console.error(`Failed to fetch image: ${imageUrl} - ${response.status} (tried WebP: ${webpUrl})`);
      return false;
    }

    const imageBuffer = await response.arrayBuffer();
    console.log(`Successfully fetched: ${response.url} (${contentType}, ${imageBuffer.byteLength} bytes)`);

    // For thumbnails, reject if the image is too large (> 30KB)
    // This prevents caching full-size images as "thumbnails" when WordPress
    // didn't generate proper thumbnail sizes
    const MAX_THUMB_SIZE = 30 * 1024; // 30KB - proper 150x150 thumbs are typically 5-15KB
    if (size === 'thumb' && imageBuffer.byteLength > MAX_THUMB_SIZE) {
      console.warn(`Rejecting oversized thumbnail (${imageBuffer.byteLength} bytes > ${MAX_THUMB_SIZE}): ${imageUrl}`);
      return false;
    }

    // Store image as base64 in KV with metadata
    // Use chunked conversion to avoid call stack overflow for large images
    const bytes = new Uint8Array(imageBuffer);
    const chunkSize = 0x8000; // 32KB chunks
    let binaryString = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binaryString += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64Image = btoa(binaryString);

    await kv.put(
      kvKey,
      base64Image,
      {
        metadata: {
          contentType,
          originalUrl: imageUrl,
          syncedAt: new Date().toISOString(),
          imageIndex,
          size,
        },
      }
    );

    console.log(`Cached image ${imageIndex} (${size}) for ${productSlug}`);
    return true;
  } catch (error) {
    console.error(`Error syncing image ${imageIndex} (${size}) for ${productSlug}:`, error);
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
      let localThumbnail = img.src.replace(/(\.[^.]+)$/, '-361x361$1');

      if (syncImages) {
        localSrc = await syncImageToR2(bucket, img.src, product.slug, index, false);
        localThumbnail = await syncImageToR2(bucket, localThumbnail, product.slug, index, true);
      }

      return {
        id: img.id,
        src: img.src,
        local_src: localSrc,
        thumbnail: img.src.replace(/(\.[^.]+)$/, '-361x361$1'),
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
  const madeInUk = getMeta('made_in_uk');

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

  // Primary category from Rank Math (for breadcrumbs)
  const primaryCatId = getMeta('rank_math_primary_product_cat');
  let primaryCategory: { id: number; name: string; slug: string } | null = null;
  if (primaryCatId && primaryCatId !== '0') {
    const catId = parseInt(primaryCatId, 10);
    const matchedCat = product.categories.find((c: any) => c.id === catId);
    if (matchedCat) {
      primaryCategory = { id: matchedCat.id, name: matchedCat.name, slug: matchedCat.slug };
    }
  }

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
    primary_category: primaryCategory,
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
    made_in_uk: madeInUk === '1' || madeInUk === 1 || madeInUk === true,
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
    // Missive-only flag (hidden from website, visible in Missive CRM)
    missive_only: product.missive_only || getMeta('_missive_only') === 'yes',
    // Will be updated after image caching
    cached_image_count: 0,
    synced_at: new Date().toISOString(),
  };
}

// Batch size for product sync (to stay under subrequest limit)
// With 2 sizes per image (full + thumb) and fallback logic, subrequests add up fast
const BATCH_SIZE = 1;

// Max gallery images to cache per product (to stay within 50 subrequest limit)
// Now caching 2 sizes per image (full 600x600 + thumb 300x300)
// 1 product × 5 images × 2 sizes × 2 fetches (WebP + fallback) = 20 subrequests max
const MAX_GALLERY_IMAGES = 5;

// Main sync function with batching support
// forceImageRefresh: if true, re-download all images even if already cached (for upgrading image sizes)
// modifiedAfter: if set, only fetch products modified after this ISO timestamp (delta sync)
async function syncAllProducts(env: Env, offset: number = 0, forceImageRefresh: boolean = false, modifiedAfter?: string): Promise<{ synced: number; errors: string[]; hasMore: boolean; nextOffset: number }> {
  const client = new WooCommerceClient(
    env.WC_STORE_URL,
    env.WC_CONSUMER_KEY,
    env.WC_CONSUMER_SECRET
  );

  const errors: string[] = [];
  let synced = 0;

  try {
    // Fetch products (all, or only those modified since last sync)
    console.log(modifiedAfter ? `Fetching products modified after ${modifiedAfter}...` : 'Fetching all products...');
    const allProducts = await client.fetchAllProducts(modifiedAfter);
    console.log(`Found ${allProducts.length} products${modifiedAfter ? ' (modified)' : ''}, syncing from offset ${offset}`);

    // Fetch categories only on first batch
    if (offset === 0) {
      console.log('Fetching categories...');
      const categories = await client.fetchCategories();
      await env.PRODUCTS_KV.put('categories', JSON.stringify(categories));
    }

    // Get batch of products
    const products = allProducts.slice(offset, offset + BATCH_SIZE);
    // hasMore is false if the slice is empty (offset past end) or this is the last slice
    const hasMore = products.length > 0 && (offset + BATCH_SIZE < allProducts.length);
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

        // Cache gallery images in KV (limited to MAX_GALLERY_IMAGES to stay within subrequest limits)
        // forceRefresh parameter passed from sync endpoint to re-download all images
        // Cache both main and thumb versions using WordPress custom sizes:
        // - Main: 361x361 for exact 361px display on category cards (~10-15KB WebP)
        // - Thumb: 100x100 for 83px display in thumbnail carousels (~2-5KB WebP)
        let cachedImageCount = 0;
        if (product.slug && product.images?.length > 0) {
          const imagesToCache = Math.min(product.images.length, MAX_GALLERY_IMAGES);
          for (let i = 0; i < imagesToCache; i++) {
            const img = product.images[i];
            if (img?.src) {
              // Cache main size (361x361) for category cards - exact match for display size
              const mainUrl = img.src.replace(/(\.[^.]+)$/, '-361x361$1');
              let mainSuccess = await syncImageToKV(env.PRODUCTS_KV, mainUrl, product.slug, i, forceImageRefresh, 'full');
              if (!mainSuccess && img.src !== mainUrl) {
                // Fallback to 300x300, then 600x600, then original
                const fallback300 = img.src.replace(/(\.[^.]+)$/, '-300x300$1');
                mainSuccess = await syncImageToKV(env.PRODUCTS_KV, fallback300, product.slug, i, true, 'full');
                if (!mainSuccess) {
                  const fallback600 = img.src.replace(/(\.[^.]+)$/, '-600x600$1');
                  mainSuccess = await syncImageToKV(env.PRODUCTS_KV, fallback600, product.slug, i, true, 'full');
                }
              }

              // Cache thumbnail (100x100) for thumbnail carousels - ~2-5KB WebP
              const thumbUrl = img.src.replace(/(\.[^.]+)$/, '-100x100$1');
              let thumbSuccess = await syncImageToKV(env.PRODUCTS_KV, thumbUrl, product.slug, i, forceImageRefresh, 'thumb');
              if (!thumbSuccess && img.src !== thumbUrl) {
                // Fallback to 83x83 (exact display size) if 100x100 doesn't exist
                const fallback83 = img.src.replace(/(\.[^.]+)$/, '-83x83$1');
                thumbSuccess = await syncImageToKV(env.PRODUCTS_KV, fallback83, product.slug, i, true, 'thumb');
              }

              if (mainSuccess || thumbSuccess) {
                cachedImageCount++;
              }
            }
          }
        }

        // Update product with cached image count and re-save
        syncedProduct.cached_image_count = cachedImageCount;
        await env.PRODUCTS_KV.put(
          `product:${product.id}`,
          JSON.stringify(syncedProduct)
        );
        await env.PRODUCTS_KV.put(
          `product:slug:${product.slug}`,
          JSON.stringify(syncedProduct)
        );

        synced++;
      } catch (error) {
        const errorMsg = `Error syncing product ${product.id}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Update product index on first batch
    if (offset === 0) {
      const toIndexEntry = (p: WCProduct) => {
        const getMeta = (key: string) => p.meta_data?.find(m => m.key === key)?.value;
        const madeInEurope = getMeta('made_in_europe');
        const greenProduct = getMeta('green_product');
        const madeInUk = getMeta('made_in_uk');

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          featured: p.featured,
          categories: p.categories.map(c => c.slug),
          menu_order: p.menu_order || 0,
          made_in_europe: madeInEurope === '1' || madeInEurope === 1 || madeInEurope === true,
          green_product: greenProduct === '1' || greenProduct === 1 || greenProduct === true,
          made_in_uk: madeInUk === '1' || madeInUk === 1 || madeInUk === true,
          missive_only: p.missive_only || getMeta('_missive_only') === 'yes',
          date_modified: p.date_modified || new Date().toISOString(),
        };
      };

      if (modifiedAfter) {
        // Delta sync: merge modified products into existing index
        if (allProducts.length === 0) {
          console.log('Delta sync: 0 modified products — index unchanged');
        } else {
          const existingRaw = await env.PRODUCTS_KV.get('product:index');
          const existingIndex: any[] = existingRaw ? JSON.parse(existingRaw) : [];
          const modifiedIds = new Set(allProducts.map(p => p.id));
          // Remove old entries for modified products, then append updated entries
          const filtered = existingIndex.filter((e: any) => !modifiedIds.has(e.id));
          const updatedEntries = allProducts.map(toIndexEntry);
          await env.PRODUCTS_KV.put('product:index', JSON.stringify([...filtered, ...updatedEntries]));
          console.log(`Delta index merge: ${updatedEntries.length} updated/added, ${filtered.length + updatedEntries.length} total`);
        }
      } else {
        // Full sync: replace entire index
        if (allProducts.length === 0) {
          console.error('Full sync: WooCommerce returned 0 products — skipping index write');
        } else {
          const productIndex = allProducts.map(toIndexEntry);
          await env.PRODUCTS_KV.put('product:index', JSON.stringify(productIndex));
        }
      }
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

// Purge Cloudflare cache for specific URLs
async function purgeCloudflareCache(env: Env, urls: string[]): Promise<boolean> {
  if (!env.CLOUDFLARE_ZONE_ID || !env.CLOUDFLARE_API_TOKEN) {
    console.log('Cloudflare credentials not configured, skipping cache purge');
    return false;
  }

  if (urls.length === 0) {
    return true;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      }
    );

    const result = await response.json() as { success: boolean; errors?: any[] };
    if (result.success) {
      console.log(`Purged Cloudflare cache for ${urls.length} URLs:`, urls);
      return true;
    } else {
      console.error('Cloudflare cache purge failed:', result.errors);
      return false;
    }
  } catch (error) {
    console.error('Cloudflare cache purge error:', error);
    return false;
  }
}

// Delete a product from KV storage (returns slug for cache purging)
async function deleteProduct(env: Env, productId: number): Promise<string | null> {
  let slug: string | null = null;

  // Get product to find slug for image deletion
  const productStr = await env.PRODUCTS_KV.get(`product:${productId}`);
  if (productStr) {
    const product = JSON.parse(productStr);
    slug = product.slug;
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
  return slug;
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

  // Note: missive-only products are kept in KV (for Missive CRM access)
  // but filtered out from Astro-facing endpoints (/products, /products-by-category, etc.)

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

  // Read old product data BEFORE writing, to detect image changes
  const oldProductStr = await env.PRODUCTS_KV.get(`product:slug:${product.slug}`);
  const oldProduct = oldProductStr ? JSON.parse(oldProductStr) : null;

  // Store product data in KV FIRST (before image sync) so it's always saved
  // even if the image sync loop exhausts the Worker subrequest limit (50/invocation)
  await env.PRODUCTS_KV.put(
    `product:${product.id}`,
    JSON.stringify(syncedProduct)
  );
  await env.PRODUCTS_KV.put(
    `product:slug:${product.slug}`,
    JSON.stringify(syncedProduct)
  );

  // If images were reordered or replaced, delete ALL stale image KV entries first.
  // This prevents old cached images (from a previous order) lingering at the wrong index.
  // The nightly cron uses forceRefresh=false, so it would never overwrite a stale entry
  // that already exists in KV — making the stale image permanent until manual intervention.
  const oldImageIds: number[] = (oldProduct?.images || []).map((img: any) => img.id);
  const newImageIds: number[] = (product.images || []).map((img: any) => img.id);
  const imagesChanged =
    oldImageIds.length !== newImageIds.length ||
    newImageIds.some((id, i) => oldImageIds[i] !== id);

  if (imagesChanged && oldProduct) {
    const staleKeys: string[] = [
      `image:${product.slug}`,
      `image:${product.slug}:thumb`,
    ];
    const maxOld = Math.min(oldImageIds.length, MAX_GALLERY_IMAGES);
    for (let i = 1; i <= maxOld; i++) {
      staleKeys.push(`image:${product.slug}:${i}`);
      staleKeys.push(`image:${product.slug}:${i}:thumb`);
    }
    await Promise.all(staleKeys.map(key => env.PRODUCTS_KV.delete(key)));
    console.log(`Image list changed for ${product.slug}: cleared ${staleKeys.length} stale KV entries`);
  }

  // Cache ALL gallery images in KV (same logic as batch sync)
  // Force refresh on webhook updates to ensure image changes are captured
  // Cache both main (361x361) and thumb (100x100) versions
  let cachedImageCount = 0;
  if (product.slug && product.images?.length > 0) {
    const imagesToCache = Math.min(product.images.length, MAX_GALLERY_IMAGES);
    for (let i = 0; i < imagesToCache; i++) {
      const img = product.images[i];
      if (img?.src) {
        // Cache main size (361x361) for category cards
        const mainUrl = img.src.replace(/(\.[^.]+)$/, '-361x361$1');
        let mainSuccess = await syncImageToKV(env.PRODUCTS_KV, mainUrl, product.slug, i, true, 'full');
        if (!mainSuccess && img.src !== mainUrl) {
          // Fallback to 300x300, then 600x600, then original
          const fallback300 = img.src.replace(/(\.[^.]+)$/, '-300x300$1');
          mainSuccess = await syncImageToKV(env.PRODUCTS_KV, fallback300, product.slug, i, true, 'full');
          if (!mainSuccess) {
            const fallback600 = img.src.replace(/(\.[^.]+)$/, '-600x600$1');
            mainSuccess = await syncImageToKV(env.PRODUCTS_KV, fallback600, product.slug, i, true, 'full');
          }
        }

        // Cache thumbnail (100x100) for thumbnail carousels
        const thumbUrl = img.src.replace(/(\.[^.]+)$/, '-100x100$1');
        let thumbSuccess = await syncImageToKV(env.PRODUCTS_KV, thumbUrl, product.slug, i, true, 'thumb');
        if (!thumbSuccess && img.src !== thumbUrl) {
          // Fallback to 83x83 if 100x100 doesn't exist
          const fallback83 = img.src.replace(/(\.[^.]+)$/, '-83x83$1');
          thumbSuccess = await syncImageToKV(env.PRODUCTS_KV, fallback83, product.slug, i, true, 'thumb');
        }

        if (mainSuccess || thumbSuccess) {
          cachedImageCount++;
        }
      }
    }
  }

  // Update cached_image_count and re-save if any images were cached
  if (cachedImageCount !== syncedProduct.cached_image_count) {
    syncedProduct.cached_image_count = cachedImageCount;
    await env.PRODUCTS_KV.put(
      `product:${product.id}`,
      JSON.stringify(syncedProduct)
    );
    await env.PRODUCTS_KV.put(
      `product:slug:${product.slug}`,
      JSON.stringify(syncedProduct)
    );
  }

  console.log(`Synced product ${productId} with ${cachedImageCount} cached images`);

  // Update index
  const indexStr = await env.PRODUCTS_KV.get('product:index');
  if (indexStr) {
    const index = JSON.parse(indexStr);
    const existingIndex = index.findIndex((p: any) => p.id === productId);
    const getMeta = (key: string) => product.meta_data?.find(m => m.key === key)?.value;
    const newEntry = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      featured: product.featured,
      categories: product.categories.map(c => c.slug),
      menu_order: product.menu_order || 0,
      made_in_europe: syncedProduct.made_in_europe || false,
      green_product: syncedProduct.green_product || false,
      made_in_uk: syncedProduct.made_in_uk || false,
      missive_only: product.missive_only || getMeta('_missive_only') === 'yes',
      date_modified: product.date_modified || new Date().toISOString(),
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
    // FAQ items from category custom fields
    faq: category.faq || [],
    // SEO override fields
    seo_h1: category.seo_h1 || null,
    seo_title: category.seo_title || null,
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
    title: decodeHtmlEntities(post.title.rendered),
    slug: post.slug,
    date: post.date,
    modified: post.modified,
    excerpt: decodeHtmlEntities(cleanExcerpt),
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
          modified: syncedPost.modified || syncedPost.date,
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
        modified: syncedPost.modified || syncedPost.date,
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

// Debounce interval for site rebuilds (60 seconds)
const REBUILD_DEBOUNCE_MS = 60 * 1000;

// Verify KV product count matches WooCommerce before allowing a rebuild.
async function verifyProductCounts(env: Env): Promise<{
  ok: boolean;
  kvCount: number;
  wpCount: number;
  reason: string;
}> {
  try {
    const indexStr = await env.PRODUCTS_KV.get('product:index');
    const kvCount = indexStr ? JSON.parse(indexStr).length : 0;

    const wpRes = await fetch(
      `${env.WC_STORE_URL}/wp-json/wc/v3/products?per_page=1&status=publish`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`)}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!wpRes.ok) {
      return { ok: false, kvCount, wpCount: -1, reason: `WP API error: ${wpRes.status}` };
    }

    const wpCount = parseInt(wpRes.headers.get('X-WP-Total') || '0', 10);

    if (kvCount === 0) {
      return { ok: false, kvCount, wpCount, reason: 'KV index is empty — refusing to rebuild' };
    }

    const tolerance = Math.max(3, Math.ceil(wpCount * 0.05));
    const diff = Math.abs(kvCount - wpCount);

    if (diff > tolerance) {
      return {
        ok: false,
        kvCount,
        wpCount,
        reason: `Count mismatch: KV=${kvCount}, WP=${wpCount} (diff=${diff}, tolerance=${tolerance})`,
      };
    }

    return { ok: true, kvCount, wpCount, reason: `Counts verified: KV=${kvCount}, WP=${wpCount}` };
  } catch (error) {
    return { ok: false, kvCount: -1, wpCount: -1, reason: `Verification error: ${error}` };
  }
}

// Trigger GitHub Actions workflow to rebuild and deploy the site
// Uses workflow_dispatch API to trigger the deploy.yml workflow
// Prevents excessive rebuilds when multiple products are updated in quick succession
async function triggerSiteRebuild(env: Env): Promise<{ triggered: boolean; reason: string }> {
  // Skip if no GitHub token configured
  if (!env.GITHUB_TOKEN) {
    return { triggered: false, reason: 'No GITHUB_TOKEN configured' };
  }

  try {
    // Check for pending rebuild from a previous failed attempt — skip debounce if so
    const pendingRebuild = await env.PRODUCTS_KV.get('rebuild_pending');
    const lastRebuildStr = await env.PRODUCTS_KV.get('last_rebuild');
    const now = Date.now();

    if (!pendingRebuild && lastRebuildStr) {
      const lastRebuild = parseInt(lastRebuildStr, 10);
      const elapsed = now - lastRebuild;

      if (elapsed < REBUILD_DEBOUNCE_MS) {
        const remainingSeconds = Math.ceil((REBUILD_DEBOUNCE_MS - elapsed) / 1000);
        console.log(`Skipping rebuild - ${remainingSeconds}s remaining in debounce window`);
        return { triggered: false, reason: `Debounced (${remainingSeconds}s remaining)` };
      }
    }

    // Trigger GitHub Actions workflow via workflow_dispatch
    const ghRepo = env.GITHUB_OWNER && env.GITHUB_REPO
      ? `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`
      : 'royboy31/royboy31-hercules-live-fr';
    const ghWorkflow = env.GITHUB_WORKFLOW || 'deploy.yml';
    const ghRef = env.GITHUB_REF || 'main';
    const workflowUrl = `https://api.github.com/repos/${ghRepo}/actions/workflows/${ghWorkflow}/dispatches`;

    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Hercules-Product-Sync-Worker',
      },
      body: JSON.stringify({
        ref: ghRef,
        inputs: {
          reason: 'WooCommerce product sync webhook',
          // Production worker (URL contains "-prod") deploys to production, otherwise staging
          target: env.WORKER_BASE_URL?.includes('-prod') ? 'production' : 'staging',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub workflow trigger failed: ${response.status} ${errorText}`);
      await env.PRODUCTS_KV.put('rebuild_pending', JSON.stringify({
        failed_at: now,
        attempts: pendingRebuild ? JSON.parse(pendingRebuild).attempts + 1 : 1,
        last_error: `${response.status}: ${errorText.substring(0, 200)}`,
      }));
      return { triggered: false, reason: `GitHub API failed: ${response.status}` };
    }

    // Success — clear pending flag and set timestamp
    await env.PRODUCTS_KV.delete('rebuild_pending');
    await env.PRODUCTS_KV.put('last_rebuild', now.toString());

    console.log('GitHub Actions workflow triggered successfully');
    return { triggered: true, reason: 'GitHub workflow triggered' };
  } catch (error) {
    console.error('Error triggering site rebuild:', error);
    await env.PRODUCTS_KV.put('rebuild_pending', JSON.stringify({
      failed_at: Date.now(),
      attempts: 1,
      last_error: String(error).substring(0, 200),
    }));
    return { triggered: false, reason: `Error: ${error}` };
  }
}

// ============================================
// CLIENT LOGOS SYNC — Fetch from WordPress, store images in R2, metadata in KV
// ============================================

interface ClientLogo {
  name: string;
  slug: string;
  image_url: string;
  row: number;
  order: number;
}

async function syncClientLogos(env: Env): Promise<{ success: boolean; count: number }> {
  // Fetch logos from WordPress REST API
  const wpUrl = `${env.WC_STORE_URL}/wp-json/hercules/v1/client-logos`;
  console.log(`Fetching client logos from ${wpUrl}`);

  const response = await fetch(wpUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch logos from WordPress: ${response.status} ${response.statusText}`);
  }

  const logos: ClientLogo[] = await response.json();
  console.log(`Received ${logos.length} logos from WordPress`);

  if (!env.CLIENT_LOGOS_BUCKET) {
    throw new Error('CLIENT_LOGOS_BUCKET R2 binding not configured');
  }

  // Sync each logo image to R2
  const syncedLogos: Array<{ name: string; slug: string; row: number; order: number; r2_key: string }> = [];

  for (const logo of logos) {
    try {
      // Determine expected R2 key
      const ext = logo.image_url.includes('.webp') ? 'webp' : logo.image_url.includes('.png') ? 'png' : 'webp';
      const r2Key = `logos/${logo.slug}.${ext}`;

      // Check if image already exists in R2 with same source URL (skip re-download)
      const existing = await env.CLIENT_LOGOS_BUCKET.head(r2Key);
      if (existing && existing.customMetadata?.originalUrl === logo.image_url) {
        syncedLogos.push({
          name: logo.name,
          slug: logo.slug,
          row: logo.row,
          order: logo.order,
          r2_key: r2Key,
        });
        continue;
      }

      // Download image from WordPress
      const imgResponse = await fetch(logo.image_url);
      if (!imgResponse.ok) {
        console.error(`Failed to download logo image for ${logo.name}: ${imgResponse.status}`);
        if (existing) {
          syncedLogos.push({ name: logo.name, slug: logo.slug, row: logo.row, order: logo.order, r2_key: r2Key });
        }
        continue;
      }

      const contentType = imgResponse.headers.get('Content-Type') || 'image/png';
      const imageBuffer = await imgResponse.arrayBuffer();

      // Upload to R2
      await env.CLIENT_LOGOS_BUCKET.put(r2Key, imageBuffer, {
        httpMetadata: {
          contentType: contentType,
          cacheControl: 'public, max-age=604800',
        },
        customMetadata: {
          name: logo.name,
          originalUrl: logo.image_url,
          syncedAt: new Date().toISOString(),
        },
      });

      syncedLogos.push({
        name: logo.name,
        slug: logo.slug,
        row: logo.row,
        order: logo.order,
        r2_key: r2Key,
      });

      console.log(`Synced logo: ${logo.name} → R2:${r2Key}`);
    } catch (error) {
      console.error(`Error syncing logo ${logo.name}:`, error);
    }
  }

  // Store metadata in KV
  await env.PRODUCTS_KV.put('CLIENT_LOGOS', JSON.stringify(syncedLogos));
  console.log(`Stored ${syncedLogos.length} logo metadata entries in KV`);

  // Clean up R2: remove logos that are no longer in the list
  const currentSlugs = new Set(syncedLogos.map(l => l.slug));
  const listed = await env.CLIENT_LOGOS_BUCKET.list({ prefix: 'logos/' });
  for (const obj of listed.objects) {
    const keySlug = obj.key.replace('logos/', '').replace(/\.(webp|png|jpg|jpeg)$/, '');
    if (!currentSlugs.has(keySlug)) {
      await env.CLIENT_LOGOS_BUCKET.delete(obj.key);
      console.log(`Deleted orphaned logo from R2: ${obj.key}`);
    }
  }

  return { success: true, count: syncedLogos.length };
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

// WordPress-generated square variants we may serve instead of the full-size original,
// ascending. Presence varies per upload, so a candidate is only ever used after the
// fetch below confirms it exists — we never construct a URL and hope.
const WP_SQUARE_VARIANTS = [100, 150, 300, 361, 768];

// Thumbnails render in a 94px box (and are CSS-blurred unless active), so 300px stays
// crisp past 3x DPR. This is an UPGRADE on the 100x100 the sync caches, not a downgrade:
// the only thing it replaces is the full-size original, which no thumbnail can display.
const THUMB_MIN_PX = 300;

/**
 * Fetch the smallest WordPress variant that is at least `minPx` wide and actually exists.
 * Returns null if none can be confirmed, so callers keep their existing behaviour.
 * Responses are cached at the edge, so the probe cost is paid once per image.
 */
async function fetchSizedVariant(originalUrl: string, minPx: number): Promise<Response | null> {
  // WordPress names variants after the PRE-SCALE basename: an upload stored as
  // "shirt-scaled.png" has variants called "shirt-768x768.png", NOT
  // "shirt-scaled-768x768.png". Try both spellings or -scaled uploads find nothing
  // and fall back to a multi-MB original.
  const bases = [originalUrl];
  const unscaled = originalUrl.replace(/-scaled(\.[^.]+)$/, '$1');
  if (unscaled !== originalUrl) bases.push(unscaled);

  for (const px of WP_SQUARE_VARIANTS) {
    if (px < minPx) continue;
    for (const base of bases) {
      const candidate = base.replace(/(\.[^.]+)$/, `-${px}x${px}$1`);
      try {
        const response = await fetch(candidate, {
          cf: { cacheEverything: true, cacheTtl: 604800 },
        });
        if (response.ok) return response;
      } catch (e) {
        // Network/WP failure - fall through and let the caller redirect to the original
      }
    }
  }
  return null;
}

// Request handler
export default {
  // HTTP request handler
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Set worker URL from env if provided (production vs staging)
    if (env.WORKER_BASE_URL) {
      WORKER_URL = env.WORKER_BASE_URL;
    }
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

        // Run sync FIRST, then trigger rebuild after sync completes
        // This ensures the build always fetches the latest data
        ctx.waitUntil(
          syncSingleProduct(env, productId)
            .then(result => {
              console.log(`Product ${productId} sync complete`);
              return triggerSiteRebuild(env);
            })
            .then(result => console.log(`Rebuild result: ${result.reason}`))
            .catch(error => console.error(`Sync/rebuild error for product ${productId}:`, error))
        );

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

    // Batch product sync — syncs multiple products then triggers a single rebuild
    if (url.pathname === '/webhook/batch-product-sync' && request.method === 'POST') {
      try {
        const signature = request.headers.get('X-WC-Webhook-Signature') || '';
        const payload = await request.text();

        const isValid = await verifyWebhookSignature(payload, signature, env.WEBHOOK_SECRET);
        if (!isValid) {
          return new Response('Invalid signature', { status: 401 });
        }

        const data = JSON.parse(payload);
        const productIds: number[] = data.product_ids || [];

        const termId = data.term_id ? String(data.term_id) : null;
        console.log(`Batch sync: ${productIds.length} products, term_id=${termId} (source: ${data.source})`);

        // Lightweight category position update — only patch category_positions in KV
        // Full syncSingleProduct takes ~49s/product (WP API + images), way too slow.
        // Instead: read existing KV entry, update category_positions field, write back.
        // The product_ids array is already in the saved order (index = position).
        let updated = 0;
        for (let i = 0; i < productIds.length; i++) {
          try {
            const productStr = await env.PRODUCTS_KV.get(`product:${productIds[i]}`);
            if (!productStr) {
              console.log(`Product ${productIds[i]} not in KV, skipping`);
              continue;
            }
            const product = JSON.parse(productStr);
            if (!product.category_positions) product.category_positions = {};
            if (termId) {
              product.category_positions[termId] = i;
            }
            const updatedStr = JSON.stringify(product);
            // Update both ID and slug keys
            await env.PRODUCTS_KV.put(`product:${productIds[i]}`, updatedStr);
            if (product.slug) {
              await env.PRODUCTS_KV.put(`product:slug:${product.slug}`, updatedStr);
            }
            updated++;
          } catch (e) {
            console.error(`Failed to update position for product ${productIds[i]}:`, e);
          }
        }
        console.log(`Batch position update: ${updated}/${productIds.length} products updated`);

        return new Response(JSON.stringify({ success: true, count: productIds.length, updated }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Batch sync error:', error);
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
        const deletedSlug = await deleteProduct(env, productId);

        // Purge Cloudflare cache for the deleted product page
        if (deletedSlug && env.ASTRO_SITE_URL) {
          const urlsToPurge = [
            `${env.ASTRO_SITE_URL}/products/${deletedSlug}/`,
            `${env.ASTRO_SITE_URL}/products/${deletedSlug}`,
          ];
          ctx.waitUntil(purgeCloudflareCache(env, urlsToPurge));
        }

        // Trigger site rebuild (debounced)
        ctx.waitUntil(triggerSiteRebuild(env));

        return new Response(JSON.stringify({ success: true, productId, slug: deletedSlug, action: 'delete', cachePurged: !!deletedSlug }), {
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

        // Run sync and rebuild in PARALLEL to avoid ctx.waitUntil() 30s timeout
        ctx.waitUntil(
          Promise.all([
            syncSingleCategory(env, categoryId)
              .then(result => console.log(`Category ${categoryId} sync complete`))
              .catch(error => console.error(`Sync error for category ${categoryId}:`, error)),
            triggerSiteRebuild(env)
              .then(result => console.log(`Rebuild result: ${result.reason}`))
              .catch(error => console.error(`Rebuild error:`, error)),
          ])
        );

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

        // Run sync and rebuild in PARALLEL to avoid ctx.waitUntil() 30s timeout
        ctx.waitUntil(
          Promise.all([
            syncSinglePost(env, postId)
              .then(result => console.log(`Post ${postId} sync complete`))
              .catch(error => console.error(`Sync error for post ${postId}:`, error)),
            triggerSiteRebuild(env)
              .then(result => console.log(`Rebuild result: ${result.reason}`))
              .catch(error => console.error(`Rebuild error:`, error)),
          ])
        );

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

    // Debug: Test single image fetch and full sync process
    if (url.pathname === '/test-image-fetch' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.WEBHOOK_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      const testUrl = url.searchParams.get('url') || 'https://hercules-merchandising.fr/wp-content/uploads/2025/08/Hercules-Merchandise-Jacquard-Woven-Towel-1-300x300.webp';
      const testSync = url.searchParams.get('sync') === 'true';

      try {
        const response = await fetch(testUrl, {
          headers: { 'User-Agent': 'Hercules-Product-Sync/1.0' },
        });

        const buffer = await response.arrayBuffer();

        const result: any = {
          url: testUrl,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          actualSize: buffer.byteLength,
          ok: response.ok,
        };

        // Try full sync process if requested
        if (testSync && response.ok) {
          try {
            // Chunked base64 conversion
            const bytes = new Uint8Array(buffer);
            const chunkSize = 0x8000;
            let binaryString = '';
            for (let i = 0; i < bytes.length; i += chunkSize) {
              const chunk = bytes.subarray(i, i + chunkSize);
              binaryString += String.fromCharCode.apply(null, Array.from(chunk));
            }
            const base64Image = btoa(binaryString);

            result.base64Length = base64Image.length;
            result.base64Preview = base64Image.substring(0, 50) + '...';

            // Try to store in KV
            const testKey = 'test:image:debug';
            await env.PRODUCTS_KV.put(testKey, base64Image, {
              metadata: { contentType: 'image/webp', originalUrl: testUrl, syncedAt: new Date().toISOString() },
            });

            result.kvStored = true;
            result.kvKey = testKey;

            // Verify retrieval
            const retrieved = await env.PRODUCTS_KV.get(testKey);
            result.kvRetrieved = retrieved !== null;
            result.kvRetrievedLength = retrieved?.length || 0;
          } catch (syncError) {
            result.syncError = syncError instanceof Error ? syncError.message : String(syncError);
            result.syncErrorStack = syncError instanceof Error ? syncError.stack : undefined;
          }
        }

        return new Response(JSON.stringify(result, null, 2), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({
          url: testUrl,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Resync all images as WebP (force re-download and convert)
    // Use ?offset=N for pagination (default batch size: 10 products)
    if (url.pathname === '/resync-images' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.WEBHOOK_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const batchSize = 1; // 1 product per batch to allow more images per product

      try {
        // Get all products from index
        const indexStr = await env.PRODUCTS_KV.get('product:index');
        if (!indexStr) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No products found in index'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const allProducts = JSON.parse(indexStr) as Array<{ id: number; name: string; slug: string }>;
        const totalProducts = allProducts.length;
        const productsToSync = allProducts.slice(offset, offset + batchSize);

        let imagesSynced = 0;
        let imagesFailed = 0;
        const results: Array<{ slug: string; images: number; failed: number }> = [];

        for (const product of productsToSync) {
          // Get full product data to access images array
          const productStr = await env.PRODUCTS_KV.get(`product:slug:${product.slug}`);
          if (!productStr) continue;

          const productData = JSON.parse(productStr);
          const images = productData.images || [];
          let productImagesSynced = 0;
          let productImagesFailed = 0;

          // Sync each image with force refresh (WebP conversion)
          // With batchSize=1, we can sync up to 10 images per product
          // 10 images × 2 sizes × 2 fetches (WebP fallback) = 40 subrequests max (within 50 limit)
          for (let i = 0; i < images.length && i < 10; i++) {
            const imageUrl = images[i].src || images[i].local_src;
            if (!imageUrl) continue;

            // Sync main size (361x361) for category cards - exact display size
            const mainUrl = imageUrl.replace(/(\.[^.]+)$/, '-361x361$1');
            const fullSuccess = await syncImageToKV(
              env.PRODUCTS_KV,
              mainUrl,
              product.slug,
              i,
              true, // forceRefresh
              'full'
            );

            // Sync thumbnail (100x100) for thumbnail carousels - displayed at 83px
            const thumbUrl = imageUrl.replace(/(\.[^.]+)$/, '-100x100$1');
            const thumbSuccess = await syncImageToKV(
              env.PRODUCTS_KV,
              thumbUrl,
              product.slug,
              i,
              true, // forceRefresh
              'thumb'
            );

            if (fullSuccess || thumbSuccess) {
              productImagesSynced++;
              imagesSynced++;
            } else {
              productImagesFailed++;
              imagesFailed++;
            }
          }

          results.push({
            slug: product.slug,
            images: productImagesSynced,
            failed: productImagesFailed
          });
        }

        const hasMore = offset + batchSize < totalProducts;
        const nextOffset = hasMore ? offset + batchSize : null;

        return new Response(JSON.stringify({
          success: true,
          batch: {
            offset,
            batchSize,
            processed: productsToSync.length,
            totalProducts
          },
          images: {
            synced: imagesSynced,
            failed: imagesFailed
          },
          results,
          hasMore,
          nextOffset,
          message: hasMore
            ? `Processed ${productsToSync.length} products. Run again with offset=${nextOffset} to continue.`
            : `Complete! All ${totalProducts} products processed.`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Resync images for a specific product by slug (targeted resync)
    // Use POST /resync-product-images/{slug} to force resync one product's images
    if (url.pathname.startsWith('/resync-product-images/') && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.WEBHOOK_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      const slug = url.pathname.replace('/resync-product-images/', '');
      if (!slug) {
        return new Response(JSON.stringify({ success: false, error: 'Missing product slug' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        // Get full product data
        const productStr = await env.PRODUCTS_KV.get(`product:slug:${slug}`);
        if (!productStr) {
          return new Response(JSON.stringify({ success: false, error: 'Product not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const product = JSON.parse(productStr);
        const images = product.images || [];
        let imagesSynced = 0;
        let imagesFailed = 0;
        const imageResults: Array<{ index: number; mainSuccess: boolean; thumbSuccess: boolean; mainSize?: string; thumbSize?: string }> = [];

        // Sync each image with force refresh
        // Max 5 images per product to stay within subrequest limits
        for (let i = 0; i < images.length && i < 5; i++) {
          const imageUrl = images[i].src || images[i].local_src;
          if (!imageUrl) continue;

          // Sync main size (361x361) for category cards - exact display size
          const mainUrl = imageUrl.replace(/(\.[^.]+)$/, '-361x361$1');
          const mainSuccess = await syncImageToKV(
            env.PRODUCTS_KV,
            mainUrl,
            slug,
            i,
            true, // forceRefresh
            'full'
          );

          // Sync thumbnail (100x100) for thumbnail carousels - displayed at 83px
          const thumbUrl = imageUrl.replace(/(\.[^.]+)$/, '-100x100$1');
          const thumbSuccess = await syncImageToKV(
            env.PRODUCTS_KV,
            thumbUrl,
            slug,
            i,
            true, // forceRefresh
            'thumb'
          );

          imageResults.push({
            index: i,
            mainSuccess,
            thumbSuccess,
            mainSize: mainSuccess ? '361x361' : undefined,
            thumbSize: thumbSuccess ? '100x100' : undefined
          });

          if (mainSuccess) imagesSynced++;
          if (thumbSuccess) imagesSynced++;
          if (!mainSuccess) imagesFailed++;
          if (!thumbSuccess) imagesFailed++;
        }

        return new Response(JSON.stringify({
          success: true,
          slug,
          productName: product.name,
          images: {
            total: images.length,
            processed: Math.min(images.length, 5),
            synced: imagesSynced,
            failed: imagesFailed
          },
          results: imageResults
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          slug,
          error: error instanceof Error ? error.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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

      // Block missive-only products from website (CRM passes include_missive=true)
      const includeMissive = url.searchParams.get('include_missive') === 'true';
      if (product.missive_only && !includeMissive) {
        return new Response('Product not found', { status: 404 });
      }
      if (product.slug) {
        product.localThumbnail = `${WORKER_URL}/image/${product.slug}`;
      }

      return new Response(JSON.stringify(product), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all products (index only - lightweight)
    if (url.pathname === '/products') {
      const indexStr = await env.PRODUCTS_KV.get('product:index');
      const index = indexStr ? JSON.parse(indexStr) : [];
      // Exclude missive-only products from website listings (CRM passes include_missive=true)
      const includeMissive = url.searchParams.get('include_missive') === 'true';
      const filtered = includeMissive ? index : index.filter((p: any) => !p.missive_only);
      return new Response(JSON.stringify(filtered), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all products with full data (for build optimization)
    if (url.pathname === '/products-full') {
      const indexStr = await env.PRODUCTS_KV.get('product:index');
      if (!indexStr) {
        return new Response('[]', {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const index = JSON.parse(indexStr);
      // Exclude missive-only products from website builds (CRM passes include_missive=true)
      const includeMissive = url.searchParams.get('include_missive') === 'true';
      const filtered = includeMissive ? index : index.filter((p: any) => !p.missive_only);
      const products = await Promise.all(
        filtered.map(async (p: any) => {
          const productStr = await env.PRODUCTS_KV.get(`product:${p.id}`);
          return productStr ? JSON.parse(productStr) : null;
        })
      );

      return new Response(JSON.stringify(products.filter(Boolean)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get products by category with full data (optimized for collection pages)
    if (url.pathname.startsWith('/products-by-category/')) {
      const categorySlug = url.pathname.replace('/products-by-category/', '');

      const indexStr = await env.PRODUCTS_KV.get('product:index');
      if (!indexStr) {
        return new Response('[]', {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const index = JSON.parse(indexStr);
      // Filter products by category from index (exclude missive-only)
      const categoryProducts = index.filter((p: any) =>
        p.categories?.includes(categorySlug) && !p.missive_only
      );

      // Fetch full product data for matching products
      const products = await Promise.all(
        categoryProducts.map(async (p: any) => {
          const productStr = await env.PRODUCTS_KV.get(`product:${p.id}`);
          return productStr ? JSON.parse(productStr) : null;
        })
      );

      return new Response(JSON.stringify(products.filter(Boolean)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Purge all product-config cache entries
    if (url.pathname === '/purge-product-configs' && request.method === 'POST') {
      const authHeader = request.headers.get('X-Webhook-Secret') || '';
      if (authHeader !== env.WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      try {
        const list = await env.PRODUCTS_KV.list({ prefix: 'product-config:' });
        let deleted = 0;
        for (const key of list.keys) {
          await env.PRODUCTS_KV.delete(key.name);
          deleted++;
        }
        return new Response(JSON.stringify({ success: true, deleted }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ success: false, error: String(err) }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Get product configuration for steps form (Pearl WC Steps data)
    // This endpoint fetches from WordPress and caches in KV
    if (url.pathname.startsWith('/product-config/')) {
      const identifier = url.pathname.replace('/product-config/', '');

      const wpUrl = identifier.match(/^\d+$/)
        ? `${env.WC_STORE_URL}/wp-json/hercules/v1/product-config/${identifier}`
        : `${env.WC_STORE_URL}/wp-json/hercules/v1/product-config-by-slug/${identifier}`;
      let configStr: string | null = null;

      // Check KV cache first (10 min TTL) — avoids 3s WP round-trip per product
      const cached = await env.PRODUCTS_KV.get(`product-config:${identifier}`);
      if (cached) {
        return new Response(cached, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        });
      }

      try {
          const response = await fetch(wpUrl, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Hercules-Product-Sync-Worker/1.0',
            },
            cf: { cacheTtl: 0 },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`WordPress API error: ${response.status} - ${errorText}`);
            return new Response(JSON.stringify({
              error: 'Product config not found',
              status: response.status,
              wpUrl: wpUrl,
              details: errorText.substring(0, 200)
            }), {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const config = await response.json();

          // Normalize addon options: convert object-based options to arrays
          // WordPress returns different formats:
          // - Most addons: options as ARRAY
          // - multiple_choise addons: options as OBJECT with numeric keys
          if (config.addons && Array.isArray(config.addons)) {
            config.addons = config.addons.map((addon: any) => {
              // If options exists and is an object (not an array), convert to array
              if (addon.options && typeof addon.options === 'object' && !Array.isArray(addon.options)) {
                // Convert object to array of values
                addon.options = Object.values(addon.options);
              }
              // Ensure options is always an array (even if empty)
              if (!Array.isArray(addon.options)) {
                addon.options = [];
              }
              return addon;
            });
          }

          configStr = JSON.stringify(config);

          // Cache in KV for 1 hour — avoids 3s WP round-trip during Astro builds
          // (100 products × 3s = 5 min build without cache vs ~15s with cache)
          // Cache is refreshed: on product sync (syncSingleProduct), via /purge-product-configs,
          // or automatically after 1 hour expiry
          await env.PRODUCTS_KV.put(`product-config:${identifier}`, configStr, { expirationTtl: 3600 });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Error fetching product config:', errorMessage);
          return new Response(JSON.stringify({
            error: 'Error fetching product config',
            message: errorMessage,
            wpUrl: wpUrl
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
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
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Health check endpoint (machine-parseable, returns 503 if degraded)
    if (url.pathname === '/health') {
      const lastSync = await env.PRODUCTS_KV.get('last_sync');
      const lastRebuild = await env.PRODUCTS_KV.get('last_rebuild');
      const pendingRebuild = await env.PRODUCTS_KV.get('rebuild_pending');
      const productIndex = await env.PRODUCTS_KV.get('product:index');
      const now = Date.now();

      const lastSyncAge = lastSync ? now - new Date(lastSync).getTime() : Infinity;
      const syncStale = lastSyncAge > 26 * 60 * 60 * 1000;
      const hasPendingRebuild = !!pendingRebuild;
      const productCount = productIndex ? JSON.parse(productIndex).length : 0;

      const healthy = !syncStale && !hasPendingRebuild && productCount > 0;

      return new Response(JSON.stringify({
        status: healthy ? 'healthy' : 'degraded',
        checks: {
          last_sync_age_hours: Math.round(lastSyncAge / 3600000 * 10) / 10,
          sync_stale: syncStale,
          pending_rebuild: hasPendingRebuild,
          pending_rebuild_details: pendingRebuild ? JSON.parse(pendingRebuild) : null,
          product_count: productCount,
          github_token_configured: !!env.GITHUB_TOKEN,
        },
        timestamp: new Date().toISOString(),
      }), {
        status: healthy ? 200 : 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

      // Verify product counts before rebuilding (skip with ?skip_verify=true)
      const skipVerify = url.searchParams.get('skip_verify') === 'true';
      if (!skipVerify) {
        const verification = await verifyProductCounts(env);
        if (!verification.ok) {
          return new Response(JSON.stringify({
            triggered: false,
            reason: `REBUILD BLOCKED: ${verification.reason}`,
            verification,
          }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Clear debounce first
      await env.PRODUCTS_KV.delete('last_rebuild');

      const result = await triggerSiteRebuild(env);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // CLIENT LOGOS — Webhook, metadata, and image serving
    // ============================================

    // Webhook: WordPress notifies us when logos are updated
    if (url.pathname === '/webhook/logos-update' && request.method === 'POST') {
      try {
        const signature = request.headers.get('X-WC-Webhook-Signature') || '';
        const payload = await request.text();

        const isValid = await verifyWebhookSignature(payload, signature, env.WEBHOOK_SECRET);
        if (!isValid) {
          console.log('Invalid logos webhook signature');
          return new Response('Invalid signature', { status: 401 });
        }

        console.log('Logos webhook received — syncing from WordPress');

        // Sync logos first, THEN trigger rebuild so KV has fresh data before build fetches it
        ctx.waitUntil(
          syncClientLogos(env)
            .then(result => {
              console.log(`Client logos sync complete: ${result.count} logos`);
              return triggerSiteRebuild(env);
            })
            .then(result => console.log(`Logos rebuild result: ${result.reason}`))
            .catch(error => console.error('Client logos sync/rebuild error:', error))
        );

        return new Response(JSON.stringify({ success: true, action: 'logos_sync' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Logos webhook error:', error);
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // GET /client-logos — return logo metadata from KV
    if (url.pathname === '/client-logos' && request.method === 'GET') {
      const data = await env.PRODUCTS_KV.get('CLIENT_LOGOS');
      if (!data) {
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(data, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        },
      });
    }

    // GET /client-logo-image/{slug} — serve logo image from R2
    if (url.pathname.startsWith('/client-logo-image/') && request.method === 'GET') {
      const slug = url.pathname.replace('/client-logo-image/', '').replace(/\/$/, '');
      if (!slug) {
        return new Response('Missing slug', { status: 400 });
      }

      if (!env.CLIENT_LOGOS_BUCKET) {
        return new Response('R2 bucket not configured', { status: 503 });
      }

      // Check edge cache first
      const cache = caches.default;
      const cacheKey = new Request(url.toString(), { method: 'GET' });
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      const r2Key = `logos/${slug}.webp`;
      const object = await env.CLIENT_LOGOS_BUCKET.get(r2Key);

      if (!object) {
        // Try original format
        const r2KeyPng = `logos/${slug}.png`;
        const objectPng = await env.CLIENT_LOGOS_BUCKET.get(r2KeyPng);
        if (!objectPng) {
          return new Response('Logo not found', { status: 404 });
        }

        const response = new Response(objectPng.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=604800',
          },
        });
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      }

      const response = new Response(object.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=604800',
        },
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    // Manual trigger: POST /sync-logos (same auth as /sync)
    if (url.pathname === '/sync-logos' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace('Bearer ', '');
      if (!token || token !== env.WEBHOOK_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }

      try {
        const result = await syncClientLogos(env);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Serve cached product images
    // Supports: /image/{slug} (main image) or /image/{slug}/{index} (gallery image)
    // Optional query params: ?size=thumb (300x300), ?w=300 (width), ?format=webp (output format)
    if (url.pathname.startsWith('/image/')) {
      const pathParts = url.pathname.replace('/image/', '').split('/');
      const slug = pathParts[0];
      const imageIndex = pathParts[1] ? parseInt(pathParts[1], 10) : 0;

      // Optional resizing parameters
      const requestedWidth = url.searchParams.get('w');
      const requestedFormat = url.searchParams.get('format');
      const requestedSize = url.searchParams.get('size'); // 'thumb' for 300x300 thumbnails

      if (!slug) {
        return new Response('Missing product slug', { status: 400 });
      }

      // Key format: image:{slug} for main (index 0), image:{slug}:{index} for gallery
      // Add :thumb suffix if requesting thumbnail size
      let kvKey = imageIndex === 0 ? `image:${slug}` : `image:${slug}:${imageIndex}`;
      if (requestedSize === 'thumb') {
        kvKey += ':thumb';
      }

      // Get image from KV with metadata
      let { value: base64Image, metadata } = await env.PRODUCTS_KV.getWithMetadata<{
        contentType: string;
        originalUrl: string;
        syncedAt: string;
        imageIndex?: number;
        size?: string;
      }>(kvKey);

      // If requesting thumb but not cached, fall back to full size
      if (!base64Image && requestedSize === 'thumb') {
        const fullKey = imageIndex === 0 ? `image:${slug}` : `image:${slug}:${imageIndex}`;
        const fullResult = await env.PRODUCTS_KV.getWithMetadata<{
          contentType: string;
          originalUrl: string;
          syncedAt: string;
          imageIndex?: number;
          size?: string;
        }>(fullKey);
        if (fullResult.value) {
          base64Image = fullResult.value;
          metadata = fullResult.metadata;
        }
      }

      if (!base64Image) {
        // Image not cached - try to get original URL from product data and redirect
        const product = await env.PRODUCTS_KV.get<SyncedProduct>(`product:slug:${slug}`, 'json');
        if (product && product.images && product.images[imageIndex]) {
          // Redirect to WordPress image URL (with optional resizing via cdn-cgi)
          const originalUrl = product.images[imageIndex].src;
          if (originalUrl) {
            // A thumbnail must never fall back to the full-size original: it renders in a
            // 94px box, so redirecting here was shipping ~600KB to paint ~5KB worth of pixels.
            // Serve WordPress's own sized variant instead; if none can be confirmed we fall
            // through to the original exactly as before.
            if (requestedSize === 'thumb') {
              const variant = await fetchSizedVariant(originalUrl, THUMB_MIN_PX);
              if (variant) {
                const headers = new Headers(variant.headers);
                headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
                headers.set('Access-Control-Allow-Origin', '*');
                return new Response(variant.body, { status: 200, headers });
              }
            }

            // If resizing requested, use Cloudflare cdn-cgi Image Resizing
            if (requestedWidth || requestedFormat) {
              const options: string[] = ['fit=contain', 'quality=85'];
              if (requestedWidth) {
                options.push(`width=${requestedWidth}`);
              }
              if (requestedFormat === 'webp') {
                options.push('format=webp');
              }
              try {
                const originalUrlObj = new URL(originalUrl);
                const cdnCgiUrl = `${originalUrlObj.origin}/cdn-cgi/image/${options.join(',')}${originalUrlObj.pathname}`;
                const resizedResponse = await fetch(cdnCgiUrl);
                if (resizedResponse.ok) {
                  const headers = new Headers(resizedResponse.headers);
                  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
                  headers.set('Access-Control-Allow-Origin', '*');
                  return new Response(resizedResponse.body, {
                    status: 200,
                    headers
                  });
                }
              } catch (e) {
                // Fall through to redirect if resizing fails
              }

              // Same cdn-cgi caveat as the cached branch below: prefer a real sized
              // variant over shipping the full-size original.
              const widthPx = parseInt(requestedWidth || '0', 10);
              if (widthPx > 0) {
                const variant = await fetchSizedVariant(originalUrl, widthPx);
                if (variant) {
                  const headers = new Headers(variant.headers);
                  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
                  headers.set('Access-Control-Allow-Origin', '*');
                  return new Response(variant.body, { status: 200, headers });
                }
              }
            }
            return Response.redirect(originalUrl, 302);
          }
        }
        return new Response('Image not found', { status: 404 });
      }

      // If resizing requested, use Cloudflare Image Resizing via cdn-cgi URL
      // This works on any Cloudflare-proxied domain (cf.image requires zone with Image Resizing)
      if (requestedWidth || requestedFormat) {
        let originalUrl = metadata?.originalUrl;

        // Fallback: get originalUrl from product data if not in metadata
        if (!originalUrl) {
          const product = await env.PRODUCTS_KV.get<SyncedProduct>(`product:slug:${slug}`, 'json');
          if (product && product.images && product.images[imageIndex]) {
            originalUrl = product.images[imageIndex].src;
          }
        }

        if (originalUrl) {
          // Build cdn-cgi image URL options
          const options: string[] = ['fit=contain', 'quality=85'];
          if (requestedWidth) {
            options.push(`width=${requestedWidth}`);
          }
          if (requestedFormat === 'webp') {
            options.push('format=webp');
          }

          // Extract path from original URL (e.g., /wp-content/uploads/...)
          // URL format: https://staging.hercules-merchandising.fr/cdn-cgi/image/options/path
          try {
            const originalUrlObj = new URL(originalUrl);
            const cdnCgiUrl = `${originalUrlObj.origin}/cdn-cgi/image/${options.join(',')}${originalUrlObj.pathname}`;

            const resizedResponse = await fetch(cdnCgiUrl);
            if (resizedResponse.ok) {
              const headers = new Headers(resizedResponse.headers);
              headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
              headers.set('Access-Control-Allow-Origin', '*');
              return new Response(resizedResponse.body, {
                status: 200,
                headers
              });
            }
          } catch (e) {
            // Fall through to serve original if resizing fails
            console.error('Cloudflare cdn-cgi Image Resizing failed:', e);
          }

          // Cloudflare Image Resizing is NOT enabled on every zone (FR returns 404 for
          // /cdn-cgi/image/...), so without this we would fall through and serve the small
          // cached copy at a size the caller explicitly asked to be LARGER - a silent
          // quality downgrade. Serve WordPress's own variant at or above the requested width.
          const widthPx = parseInt(requestedWidth || '0', 10);
          if (widthPx > 0) {
            const variant = await fetchSizedVariant(originalUrl, widthPx);
            if (variant) {
              const headers = new Headers(variant.headers);
              headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
              headers.set('Access-Control-Allow-Origin', '*');
              return new Response(variant.body, { status: 200, headers });
            }
          }
        }
      }

      // Decode base64 to binary (original image)
      const binaryString = atob(base64Image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Return image with caching headers
      return new Response(bytes, {
        headers: {
          'Content-Type': metadata?.contentType || 'image/png',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
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
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
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

      // Exclude missive-only from website search (CRM passes include_missive=true)
      const includeMissive = url.searchParams.get('include_missive') === 'true';

      // Score-based search: prioritize name matches over category matches
      // Also filter out test products and products without slugs
      const scoredProducts = index
        .filter((p: any) => {
          // Filter out test products and products without slugs
          if (!p.slug || p.slug === '') return false;
          if (p.name.toLowerCase().includes('(copy)') || p.name.toLowerCase() === 'test') return false;
          // Exclude missive-only from website search (CRM passes include_missive=true)
          if (!includeMissive && p.missive_only) return false;
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
              priceDisplay = `${minPrice.toFixed(2)} €`;
            } else {
              priceDisplay = `${minPrice.toFixed(2)} € – ${maxPrice.toFixed(2)} €`;
            }
          } else if (product.price) {
            priceDisplay = `${parseFloat(product.price).toFixed(2)} €`;
          }

          // Get thumbnail - use local cached image URL
          const thumbnail = product.slug ? `${WORKER_URL}/image/${product.slug}` : '';

          return {
            id: product.id,
            title: product.name,
            slug: product.slug,
            url: `/products/${product.slug}`,
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

  // Scheduled (cron) handler - delta sync: only products modified since last run
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    if (env.WORKER_BASE_URL) {
      WORKER_URL = env.WORKER_BASE_URL;
    }
    // Read last successful sync timestamp for delta filtering
    const lastSyncAt = await env.PRODUCTS_KV.get('last_delta_sync');
    const syncStartedAt = new Date().toISOString();
    console.log(`Starting delta sync (modified after: ${lastSyncAt ?? 'never — full sync'})...`);

    // Sync categories and blog posts unconditionally (they are small and have no delta filter)
    console.log('Syncing categories...');
    const categoryResult = await syncAllCategories(env);
    console.log(`Categories synced: ${categoryResult.synced}, errors: ${categoryResult.errors.length}`);

    console.log('Syncing blog posts...');
    const postResult = await syncAllPosts(env);
    console.log(`Posts synced: ${postResult.synced}, errors: ${postResult.errors.length}`);

    // Sync only products modified since last run (or all products on first run)
    console.log('Syncing modified products...');
    let offset = 0;
    let hasMore = true;
    let totalSynced = 0;
    let consecutiveEmpty = 0;

    while (hasMore) {
      const result = await syncAllProducts(env, offset, false, lastSyncAt ?? undefined);
      totalSynced += result.synced;
      hasMore = result.hasMore;
      offset = result.nextOffset;

      if (result.errors.length > 0) {
        console.log(`Batch had ${result.errors.length} errors`);
      }

      // Stall protection: stop if 3 consecutive batches produce nothing
      if (result.synced === 0) {
        consecutiveEmpty++;
        if (consecutiveEmpty >= 3) {
          console.log('Stopping sync: 3 consecutive batches with 0 products synced');
          hasMore = false;
        }
      } else {
        consecutiveEmpty = 0;
      }
    }

    console.log(`Delta sync complete. Products: ${totalSynced}, Categories: ${categoryResult.synced}, Posts: ${postResult.synced}`);

    // Store the timestamp we started the sync at (not 'now' at end, to avoid missing products
    // that were modified while the sync was running)
    await env.PRODUCTS_KV.put('last_delta_sync', syncStartedAt);

    // Stale image sweep: re-sync products with cached_image_count = 0 or missing synced_at
    // This catches products where the webhook fired but image caching failed silently
    console.log('Checking for products with missing cached images...');
    let staleFixed = 0;
    try {
      const indexStr = await env.PRODUCTS_KV.get('product:index');
      if (indexStr) {
        const index = JSON.parse(indexStr);
        const staleProducts: number[] = [];

        for (const entry of index) {
          if (entry.missive_only) continue;
          const productStr = await env.PRODUCTS_KV.get(`product:${entry.id}`);
          if (!productStr) {
            staleProducts.push(entry.id);
            continue;
          }
          const product = JSON.parse(productStr);
          if ((product.cached_image_count ?? 0) === 0 || !product.synced_at) {
            staleProducts.push(entry.id);
          }
        }

        if (staleProducts.length > 0) {
          console.log(`Found ${staleProducts.length} products with missing images: ${staleProducts.join(', ')}`);
          // Re-sync up to 10 stale products per cron run to stay within subrequest limits
          for (const pid of staleProducts.slice(0, 10)) {
            try {
              const result = await syncSingleProduct(env, pid);
              if (result && (result.cached_image_count ?? 0) > 0) {
                staleFixed++;
                console.log(`Fixed stale product ${pid}: ${result.cached_image_count} images cached`);
              } else {
                console.warn(`Re-synced product ${pid} but still has 0 cached images`);
              }
            } catch (e) {
              console.error(`Failed to re-sync stale product ${pid}:`, e);
            }
          }
          console.log(`Stale image sweep: fixed ${staleFixed}/${staleProducts.length} products`);
        } else {
          console.log('No products with missing cached images');
        }
      }
    } catch (e) {
      console.error('Stale image sweep error:', e);
    }

    // Trigger site rebuild only if anything actually changed
    if (totalSynced > 0 || categoryResult.synced > 0 || postResult.synced > 0 || staleFixed > 0) {
      // Verify product counts before rebuilding
      const verification = await verifyProductCounts(env);
      if (!verification.ok) {
        console.log(`REBUILD BLOCKED: ${verification.reason}`);
      } else {
        console.log(`Pre-rebuild verification passed: ${verification.reason}`);
        await env.PRODUCTS_KV.delete('last_rebuild');
        const rebuildResult = await triggerSiteRebuild(env);
        console.log(`Site rebuild: ${rebuildResult.reason}`);
      }
    } else {
      console.log('Nothing changed, skipping site rebuild.');
    }
  },
};
