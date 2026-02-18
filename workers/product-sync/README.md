# Hercules Product Sync Worker

This Cloudflare Worker syncs product data from the WooCommerce store to Cloudflare KV storage and R2 for the headless Astro frontend.

## Features

- **Daily Sync**: Automatically syncs all products daily at 3 AM UTC
- **Webhook Support**: Real-time updates when products change in WooCommerce
- **Image Sync**: Copies product images to R2 for faster delivery
- **REST API**: Exposes product data via a simple JSON API

## Setup

### Prerequisites

1. Cloudflare account with Workers, KV, and R2 enabled
2. WooCommerce REST API credentials
3. Wrangler CLI installed (`npm install -g wrangler`)

### 1. Create KV Namespace

```bash
wrangler kv:namespace create "PRODUCTS_KV"
wrangler kv:namespace create "PRODUCTS_KV" --preview
```

Update `wrangler.toml` with the namespace IDs returned.

### 2. Create R2 Bucket

```bash
wrangler r2 bucket create hercules-products
```

### 3. Set Secrets

```bash
# WooCommerce API credentials (get from WordPress Admin > WooCommerce > Settings > Advanced > REST API)
wrangler secret put WC_CONSUMER_KEY
wrangler secret put WC_CONSUMER_SECRET

# Webhook secret for securing endpoints
wrangler secret put WEBHOOK_SECRET
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Deploy

```bash
# Development
npm run dev

# Production
npm run deploy:production
```

## API Endpoints

### Products

- `GET /products` - Get product index (id, name, slug, categories)
- `GET /product/{id}` - Get product by ID
- `GET /product/{slug}` - Get product by slug
- `GET /search?q={query}` - Search products by name

### Categories

- `GET /categories` - Get all product categories

### Status

- `GET /status` - Get last sync timestamp

### Sync

- `POST /sync` - Trigger manual sync (requires Bearer token)
- `POST /webhook/product-update` - Webhook for WooCommerce product updates

## WooCommerce Webhook Setup

In WordPress Admin:
1. Go to WooCommerce > Settings > Advanced > Webhooks
2. Add new webhook:
   - Name: Product Sync
   - Status: Active
   - Topic: Product updated
   - Delivery URL: `https://hercules-product-sync.{your-account}.workers.dev/webhook/product-update`
   - Secret: Same as WEBHOOK_SECRET

## Data Structure

### Product Object

```json
{
  "id": 6721,
  "name": "Personalisierter HD-Fußballschal",
  "slug": "personalisierter-fussballschal",
  "type": "variable",
  "price": "4.50",
  "images": [
    {
      "id": 7418,
      "src": "https://wp-site.com/...",
      "local_src": "products/slug/0.png",
      "thumbnail": "...",
      "alt": "..."
    }
  ],
  "attributes": [
    {
      "id": 1,
      "name": "Format",
      "slug": "pa_format",
      "options": [
        { "value": "140-x-18-cm-standard", "label": "140 x 18 cm (standard)" }
      ]
    }
  ],
  "variations": [
    {
      "id": 6732,
      "attributes": { "format": "140-x-18-cm-standard", "farbe": "1-5-farben" },
      "price": "4.50"
    }
  ],
  "quantity_pricing": [
    { "min": 50, "max": 99, "discount_percent": 0 },
    { "min": 100, "max": 199, "discount_percent": 5 }
  ],
  "synced_at": "2024-01-01T00:00:00.000Z"
}
```

## Using in Astro

```typescript
// src/lib/products.ts
const WORKER_URL = 'https://hercules-product-sync.workers.dev';

export async function getProducts() {
  const res = await fetch(`${WORKER_URL}/products`);
  return res.json();
}

export async function getProduct(slug: string) {
  const res = await fetch(`${WORKER_URL}/product/${slug}`);
  if (!res.ok) return null;
  return res.json();
}

export async function searchProducts(query: string) {
  const res = await fetch(`${WORKER_URL}/search?q=${encodeURIComponent(query)}`);
  return res.json();
}
```

## Troubleshooting

### CORS Issues

The worker includes CORS headers for all origins. If you need to restrict:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://herculesde.pages.dev',
  // ...
};
```

### Missing Products

Check the KV namespace has data:
```bash
wrangler kv:key list --namespace-id=<your-kv-id>
```

### Sync Failures

Check worker logs:
```bash
wrangler tail
```

### Rate Limiting

WooCommerce may rate-limit API requests. The worker processes products sequentially with small delays. For large catalogs, consider batch processing.
