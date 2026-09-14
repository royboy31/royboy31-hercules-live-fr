<?php
/**
 * Plugin Name: Hercules - Accept BE/FR/LU Postcodes
 * Description: Accepts any postcode valid for one of the shop's selling countries (Belgium, France, Luxembourg) at checkout.
 * Version: 1.0.0
 * Author: Hercules Development
 *
 * Why: Pearl (pearl-wc-steps-variation/includes/checkout/customize_checkout.php) turns
 * shipping_country into a hidden field (default GB) that the country dropdown never updates.
 * With "ship to a different address" ticked, WooCommerce checks the shipping postcode against
 * that hidden country, so a valid Belgian 7780 is rejected when it holds FR or GB.
 *
 * Ranges accepted:
 *   Belgium     1000-9999
 *   France      01000-98999 (incl. Corsica 20xxx and overseas 97xxx/98xxx)
 *   Luxembourg  1000-9999, optionally written L-1234
 */

if ( ! defined( 'ABSPATH' ) ) exit;

function hercules_postcode_matches_selling_country( $postcode ) {
	$postcode = strtoupper( preg_replace( '/\s+/', '', (string) $postcode ) );
	return (bool) preg_match( '/^(?:[1-9]\d{3}|(?:0[1-9]|[1-8]\d|9[0-8])\d{3}|L-?\d{4})$/', $postcode );
}

add_filter( 'woocommerce_validate_postcode', function ( $valid, $postcode, $country ) {
	return $valid || hercules_postcode_matches_selling_country( $postcode );
}, 10, 3 );

/**
 * Keep the postcode as typed. When the hidden country is not a selling country (GB),
 * wc_format_postcode() would otherwise save 7780 as "7 780".
 */
add_filter( 'woocommerce_format_postcode', function ( $formatted, $country ) {
	if ( in_array( $country, [ 'BE', 'FR', 'LU' ], true ) ) {
		return $formatted;
	}
	$raw = strtoupper( preg_replace( '/\s+/', '', $formatted ) );
	return hercules_postcode_matches_selling_country( $raw ) ? $raw : $formatted;
}, 10, 2 );
