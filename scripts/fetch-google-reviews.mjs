#!/usr/bin/env node
/**
 * Fetches live Google Maps rating and review count via Google's internal
 * preview endpoint (no headless browser or API key needed).
 *
 * Outputs to src/data/google-place-data.json for build-time consumption.
 *
 * Usage: node scripts/fetch-google-reviews.mjs
 */

import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = resolve(__dirname, '../src/data/google-place-data.json');

// Hercules Merchandise UK — Google Maps feature ID
const FTID = '0xa13b775f11fdb24d:0x93a56bc6631bafa4';
const MAPS_URL = 'https://www.google.com/maps/place//data=!4m7!3m6!1s0xa13b775f11fdb24d:0x93a56bc6631bafa4!8m2!3d47.73855!4d11.5749774!9m1!1b1';

// Fallback values if scraping fails
const FALLBACK = {
  rating: 4.9,
  reviewCount: 179,
  name: 'Hercules Merchandise UK',
  url: MAPS_URL,
  scrapedAt: null,
  source: 'fallback'
};

async function fetchGoogleReviews() {
  const endpoint = `https://www.google.com/maps/preview/place?authuser=0&hl=en&gl=uk&pb=!1m17!1s${encodeURIComponent(FTID)}!3m12!1m3!1d1000!2d-49.4022062!3d30.886403!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m2!3d30.886403!4d-49.4022062!8m5!1b1!2b1!3b1!4b1!5b1`;

  console.log('[GoogleReviews] Fetching from Google Maps preview endpoint...');

  const response = await fetch(endpoint, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-GB,en;q=0.9'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  let text = await response.text();

  // Strip the ")]}'" XSSI prefix
  const newlineIdx = text.indexOf('\n');
  if (newlineIdx !== -1 && text.slice(0, newlineIdx).includes(')]}')){
    text = text.slice(newlineIdx + 1);
  }

  const data = JSON.parse(text);

  // Extract from known positions in the response:
  //   [6][4][7]  = rating (float, e.g. 4.9)
  //   [6][37][1] = review count (int, e.g. 179)
  //   [6][11]    = business name
  //   [6][42]    = canonical Maps URL
  const placeData = data?.[6];
  if (!placeData) {
    throw new Error('Unexpected response structure: missing [6]');
  }

  const rating = placeData?.[4]?.[7];
  const reviewCount = placeData?.[37]?.[1];
  const name = placeData?.[11];
  const mapsUrl = placeData?.[42] || MAPS_URL;

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    throw new Error(`Invalid rating extracted: ${rating}`);
  }

  const result = {
    rating,
    reviewCount: typeof reviewCount === 'number' ? reviewCount : FALLBACK.reviewCount,
    name: name || FALLBACK.name,
    url: mapsUrl,
    scrapedAt: new Date().toISOString(),
    source: 'google-maps-preview'
  };

  console.log(`[GoogleReviews] Success: ${result.rating} stars from ${result.reviewCount} reviews`);
  return result;
}

// Main
let result;
try {
  result = await fetchGoogleReviews();
} catch (error) {
  console.error(`[GoogleReviews] Failed: ${error.message}`);
  console.warn('[GoogleReviews] Using fallback values');
  result = FALLBACK;
}

// Preserve static reviews text from google-reviews.json
let existingReviews = [];
try {
  const existing = JSON.parse(readFileSync(resolve(__dirname, '../src/data/google-reviews.json'), 'utf-8'));
  existingReviews = existing.reviews || [];
} catch {}

const output = {
  ...result,
  reviews: existingReviews
};

writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n');
console.log(`[GoogleReviews] Written to ${OUTPUT_FILE}`);
