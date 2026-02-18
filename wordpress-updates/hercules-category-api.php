<?php
/**
 * Plugin Name: Hercules Category API
 * Description: Custom REST API endpoint for product categories with second_description and FAQ
 * Version: 1.1.0
 * Author: Hercules Merchandise
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register custom REST API routes for categories
 */
add_action('rest_api_init', function() {
    // Get all categories
    register_rest_route('hercules/v1', '/categories', [
        'methods' => 'GET',
        'callback' => 'hercules_get_all_categories',
        'permission_callback' => '__return_true',
    ]);

    // Get single category by slug
    register_rest_route('hercules/v1', '/category/(?P<slug>[a-zA-Z0-9-]+)', [
        'methods' => 'GET',
        'callback' => 'hercules_get_category_by_slug',
        'permission_callback' => '__return_true',
        'args' => [
            'slug' => [
                'required' => true,
                'type' => 'string',
            ],
        ],
    ]);
});

/**
 * Get all product categories with custom meta
 */
function hercules_get_all_categories() {
    $categories = get_terms([
        'taxonomy' => 'product_cat',
        'hide_empty' => false,
    ]);

    if (is_wp_error($categories)) {
        return new WP_REST_Response(['error' => 'Failed to fetch categories'], 500);
    }

    $result = [];
    foreach ($categories as $category) {
        $result[] = hercules_format_category($category);
    }

    return new WP_REST_Response($result, 200);
}

/**
 * Get single category by slug
 */
function hercules_get_category_by_slug($request) {
    $slug = $request->get_param('slug');

    $term = get_term_by('slug', $slug, 'product_cat');

    if (!$term || is_wp_error($term)) {
        return new WP_REST_Response(['error' => 'Category not found'], 404);
    }

    return new WP_REST_Response(hercules_format_category($term), 200);
}

/**
 * Format category with custom meta fields
 */
function hercules_format_category($category) {
    // Get second description from term meta
    $second_description = get_term_meta($category->term_id, 'seconddesc', true);

    // Get FAQ from ACF repeater field (if using ACF)
    // Field name: 'category_faq' - repeater with sub-fields 'question' and 'answer'
    $faq = [];

    // Try ACF first
    if (function_exists('get_field')) {
        $acf_faq = get_field('category_faq', 'product_cat_' . $category->term_id);
        if (is_array($acf_faq)) {
            foreach ($acf_faq as $item) {
                if (!empty($item['question']) && !empty($item['answer'])) {
                    $faq[] = [
                        'question' => $item['question'],
                        'answer' => $item['answer'],
                    ];
                }
            }
        }
    }

    // Fallback: try term_meta directly (if FAQ is stored as serialized array)
    if (empty($faq)) {
        $meta_faq = get_term_meta($category->term_id, 'category_faq', true);
        if (is_array($meta_faq)) {
            foreach ($meta_faq as $item) {
                if (!empty($item['question']) && !empty($item['answer'])) {
                    $faq[] = [
                        'question' => $item['question'],
                        'answer' => $item['answer'],
                    ];
                }
            }
        }
    }

    return [
        'id' => $category->term_id,
        'name' => $category->name,
        'slug' => $category->slug,
        'parent' => $category->parent,
        'count' => $category->count,
        'description' => $category->description,
        'second_description' => $second_description ?: null,
        'faq' => $faq,
    ];
}
