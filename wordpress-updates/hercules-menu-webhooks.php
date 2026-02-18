<?php
/**
 * Plugin Name: Hercules Menu Webhooks
 * Description: Triggers site rebuild when navigation menus are updated
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

class Hercules_Menu_Webhooks {

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
        // Hook into menu update (fires when menu is saved in admin)
        add_action('wp_update_nav_menu', array($this, 'on_menu_update'), 10, 2);
    }

    /**
     * Send webhook when a menu is updated
     */
    public function on_menu_update($menu_id, $menu_data = array()) {
        // Get menu name for logging
        $menu = wp_get_nav_menu_object($menu_id);
        $menu_name = $menu ? $menu->name : 'Unknown';

        // Send webhook to trigger rebuild
        $this->send_webhook('/trigger-rebuild', array(
            'source' => 'menu_update',
            'menu_id' => $menu_id,
            'menu_name' => $menu_name,
            'timestamp' => time(),
        ));

        // Log for debugging
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("Hercules Menu Webhook: Menu '$menu_name' (ID: $menu_id) was updated, triggering rebuild");
        }
    }

    /**
     * Send webhook with authorization header
     */
    private function send_webhook($endpoint, $data) {
        $url = $this->get_webhook_url() . $endpoint;
        $payload = json_encode($data);

        // Send async request (non-blocking)
        wp_remote_post($url, array(
            'timeout' => 5,
            'blocking' => false,
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $this->webhook_secret,
            ),
            'body' => $payload,
        ));
    }
}

// Initialize
new Hercules_Menu_Webhooks();
