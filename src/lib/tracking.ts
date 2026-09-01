// GA4 tracking pushes for the Astro storefront.
// Leads are pushed only once /api/contact has confirmed the submission, never on
// click, so the counts match the forms actually delivered.
// Spec: PLANS/HERCULES_TRACKING_EVENT_SPEC_2026_09_01.md §2 and §3

export type LeadType = 'contact' | 'express_delivery';

export interface Ga4Item {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity?: number;
  index?: number;
  item_list_id?: string;
  item_list_name?: string;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

// FR storefront. The UK port sends GBP.
const CURRENCY = 'EUR';

// The boutique lists 102 products and the whole array would ship on every page
// view, so list events carry the first slice only. Documented, not silent.
const LIST_ITEM_LIMIT = 30;

const pushed = new Set<LeadType>();

export function pushGenerateLead(leadType: LeadType): void {
  if (typeof window === 'undefined' || pushed.has(leadType)) return;
  pushed.add(leadType);
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'generate_lead', lead_type: leadType });
}

/**
 * item_id mirrors the WordPress purchase producer
 * (plugins/hercules-purchase-event.php:120-126): SKU when set, product id
 * otherwise. Same key on both sides or the funnel does not join in GA4.
 */
export function ga4ItemId(sku: string | null | undefined, productId: number | string): string {
  const s = (sku ?? '').trim();
  return s !== '' ? s : String(productId);
}

/**
 * Catalogue `price` is a placeholder (1,00 €) on 18 of the 102 products; the real
 * entry price is the lowest conditional tier. Falls back to `price` when a product
 * carries no tiers.
 */
export function lowestTierPrice(
  variations: Array<{ conditional_prices?: Array<{ qty: number | string; price: number | string }> }> | undefined,
  fallback?: number | string
): number | undefined {
  const tiers = (variations || []).flatMap((v) => v.conditional_prices || []);
  const prices = tiers
    .map((t) => (typeof t.price === 'number' ? t.price : parseFloat(String(t.price).replace(',', '.'))))
    .filter((p) => !isNaN(p) && p > 0);
  if (prices.length) return Math.min(...prices);
  const parsed = typeof fallback === 'number' ? fallback : parseFloat(String(fallback ?? '').replace(',', '.'));
  return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
}

export function pushEcommerce(event: string, ecommerce: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null }); // GTM reset, prevents item bleed between events
  window.dataLayer.push({ event, ecommerce: { currency: CURRENCY, ...ecommerce } });
}

function readItem(el: HTMLElement): Ga4Item | null {
  try {
    return JSON.parse(el.dataset.ga4Item || '') as Ga4Item;
  } catch {
    return null;
  }
}

function listContext(el: HTMLElement) {
  const list = el.closest<HTMLElement>('[data-ga4-list-id]');
  const item_list_id = list?.dataset.ga4ListId || '';
  return { item_list_id, item_list_name: list?.dataset.ga4ListName || item_list_id };
}

/**
 * One `view_item_list` per product grid on the page, plus `select_item` on any
 * card link click. Both read the payload the cards already carry in
 * `data-ga4-item`, so the grid markup stays the single source of truth.
 */
export function initListTracking(): void {
  if (typeof document === 'undefined') return;

  document.querySelectorAll<HTMLElement>('[data-ga4-list-id]').forEach((list) => {
    const { item_list_id, item_list_name } = listContext(list);
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-ga4-item]'))
      .slice(0, LIST_ITEM_LIMIT)
      .map((el): Ga4Item | null => {
        const item = readItem(el);
        if (!item) return null;
        return { ...item, index: Number(el.dataset.ga4Index ?? 0), item_list_id, item_list_name };
      })
      .filter((item): item is Ga4Item => item !== null);
    if (items.length) pushEcommerce('view_item_list', { item_list_id, item_list_name, items });
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Element | null;
    if (!target || target.closest('button')) return; // thumbnails and wishlist are not a selection
    const card = target.closest('a[href]')?.closest<HTMLElement>('[data-ga4-item]');
    if (!card) return;
    const item = readItem(card);
    if (!item) return;
    const { item_list_id, item_list_name } = listContext(card);
    pushEcommerce('select_item', {
      item_list_id,
      item_list_name,
      items: [{ ...item, index: Number(card.dataset.ga4Index ?? 0), item_list_id, item_list_name }],
    });
  });
}
