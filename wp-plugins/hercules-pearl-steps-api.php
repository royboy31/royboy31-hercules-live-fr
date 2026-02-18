<?php
/**
 * Plugin Name: Hercules Pearl Steps API
 * Description: Exposes Pearl WC Steps Variation data via REST API for headless Astro frontend
 * Version: 1.0.0
 * Author: Hercules Development
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function() {
    // Get full product configuration data for the steps form
    register_rest_route('hercules/v1', 'product-config/(?P<id>\d+)', [
        'methods' => 'GET',
        'callback' => 'hercules_get_product_config',
        'permission_callback' => '__return_true',
        'args' => [
            'id' => [
                'validate_callback' => function($param) {
                    return is_numeric($param);
                }
            ]
        ]
    ]);

    // Get product config by slug
    register_rest_route('hercules/v1', 'product-config-by-slug/(?P<slug>[a-zA-Z0-9-]+)', [
        'methods' => 'GET',
        'callback' => 'hercules_get_product_config_by_slug',
        'permission_callback' => '__return_true',
    ]);
});

/**
 * Get product configuration data by slug
 */
function hercules_get_product_config_by_slug($request) {
    $slug = $request->get_param('slug');

    // Find product by slug using get_page_by_path (more reliable)
    $product_post = get_page_by_path($slug, OBJECT, 'product');

    if (!$product_post) {
        return new WP_Error('not_found', 'Product not found', ['status' => 404]);
    }

    $product = wc_get_product($product_post->ID);

    if (!$product) {
        return new WP_Error('not_found', 'Product not found', ['status' => 404]);
    }

    return hercules_build_product_config($product);
}

/**
 * Get product configuration data by ID
 */
function hercules_get_product_config($request) {
    $product_id = (int) $request->get_param('id');
    $product = wc_get_product($product_id);

    if (!$product) {
        return new WP_Error('not_found', 'Product not found', ['status' => 404]);
    }

    return hercules_build_product_config($product);
}

/**
 * Build the complete product configuration data
 */
