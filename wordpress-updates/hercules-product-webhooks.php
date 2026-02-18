<?php
/**
 * Plugin Name: Hercules Product Webhooks
 * Description: Sends webhooks to Cloudflare Product Sync Worker when WooCommerce products are created, updated, or deleted.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

class Hercules_Product_Webhooks {

    private $webhook_secret = 'hercules-webhook-secret-fr-2024';

    /**
     * Get the correct worker URL based on environment (staging vs production)
     */
    private function get_webhook_url() {
        $site_url = site_url();
        if (strpos($site_url, 'staging.') !== false) {
            return 'https://hercules-product-sync-fr.gilles-86d.workers.dev';
        }
        return 'https://hercules-product-sync-fr-production.gilles-86d.workers.dev';
    }

    public function __construct() {
        // WooCommerce product save (covers create and update via admin)
        add_action('woocommerce_update_product', array($this, 'on_product_update'), 10, 2);
        add_action('woocommerce_new_product', array($this, 'on_product_create'), 10, 2);

        // Product trash / untrash / delete
        add_action('wp_trash_post', array($this, 'on_product_trash'), 10, 1);
        add_action('untrash_post', array($this, 'on_product_untrash'), 10, 1);
        add_action('before_delete_post', array($this, 'on_product_delete'), 10, 2);

        // Variation changes
        add_action('woocommerce_save_product_variation', array($this, 'on_variation_save'), 10, 2);
    }

    /**
     * Product updated
     */
    public function on_product_update($product_id, $product) {
        if ($this->should_skip($product_id)) return;

        $this->send_webhook('/webhook/product-update', array(
            'id' => $product_id,
            'name' => $product->get_name(),
            'action' => 'update',
            'status' => $product->get_status(),
        ));
    }

    /**
     * New product created
     */
    public function on_product_create($product_id, $product) {
        if ($this->should_skip($product_id)) return;

        $this->send_webhook('/webhook/product-create', array(
            'id' => $product_id,
            'name' => $product->get_name(),
            'action' => 'create',
            'status' => $product->get_status(),
        ));
    }

    /**
     * Product trashed
     */
    public function on_product_trash($post_id) {
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'product') return;

        $this->send_webhook('/webhook/product-delete', array(
            'id' => $post_id,
            'action' => 'trash',
        ));
    }

    /**
     * Product untrashed (restored)
     */
    public function on_product_untrash($post_id) {
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'product') return;

        $this->send_webhook('/webhook/product-update', array(
            'id' => $post_id,
            'action' => 'untrash',
        ));
    }

    /**
     * Product permanently deleted
     */
    public function on_product_delete($post_id, $post) {
        if ($post->post_type !== 'product') return;

        $this->send_webhook('/webhook/product-delete', array(
            'id' => $post_id,
            'action' => 'delete',
        ));
    }

    /**
     * Variation saved (price change, stock change, etc.)
     */
    public function on_variation_save($variation_id, $index) {
        $variation = wc_get_product($variation_id);
        if (!$variation) return;

        $parent_id = $variation->get_parent_id();

        $this->send_webhook('/webhook/product-update', array(
            'id' => $parent_id,
            'variation_id' => $variation_id,
            'action' => 'variation_update',
        ));
    }

    /**
     * Skip autosaves and revisions
     */
    private function should_skip($post_id) {
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return true;
        if (wp_is_post_revision($post_id)) return true;
        return false;
    }

    /**
     * Send webhook with HMAC-SHA256 signature (same format as WooCommerce built-in)
     */
    private function send_webhook($endpoint, $data) {
        $url = $this->get_webhook_url() . $endpoint;
        $payload = json_encode($data);

        // Generate HMAC-SHA256 signature (matches worker's verifyWebhookSignature)
        $signature = base64_encode(hash_hmac('sha256', $payload, $this->webhook_secret, true));

        wp_remote_post($url, array(
            'timeout' => 5,
            'blocking' => false,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-WC-Webhook-Signature' => $signature,
            ),
            'body' => $payload,
        ));

        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("Hercules Product Webhook: Sent to {$endpoint} for product {$data['id']} (action: {$data['action']})");
        }
    }
}

new Hercules_Product_Webhooks();
