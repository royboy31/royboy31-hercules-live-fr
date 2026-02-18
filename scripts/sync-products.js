/**
 * Product Sync Script for Hercules Merchandise
 * Fetches products from WooCommerce REST API and saves to local JSON files
 *
 * Usage: node scripts/sync-products.js
 *
 * For now, uses the WooCommerce Store API (public, no auth required)
 * Later can be upgraded to use consumer key/secret for full API access
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  // Staging site URL
  siteUrl: 'https://staging.hercules-merchandise.de',

  // WooCommerce Store API (public, no auth needed)
  storeApiUrl: 'https://staging.hercules-merchandise.de/wp-json/wc/store/v1',

  // WooCommerce REST API v3 (requires auth for some endpoints)
  wcApiUrl: 'https://staging.hercules-merchandise.de/wp-json/wc/v3',

  // Output directory
  outputDir: join(__dirname, '..', 'src', 'data'),
};

// Fetch with error handling
async function fetchJSON(url, options = {}) {
  try {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Hercules-Astro-Sync/1.0',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

// Fetch all products using Store API (public)
async function fetchAllProducts() {
  const products = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const url = `${CONFIG.storeApiUrl}/products?per_page=${perPage}&page=${page}`;
    const data = await fetchJSON(url);

    if (!data || data.length === 0) break;

    products.push(...data);
    console.log(`  Fetched page ${page}: ${data.length} products`);

    if (data.length < perPage) break;
    page++;
  }

  return products;
}

// Fetch product categories
async function fetchCategories() {
  const url = `${CONFIG.storeApiUrl}/products/categories?per_page=100`;
  return await fetchJSON(url) || [];
}

// Transform Store API product to our format
function transformProduct(p) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    permalink: p.permalink,
    type: p.type || 'simple',
    featured: p.is_on_sale || false, // Store API doesn't have featured flag directly
    description: p.description || '',
    short_description: p.short_description || '',
    sku: p.sku || '',
    price: p.prices?.price ? (parseInt(p.prices.price) / 100).toFixed(2) : '0.00',
    regular_price: p.prices?.regular_price ? (parseInt(p.prices.regular_price) / 100).toFixed(2) : '0.00',
    sale_price: p.prices?.sale_price ? (parseInt(p.prices.sale_price) / 100).toFixed(2) : '',
    on_sale: p.prices?.price !== p.prices?.regular_price,
    currency: p.prices?.currency_code || 'EUR',
    stock_status: p.is_in_stock ? 'instock' : 'outofstock',
    categories: (p.categories || []).map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
    })),
    tags: (p.tags || []).map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
    })),
    images: (p.images || []).map(img => ({
      id: img.id,
      src: img.src,
      thumbnail: img.thumbnail,
      alt: img.alt || p.name,
    })),
    attributes: (p.attributes || []).map(attr => ({
      id: attr.id,
      name: attr.name,
      options: attr.terms?.map(t => t.name) || [],
    })),
    variations: p.variations || [],
    average_rating: p.average_rating || '0',
    review_count: p.review_count || 0,
  };
}

// Transform category
function transformCategory(c) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || '',
    count: c.count || 0,
    image: c.image ? {
      src: c.image.src,
      alt: c.image.alt || c.name,
    } : null,
    parent: c.parent || 0,
  };
}

// Save data to JSON file
function saveJSON(filename, data) {
  const filepath = join(CONFIG.outputDir, filename);
  mkdirSync(dirname(filepath), { recursive: true });
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`Saved: ${filepath}`);
}

// Main sync function
async function syncProducts() {
  console.log('========================================');
  console.log('Hercules Product Sync');
  console.log('========================================');
  console.log(`Source: ${CONFIG.siteUrl}`);
  console.log(`Output: ${CONFIG.outputDir}`);
  console.log('');

  // Fetch products
  console.log('Fetching products...');
  const rawProducts = await fetchAllProducts();
  console.log(`Total products fetched: ${rawProducts.length}`);

  if (rawProducts.length === 0) {
    console.log('No products found. Check if the site is accessible.');
    return;
  }

  // Transform products
  const products = rawProducts.map(transformProduct);

  // Fetch categories
  console.log('\nFetching categories...');
  const rawCategories = await fetchCategories();
  const categories = rawCategories.map(transformCategory);
  console.log(`Total categories fetched: ${categories.length}`);

  // Create main products file
  const productsData = {
    products,
    categories,
    synced_at: new Date().toISOString(),
    total_products: products.length,
    total_categories: categories.length,
    source: CONFIG.siteUrl,
  };
  saveJSON('products.json', productsData);

  // Create featured products file (products with images, sorted by ID desc for newest)
  const featuredProducts = products
    .filter(p => p.images.length > 0)
    .sort((a, b) => b.id - a.id)
    .slice(0, 12);

  saveJSON('featured.json', {
    products: featuredProducts,
    synced_at: new Date().toISOString(),
  });

  // Create category-specific files
  console.log('\nCreating category files...');
  mkdirSync(join(CONFIG.outputDir, 'categories'), { recursive: true });

  categories.forEach(cat => {
    const categoryProducts = products.filter(p =>
      p.categories.some(c => c.slug === cat.slug)
    );

    if (categoryProducts.length > 0) {
      saveJSON(`categories/${cat.slug}.json`, {
        category: cat,
        products: categoryProducts,
        synced_at: new Date().toISOString(),
      });
    }
  });

  // Summary
  console.log('\n========================================');
  console.log('Sync Complete!');
  console.log('========================================');
  console.log(`Products: ${products.length}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Featured: ${featuredProducts.length}`);
  console.log(`Synced at: ${new Date().toISOString()}`);
}

// Run sync
syncProducts().catch(console.error);
