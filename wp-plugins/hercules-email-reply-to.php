<?php
/**
 * Plugin Name: Hercules Email Reply-To
 * Description: Sets Reply-To header on WooCommerce admin emails to the customer's billing email
 * Version: 1.0.0
 * Author: Hercules Development
 */

if (!defined('ABSPATH')) {
    exit;
}

add_filter('woocommerce_email_headers', 'hercules_set_reply_to_customer', 10, 3);

function hercules_set_reply_to_customer($headers, $email_id, $order) {
    // Only modify admin-facing order emails
    $admin_emails = [
        'new_order',
        'cancelled_order',
        'failed_order',
    ];

    if (!in_array($email_id, $admin_emails) || !$order || !is_a($order, 'WC_Order')) {
        return $headers;
    }

    $billing_email = $order->get_billing_email();
    $billing_name  = $order->get_formatted_billing_full_name();

    if ($billing_email) {
        $headers .= "Reply-To: {$billing_name} <{$billing_email}>\r\n";
    }

    return $headers;
}
