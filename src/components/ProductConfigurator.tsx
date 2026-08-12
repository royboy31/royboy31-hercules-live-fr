import { useState, useEffect, useMemo } from 'react';
import QuantityRequestPopup from './QuantityRequestPopup';
import ExpressDeliveryPopup from './ExpressDeliveryPopup';
import ContactFormPopup from './ContactFormPopup';
import { cartStore } from '../lib/cartStore';
import { distributorStore } from '../lib/distributorStore';

// Types matching the API response
interface TermInfo {
  slug: string;
  name: string;
  description: string;
  desc_above: string;
  desc_below: string;
  thumbnail_id: number;
  thumbnail_url: string;
  icon_size?: string | null;
  icon_width?: number | null;
  icon_height?: number | null;
  icon_percent?: number | null;
}

interface AttributeData {
  terms: TermInfo[];
  display_type: 'dropdown' | 'image_selector' | 'select_boxes';
  display_title: string;
  display_description: string;
  enabled_if: string;
  enabled_if_value: string;
  minimum_qty: string;
  image_text_position: 'above' | 'next_to' | 'under';
  image_items_per_line: number;
  image_text_weight: 'normal' | 'medium' | 'bold';
  image_footer_text: string;
  image_icon_size?: 'small' | 'medium' | 'large' | 'custom' | 'full';
  image_icon_width?: number | null;
  image_icon_height?: number | null;
  image_icon_percent?: number | null;
}

interface AddonOption {
  name: string;
  image: string;
  price_table: Array<{ qty: number; price: number }>;
  icon_size?: string | null;
  icon_width?: number | null;
  icon_height?: number | null;
  icon_percent?: number | null;
}

interface AddonData {
  id: number;
  name: string;
  description?: string;
  display_type: 'dropdown' | 'image_selector' | 'select_boxes' | 'multiple_choise';
  parent_id: number;
  visible_if_option: string;
  options: AddonOption[];
  image_text_position?: 'above' | 'next_to' | 'under';
  image_items_per_line?: number;
  image_text_weight?: 'normal' | 'medium' | 'bold';
  image_footer_text?: string;
  image_icon_size?: 'small' | 'medium' | 'large' | 'custom' | 'full';
  image_icon_width?: number | null;
  image_icon_height?: number | null;
  image_icon_percent?: number | null;
}

interface VariationData {
  variation_id: number;
  attributes: Record<string, string>;
  display_price: number;
  display_regular_price: number;
  image: { url: string; alt: string } | null;
  is_in_stock: boolean;
  conditional_prices: Array<{ qty: number | string; price: number | string }>;
  lead_time: string;
}

interface ProductConfig {
  product_id: number;
  product_name: string;
  product_slug: string;
  attributes: Record<string, AttributeData>;
  addons: AddonData[];
  variations: VariationData[];
  currency_code: string;
  currency_symbol: string;
  currency_position: string;
  tax_percent: number;
  estimated_delivery_date: string;
  minimum_quantity: string;
  quote_page_url: string;
}

interface ProductConfiguratorProps {
  productSlug: string;
  workerUrl?: string;
}

// Helper to parse float safely (handles German comma decimal separator)
function parseFloatSafe(val: any): number {
  if (val === null || val === undefined) return 0;
  // Convert to string and replace comma with period for German number format
  const str = String(val).replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

// Get interpolated price from conditional_prices
function getInterpolatedPrice(conditionalPrices: Array<{ qty: number | string; price: number | string }>, quantity: number): number {
  if (!conditionalPrices || conditionalPrices.length === 0) return 0;

  const sorted = [...conditionalPrices]
    .map(cp => ({ qty: parseFloatSafe(cp.qty), price: parseFloatSafe(cp.price) }))
    .sort((a, b) => a.qty - b.qty);

  // Exact match
  const exact = sorted.find(t => t.qty === quantity);
  if (exact) return exact.price;

  // Interpolation
  let below: { qty: number; price: number } | null = null;
  let above: { qty: number; price: number } | null = null;

  for (const t of sorted) {
    if (t.qty < quantity) below = t;
    if (t.qty > quantity && !above) above = t;
  }

  if (below && above && above.qty !== below.qty) {
    const pA = below.price, pB = above.price;
    const qA = below.qty, qB = above.qty;
    return pA + ((pB - pA) * (quantity - qA)) / (qB - qA);
  }

  if (below) return below.price;
  if (above) return above.price;
  return sorted[0]?.price || 0;
}

// Get addon price for a specific tier qty (floor-based matching)
// Returns the addon price at a given tier quantity (not the custom quantity)
function getAddonPriceAtTierQty(addon: AddonData, selectedValue: string | string[], tierQty: number): number {
  if (!selectedValue) return 0;

  const selectedNames = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
  let total = 0;

  for (const name of selectedNames) {
    // Skip "Aucun" selection - it has no price
    if (['none', 'keine', 'aucun'].includes(name.toLowerCase())) continue;

    const option = addon.options.find(o => o.name === name);
    if (!option || !option.price_table || option.price_table.length === 0) continue;

    const sorted = [...option.price_table]
      .map(p => ({ qty: parseFloatSafe(p.qty), price: parseFloatSafe(p.price) }))
      .sort((a, b) => a.qty - b.qty);

    // Floor-based matching: find the highest qty threshold <= tierQty
    let priceToUse: number | null = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (tierQty >= sorted[i].qty) {
        priceToUse = sorted[i].price;
        break;
      }
    }

    if (priceToUse !== null) {
      total += priceToUse;
    }
  }

  return total;
}

// Get interpolated price with addons - WordPress style
// WordPress builds combined tiers (base + addon at each tier), then interpolates between those
function getInterpolatedPriceWithAddons(
  conditionalPrices: Array<{ qty: number | string; price: number | string }>,
  quantity: number,
  addons: AddonData[],
  selectedAddons: Record<number, string | string[]>
): number {
  if (!conditionalPrices || conditionalPrices.length === 0) return 0;

  // Build combined tiers: base price + addon prices at each tier qty
  const combinedTiers = conditionalPrices.map(cp => {
    const tierQty = parseFloatSafe(cp.qty);
    const basePrice = parseFloatSafe(cp.price);

    // Add addon prices for this tier qty
    let addonPrice = 0;
    for (const addon of addons) {
      if (selectedAddons[addon.id]) {
        addonPrice += getAddonPriceAtTierQty(addon, selectedAddons[addon.id], tierQty);
      }
    }

    return { qty: tierQty, price: basePrice + addonPrice };
  }).sort((a, b) => a.qty - b.qty);

  // Now interpolate using the combined tiers
  // Exact match
  const exact = combinedTiers.find(t => t.qty === quantity);
  if (exact) return exact.price;

  // Interpolation
  let below: { qty: number; price: number } | null = null;
  let above: { qty: number; price: number } | null = null;

  for (const t of combinedTiers) {
    if (t.qty < quantity) below = t;
    if (t.qty > quantity && !above) above = t;
  }

  if (below && above && above.qty !== below.qty) {
    const pA = below.price, pB = above.price;
    const qA = below.qty, qB = above.qty;
    return pA + ((pB - pA) * (quantity - qA)) / (qB - qA);
  }

  if (below) return below.price;
  if (above) return above.price;
  return combinedTiers[0]?.price || 0;
}

