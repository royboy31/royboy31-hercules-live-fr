<?php
/**
 * Plugin Name: Hercules Missive-Only Products
 * Description: Adds a "Missive Only" checkbox to products. Missive-only products are hidden
 *              from the website (WooCommerce shop, Astro via sync worker) but remain accessible
 *              via REST API for Missive CRM and are still open for quotes/purchases.
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// ─── 1. Add "Missive Only" checkbox to product General tab ───

add_action( 'woocommerce_product_options_general_product_data', function () {
    woocommerce_wp_checkbox( [
        'id'          => '_missive_only',
        'label'       => 'Missive uniquement',
        'description' => 'Masquer ce produit du site web (Astro + WooCommerce). Il restera visible dans Missive et ouvert aux devis.',
        'desc_tip'    => true,
    ] );
} );

// Save the checkbox value
add_action( 'woocommerce_process_product_meta', function ( $post_id ) {
    $value = isset( $_POST['_missive_only'] ) ? 'yes' : 'no';
    update_post_meta( $post_id, '_missive_only', $value );
} );

// ─── 2. Expose _missive_only in WooCommerce REST API ───

add_action( 'rest_api_init', function () {
    register_rest_field( 'product', 'missive_only', [
        'get_callback' => function ( $product ) {
            return get_post_meta( $product['id'], '_missive_only', true ) === 'yes';
        },
        'schema' => [
            'type'        => 'boolean',
            'description' => 'Whether this product is only visible in Missive',
        ],
    ] );
} );

// ─── 3. Hide from WooCommerce frontend queries (shop, search, categories) ───

add_action( 'woocommerce_product_query', function ( $q ) {
    // Don't filter in admin or REST API requests
    if ( is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) return;

    $meta_query = $q->get( 'meta_query' ) ?: [];
    $meta_query[] = [
        'relation' => 'OR',
        [
            'key'     => '_missive_only',
            'value'   => 'yes',
            'compare' => '!=',
        ],
        [
            'key'     => '_missive_only',
            'compare' => 'NOT EXISTS',
        ],
    ];
    $q->set( 'meta_query', $meta_query );
} );

// Also hide from WooCommerce search widget and shortcodes
add_filter( 'woocommerce_shortcode_products_query', function ( $query_args ) {
    if ( is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) return $query_args;

    $query_args['meta_query'] = $query_args['meta_query'] ?? [];
    $query_args['meta_query'][] = [
        'relation' => 'OR',
        [
            'key'     => '_missive_only',
            'value'   => 'yes',
            'compare' => '!=',
        ],
        [
            'key'     => '_missive_only',
            'compare' => 'NOT EXISTS',
        ],
    ];
    return $query_args;
} );

// ─── 4. Show indicator in admin product list ───

add_filter( 'manage_product_posts_columns', function ( $columns ) {
    $new = [];
    foreach ( $columns as $key => $label ) {
        $new[ $key ] = $label;
        if ( $key === 'name' ) {
            $new['missive_only'] = 'Missive';
        }
    }
    return $new;
} );

add_action( 'manage_product_posts_custom_column', function ( $column, $post_id ) {
    if ( $column === 'missive_only' ) {
        echo get_post_meta( $post_id, '_missive_only', true ) === 'yes'
            ? '<span style="color:#e67e22;font-weight:bold;">Missive</span>'
            : '—';
    }
}, 10, 2 );