function hercules_build_product_config($product) {
    if (!$product || !$product->is_type('variable')) {
        return new WP_Error('invalid_product', 'Product must be a variable product', ['status' => 400]);
    }

    $product_id = $product->get_id();

    // =====================
    // 1. Build Attributes
    // =====================
    $variation_attributes = $product->get_variation_attributes();
    $registered_attrs = wc_get_attribute_taxonomies();
    $merged_attributes = [];

    foreach ($variation_attributes as $slug => $term_slugs_array) {
        $raw_taxonomy = str_replace('attribute_', '', $slug);

        // Default values
        $display_type = 'dropdown';
        $display_title = '';
        $display_description = '';
        $enabled_if = '';
        $enabled_if_value = '';
        $minimum_qty = '';

        // Find attribute settings
        foreach ($registered_attrs as $attr_obj) {
            if ('pa_' . $attr_obj->attribute_name === $raw_taxonomy) {
                $attribute_id = $attr_obj->attribute_id;
                $display_type = get_option("wc_attribute_display_type_{$attribute_id}", 'dropdown');
                $display_title = get_option("wc_attribute_display_title_{$attribute_id}", '');
                $display_description = get_option("wc_attribute_description_{$attribute_id}", '');
                $enabled_if = get_post_meta($product_id, 'attribute_enabled_if_pa_' . $attr_obj->attribute_name, true);
                $enabled_if_value = get_post_meta($product_id, 'attribute_enabled_if_value_pa_' . $attr_obj->attribute_name, true);
                $minimum_qty = get_post_meta($product_id, 'attribute_minimum_qty_pa_' . $attr_obj->attribute_name, true);
                break;
            }
        }

        // Build term info array
        $terms_info = [];
        $taxonomy_name = $raw_taxonomy;

        foreach ($term_slugs_array as $single_term_slug) {
            $term_obj = get_term_by('slug', $single_term_slug, $taxonomy_name);

            if (!$term_obj || is_wp_error($term_obj)) {
                $terms_info[] = [
                    'slug' => $single_term_slug,
                    'name' => $single_term_slug,
                    'description' => '',
                    'thumbnail_id' => 0,
                    'thumbnail_url' => '',
                ];
                continue;
            }

            $thumbnail_id = get_term_meta($term_obj->term_id, 'thumbnail_id', true);
            $thumbnail_url = '';
            if ($thumbnail_id) {
                $thumbnail_url = wp_get_attachment_image_url($thumbnail_id, 'full');
            }

            $terms_info[] = [
                'slug' => $single_term_slug,
                'name' => $term_obj->name,
                'description' => $term_obj->description,
                'thumbnail_id' => $thumbnail_id ? (int) $thumbnail_id : 0,
                'thumbnail_url' => $thumbnail_url ?: '',
            ];
        }

        $merged_attributes[$slug] = [
            'terms' => $terms_info,
            'display_type' => $display_type,
            'display_title' => $display_title,
            'display_description' => $display_description,
            'enabled_if' => $enabled_if ?: '',
            'enabled_if_value' => $enabled_if_value ?: '',
            'minimum_qty' => $minimum_qty ?: '',
        ];
    }

    // =====================
    // 2. Build Addons
    // =====================
    $addon_data = [];
    $allowed_parent_ids = get_post_meta($product_id, '_product_allowed_addon_ids', true) ?: [];
    if (!is_array($allowed_parent_ids)) $allowed_parent_ids = [];

    if (!empty($allowed_parent_ids)) {
        $all_terms = get_terms([
            'taxonomy' => 'product_addons',
            'hide_empty' => false,
            'orderby' => 'name',
            'hierarchical' => true,
        ]);

        $term_lookup = [];
        if (!is_wp_error($all_terms)) {
            foreach ($all_terms as $term) {
                $term_lookup[$term->term_id] = $term;
            }
        }

        $product_addon_meta = get_post_meta($product_id, '_product_addon_options', true) ?: [];

        foreach ($allowed_parent_ids as $parent_id) {
            if (!isset($term_lookup[$parent_id])) continue;
            $parent = $term_lookup[$parent_id];

            $parent_options = $product_addon_meta[$parent->term_id]['options'] ?? [];
            $parent_visible_if = $product_addon_meta[$parent->term_id]['visible_if_option'] ?? '';

            $addon_data[] = [
                'id' => $parent->term_id,
                'name' => $parent->name,
                'display_type' => get_term_meta($parent->term_id, 'addon_display', true) ?: 'dropdown',
                'parent_id' => 0,
                'visible_if_option' => $parent_visible_if,
                'options' => array_map(function($opt) {
                    return [
                        'name' => $opt['name'] ?? '',
                        'image' => $opt['image'] ?? '',
                        'price_table' => $opt['price_table'] ?? [],
                    ];
                }, $parent_options)
            ];

            // Add children
            $children = array_filter($all_terms, function($t) use ($parent_id) {
                return $t->parent == $parent_id;
            });
            usort($children, fn($a, $b) => strcasecmp($a->name, $b->name));

            foreach ($children as $child) {
                $child_options = $product_addon_meta[$child->term_id]['options'] ?? [];
                $child_visible_if = $product_addon_meta[$child->term_id]['visible_if_option'] ?? '';

                $addon_data[] = [
                    'id' => $child->term_id,
                    'name' => $child->name,
                    'display_type' => get_term_meta($child->term_id, 'addon_display', true) ?: 'dropdown',
                    'parent_id' => $parent_id,
                    'visible_if_option' => $child_visible_if,
                    'options' => array_map(function($opt) {
                        return [
                            'name' => $opt['name'] ?? '',
                            'image' => $opt['image'] ?? '',
                            'price_table' => $opt['price_table'] ?? [],
                        ];
                    }, $child_options)
                ];
            }
        }
    }

    // =====================
    // 3. Build Variations
    // =====================
    $variations = $product->get_available_variations();
    $variations_data = [];

    foreach ($variations as $v) {
        $vid = isset($v['variation_id']) ? (int) $v['variation_id'] : 0;

        $variations_data[] = [
            'variation_id' => $vid,
            'attributes' => $v['attributes'] ?? [],
            'display_price' => $v['display_price'] ?? 0,
            'display_regular_price' => $v['display_regular_price'] ?? 0,
            'image' => $v['image'] ?? null,
            'is_in_stock' => $v['is_in_stock'] ?? true,
            'conditional_prices' => $vid ? (get_post_meta($vid, '_conditional_prices', true) ?: []) : [],
            'lead_time' => $vid ? (get_post_meta($vid, '_lead_time', true) ?: '5 Wochen') : '5 Wochen',
        ];
    }

    // =====================
    // 4. Currency & Tax
    // =====================
    $currency = get_woocommerce_currency();
    $currency_sym = get_woocommerce_currency_symbol();
    $currency_pos = get_option('woocommerce_currency_pos');

    // Get DE tax rate
    $rates = WC_Tax::find_rates([
        'country' => 'DE',
        'state' => '',
        'postcode' => '',
        'city' => '',
        'tax_class' => '',
        'shipping' => false,
    ]);

    $tax_percent = 0.0;
    if (!empty($rates)) {
        $first = reset($rates);
        $tax_percent = (float) $first['rate'];
    }

    // =====================
    // 5. Other Settings
    // =====================
    $estimated_date = get_post_meta($product_id, '_estimated_delivery_date', true) ?: '';
    $minimum_quantity = function_exists('get_field') ? get_field('minimum_quantity', $product_id) : '';

    // Build response
    return new WP_REST_Response([
        'product_id' => $product_id,
        'product_name' => $product->get_name(),
        'product_slug' => $product->get_slug(),
        'attributes' => $merged_attributes,
        'addons' => $addon_data,
        'variations' => $variations_data,
        'currency_code' => $currency,
        'currency_symbol' => $currency_sym,
        'currency_position' => $currency_pos,
        'tax_percent' => $tax_percent,
        'estimated_delivery_date' => $estimated_date,
        'minimum_quantity' => $minimum_quantity,
        'quote_page_url' => '/quote-generator/',
    ], 200);
}