export default function ProductConfigurator({ productSlug, workerUrl = 'https://hercules-product-sync-fr-prod.gilles-86d.workers.dev' }: ProductConfiguratorProps) {
  const [config, setConfig] = useState<ProductConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step state
  const [maxVisibleStep, setMaxVisibleStep] = useState(0);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedAddons, setSelectedAddons] = useState<Record<number, string | string[]>>({});
  const [quantitySelected, setQuantitySelected] = useState(0);
  const [tempQuantity, setTempQuantity] = useState(50);
  const [showQuantityPopup, setShowQuantityPopup] = useState(false);
  const [showExpressPopup, setShowExpressPopup] = useState(false);
  const [showDeliveryTooltip, setShowDeliveryTooltip] = useState(false);
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [addToCartError, setAddToCartError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<'quote' | 'cart' | null>(null);
  const [productInCart, setProductInCart] = useState(false);

  // Track natural image sizes per attribute for proportional scaling
  const [imageSizes, setImageSizes] = useState<Record<string, Record<string, number>>>({}); // { attrKey: { termSlug: naturalWidth } }

  // Distributor discount
  const [distributorDiscount, setDistributorDiscount] = useState(0);

  // Check if any product is already in cart
  useEffect(() => {
    const checkCart = () => {
      const cart = cartStore.get();
      setProductInCart(cart.count > 0);
    };
    checkCart();
    return cartStore.subscribe(checkCart);
  }, []);

  // Read distributor discount from store and subscribe to changes
  useEffect(() => {
    setDistributorDiscount(distributorStore.get().discount);
    return distributorStore.onChange((data) => setDistributorDiscount(data.discount));
  }, []);

  // Fetch product config on mount (with retry for transient server errors)
  useEffect(() => {
    async function fetchConfig() {
      try {
        console.log('[ProductConfigurator] Fetching config for:', productSlug);
        const url = `https://hercules-merchandising.fr/wp-json/hercules/v1/product-config-by-slug/${productSlug}`;
        console.log('[ProductConfigurator] URL:', url);

        let response: Response | null = null;
        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          response = await fetch(url);
          console.log(`[ProductConfigurator] Attempt ${attempt}/${maxRetries} — status:`, response.status);
          if (response.ok) break;
          if (attempt < maxRetries) {
            console.warn(`[ProductConfigurator] Retrying in ${attempt * 1000}ms...`);
            await new Promise(r => setTimeout(r, attempt * 1000));
          }
        }

        if (!response || !response.ok) {
          const text = response ? await response.text() : 'No response';
          console.error('[ProductConfigurator] Error response:', text);
          throw new Error(`Failed to fetch product config: ${response?.status || 'unknown'}`);
        }

        const data = await response.json();
        console.log('[ProductConfigurator] Config loaded:', data.product_name);
        setConfig(data);

        // Set initial temp quantity from minimum
        const minQty = parseInt(data.minimum_quantity || '50', 10);
        setTempQuantity(minQty > 0 ? minQty : 50);

        // Auto-select default attributes and set initial step
        const allAttrKeys = Object.keys(data.attributes);
        const autoSelectedAttrs: Record<string, string> = {};
        let hasVisibleAttributes = false;

        allAttrKeys.forEach(key => {
          const attr = data.attributes[key];
          if (attr.terms.length === 1 && attr.terms[0].slug === 'default') {
            // Auto-select single default option
            autoSelectedAttrs[key] = 'default';
          } else {
            hasVisibleAttributes = true;
          }
        });

        if (Object.keys(autoSelectedAttrs).length > 0) {
          setSelectedAttributes(autoSelectedAttrs);
        }

        // If no visible attributes (all are defaults), expand quantity step immediately
        if (!hasVisibleAttributes) {
          // Set maxVisibleStep to quantity step index (which is 0 when no visible attributes)
          setMaxVisibleStep(0);
        }
      } catch (err) {
        console.error('[ProductConfigurator] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchConfig();
  }, [productSlug, workerUrl]);

  // Pre-load images to detect natural sizes for proportional scaling
  useEffect(() => {
    if (!config) return;
    let cancelled = false;

    Object.entries(config.attributes).forEach(([attrKey, attr]) => {
      if (attr.display_type !== 'image_selector') return;
      const termsWithImages = attr.terms.filter(t => t.thumbnail_url);
      if (termsWithImages.length < 2) return;

      termsWithImages.forEach(term => {
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          setImageSizes(prev => ({
            ...prev,
            [attrKey]: { ...(prev[attrKey] || {}), [term.slug]: img.naturalWidth }
          }));
        };
        img.src = term.thumbnail_url;
      });
    });

    return () => { cancelled = true; };
  }, [config]);

  // Compute proportional image height for a term within an attribute group
  const getProportionalHeight = (attrKey: string, termSlug: string, baseHeight: number = 48): number => {
    const attrSizes = imageSizes[attrKey];
    if (!attrSizes) return baseHeight;
    const widths = Object.values(attrSizes);
    if (widths.length < 2) return baseHeight;
    const minW = Math.min(...widths);
    const maxW = Math.max(...widths);
    if (maxW === minW) return baseHeight;
    const termW = attrSizes[termSlug];
    if (termW === undefined) return baseHeight;
    const minHeight = baseHeight * 0.55; // smallest image shows at 55% of base
    return minHeight + ((termW - minW) / (maxW - minW)) * (baseHeight - minHeight);
  };

  // Icon size presets and helpers
  const ICON_SIZE_PRESETS: Record<string, number> = { small: 32, medium: 48, large: 72 };

  const getIconBaseHeight = (iconSize?: string | null, iconHeight?: number | null): number => {
    if (iconSize === 'custom' && iconHeight && iconHeight > 0) return iconHeight;
    if (iconSize && ICON_SIZE_PRESETS[iconSize]) return ICON_SIZE_PRESETS[iconSize];
    return 48;
  };

  const getIconWidthStyle = (iconSize?: string | null, iconWidth?: number | null): Record<string, string> => {
    if (iconSize === 'custom' && iconWidth && iconWidth > 0) return { width: `${iconWidth}px` };
    return {};
  };

  // Resolve icon size: term-level overrides attribute-level
  const resolveTermIconSize = (term: TermInfo, attr: AttributeData) => {
    const size = term.icon_size || attr.image_icon_size || 'medium';
    const width = term.icon_size ? term.icon_width : attr.image_icon_width;
    const height = term.icon_size ? term.icon_height : attr.image_icon_height;
    return { size, width: width ?? null, height: height ?? null };
  };

  // Get final pixel height for an attribute term icon
  const getTermIconHeight = (attrKey: string, term: TermInfo, attr: AttributeData): number => {
    const { size, height } = resolveTermIconSize(term, attr);
    const baseH = getIconBaseHeight(size, height);
    if (term.icon_size) return baseH;  // fixed, no proportional scaling
    return getProportionalHeight(attrKey, term.slug, baseH);
  };

  // Get width style for an attribute term icon
  const getTermIconWidthStyle = (term: TermInfo, attr: AttributeData): Record<string, string> => {
    const { size, width } = resolveTermIconSize(term, attr);
    return getIconWidthStyle(size, width);
  };

  // Fill mode: the image is sized as a percentage of its option box instead of a
  // fixed pixel height, so it scales with the card. `bleed` cancels the card's 10px
  // padding at 100% so the image meets the borders (see .kd-image-selector-col).
  const CARD_PADDING = 10;

  const getFillStyle = (
    percent: number,
    bleed?: { sides?: boolean; top?: boolean; bottom?: boolean }
  ): Record<string, string> => {
    const pct = Math.min(Math.max(percent, 1), 100);
    const style: Record<string, string> = {
      width: `${pct}%`,
      height: 'auto',
      maxWidth: '100%',
      flexShrink: '0',
    };
    if (pct < 100 || !bleed?.sides) return style;
    const full = `calc(100% + ${CARD_PADDING * 2}px)`;
    style.width = full;
    style.maxWidth = full;
    style.marginLeft = `-${CARD_PADDING}px`;
    style.marginRight = `-${CARD_PADDING}px`;
    if (bleed.top) style.marginTop = `-${CARD_PADDING}px`;
    if (bleed.bottom) style.marginBottom = `-${CARD_PADDING}px`;
    return style;
  };

  // Specificity for both helpers below: term/option percent > term/option fixed size
  // > group percent > group fixed size.
  const getTermIconStyle = (
    attrKey: string,
    term: TermInfo,
    attr: AttributeData,
    bleed?: { sides?: boolean; top?: boolean; bottom?: boolean }
  ): Record<string, string> => {
    if (term.icon_percent && term.icon_percent > 0) return getFillStyle(term.icon_percent, bleed);
    if (!term.icon_size && attr.image_icon_percent && attr.image_icon_percent > 0) {
      return getFillStyle(attr.image_icon_percent, bleed);
    }
    return {
      height: `${getTermIconHeight(attrKey, term, attr)}px`,
      ...getTermIconWidthStyle(term, attr),
    };
  };

  const getAddonIconStyle = (
    option: AddonOption,
    addon: AddonData,
    bleed?: { sides?: boolean; top?: boolean; bottom?: boolean }
  ): Record<string, string> => {
    if (option.icon_percent && option.icon_percent > 0) return getFillStyle(option.icon_percent, bleed);
    if (!option.icon_size && addon.image_icon_percent && addon.image_icon_percent > 0) {
      return getFillStyle(addon.image_icon_percent, bleed);
    }
    const size = option.icon_size || addon.image_icon_size;
    const width = option.icon_size ? option.icon_width : addon.image_icon_width;
    const height = option.icon_size ? option.icon_height : addon.image_icon_height;
    return {
      height: `${getIconBaseHeight(size, height)}px`,
      ...getIconWidthStyle(size, width),
    };
  };

  // Get attribute keys (filtered for visibility)
  const attributeKeys = useMemo(() => {
    if (!config) return [];
    return Object.keys(config.attributes);
  }, [config]);

  // Get visible attribute keys (exclude single "default" attributes)
  const visibleAttributeKeys = useMemo(() => {
    if (!config) return [];
    return attributeKeys.filter(key => {
      const attr = config.attributes[key];
      // Hide attributes that only have a single "default" option
      return !(attr.terms.length === 1 && attr.terms[0].slug === 'default');
    });
  }, [config, attributeKeys]);

  // Get available terms for an attribute, filtered by what variations actually exist
  // given the already-selected attributes from prior steps
  const getAvailableTerms = (attrKey: string, visibleIndex: number): TermInfo[] => {
    if (!config) return [];
    const attr = config.attributes[attrKey];
    if (!attr) return attr?.terms || [];

    // Collect selected attributes from prior steps only
    const priorSelections: Record<string, string> = {};
    for (let i = 0; i < visibleIndex; i++) {
      const priorKey = visibleAttributeKeys[i];
      if (selectedAttributes[priorKey]) {
        priorSelections[priorKey] = selectedAttributes[priorKey];
      }
    }

    // If no prior selections, show all terms
    if (Object.keys(priorSelections).length === 0) return attr.terms;

    // Filter terms to only those that have at least one matching variation
    return attr.terms.filter(term => {
      return config.variations.some(v => {
        // Check this term matches
        const normalizedAttrKey = attrKey.replace('attribute_', '');
        const variationValue = v.attributes[attrKey] || v.attributes[`attribute_${normalizedAttrKey}`] || v.attributes[normalizedAttrKey];
        if (variationValue !== term.slug) return false;

        // Check all prior selections match
        return Object.entries(priorSelections).every(([priorKey, priorValue]) => {
          const normalizedPriorKey = priorKey.replace('attribute_', '');
          const vVal = v.attributes[priorKey] || v.attributes[`attribute_${normalizedPriorKey}`] || v.attributes[normalizedPriorKey];
          return vVal === priorValue;
        });
      });
    });
  };

  // Check if an attribute should be visible based on enabled_if conditions
  const isAttributeVisible = (attrKey: string, index: number): boolean => {
    if (!config) return false;
    if (index === 0) return true; // First attribute is always visible

    const attr = config.attributes[attrKey];
    if (!attr.enabled_if || !attr.enabled_if_value) return true;

    // Find the controlling attribute
    const controllingKey = attributeKeys.find(k => k.includes(attr.enabled_if));
    if (!controllingKey) return true;

    return selectedAttributes[controllingKey] === attr.enabled_if_value;
  };

  // Get visible addons based on selection hierarchy
  const visibleAddons = useMemo(() => {
    if (!config || config.addons.length === 0) return [];

    const visible: AddonData[] = [];

    config.addons
      .filter(a => a.parent_id === 0)
      .forEach(parent => {
        // Only include addon if it has valid options array
        if (Array.isArray(parent.options) && parent.options.length > 0) {
          visible.push(parent);
        }

        // Find child if parent selection matches visible_if_option
        const child = config.addons.find(
          a => a.parent_id === parent.id && selectedAddons[parent.id] === a.visible_if_option
        );

        if (child && Array.isArray(child.options) && child.options.length > 0) {
          visible.push(child);

          // Find grandchild
          const grandchild = config.addons.find(
            a => a.parent_id === child.id && selectedAddons[child.id] === a.visible_if_option
          );

          if (grandchild && Array.isArray(grandchild.options) && grandchild.options.length > 0) {
            visible.push(grandchild);
          }
        }
      });

    return visible;
  }, [config, selectedAddons]);

  // Find matching variation based on selected attributes
  const matchedVariation = useMemo(() => {
    if (!config) return null;

    return config.variations.find(v => {
      return Object.entries(v.attributes).every(([key, value]) => {
        const normalizedKey = key.replace('attribute_', '');
        const selectedValue = selectedAttributes[key] || selectedAttributes[`attribute_${normalizedKey}`] || selectedAttributes[normalizedKey];
        return selectedValue === value;
      });
    }) || null;
  }, [config, selectedAttributes]);

  // Calculate quantity range — adjusts min based on selected addon price_table minimums
  const quantityRange = useMemo(() => {
    const prices = matchedVariation?.conditional_prices;
    if (!prices?.length) {
      return { min: 50, max: 500 };
    }

    const qtys = prices.map(p => parseFloatSafe(p.qty));
    let minQty = Math.min(...qtys);
    let maxQty = Math.max(...qtys);

    // Raise minimum based on selected addon price_table minimums
    // e.g. "Woven patch" starts at qty 100, so min becomes 100
    for (const addon of visibleAddons) {
      const selected = selectedAddons[addon.id];
      if (!selected) continue;
      const selectedNames = Array.isArray(selected) ? selected : [selected];
      for (const name of selectedNames) {
        if (['none', 'keine', 'aucun'].includes(name.toLowerCase())) continue;
        const option = addon.options.find(o => o.name === name);
        if (option && Array.isArray(option.price_table) && option.price_table.length > 0) {
          const firstQty = parseFloatSafe(option.price_table[0].qty);
          if (firstQty > 0) {
            minQty = Math.max(minQty, firstQty);
          }
          const lastQty = parseFloatSafe(option.price_table[option.price_table.length - 1].qty);
          if (lastQty > 0) {
            maxQty = Math.max(maxQty, lastQty);
          }
        }
      }
    }

    return { min: minQty, max: maxQty };
  }, [matchedVariation, config, visibleAddons, selectedAddons]);

  // Reset quantity when addon changes push the minimum above current selection
  useEffect(() => {
    if (quantitySelected > 0 && quantitySelected < quantityRange.min) {
      setQuantitySelected(0);
      setTempQuantity(quantityRange.min);
    } else if (tempQuantity < quantityRange.min) {
      setTempQuantity(quantityRange.min);
    }
  }, [quantityRange.min]);

  // Calculate final price - uses WordPress combined-tier interpolation
  const priceInfo = useMemo(() => {
    if (!matchedVariation || quantitySelected <= 0) return null;

    // Use combined-tier interpolation (WordPress style)
    // Round to 2 decimal places to match displayed price
    const originalPricePerPiece = Math.round(getInterpolatedPriceWithAddons(
      matchedVariation.conditional_prices,
      quantitySelected,
      visibleAddons,
      selectedAddons
    ) * 100) / 100;

    // Apply distributor discount if applicable
    const pricePerPiece = distributorDiscount > 0
      ? Math.round(originalPricePerPiece * (1 - distributorDiscount / 100) * 100) / 100
      : originalPricePerPiece;

    const totalExclVat = Math.round(pricePerPiece * quantitySelected * 100) / 100;
    const taxMultiplier = config && config.tax_percent > 0 ? 1 + (config.tax_percent / 100) : 1.20;
    const totalInclVat = Math.round(totalExclVat * taxMultiplier * 100) / 100;

    // Original totals (before discount) for strikethrough display
    const originalTotalExclVat = Math.round(originalPricePerPiece * quantitySelected * 100) / 100;
    const originalTotalInclVat = Math.round(originalTotalExclVat * taxMultiplier * 100) / 100;

    return {
      originalPricePerPiece,
      pricePerPiece,
      totalExclVat,
      totalInclVat,
      originalTotalExclVat,
      originalTotalInclVat,
      leadTime: matchedVariation.lead_time || '5 Weeks',
    };
  }, [matchedVariation, quantitySelected, visibleAddons, selectedAddons, config, distributorDiscount]);

  // Handle attribute selection
  const handleAttributeSelect = (attrKey: string, value: string, stepIndex: number) => {
    setSelectedAttributes(prev => {
      const next = { ...prev, [attrKey]: value };
      // Clear downstream attribute selections when a prior attribute changes
      for (let i = stepIndex + 1; i < visibleAttributeKeys.length; i++) {
        delete next[visibleAttributeKeys[i]];
      }
      return next;
    });
    // Reset quantity when attributes change
    setQuantitySelected(0);
    setMaxVisibleStep(stepIndex + 1);
  };

  // Handle addon selection
  const handleAddonSelect = (addonId: number, value: string | string[], stepIndex: number) => {
    setSelectedAddons(prev => ({ ...prev, [addonId]: value }));
    setMaxVisibleStep(stepIndex + 1);
  };

  // Handle quantity confirmation - confirms quantity and advances to next step
  const handleQuantityConfirm = () => {
    if (tempQuantity >= quantityRange.min && tempQuantity <= quantityRange.max) {
      setQuantitySelected(tempQuantity);
      setMaxVisibleStep(visibleAttributeKeys.length + visibleAddons.length + 1);
    }
  };

  // Calculate addon price per piece for the current quantity (floor-based for tier display)
  const getAddonPricePerPiece = (qty: number): number => {
    let total = 0;
    for (const addon of visibleAddons) {
      const selectedValue = selectedAddons[addon.id];
      if (selectedValue) {
        total += getAddonPriceAtTierQty(addon, selectedValue, qty);
      }
    }
    return total;
  };

  // Add to cart function - calls WordPress AJAX endpoint
  const handleAddToCart = async (redirectTo: 'cart' | 'quote') => {
    if (!matchedVariation || !config || quantitySelected <= 0) return;

    setAddToCartLoading(true);
    setAddToCartError(null);
    setLoadingAction(redirectTo);

    try {
      // Calculate prices using combined-tier interpolation (WordPress style)
      const finalPricePerPiece = getInterpolatedPriceWithAddons(
        matchedVariation.conditional_prices,
        quantitySelected,
        visibleAddons,
        selectedAddons
      );
      const addonPricePerPiece = getAddonPricePerPiece(quantitySelected);

      // Addon values are already in French ("Aucun" etc.), no translation needed
      const translatedAddons: Record<number, string | string[]> = {};
      for (const [id, value] of Object.entries(selectedAddons)) {
        translatedAddons[Number(id)] = value;
      }

      // Prepare data for Hercules Cart API (REST endpoint, no nonce required)
      const cartData = {
        product_id: config.product_id,
        variation_id: matchedVariation.variation_id,
        quantity: quantitySelected,
        price_num: finalPricePerPiece,
        addons: translatedAddons,
        addonsPricePerpiece: addonPricePerPiece,
        minQty: quantityRange.min,
        ...(distributorDiscount > 0 && { distributor_discount: distributorDiscount }),
      };

      // Call Hercules Cart REST API endpoint
      const response = await fetch('/wp-json/hercules/v1/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartData),
        credentials: 'include', // Important for session cookies
      });

      const result = await response.json();

      if (result.success) {
        // Update cart in localStorage
        if (result.cart) {
          // Full cart data from API - save to localStorage
          cartStore.set(result.cart);
        } else {
          // Fallback: increment cart count locally
          cartStore.incrementCount(1);
        }

        // Small delay to let user see the cart update, then redirect
        setTimeout(() => {
          if (redirectTo === 'quote') {
            window.location.href = config.quote_page_url || '/generateur-de-devis/';
          } else {
            window.location.href = '/panier/';
          }
        }, 500);
      } else {
        const errorMsg = result.message || 'Une erreur est survenue';
        setAddToCartError(typeof errorMsg === 'string' ? errorMsg : 'Une erreur est survenue');
        setAddToCartLoading(false);
        setLoadingAction(null);
      }
    } catch (error) {
      console.error('[ProductConfigurator] Add to cart error:', error);
      setAddToCartError('Une erreur est survenue. Veuillez réessayer.');
      setAddToCartLoading(false);
      setLoadingAction(null);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div id="pearl-wc-steps-form">
        <div className="pearl-step-indicator">
          {/* Not a heading: loading text must stay out of the document outline */}
          <p className="pearl-loading-text">Chargement...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !config) {
    return (
      <div id="pearl-wc-steps-form">
        <div className="pearl-step-indicator">
          <h2>Erreur de chargement de la configuration</h2>
          {error && <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '10px' }}>{error}</p>}
          <p style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>Slug: {productSlug}</p>
        </div>
      </div>
    );
  }

  // Decode HTML entities like &euro; to actual symbols
  const decodeHtmlEntity = (str: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
  };
  const currencySymbol = decodeHtmlEntity(config.currency_symbol) || '€';
  // Use visibleAttributeKeys for step counting (excludes hidden default attributes)
  const totalSteps = visibleAttributeKeys.length + visibleAddons.length + 1; // +1 for quantity
  const quantityStepIndex = visibleAttributeKeys.length + visibleAddons.length;
  const minQuantity = parseInt(config.minimum_quantity || '50', 10);

  // Check if all selections are complete for add to cart
  const allAttributesSelected = attributeKeys.every(key => selectedAttributes[key]);
  // For multiple_choise addons, user must select at least one option (including "Aucun")
  const allAddonsSelected = visibleAddons.every(addon => {
    const value = selectedAddons[addon.id];
    if (addon.display_type === 'multiple_choise') {
      // Multiple choice requires at least one checkbox selected (including 'none')
      return Array.isArray(value) && value.length > 0;
    }
    return !!value;
  });
  const canAddToCart = allAttributesSelected && allAddonsSelected && quantitySelected > 0 && matchedVariation;

  // Calculate current visible step number (excluding hidden default attributes)
  const currentStepNum = Math.min(maxVisibleStep + 1, totalSteps);

  return (
    <>
    <div id="pearl-wc-steps-form" className="pearl-wc-steps-form">
      {/* Step indicator - matches WordPress exactly */}
      <div className="pearl-step-indicator">
        <h2>OBTENEZ UN DEVIS</h2>
        <span className="pearl-step-counter">ÉTAPE {currentStepNum} SUR {totalSteps}</span>
        <span className="pearl-min-qty-badge">À PARTIR DE {minQuantity} PCS</span>
      </div>

      {/* Attribute Steps - Only render visible attributes (excludes single default options) */}
      {visibleAttributeKeys.map((attrKey, visibleIndex) => {
        if (!isAttributeVisible(attrKey, visibleIndex)) return null;

        const attr = config.attributes[attrKey];
        const availableTerms = getAvailableTerms(attrKey, visibleIndex);
        const isExpanded = maxVisibleStep === visibleIndex;
        const selectedValue = selectedAttributes[attrKey];
        const isCompleted = !!selectedValue;

        const stepClass = `pearl-step ${isExpanded ? '' : 'collapsed'} ${isCompleted && !isExpanded ? 'selected' : ''}`.trim();
        const stepNumber = visibleIndex + 1;

        return (
          <div key={attrKey} className={stepClass} onClick={!isExpanded && isCompleted ? () => setMaxVisibleStep(visibleIndex) : undefined}>
            <h3>
              {!isExpanded && isCompleted ? (
                <>
                  <div className="kd-prod-attribute-title-wrapper">
                    <span>{stepNumber}: {attr.display_title || attrKey.replace('pa_', '')}</span>
                  </div>
                  <span className="kd-selected-val">{availableTerms.find(t => t.slug === selectedValue)?.name || selectedValue}</span>
                  <button type="button" className="kd-selected-chng-btn" onClick={(e) => { e.stopPropagation(); setMaxVisibleStep(visibleIndex); }}>
                    Modifier
                  </button>
                </>
              ) : (
                <div className="kd-prod-attribute-title-wrapper">
                  <span>{stepNumber}: {attr.display_title || attrKey.replace('pa_', '')}</span>
                </div>
              )}
            </h3>

            {isExpanded && (
              <div className="kd-step-collapse">
                {attr.display_description && <p style={{ marginBottom: '10px', color: '#666' }}>{attr.display_description}</p>}

                {/* Image Selector */}
                {attr.display_type === 'image_selector' && (() => {
                  const textPos = attr.image_text_position || 'next_to';
                  const perLine = attr.image_items_per_line || 3;
                  const textWeight = attr.image_text_weight || 'medium';
                  const weightMap: Record<string, number> = { normal: 400, medium: 500, bold: 700 };
                  const gapPx = 20;
                  const colWidth = `calc((100% - ${(perLine - 1) * gapPx}px) / ${perLine})`;
                  const isVertical = textPos === 'above' || textPos === 'under';

                  return (
                    <div className="kd-image-selector" style={{ display: 'flex', flexFlow: 'row wrap', gap: `${gapPx}px` }}>
                      {availableTerms.map(term => (
                        <div
                          key={term.slug}
                          className={`kd-image-selector-col kd-img-sel-${textPos}`}
                          onClick={() => handleAttributeSelect(attrKey, term.slug, visibleIndex)}
                          style={{
                            border: selectedValue === term.slug ? '2px solid #469ADC' : '1px solid #ccc',
                            background: selectedValue === term.slug ? '#e6f0fa' : '#fff',
                            padding: '10px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isVertical ? 'center' : 'stretch',
                            width: colWidth,
                            textAlign: isVertical ? 'center' : undefined,
                          }}
                        >
                          {textPos === 'next_to' ? (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div className="kd-image-selector-title" style={{ fontWeight: weightMap[textWeight] || 500 }}>{term.name}</div>
                                {term.thumbnail_url && (
                                  <img src={term.thumbnail_url} alt={term.name} style={{ objectFit: 'contain', marginLeft: '5px', ...getTermIconStyle(attrKey, term, attr) }} />
                                )}
                              </div>
                              {term.desc_above && (
                                <div className="kd-image-selector-desc kd-image-selector-desc-above" dangerouslySetInnerHTML={{ __html: term.desc_above }} />
                              )}
                              {term.desc_below && (
                                <div className="kd-image-selector-desc kd-image-selector-desc-below" dangerouslySetInnerHTML={{ __html: term.desc_below }} />
                              )}
                            </>
                          ) : (
                            <>
                              <div className="kd-image-selector-title" style={{ fontWeight: weightMap[textWeight] || 500 }}>{term.name}</div>
                              {term.desc_above && (
                                <div className="kd-image-selector-desc kd-image-selector-desc-above" dangerouslySetInnerHTML={{ __html: term.desc_above }} />
                              )}
                              {term.thumbnail_url && (
                                <img src={term.thumbnail_url} alt={term.name} style={{ objectFit: 'contain', margin: '6px 0', ...getTermIconStyle(attrKey, term, attr, { sides: isVertical, bottom: isVertical && !term.desc_below }) }} />
                              )}
                              {term.desc_below && (
                                <div className="kd-image-selector-desc kd-image-selector-desc-below" dangerouslySetInnerHTML={{ __html: term.desc_below }} />
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {attr.display_type === 'image_selector' && attr.image_footer_text && (
                  <div className="kd-image-selector-desc kd-image-selector-footer" dangerouslySetInnerHTML={{ __html: attr.image_footer_text }} />
                )}

                {/* Dropdown */}
                {attr.display_type === 'dropdown' && (
                  <select
                    value={selectedValue || ''}
                    onChange={e => handleAttributeSelect(attrKey, e.target.value, visibleIndex)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
                  >
                    <option value="">Sélectionner une option</option>
                    {availableTerms.map(term => (
                      <option key={term.slug} value={term.slug}>{term.name}</option>
                    ))}
                  </select>
                )}

                {/* Select Boxes */}
                {attr.display_type === 'select_boxes' && (
                  <div className="box-selector" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {availableTerms.map(term => (
                      <div
                        key={term.slug}
                        className="box-selector-item"
                        onClick={() => handleAttributeSelect(attrKey, term.slug, visibleIndex)}
                        style={{
                          cursor: 'pointer',
                          border: selectedValue === term.slug ? '2px solid #469ADC' : '1px solid #ddd',
                          padding: '10px',
                          borderRadius: '10px',
                          width: '31%',
                          background: selectedValue === term.slug ? '#e6f0fa' : '#fff',
                        }}
                      >
                        <strong>{term.name}</strong>
                        {term.description && <p style={{ fontSize: '12px', marginTop: '5px' }}>{term.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Addon Steps */}
      {visibleAddons.map((addon, addonIndex) => {
        const stepIndex = visibleAttributeKeys.length + addonIndex;
        const isExpanded = maxVisibleStep === stepIndex;
        const selectedValue = selectedAddons[addon.id];
        const isCompleted = !!selectedValue;

        const stepClass = `pearl-step ${isExpanded ? '' : 'collapsed'} ${isCompleted && !isExpanded ? 'selected' : ''}`.trim();
        const displayStepNum = stepIndex + 1;

        return (
          <div key={`addon_${addon.id}`} className={stepClass} onClick={!isExpanded && isCompleted ? () => setMaxVisibleStep(stepIndex) : undefined}>
            <h3>
              {!isExpanded && isCompleted ? (
                <>
                  <div className="kd-prod-attribute-title-wrapper">
                    <span>{displayStepNum}: {addon.name}</span>
                  </div>
                  <span className="kd-selected-val">{Array.isArray(selectedValue) ? selectedValue.join(', ') : selectedValue}</span>
                  <button type="button" className="kd-selected-chng-btn" onClick={(e) => { e.stopPropagation(); setMaxVisibleStep(stepIndex); }}>
                    Modifier
                  </button>
                </>
              ) : (
                <div className="kd-prod-attribute-title-wrapper">
                  <span>{displayStepNum}: {addon.name}</span>
                </div>
              )}
            </h3>

            {isExpanded && (
              <div className="kd-step-collapse">
                {addon.description && <p style={{ marginBottom: '10px', color: '#666' }}>{addon.description}</p>}

                {/* Image Selector for addons with dynamic settings */}
                {addon.display_type === 'image_selector' && Array.isArray(addon.options) && (() => {
                  const textPos = addon.image_text_position || 'next_to';
                  const perLine = addon.image_items_per_line || 3;
                  const textWeight = addon.image_text_weight || 'medium';
                  const weightMap: Record<string, number> = { normal: 400, medium: 500, bold: 700 };
                  const gapPx = 20;
                  const colWidth = `calc((100% - ${(perLine - 1) * gapPx}px) / ${perLine})`;
                  const isVertical = textPos === 'above' || textPos === 'under';

                  return (
                    <div className="kd-image-selector" style={{ display: 'flex', flexFlow: 'row wrap', gap: `${gapPx}px` }}>
                      {addon.options.map(option => (
                        <div
                          key={option.name}
                          className={`kd-image-selector-col kd-img-sel-${textPos}`}
                          onClick={() => handleAddonSelect(addon.id, option.name, stepIndex)}
                          style={{
                            border: selectedValue === option.name ? '2px solid #469ADC' : '1px solid #ccc',
                            background: selectedValue === option.name ? '#e6f0fa' : '#fff',
                            padding: '10px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: isVertical ? 'column' : 'row',
                            justifyContent: isVertical ? 'center' : 'space-between',
                            alignItems: 'center',
                            width: colWidth,
                            textAlign: isVertical ? 'center' : undefined,
                          }}
                        >
                          {textPos === 'above' && (
                            <>
                              <div className="kd-image-selector-title" style={{ fontWeight: weightMap[textWeight] || 500 }}>{option.name}</div>
                              {option.image && (
                                <img src={option.image} alt={option.name} style={{ objectFit: 'contain', marginTop: '6px', ...getAddonIconStyle(option, addon, { sides: true, bottom: true }) }} />
                              )}
                            </>
                          )}
                          {textPos === 'next_to' && (
                            <>
                              <div className="kd-image-selector-title" style={{ fontWeight: weightMap[textWeight] || 500 }}>{option.name}</div>
                              {option.image && (
                                <img src={option.image} alt={option.name} style={{ objectFit: 'contain', marginLeft: '5px', ...getAddonIconStyle(option, addon) }} />
                              )}
                            </>
                          )}
                          {textPos === 'under' && (
                            <>
                              {option.image && (
                                <img src={option.image} alt={option.name} style={{ objectFit: 'contain', marginBottom: '6px', ...getAddonIconStyle(option, addon, { sides: true, top: true }) }} />
                              )}
                              <div className="kd-image-selector-title" style={{ fontWeight: weightMap[textWeight] || 500 }}>{option.name}</div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {addon.display_type === 'image_selector' && addon.image_footer_text && (
                  <div className="kd-image-selector-desc kd-image-selector-footer" dangerouslySetInnerHTML={{ __html: addon.image_footer_text }} />
                )}

                {/* Dropdown for addons */}
                {addon.display_type === 'dropdown' && Array.isArray(addon.options) && (
                  <select
                    value={typeof selectedValue === 'string' ? selectedValue : ''}
                    onChange={e => handleAddonSelect(addon.id, e.target.value, stepIndex)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd' }}
                  >
                    <option value="">Sélectionner une option</option>
                    {addon.options.map(option => (
                      <option key={option.name} value={option.name}>{option.name}</option>
                    ))}
                  </select>
                )}

                {/* Multiple Choice (checkboxes) for addons like Zubehör - auto-advances on selection */}
                {addon.display_type === 'multiple_choise' && Array.isArray(addon.options) && (() => {
                  const currentSelected = Array.isArray(selectedValue) ? selectedValue : (selectedValue ? [selectedValue] : []);
                  // Detect the "none" option dynamically from DB (first option is typically None/Keine/Aucun)
                  const noneOption = addon.options.find(o => ['none', 'keine', 'aucun'].includes(o.name.toLowerCase()));
                  const noneName = noneOption ? noneOption.name : '';
                  const isNoneChecked = noneName ? currentSelected.includes(noneName) : false;

                  const handleCheckboxChange = (value: string, checked: boolean) => {
                    let newSelected: string[];
                    if (noneName && value === noneName) {
                      // "None" clears all other selections and advances immediately
                      newSelected = checked ? [noneName] : [];
                    } else {
                      // Remove none option if selecting an actual option
                      const withoutNone = noneName ? currentSelected.filter(v => v !== noneName) : currentSelected;
                      if (checked) {
                        newSelected = [...withoutNone, value];
                      } else {
                        newSelected = withoutNone.filter(v => v !== value);
                      }
                    }
                    // Update selection and advance to next step immediately
                    setSelectedAddons(prev => ({ ...prev, [addon.id]: newSelected }));
                    if (newSelected.length > 0) {
                      setMaxVisibleStep(stepIndex + 1);
                    }
                  };

                  return (
                    <div className="kd-step-choises">
                      {addon.options.map((option, index) => {
                        const isChecked = option.name === noneName ? isNoneChecked : currentSelected.includes(option.name);
                        return (
                          <label key={index} style={{ display: 'block', marginBottom: '8px' }}>
                            <input
                              type="checkbox"
                              name={String(addon.id)}
                              value={option.name}
                              checked={isChecked}
                              onChange={(e) => handleCheckboxChange(option.name, e.target.checked)}
                              style={{ marginRight: '8px' }}
                            />
                            {option.name}
                          </label>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Select Boxes for addons */}
                {addon.display_type === 'select_boxes' && Array.isArray(addon.options) && (
                  <div className="box-selector" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {addon.options.map(option => (
                      <div
                        key={option.name}
                        className="box-selector-item"
                        onClick={() => handleAddonSelect(addon.id, option.name, stepIndex)}
                        style={{
                          cursor: 'pointer',
                          border: selectedValue === option.name ? '2px solid #469ADC' : '1px solid #ddd',
                          padding: '10px',
                          borderRadius: '10px',
                          width: '31%',
                          background: selectedValue === option.name ? '#e6f0fa' : '#fff',
                        }}
                      >
                        <strong>{option.name}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Quantity Step - Always show */}
      {(matchedVariation || config.variations?.length > 0) && (
        <div
          className={`pearl-step ${maxVisibleStep === quantityStepIndex ? '' : 'collapsed'} ${quantitySelected > 0 && maxVisibleStep !== quantityStepIndex ? 'selected' : ''}`.trim()}
          onClick={maxVisibleStep !== quantityStepIndex && quantitySelected > 0 ? () => setMaxVisibleStep(quantityStepIndex) : undefined}
        >
          <h3>
            {maxVisibleStep !== quantityStepIndex && quantitySelected > 0 ? (
              <>
                <div className="kd-prod-attribute-title-wrapper">
                  <span>{quantityStepIndex + 1}: Votre quantité</span>
                </div>
                <span className="kd-selected-val">{quantitySelected}</span>
                <button type="button" className="kd-selected-chng-btn" onClick={(e) => { e.stopPropagation(); setMaxVisibleStep(quantityStepIndex); }}>
                  Modifier
                </button>
              </>
            ) : (
              <div className="kd-prod-attribute-title-wrapper">
                <span>{quantityStepIndex + 1}: Choisissez votre quantité</span>
              </div>
            )}
          </h3>

          {maxVisibleStep === quantityStepIndex && (
            <div className="kd-step-collapse">
              {/* Quantity tier options — filtered by addon minimum qty */}
              {(matchedVariation?.conditional_prices || [])
                .filter(tier => parseFloatSafe(tier.qty) >= quantityRange.min)
                .map((tier, idx, filteredTiers) => {
                const tierQty = parseFloatSafe(tier.qty);
                const tierPrice = parseFloatSafe(tier.price);

                // Calculate addon price for this tier (exact tier qty, so floor-based is correct)
                let addonPrice = 0;
                for (const addon of visibleAddons) {
                  if (selectedAddons[addon.id]) {
                    addonPrice += getAddonPriceAtTierQty(addon, selectedAddons[addon.id], tierQty);
                  }
                }
                const totalPrice = tierPrice + addonPrice;
                // Distributor discount applied to this qty-tier option row
                const discountedTotalPrice = distributorDiscount > 0
                  ? Math.round(totalPrice * (1 - distributorDiscount / 100) * 100) / 100
                  : totalPrice;

                // Calculate savings percentage vs first visible tier
                const firstTier = filteredTiers[0];
                const firstTierQty = parseFloatSafe(firstTier.qty);
                const firstPrice = parseFloatSafe(firstTier.price) + (visibleAddons.reduce((sum, addon) =>
                  sum + (selectedAddons[addon.id] ? getAddonPriceAtTierQty(addon, selectedAddons[addon.id], firstTierQty) : 0), 0));
                const savings = firstPrice > 0 ? Math.round((1 - totalPrice / firstPrice) * 100) : 0;

                return (
                  <label key={idx} className="kd-radio-option">
                    <div>
                      <input
                        type="radio"
                        name="qty_option"
                        checked={quantitySelected === tierQty}
                        onChange={() => {
                          setQuantitySelected(tierQty);
                          setTempQuantity(tierQty);
                          setMaxVisibleStep(quantityStepIndex + 1);
                        }}
                      />
                      <span>{tierQty}</span>
                    </div>
                    <div className="kd-radio-meta">
                      {savings > 0 && (
                        <span className="save">Économisez {savings}%</span>
                      )}
                      {distributorDiscount > 0 ? (
                        <span>
                          <s style={{ color: '#999', marginRight: '4px' }}>{totalPrice.toFixed(2).replace('.', ',')} {currencySymbol}</s>
                          <span style={{ color: '#10C99E', fontWeight: 700 }}>{discountedTotalPrice.toFixed(2).replace('.', ',')} {currencySymbol}</span>
                        </span>
                      ) : (
                        <span>{totalPrice.toFixed(2).replace('.', ',')} {currencySymbol}</span>
                      )}
                    </div>
                  </label>
                );
              })}

              {/* Max quantity+ Contact option */}
              <label className="kd-radio-option kd-contact-option">
                <div>
                  <input
                    type="radio"
                    name="qty_option"
                    checked={false}
                    onChange={() => {}}
                  />
                  <span>{quantityRange.max}+</span>
                </div>
                <div className="kd-radio-meta kd-contact-meta">
                  <button type="button" className="step-contact" onClick={() => setShowQuantityPopup(true)}>
                    NOUS CONTACTER
                  </button>
                </div>
              </label>

              {/* Custom quantity slider */}
              <div className="range-wrapper">
                <h4 className="specific-qty-title">Ou choisissez une quantité spécifique</h4>

                <div className="kd-range-slider-container">
                  <div
                    className="kd-qty-display"
                    style={{
                      left: `calc(${((tempQuantity - quantityRange.min) / (quantityRange.max - quantityRange.min)) * 100}% + ${8 - ((tempQuantity - quantityRange.min) / (quantityRange.max - quantityRange.min)) * 16}px)`
                    }}
                  >{tempQuantity}</div>
                  <input
                    type="range"
                    min={quantityRange.min}
                    max={quantityRange.max}
                    value={tempQuantity}
                    onChange={e => setTempQuantity(parseInt(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, #253461 0%, #253461 ${((tempQuantity - quantityRange.min) / (quantityRange.max - quantityRange.min)) * 100}%, #E3E3E3 ${((tempQuantity - quantityRange.min) / (quantityRange.max - quantityRange.min)) * 100}%, #E3E3E3 100%)`,
                    }}
                  />
                  {/* Tick marks - positioned at exact value percentages */}
                  <div className="kd-range-ticks">
                    {Array.from({ length: 11 }, (_, i) => {
                      const tickValue = Math.round(quantityRange.min + (i * (quantityRange.max - quantityRange.min) / 10));
                      // Calculate the exact position for this tick value
                      const tickPosition = ((tickValue - quantityRange.min) / (quantityRange.max - quantityRange.min)) * 100;
                      return (
                        <span
                          key={i}
                          className="kd-qty-range-price-tooltip"
                          style={{
                            position: 'absolute',
                            left: `${tickPosition}%`,
                            transform: 'translateX(-50%)'
                          }}
                        >
                          {tickValue}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="kd-qty-controls">
                  <input
                    type="number"
                    className="kd-qty-input"
                    min={quantityRange.min}
                    max={quantityRange.max}
                    value={tempQuantity}
                    onChange={e => setTempQuantity(parseInt(e.target.value) || quantityRange.min)}
                  />
                  <button type="button" className="kd-round-btn" onClick={() => setTempQuantity(prev => Math.min(quantityRange.max, prev + 1))}>+</button>
                  <button type="button" className="kd-round-btn" onClick={() => setTempQuantity(prev => Math.max(quantityRange.min, prev - 1))}>-</button>
                  {tempQuantity > quantityRange.max ? (
                    <button type="button" className="kd-verify-qty-btn kd-qty-warning-btn" onClick={() => setShowQuantityPopup(true)}>
                      CONTACTEZ-NOUS
                    </button>
                  ) : (
                    <button type="button" className="kd-verify-qty-btn" onClick={handleQuantityConfirm}>
                      CONFIRMER
                    </button>
                  )}
                </div>
                {tempQuantity > quantityRange.max && (
                  <p className="kd-qty-warning">
                    Pour cette quantité, veuillez nous contacter et nous vous préparerons un devis personnalisé.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {priceInfo && quantitySelected > 0 && (
        <div className="variation-summary">
          <h3 className="your-offer-title">{quantityStepIndex + 2}. Votre offre</h3>
          <table className="offer-table">
            <tbody>
              <tr>
                <td>Livraison en France</td>
                <td className="kd-free-value">Gratuit</td>
              </tr>
              <tr>
                <td>Frais de mise en place</td>
                <td className="kd-free-value">Gratuit</td>
              </tr>
              <tr>
                <td>Prix tout compris par pièce</td>
                <td className="kd-price-value">
                  {distributorDiscount > 0 ? (
                    <>
                      <s style={{ color: '#999', marginRight: '6px' }}>{priceInfo.originalPricePerPiece.toFixed(2).replace('.', ',')} {currencySymbol}</s>
                      {priceInfo.pricePerPiece.toFixed(2).replace('.', ',')} {currencySymbol} (HT)
                    </>
                  ) : (
                    <>{priceInfo.pricePerPiece.toFixed(2).replace('.', ',')} {currencySymbol} (HT)</>
                  )}
                </td>
              </tr>
              {distributorDiscount > 0 && (
                <tr style={{ color: '#10C99E', fontWeight: 600 }}>
                  <td style={{ color: '#10C99E' }}>Remise revendeur ({distributorDiscount}%)</td>
                  <td className="kd-discount-value" style={{ color: '#10C99E', fontWeight: 600 }}>
                    -{(priceInfo.originalTotalExclVat - priceInfo.totalExclVat).toFixed(2).replace('.', ',')} {currencySymbol}
                  </td>
                </tr>
              )}
              <tr>
                <td>Total (HT)</td>
                <td className="kd-total-value">
                  {distributorDiscount > 0 && (
                    <s style={{ color: '#999', marginRight: '6px' }}>{priceInfo.originalTotalExclVat.toFixed(2).replace('.', ',')} {currencySymbol}</s>
                  )}
                  {priceInfo.totalExclVat.toFixed(2).replace('.', ',')} {currencySymbol}
                </td>
              </tr>
              <tr>
                <td>Total (TTC)</td>
                <td>
                  {distributorDiscount > 0 && (
                    <s style={{ color: '#999', marginRight: '6px' }}>{priceInfo.originalTotalInclVat.toFixed(2).replace('.', ',')} {currencySymbol}</s>
                  )}
                  {priceInfo.totalInclVat.toFixed(2).replace('.', ',')} {currencySymbol}
                </td>
              </tr>
              <tr>
                <td className="kd-lieferzeit-cell">
                  Délai de livraison
                  <span
                    className="kd-tooltip-trigger"
                    onMouseEnter={() => setShowDeliveryTooltip(true)}
                    onMouseLeave={() => setShowDeliveryTooltip(false)}
                  >
                    ?
                    {showDeliveryTooltip && (
                      <span className="kd-tooltip-content">
                        Le délai de livraison commence après validation du design et réception du paiement. Pour une livraison express, veuillez nous contacter.
                      </span>
                    )}
                  </span>
                </td>
                <td>
                  <span className="kd-delivery-content">
                    {config.estimated_delivery_date && <span>{config.estimated_delivery_date}<br/></span>}
                    <span>{priceInfo.leadTime}</span>
                  </span>
                  <span className="kd-express-link-wrapper">
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); setShowExpressPopup(true); }}
                      className="kd-express-link"
                    >
                      J'ai besoin d'une livraison urgente
                    </a>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Action Buttons */}
      <div className="kd-action-btns-wrapper">
        {addToCartError && (
          <div className="kd-error-message" style={{
            width: '100%',
            padding: '12px 16px',
            marginBottom: '15px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {addToCartError}
          </div>
        )}
        <div className="kd-single-action-btn">
          <button
            type="button"
            disabled={!canAddToCart || addToCartLoading}
            onClick={() => handleAddToCart('quote')}
          >
            {addToCartLoading && <span className="kd-btn-spinner"></span>}
            {addToCartLoading ? 'En cours...' : productInCart ? 'Ajoutez au devis' : 'Créer un devis'}
          </button>
          <small>Nous vous enverrons un PDF</small>
        </div>
        <div className="kd-single-action-btn">
          <button
            type="button"
            disabled={!canAddToCart || addToCartLoading}
            onClick={() => handleAddToCart('cart')}
          >
            {addToCartLoading && <span className="kd-btn-spinner"></span>}
            {addToCartLoading ? 'En cours...' : 'Ajouter au panier'}
          </button>
          <small>Lorsque vous êtes prêt à commander</small>
        </div>
      </div>

      {/* Quantity Request Popup */}
      <QuantityRequestPopup
        isOpen={showQuantityPopup}
        onClose={() => setShowQuantityPopup(false)}
        productId={config.product_id}
        productName={config.product_name}
        selectedAttributes={selectedAttributes}
        selectedAddons={selectedAddons}
        maxQuantity={quantitySelected || tempQuantity}
        config={config}
      />

      {/* Express Delivery Popup */}
      {showExpressPopup && (
        <ExpressDeliveryPopup
          isOpen={showExpressPopup}
          onClose={() => setShowExpressPopup(false)}
          productId={config.product_id}
          productName={config.product_name}
          selectedAttributes={selectedAttributes}
          selectedAddons={selectedAddons}
          quantity={quantitySelected || tempQuantity}
          pricePerPiece={priceInfo?.pricePerPiece || 0}
          currentLeadTime={priceInfo?.leadTime || ''}
          config={config}
        />
      )}

      {/* Loading Overlay - covers only the configurator */}
      {addToCartLoading && (
        <div className="kd-loading-overlay">
          <div className="kd-loading-content">
            <div className="kd-loading-spinner"></div>
            <p className="kd-loading-text">
              {loadingAction === 'quote'
                ? 'Création de votre devis...'
                : 'Ajout au panier...'}
            </p>
            <p className="kd-loading-subtext">Veuillez patienter</p>
          </div>
        </div>
      )}
    </div>

    {/* Question Section */}
    <div className="kd-question-box">
      <h3>VOUS AVEZ UNE QUESTION ?</h3>
      <div className="kd-question-buttons">
        <ContactFormPopup
          triggerType="button"
          triggerText="NOUS CONTACTER"
          triggerClassName="kd-btn-contact"
        />
        <a href="#faq" className="kd-btn-faq" onClick={(e) => {
          e.preventDefault();
          const faqSection = document.getElementById('faq');
          if (faqSection) {
            faqSection.scrollIntoView({ behavior: 'smooth' });
          }
        }}>VOIR LA FAQ</a>
      </div>
    </div>

    {/* Vision Section */}
    <div className="kd-vision-section">
      <div className="kd-vision-images">
        <picture>
          <source media="(max-width: 768px)" srcSet="/images/design/design-mockup-mobile.webp" width="220" height="284" />
          <img src="/images/design/design-mockup.webp" alt="Design de merchandising personnalisé" width="494" height="637" loading="lazy" decoding="async" />
        </picture>
      </div>
      <div className="kd-vision-content">
        <h3>DONNEZ VIE À VOTRE VISION <span style={{ color: '#469ADC' }}>OBTENEZ UN DESIGN GRATUIT !</span></h3>
        <a
          href="#tab-design"
          className="kd-btn-design"
          onClick={(e) => {
            e.preventDefault();
            const designRadio = document.getElementById('radio-design') as HTMLInputElement;
            if (designRadio) {
              designRadio.checked = true;
              designRadio.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        >ACCÉDER À LA SECTION DESIGN</a>
      </div>
    </div>
    </>
  );
}
