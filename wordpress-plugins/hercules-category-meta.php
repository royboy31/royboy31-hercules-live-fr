<?php
/**
 * Plugin Name: Hercules Category Meta for REST API
 * Description: Exposes second_description term meta in WooCommerce REST API for category pages
 * Version: 1.0.0
 * Author: Pearl Web
 *
 * Upload this file to: wp-content/mu-plugins/hercules-category-meta.php
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Add second_description to WooCommerce Product Category REST API response
 */
add_filter('woocommerce_rest_prepare_product_cat', function($response, $item, $request) {
    $term_id = $item->term_id;

    // Get second_description from term meta
    $second_description = get_term_meta($term_id, 'second_description', true);

    // Add to response data
    $response->data['second_description'] = $second_description ?: null;

    return $response;
}, 10, 3);

/**
 * Also add to regular taxonomy REST API endpoint (if using /wp-json/wp/v2/product_cat)
 */
add_filter('rest_prepare_product_cat', function($response, $term, $request) {
    // Get second_description from term meta
    $second_description = get_term_meta($term->term_id, 'second_description', true);

    // Add to response data
    $response->data['second_description'] = $second_description ?: null;

    return $response;
}, 10, 3);
