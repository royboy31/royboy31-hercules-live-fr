// GA4 tracking pushes for the Astro storefront.
// Leads are pushed only once /api/contact has confirmed the submission, never on
// click, so the counts match the forms actually delivered.
// Spec: PLANS/HERCULES_TRACKING_EVENT_SPEC_2026_09_01.md §2 and §3

// One value per enquiry surface: GTM reads `lead_type` and Emmanuel wants a single
// conversion pot with the surface kept as a dimension, not as separate actions.
// `quote_generator` is produced WordPress-side on the quote confirmation, not here;
// it is listed so the vocabulary has one definition.
export type LeadType =
  | 'contact_popup'
  | 'contact_page'
  | 'quantity_request'
  | 'express_delivery'
  | 'quote_generator';

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

// One accepted submission, one event. Every call site already sits behind the
// `/api/contact` success response, so a per-page-load cap would only drop a second
// genuine enquiry.
// Customer email for Google Ads enhanced conversions (tracking lot 2). Same rules as the WordPress
// quote and purchase pushes (mu-plugins/hercules-ads-email.php):
// - off for visitors until this switch is on;
// - a browser carrying the cookie hercules_ads_email_test=1 gets it regardless, for testing;
// - only when the visitor accepted marketing cookies (cmplz_marketing=allow);
// - trimmed and lower-cased, never hashed here (GTM does that for the Ads tags), and never stored.
const ADS_EMAIL_LIVE = true;

function hasCookie(pair: string): boolean {
  return ('; ' + document.cookie + ';').includes('; ' + pair + ';');
}

function adsUserData(email?: string): { email: string } | undefined {
  if (!ADS_EMAIL_LIVE && !hasCookie('hercules_ads_email_test=1')) return undefined;
  if (!hasCookie('cmplz_marketing=allow')) return undefined;
  const value = (email ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? { email: value } : undefined;
}

export function pushGenerateLead(leadType: LeadType, enquiryId?: string, email?: string): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  // Clear first, as the WordPress pushes do, so a value from an earlier push cannot ride along.
  window.dataLayer.push({ user_data: undefined, enquiry_id: undefined });
  window.dataLayer.push({
    event: 'generate_lead',
    lead_type: leadType,
    enquiry_id: enquiryId,
    user_data: adsUserData(email),
  });
}

// Tracking lot 3: the reference `/api/contact` returns for an accepted request
// (HER-{SITE}-{YYMMDD}-{6 chars}). Anything else, or an unreadable body, gives undefined:
// the lead is still counted, without a reference.
const ENQUIRY_REF_RE = /^HER-(?:FR|UK|DE|NL)-\d{6}-[A-Z0-9]{6}$/;

export async function enquiryIdFrom(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { enquiry_id?: unknown };
    return typeof body.enquiry_id === 'string' && ENQUIRY_REF_RE.test(body.enquiry_id)
      ? body.enquiry_id
      : undefined;
  } catch {
    return undefined;
  }
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
