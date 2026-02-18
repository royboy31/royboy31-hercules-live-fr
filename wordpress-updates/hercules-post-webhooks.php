<?php
/**
 * Hercules Blog Post Webhooks
 *
 * Sends webhooks to Cloudflare Worker when blog posts are created, updated, or deleted.
 * Mirrors the WooCommerce webhook behavior for products.
 */

if (!defined('ABSPATH')) exit;

class Hercules_Post_Webhooks {

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
        // Hook into post save (covers both create and update)
        add_action('save_post', array($this, 'on_post_save'), 10, 3);

        // Hook into post delete
        add_action('before_delete_post', array($this, 'on_post_delete'), 10, 2);

        // Hook into post trash (soft delete)
        add_action('wp_trash_post', array($this, 'on_post_trash'), 10, 1);
    }

    /**
     * Send webhook when a post is saved (created or updated)
     */
    public function on_post_save($post_id, $post, $update) {
        // Only for regular posts (not pages, attachments, etc.)
        if ($post->post_type !== 'post') {
            return;
        }

        // Skip autosaves and revisions
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        if (wp_is_post_revision($post_id)) {
            return;
        }

        // Determine if this is create or update
        $endpoint = $update ? '/webhook/post-update' : '/webhook/post-create';

        // Send webhook
        $this->send_webhook($endpoint, array(
            'id' => $post_id,
            'post_id' => $post_id,
            'action' => $update ? 'update' : 'create',
            'status' => $post->post_status,
        ));
    }

    /**
     * Send webhook when a post is permanently deleted
     */
    public function on_post_delete($post_id, $post) {
        if ($post->post_type !== 'post') {
            return;
        }

        $this->send_webhook('/webhook/post-delete', array(
            'id' => $post_id,
            'post_id' => $post_id,
            'action' => 'delete',
        ));
    }

    /**
     * Send webhook when a post is trashed
     */
    public function on_post_trash($post_id) {
        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'post') {
            return;
        }

        // Treat trash as update (status change to trash)
        $this->send_webhook('/webhook/post-update', array(
            'id' => $post_id,
            'post_id' => $post_id,
            'action' => 'trash',
            'status' => 'trash',
        ));
    }

    /**
     * Send webhook with HMAC-SHA256 signature
     */
    private function send_webhook($endpoint, $data) {
        $url = $this->get_webhook_url() . $endpoint;
        $payload = json_encode($data);

        // Generate HMAC-SHA256 signature (same as WooCommerce)
        $signature = base64_encode(hash_hmac('sha256', $payload, $this->webhook_secret, true));

        // Send async request (non-blocking)
        wp_remote_post($url, array(
            'timeout' => 5,
            'blocking' => false,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-WC-Webhook-Signature' => $signature,
            ),
            'body' => $payload,
        ));

        // Log for debugging (optional)
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("Hercules Post Webhook: Sent to {$endpoint} for post {$data['id']}");
        }
    }
}

// Initialize
new Hercules_Post_Webhooks();
