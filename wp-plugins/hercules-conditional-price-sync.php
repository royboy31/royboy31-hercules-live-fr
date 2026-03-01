<?php
/**
 * Plugin Name: Hercules Conditional Price Sync
 * Description: Syncs WooCommerce _price/_regular_price meta with the starting (lowest-qty) conditional price
 *              so that product feeds (Google Merchant Center, etc.) show real prices instead of the €1 placeholder.
 * Version: 1.0.0
 * Author: Hercules Development
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * When _conditional_prices meta is saved on a variation, update _price and _regular_price
 * to the first tier's price (lowest quantity = starting price).
 */
add_action('updated_post_meta', 'hercules_sync_conditional_price', 10, 4);
add_action('added_post_meta', 'hercules_sync_conditional_price', 10, 4);

function hercules_sync_conditional_price($meta_id, $post_id, $meta_key, $meta_value) {
    if ($meta_key !== '_conditional_prices') {
        return;
    }

    if (get_post_type($post_id) !== 'product_variation') {
        return;
    }

    $starting_price = hercules_get_starting_conditional_price($meta_value);
    if ($starting_price === null) {
        return;
    }

    // Prevent infinite loop — unhook before updating
    remove_action('updated_post_meta', 'hercules_sync_conditional_price', 10);
    remove_action('added_post_meta', 'hercules_sync_conditional_price', 10);

    update_post_meta($post_id, '_price', $starting_price);
    update_post_meta($post_id, '_regular_price', $starting_price);

    // Re-sync parent product min/max prices
    $parent_id = wp_get_post_parent_id($post_id);
    if ($parent_id) {
        hercules_update_parent_price_range($parent_id);
    }

    add_action('updated_post_meta', 'hercules_sync_conditional_price', 10, 4);
    add_action('added_post_meta', 'hercules_sync_conditional_price', 10, 4);
}

/**
 * Get the starting price (first tier / lowest qty) from conditional_prices array.
 */
function hercules_get_starting_conditional_price($conditional_prices) {
    if (!is_array($conditional_prices) || empty($conditional_prices)) {
        return null;
    }

    // Sort by qty ascending to find the lowest-qty tier (= starting price)
    usort($conditional_prices, function($a, $b) {
        return (int)$a['qty'] - (int)$b['qty'];
    });

    $first_tier = reset($conditional_prices);
    if (isset($first_tier['price']) && $first_tier['price'] > 0) {
        return (string) $first_tier['price'];
    }

    return null;
}

/**
 * Recalculate parent product's _price, _min_variation_price, _max_variation_price
 * based on all its variations' _price values.
 */
function hercules_update_parent_price_range($parent_id) {
    $product = wc_get_product($parent_id);
    if (!$product || !$product->is_type('variable')) {
        return;
    }

    $variation_ids = $product->get_children();
    $min_price = PHP_FLOAT_MAX;
    $max_price = 0;

    foreach ($variation_ids as $vid) {
        $price = (float) get_post_meta($vid, '_price', true);
        if ($price > 0) {
            if ($price < $min_price) $min_price = $price;
            if ($price > $max_price) $max_price = $price;
        }
    }

    if ($min_price < PHP_FLOAT_MAX) {
        update_post_meta($parent_id, '_price', (string) $min_price);
        update_post_meta($parent_id, '_min_variation_price', (string) $min_price);
        update_post_meta($parent_id, '_max_variation_price', (string) $max_price);
        update_post_meta($parent_id, '_min_variation_regular_price', (string) $min_price);
        update_post_meta($parent_id, '_max_variation_regular_price', (string) $max_price);

        // Clear WooCommerce transient caches for this product
        delete_transient('wc_var_prices_' . $parent_id);
        wc_delete_product_transients($parent_id);
    }
}

/**
 * REST endpoint to run a one-time migration of all variation prices.
 * Call: POST /wp-json/hercules/v1/sync-conditional-prices?secret=YOUR_SECRET
 */
add_action('rest_api_init', function() {
    register_rest_route('hercules/v1', 'sync-conditional-prices', [
        'methods' => 'POST',
        'callback' => 'hercules_migrate_all_conditional_prices',
        'permission_callback' => function($request) {
            $secret = $request->get_param('secret');
            return $secret === 'hercules-price-sync-2026';
        },
    ]);
});

function hercules_migrate_all_conditional_prices($request) {
    global $wpdb;
    $prefix = $wpdb->prefix;

    // Find all variations with _conditional_prices
    $results = $wpdb->get_results(
        "SELECT pm.post_id, pm.meta_value, p.post_parent
         FROM {$prefix}postmeta pm
         INNER JOIN {$prefix}posts p ON pm.post_id = p.ID
         WHERE p.post_type = 'product_variation'
           AND pm.meta_key = '_conditional_prices'
           AND pm.meta_value != ''
           AND pm.meta_value IS NOT NULL"
    );

    $updated = 0;
    $skipped = 0;
    $parent_ids = [];
    $details = [];

    foreach ($results as $row) {
        $conditional_prices = maybe_unserialize($row->meta_value);
        $starting_price = hercules_get_starting_conditional_price($conditional_prices);

        if ($starting_price === null) {
            $skipped++;
            continue;
        }

        $old_price = get_post_meta($row->post_id, '_price', true);
        update_post_meta($row->post_id, '_price', $starting_price);
        update_post_meta($row->post_id, '_regular_price', $starting_price);
        $updated++;

        $details[] = [
            'variation_id' => (int) $row->post_id,
            'parent_id' => (int) $row->post_parent,
            'old_price' => $old_price,
            'new_price' => $starting_price,
        ];

        if ($row->post_parent) {
            $parent_ids[$row->post_parent] = true;
        }
    }

    // Update parent product price ranges
    $parents_updated = 0;
    foreach (array_keys($parent_ids) as $parent_id) {
        hercules_update_parent_price_range($parent_id);
        $parents_updated++;
    }

    return new WP_REST_Response([
        'success' => true,
        'variations_updated' => $updated,
        'variations_skipped' => $skipped,
        'parents_updated' => $parents_updated,
        'details' => $details,
    ], 200);
}
