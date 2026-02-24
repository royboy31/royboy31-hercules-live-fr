<?php
/**
 * Plugin Name: Hercules Custom Header (FR)
 * Description: Outputs a custom desktop + mobile header for the FR WordPress site, replacing the Elementor header to match the Astro site design.
 * Version: 1.1.0
 * Author: Pearl Web
 * Author URI: https://hercules-merchandising.fr
 *
 * This mu-plugin renders:
 * - Desktop: 3-row header (top bar, main header, navigation) with mega-menu dropdowns
 * - Mobile: Sticky header (top bar + logo/actions) with slide-out menu
 * - Hides the Elementor header on both desktop and mobile
 *
 * Upload to: wp-content/mu-plugins/hercules-custom-header.php
 */

if (!defined('ABSPATH')) {
    exit;
}

/* =========================================================================
 * 1. MENU DATA HELPER
 * ========================================================================= */

function hercules_custom_header_get_menu_items() {
    // Static FR icon map keyed by category slug → icon filename in /images/menu/
    $icon_map = array(
        // Sports
        'football'               => 'Football.svg',       'rugby'                    => 'Rugby-1.svg',
        'basketball'             => 'Basketball-1.svg',   'running'                  => 'running-1.svg',
        'hockey-sur-gazon'       => 'field-hockey-1.svg', 'volleyball'               => 'volleyball-1.svg',
        'handball'               => 'handball-1.svg',     'cyclisme'                 => 'cycling-1.svg',
        'fitness'                => 'fitness-1.svg',      'golf'                     => 'golf-1.svg',
        'esports'                => 'esport-1.svg',
        // Products
        'equipements-personnalises'       => 'teamwear-1.svg',   'echarpes-personnalisees'       => 'scarves-1.svg',
        'bonnets-personnalises-football'  => 'beanies-3.svg',    'couvre-chefs'                  => 'cap-1.svg',
        'fanions-personnalises-football'  => 'pennants-3.svg',   'serviettes-personnalisees'     => 'towelst-1.svg',
        'drapeaux-personnalises'          => 'flags-1.svg',      'chaussettes-et-claquettes'     => 'footwear-1.svg',
        'sacs-de-sport-personnalises'     => 'sportsbag-1.svg',  'textile-sport-personnalise'    => 'textile-1.svg',
        'bidons-et-tasses'                => 'drinkware-1.svg',  'ballons'                       => 'balls-1.svg',
        'accessoires-de-football'         => 'accessories-1.svg',
        // Themes
        'ete'                    => 'summer-1.svg',       'hiver'                    => 'winter-1.svg',
        'durable'                => 'sustainable-2.svg',  'fabrique-en-europe'       => 'made-in-europe-1.svg',
        'mode'                   => 'fashion-1.svg',      'rentree-scolaire'         => 'back-to-school-1.svg',
        'tifo'                   => 'tifo-1.svg',         'noel'                     => 'christmas-1.svg',
        'petits-prix'            => 'smallprices.svg',    'business'                 => 'business.svg',
        'cadeaux'                => 'giive-aways.svg',    'enfants'                  => 'kids.svg',
    );
    $icon_base = '/images/menu/';

    // Static fallback data (mirrors menu-data.ts) used when WP menu section is empty
    $static_fallback = array(
        'sportarten' => array(
            array('title' => 'Football',        'url' => '/collections/football/',                'slug' => 'football'),
            array('title' => 'Rugby',           'url' => '/collections/rugby/',                   'slug' => 'rugby'),
            array('title' => 'Basket-ball',     'url' => '/collections/basketball/',              'slug' => 'basketball'),
            array('title' => 'Running',         'url' => '/collections/running/',                 'slug' => 'running'),
            array('title' => 'Hockey sur gazon','url' => '/collections/hockey-sur-gazon/',        'slug' => 'hockey-sur-gazon'),
            array('title' => 'Volleyball',      'url' => '/collections/volleyball/',              'slug' => 'volleyball'),
            array('title' => 'Handball',        'url' => '/collections/handball/',               'slug' => 'handball'),
            array('title' => 'Cyclisme',        'url' => '/collections/cyclisme/',                'slug' => 'cyclisme'),
            array('title' => 'Fitness',         'url' => '/collections/fitness/',                 'slug' => 'fitness'),
            array('title' => 'Golf',            'url' => '/collections/golf/',                    'slug' => 'golf'),
            array('title' => 'eSports',         'url' => '/collections/esports/',                 'slug' => 'esports'),
        ),
        'produkte' => array(
            array('title' => 'Vêtements de sport',        'url' => '/collections/equipements-personnalises/',      'slug' => 'equipements-personnalises'),
            array('title' => 'Écharpes',                  'url' => '/collections/echarpes-personnalisees/',        'slug' => 'echarpes-personnalisees'),
            array('title' => 'Bonnets',                   'url' => '/collections/bonnets-personnalises-football/', 'slug' => 'bonnets-personnalises-football'),
            array('title' => 'Couvre-chefs',              'url' => '/collections/couvre-chefs/',                   'slug' => 'couvre-chefs'),
            array('title' => 'Fanions',                   'url' => '/collections/fanions-personnalises-football/', 'slug' => 'fanions-personnalises-football'),
            array('title' => 'Serviettes',                'url' => '/collections/serviettes-personnalisees/',      'slug' => 'serviettes-personnalisees'),
            array('title' => 'Drapeaux',                  'url' => '/collections/drapeaux-personnalises/',         'slug' => 'drapeaux-personnalises'),
            array('title' => 'Chaussettes et claquettes', 'url' => '/collections/chaussettes-et-claquettes/',      'slug' => 'chaussettes-et-claquettes'),
            array('title' => 'Sacs',                      'url' => '/collections/sacs-de-sport-personnalises/',    'slug' => 'sacs-de-sport-personnalises'),
            array('title' => 'Textile',                   'url' => '/collections/textile-sport-personnalise/',     'slug' => 'textile-sport-personnalise'),
            array('title' => 'Bidons & tasses',           'url' => '/collections/bidons-et-tasses/',               'slug' => 'bidons-et-tasses'),
            array('title' => 'Ballons',                   'url' => '/collections/ballons/',                        'slug' => 'ballons'),
            array('title' => 'Accessoires',               'url' => '/collections/accessoires-de-football/',        'slug' => 'accessoires-de-football'),
        ),
        'themen' => array(
            array('title' => 'Été',              'url' => '/collections/ete/',                 'slug' => 'ete'),
            array('title' => 'Hiver',            'url' => '/collections/hiver/',               'slug' => 'hiver'),
            array('title' => 'Durable',          'url' => '/collections/durable/',             'slug' => 'durable'),
            array('title' => 'Fabriqué en Europe','url' => '/collections/fabrique-en-europe/', 'slug' => 'fabrique-en-europe'),
            array('title' => 'Mode',             'url' => '/collections/mode/',                'slug' => 'mode'),
            array('title' => 'Rentrée scolaire', 'url' => '/collections/rentree-scolaire/',   'slug' => 'rentree-scolaire'),
            array('title' => 'Tifo',             'url' => '/collections/tifo/',                'slug' => 'tifo'),
            array('title' => 'Noël',             'url' => '/collections/noel/',                'slug' => 'noel'),
            array('title' => 'Petits prix',      'url' => '/collections/petits-prix/',         'slug' => 'petits-prix'),
            array('title' => 'Business',         'url' => '/collections/business/',            'slug' => 'business'),
            array('title' => 'Cadeaux',          'url' => '/collections/cadeaux/',             'slug' => 'cadeaux'),
            array('title' => 'Enfants',          'url' => '/collections/enfants/',             'slug' => 'enfants'),
        ),
    );

    $menu_items = wp_get_nav_menu_items('product-catergory-menu');

    $result = array('sportarten' => array(), 'produkte' => array(), 'themen' => array());

    if ($menu_items) {
        $parents  = array();
        $children = array();

        foreach ($menu_items as $item) {
            if ($item->menu_item_parent == 0) {
                $key = strtolower(trim($item->title));
                if ($key === 'sports' || $key === 'sportarten') $key = 'sportarten';
                if ($key === 'products' || $key === 'produkte') $key = 'produkte';
                if ($key === 'themes' || $key === 'themen')     $key = 'themen';
                $parents[$item->ID] = $key;
            } else {
                // Extract slug from FR URL pattern /collections/{slug}/
                $slug = '';
                if (preg_match('/\/collections\/([^\/]+)/', $item->url, $m)) {
                    $slug = $m[1];
                }

                // Resolve icon: prefer custom WP field, fall back to static map
                $icon_url = '';
                if (!empty($item->icon_url)) {
                    $icon_url = $item->icon_url;
                    if (strpos($icon_url, 'http') !== 0 && strpos($icon_url, '//') !== 0) {
                        $icon_url = (strpos($icon_url, '/') === 0) ? home_url($icon_url) : content_url('/uploads/hercules-menu-icons/' . $icon_url);
                    }
                } elseif ($slug && isset($icon_map[$slug])) {
                    $icon_url = $icon_base . $icon_map[$slug];
                }

                $children[$item->menu_item_parent][] = array(
                    'title'    => $item->title,
                    'url'      => $item->url,
                    'icon_url' => $icon_url,
                );
            }
        }

        foreach ($parents as $parent_id => $section_key) {
            if (isset($children[$parent_id]) && isset($result[$section_key])) {
                $result[$section_key] = $children[$parent_id];
            }
        }
    }

    // Fill any empty sections from static fallback
    foreach (array('sportarten', 'produkte', 'themen') as $section) {
        if (empty($result[$section]) && isset($static_fallback[$section])) {
            foreach ($static_fallback[$section] as $item) {
                $icon_url = isset($icon_map[$item['slug']]) ? $icon_base . $icon_map[$item['slug']] : '';
                $result[$section][] = array(
                    'title'    => $item['title'],
                    'url'      => $item['url'],
                    'icon_url' => $icon_url,
                );
            }
        }
    }

    return $result;
}

/* =========================================================================
 * 2. CSS (wp_head hook)
 * ========================================================================= */

add_action('wp_head', 'hercules_custom_header_css', 99);
function hercules_custom_header_css() {
    ?>
    <style id="hercules-custom-header-css">
    /* ==========================================================================
     * Hercules Custom Header v1.1.0
     * Desktop + Mobile header replacing Elementor header.
     * ========================================================================== */

    /* --- Hide Elementor Header --- */
    .elementor-location-header,
    .elementor-location-header .elementor-section-wrap,
    .elementor-location-header > .elementor-section,
    header.elementor-location-header {
        display: none !important;
    }

    /* ==========================================================================
     * DESKTOP HEADER
     * ========================================================================== */

    .herc-header {
        display: none;
        background: #FFFFFF;
        position: relative;
        z-index: 100;
        font-family: 'Jost', sans-serif;
        box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.1);
    }

    @media (min-width: 769px) {
        .herc-header { display: block; }
    }

    @media (max-width: 768px) {
        .herc-header { display: none !important; }
    }

    /* ROW 1 - TOP BAR */
    .herc-topbar {
        background-color: #253461;
        width: 100%;
    }

    .herc-topbar-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-width: 1280px;
        margin: 0 auto;
        padding: 4px 20px 8px;
    }

    .herc-topbar-usps {
        display: flex;
        align-items: center;
        gap: 50px;
    }

    .herc-usp {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #FFFFFF;
        font-family: 'Jost', sans-serif;
        font-size: 14px;
        font-weight: 500;
        text-decoration: none;
        white-space: nowrap;
        transition: opacity 0.2s;
    }

    a.herc-usp { color: #FFFFFF !important; }
    a.herc-usp:hover { opacity: 0.85; }

    .herc-usp svg {
        width: 23px;
        height: 23px;
        flex-shrink: 0;
    }

    .herc-topbar-reviews {
        display: flex;
        align-items: center;
    }

    .herc-topbar-reviews a {
        display: inline-flex;
        align-items: center;
        text-decoration: none;
        transition: opacity 0.2s;
    }

    .herc-topbar-reviews a:hover { opacity: 0.85; }

    .herc-topbar-reviews img {
        height: 30px;
        width: auto;
        display: block;
    }

    /* ROW 2 - MAIN HEADER */
    .herc-main {
        background: #FFFFFF;
        padding: 5px 0;
    }

    .herc-main-inner {
        width: 100%;
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 20px;
        display: flex;
        align-items: flex-end;
        box-sizing: border-box;
    }

    .herc-logo-wrap {
        flex-shrink: 0;
        padding: 10px 0;
    }

    .herc-logo-wrap a {
        display: block;
        text-decoration: none;
    }

    .herc-logo-wrap img {
        width: 172px !important;
        height: auto !important;
        display: block;
    }

    .herc-search-wrap {
        width: 708px;
        flex-shrink: 0;
        margin-left: 144px;
        min-width: 0;
        position: relative;
        padding-bottom: 10px;
    }

    .herc-search-form {
        display: flex;
        align-items: center;
        position: relative;
        width: 100%;
    }

    .herc-search-input {
        width: 100%;
        height: 44px;
        padding: 12px 48px 12px 18px;
        font-family: 'Roboto', sans-serif;
        font-size: 16px;
        color: #253461;
        border: 1px solid #253461 !important;
        border-radius: 15px !important;
        outline: none;
        box-sizing: border-box;
        background: #FFFFFF;
        -webkit-appearance: none;
        appearance: none;
    }

    .herc-search-input::placeholder {
        color: #253461;
        opacity: 0.6;
    }

    .herc-search-input:focus {
        border-color: #469ADC !important;
    }

    .herc-search-btn {
        position: absolute;
        right: 4px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #253461;
    }

    .herc-search-btn svg {
        width: 20px;
        height: 20px;
    }

    .herc-search-btn:hover svg path {
        fill: #469ADC;
    }

    /* Search Dropdown Results */
    .herc-search-results {
        position: absolute;
        z-index: 232;
        background: white;
        width: 100%;
        min-width: 350px;
        padding: 25px 15px;
        box-shadow: 0 10px 10px rgba(0, 0, 0, 0.16);
        max-height: 455px;
        overflow-y: auto;
        opacity: 0;
        visibility: hidden;
        transition: all 0.6s ease;
        margin-top: 0;
        top: 100%;
        left: 0;
        box-sizing: border-box;
    }

    .herc-search-results.active {
        opacity: 1;
        visibility: visible;
    }

    .herc-search-results-list {
        padding: 0;
        margin: 0;
        display: flex;
        flex-flow: column;
        row-gap: 10px;
        list-style: none;
    }

    .herc-search-results-list li a {
        display: flex;
        align-items: center;
        column-gap: 20px;
        color: #253461;
        text-decoration: none;
        transition: opacity 0.2s ease;
    }

    .herc-search-results-list li a:hover { opacity: 0.7; }

    .herc-search-thumb {
        max-width: 100px;
        width: 100px;
        height: auto;
        object-fit: cover;
        background-color: #f5f5f5;
        flex-shrink: 0;
    }

    .herc-search-product-info {
        flex: 1;
        min-width: 0;
    }

    .herc-search-product-title {
        font-family: 'Jost', sans-serif;
        font-weight: 500;
        font-size: 14px;
        color: #253461;
        line-height: 1.3;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }


    .herc-search-no-results {
        font-family: 'Jost', sans-serif;
        font-size: 14px;
        color: #666;
        text-align: center;
        padding: 20px;
        margin: 0;
    }

    .herc-search-spinner {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        border: 2px solid #e0e0e0;
        border-top-color: #469ADC;
        border-radius: 50%;
        animation: herc-spin 0.8s linear infinite;
    }

    @keyframes herc-spin {
        to { transform: translateY(-50%) rotate(360deg); }
    }

    .herc-search-btn.loading svg { display: none; }

    .herc-search-results::-webkit-scrollbar { width: 6px; }
    .herc-search-results::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
    .herc-search-results::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 3px; }
    .herc-search-results::-webkit-scrollbar-thumb:hover { background: #a1a1a1; }

    /* Icons */
    .herc-icons {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
        margin-left: auto;
        padding-bottom: 10px;
    }

    .herc-icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border: 1px solid #253461;
        border-radius: 15px;
        color: #253461;
        background: transparent;
        transition: all 0.3s;
        position: relative;
        text-decoration: none;
        cursor: pointer;
    }

    .herc-icon-btn svg {
        width: 22px;
        height: 22px;
    }

    .herc-icon-btn:hover {
        border-color: #469ADC;
        background: transparent;
    }

    .herc-icon-btn:hover svg path { fill: #469ADC; }

    button.herc-icon-btn.herc-cart-btn,
    button.herc-icon-btn.herc-cart-btn:hover,
    button.herc-icon-btn.herc-cart-btn:focus,
    button.herc-icon-btn.herc-cart-btn:active {
        background: transparent !important;
        color: #253461;
        padding: 0;
        line-height: 1;
        font-size: inherit;
        letter-spacing: normal;
        text-transform: none;
        box-shadow: none;
    }
    button.herc-icon-btn.herc-cart-btn:hover { border-color: #469ADC; }
    button.herc-icon-btn.herc-cart-btn:hover svg path { fill: #469ADC; }

    .herc-logged-in-dot {
        position: absolute;
        right: -6px;
        top: -6px;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: #10C99E;
        z-index: 2;
        border: none;
        display: none;
    }

    .herc-cart-badge {
        position: absolute;
        top: -6px;
        right: -6px;
        background: #10C99E;
        color: #FFFFFF;
        font-size: 11px;
        font-weight: 600;
        font-family: 'Jost', sans-serif;
        min-width: 18px;
        height: 18px;
        border-radius: 9px;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        line-height: 1;
    }

    /* Mini Cart Dropdown */
    .herc-cart-wrap {
        position: relative;
        display: inline-block;
    }

    .herc-minicart {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 10px;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        min-width: 375px;
        font-family: 'Jost', sans-serif;
        font-size: 14px;
        color: #253461;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-5px);
        transition: opacity 0.25s ease, visibility 0.25s ease, transform 0.25s ease;
    }

    .herc-minicart.active {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }

    .herc-minicart-empty { text-align: center; padding: 20px 10px; color: #666; margin: 0; }
    .herc-minicart-list { list-style: none; margin: 0 0 15px 0; padding: 0; max-height: 200px; overflow-y: auto; }
    .herc-minicart-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
    .herc-minicart-item a { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; flex: 1; min-width: 0; }
    .herc-minicart-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 5px; flex-shrink: 0; }
    .herc-minicart-info { flex: 1; min-width: 0; }
    .herc-minicart-name { font-size: 13px; font-weight: 500; color: #253461; margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .herc-minicart-price { font-size: 12px; color: #666; margin: 0; }

    button.herc-minicart-remove,
    button.herc-minicart-remove:hover,
    button.herc-minicart-remove:focus {
        background: transparent !important; border: none !important; color: #999; cursor: pointer;
        padding: 4px 8px !important; font-size: 18px !important; line-height: 1; transition: color 0.2s;
        flex-shrink: 0; box-shadow: none !important; min-width: auto !important;
    }
    button.herc-minicart-remove:hover { color: #ff4444 !important; }
    button.herc-minicart-remove:disabled { opacity: 0.5; cursor: not-allowed; }

    .herc-minicart-subtotal { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-top: 1px solid #e0e0e0; margin-bottom: 15px; font-weight: 500; }
    .herc-minicart-buttons { display: flex; gap: 8px; }

    .herc-minicart-buttons a.herc-minicart-btn {
        flex: 1 1 0%; display: inline-flex !important; justify-content: center; align-items: center;
        padding: 12px 15px !important; font-size: 12px !important; font-weight: 500 !important;
        font-family: 'Jost', sans-serif !important; text-transform: uppercase !important;
        text-decoration: none !important; border-radius: 83px !important; cursor: pointer;
        transition: all 0.2s; line-height: 1 !important; text-align: center;
        box-shadow: none !important; letter-spacing: normal !important;
    }

    a.herc-minicart-btn.herc-minicart-btn--quote { color: #469adc !important; background: transparent !important; border: 1px solid #469adc !important; }
    a.herc-minicart-btn.herc-minicart-btn--quote:hover { background: #469adc !important; color: #fff !important; }
    a.herc-minicart-btn.herc-minicart-btn--cart { color: #fff !important; background: #10c99e !important; border: 1px solid #10c99e !important; }
    a.herc-minicart-btn.herc-minicart-btn--cart:hover { background: transparent !important; color: #10c99e !important; }

    .herc-minicart-list::-webkit-scrollbar { width: 4px; }
    .herc-minicart-list::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 2px; }
    .herc-minicart-list::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 2px; }

    .herc-wishlist-badge {
        position: absolute; top: -6px; right: -6px; background: #10C99E; color: #FFFFFF;
        font-size: 11px; font-weight: 600; font-family: 'Jost', sans-serif; min-width: 18px;
        height: 18px; border-radius: 9px; display: none; align-items: center; justify-content: center;
        padding: 0 4px; line-height: 1;
    }

    /* ROW 3 - NAVIGATION */
    .herc-nav { background: #FFFFFF; padding-bottom: 3px; }

    .herc-nav-inner {
        width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 20px;
        display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;
    }

    .herc-nav-menu { display: flex; align-items: center; gap: 0; }
    .herc-nav-item { position: relative; }
    .herc-nav-item:first-child .herc-nav-btn { padding-left: 0; }

    .herc-nav-btn {
        display: flex; align-items: center; gap: 5px; padding: 14px 22px;
        background: none !important; border: none !important;
        font-family: 'Jost', sans-serif !important; font-size: 15px !important; font-weight: 500 !important;
        text-transform: uppercase; color: #00AEEF !important; cursor: pointer; transition: color 0.3s; white-space: nowrap;
    }
    .herc-nav-btn:hover { color: #253461 !important; }

    .herc-nav-arrow { width: 14px; height: 14px; transition: transform 0.2s, fill 0.3s; fill: #253461; }
    .herc-nav-item:hover .herc-nav-arrow { transform: rotate(180deg); fill: #00AEEF; }

    .herc-nav-direct {
        display: flex; align-items: center; padding: 14px 25px;
        font-family: 'Jost', sans-serif !important; font-size: 15px !important; font-weight: 500 !important;
        text-transform: uppercase; color: #253461 !important; text-decoration: none; transition: color 0.3s; white-space: nowrap;
    }
    .herc-nav-direct:hover { color: #00AEEF !important; }

    .herc-nav-cta {
        display: inline-flex; align-items: center; padding: 10px 30px; line-height: 15px;
        background-color: #10C99E !important; color: #FFFFFF !important;
        font-family: 'Jost', sans-serif !important; font-size: 15px !important; font-weight: 500 !important;
        text-transform: uppercase; text-decoration: none; border: 1px solid #10C99E !important;
        border-radius: 50px; cursor: pointer; transition: all 0.25s ease-in-out; white-space: nowrap;
    }
    .herc-nav-cta:hover { background-color: #0eb38c !important; border-color: #0eb38c !important; color: #FFFFFF !important; }

    /* MEGA MENU DROPDOWNS */
    .herc-mega-menu {
        position: fixed; top: auto; left: 0; right: 0; width: 100vw; background: #FFFFFF;
        border-top: 1px solid #FAFAFA; box-shadow: 0px 23px 4px -21px rgba(0, 0, 0, 0.18);
        opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.3s ease; z-index: 100;
    }
    .herc-nav-item:hover .herc-mega-menu { opacity: 1; visibility: visible; transform: translateY(0); }

    .herc-mega-inner { max-width: 1280px; margin: 0 auto; padding: 10px 20px; }

    .herc-mega-list {
        display: grid; grid-template-columns: repeat(3, auto); grid-template-rows: repeat(4, auto);
        grid-auto-flow: column; gap: 0 20px; list-style: none; margin: 0; padding: 0; width: fit-content;
    }

    .herc-mega-list li a {
        display: flex; align-items: center; gap: 0; height: 39px; padding: 0 15px;
        color: #253461 !important; font-family: 'Jost', sans-serif !important; font-size: 16px !important;
        font-weight: 400; text-decoration: none; transition: color 0.3s, background-color 0.3s;
        white-space: nowrap; box-sizing: border-box;
    }
    .herc-mega-list li a:hover { background: #F5F5F5; color: #469ADC !important; }

    .herc-mega-list li a img {
        width: 17px; height: 17px; object-fit: contain; margin-right: 5px; flex-shrink: 0;
    }

    /* ==========================================================================
     * MOBILE HEADER — Matches Astro Header.astro + MobileMenu.astro
     * ========================================================================== */

    .herc-mobile-header {
        display: block;
        background: #FFFFFF;
        position: sticky;
        top: 0;
        z-index: 100;
        font-family: 'Jost', sans-serif;
    }

    @media (max-width: 768px) {
        .herc-mobile-header { display: block !important; }
    }

    @media (min-width: 769px) {
        .herc-mobile-header { display: none !important; }
    }

    /* Mobile Top Bar */
    .herc-mobile-topbar {
        background-color: #253461;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0;
    }

    .herc-mobile-topbar-reviews {
        width: 35%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px 0;
    }

    .herc-mobile-topbar-reviews a {
        display: inline-block;
        text-decoration: none;
    }

    .herc-mobile-topbar-reviews img,
    .herc-mobile-topbar-reviews svg {
        max-width: 100%;
        height: auto;
        aspect-ratio: 306 / 36;
    }

    /* Mobile Header Inner */
    .herc-mobile-inner {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 8px 10px;
        background: #FFFFFF;
    }

    .herc-mobile-logo-wrap {
        width: 40%;
        display: flex;
        align-items: center;
    }

    .herc-mobile-logo-wrap a {
        display: block;
        text-decoration: none;
    }

    .herc-mobile-logo-wrap img {
        width: 100% !important;
        height: auto !important;
        max-width: 140px !important;
    }

    .herc-mobile-actions {
        width: 60%;
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
    }

    /* Mobile Action Buttons */
    .herc-mobile-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        text-decoration: none;
        font-family: 'Jost', sans-serif;
        font-size: 20px;
        font-weight: 500;
        text-transform: uppercase;
        border-radius: 5px;
        padding: 13px;
        transition: all 0.2s;
    }

    .herc-mobile-search-btn {
        background-color: #FFFFFF;
        color: #253461;
        fill: #253461;
        border: 1px solid #253461;
    }
    .herc-mobile-search-btn:hover,
    .herc-mobile-search-btn:focus {
        background-color: #FFFFFF;
        color: #253461;
        border-color: #253461;
    }
    .herc-mobile-search-btn svg { width: 22px; height: 22px; }

    .herc-mobile-contact-btn {
        background-color: #10C99E;
        color: #FFFFFF;
        fill: #FFFFFF;
        border: 1px solid #10C99E;
    }
    .herc-mobile-contact-btn:hover,
    .herc-mobile-contact-btn:focus {
        background-color: #FFFFFF;
        color: #10C99E;
        border-color: #10C99E;
    }
    .herc-mobile-contact-btn:hover svg path,
    .herc-mobile-contact-btn:focus svg path { fill: #10C99E; }
    .herc-mobile-contact-btn svg { width: 22px; height: 22px; }
    .herc-mobile-contact-btn svg path { fill: #FFFFFF; transition: fill 0.2s; }

    .herc-mobile-hamburger {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        color: #FFFFFF;
        cursor: pointer;
        background-color: #253461;
        border: 1px solid #253461;
        border-radius: 5px;
        padding: 13px;
        line-height: 1;
        transition: all 0.2s;
    }
    .herc-mobile-hamburger:hover,
    .herc-mobile-hamburger:focus {
        background-color: #FFFFFF;
        color: #253461;
        border-color: #253461;
    }

    /* ==========================================================================
     * MOBILE SEARCH OVERLAY
     * ========================================================================== */

    .herc-mobile-search-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: white;
        z-index: 200;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    }

    .herc-mobile-search-overlay.active {
        opacity: 1;
        visibility: visible;
    }

    .herc-mobile-search-container {
        padding: 20px;
        max-width: 600px;
        margin: 0 auto;
    }

    .herc-mobile-search-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        background: none;
        border: none;
        color: #253461;
        cursor: pointer;
        margin-left: auto;
        margin-bottom: 20px;
    }
    .herc-mobile-search-close:hover { color: #469ADC; }

    .herc-mobile-search-container .herc-search-results {
        position: relative;
        max-height: calc(100vh - 200px);
    }

    /* ==========================================================================
     * MOBILE SLIDE-OUT MENU — Matches MobileMenu.astro
     * ========================================================================== */

    .herc-mobile-menu {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        z-index: 9999;
        pointer-events: none;
        font-family: 'Jost', sans-serif;
    }

    body.herc-mobile-menu-open { overflow: hidden; }
    body.herc-mobile-menu-open .herc-mobile-menu { pointer-events: auto; }

    .herc-mobile-menu-overlay {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: opacity 0.3s;
    }

    body.herc-mobile-menu-open .herc-mobile-menu-overlay { opacity: 1; }

    .herc-mobile-menu-panel {
        position: absolute;
        top: 0; left: 0;
        width: 85%;
        max-width: 400px;
        height: 100%;
        background: white;
        transform: translateX(-100%);
        transition: transform 0.3s;
        overflow: hidden;
    }

    body.herc-mobile-menu-open .herc-mobile-menu-panel { transform: translateX(0); }

    /* Menu Panels */
    .herc-menu-panel {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: white;
        display: flex;
        flex-direction: column;
        transition: transform 0.3s ease;
    }

    .herc-main-panel { transform: translateX(0); }
    .herc-main-panel.slide-out { transform: translateX(-100%); }
    .herc-sub-panel { transform: translateX(100%); }
    .herc-sub-panel.active { transform: translateX(0); }

    /* Menu Header */
    .herc-mobile-menu-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px 20px;
        border-bottom: 1px solid #e5e7eb;
    }

    .herc-mobile-menu-header img {
        height: 40px !important;
        width: auto !important;
    }

    .herc-menu-close-btn {
        min-width: 40px !important;
        min-height: 40px !important;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: none;
        border: none;
        color: #253461 !important;
        cursor: pointer;
    }
    .herc-menu-close-btn:hover { color: #469ADC !important; }

    /* Menu Content */
    .herc-menu-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px 0;
    }

    .herc-menu-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 15px 20px;
        background: none;
        border: none;
        border-bottom: 1px solid #f0f0f0;
        text-decoration: none;
        cursor: pointer;
        transition: background-color 0.2s;
        box-sizing: border-box;
    }
    .herc-menu-item:hover { background-color: #f9fafb; }

    .herc-menu-item-label {
        font-family: 'Jost', sans-serif;
        font-size: 16px;
        font-weight: 500;
        color: #253461;
        text-transform: uppercase;
    }

    .herc-menu-arrow {
        color: #253461;
        flex-shrink: 0;
    }

    /* Wishlist Link */
    .herc-menu-wishlist .herc-menu-item-label {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .herc-menu-wishlist-icon {
        color: #10C99E;
        flex-shrink: 0;
    }

    /* USP Bar in mobile menu */
    .herc-mobile-usp-bar {
        padding: 20px;
        border-top: 1px solid #e5e7eb;
        background: #253461;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .herc-mobile-usp-item {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: "Jost", sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: #ffffff;
        text-decoration: none;
    }
    .herc-mobile-usp-item svg {
        width: 20px;
        height: 20px;
        fill: #23C3FF;
        flex-shrink: 0;
    }
    a.herc-mobile-usp-sustainable { color: #ffffff !important; }
    .herc-mobile-usp-sustainable svg { fill: #10A380; }

    /* CTA */
    .herc-menu-cta {
        padding: 20px;
    }

    .herc-menu-cta-btn {
        display: block;
        width: 100%;
        padding: 14px 20px;
        background: #10C99E;
        color: white !important;
        font-family: 'Jost', sans-serif;
        font-size: 16px;
        font-weight: 500;
        text-align: center;
        text-decoration: none;
        text-transform: uppercase;
        border-radius: 50px;
        transition: background-color 0.2s;
        box-sizing: border-box;
    }
    .herc-menu-cta-btn:hover { background: #0eb58d; }

    /* Submenu Header */
    .herc-submenu-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 15px 20px;
        border-bottom: 1px solid #e5e7eb;
    }

    .herc-submenu-back-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: none;
        border: none;
        color: #253461 !important;
        font-family: 'Jost', sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        padding: 5px 0;
    }
    .herc-submenu-back-btn:hover { color: #469ADC !important; }
    .herc-menu-close-btn svg {
        width: 24px !important;
        height: 24px !important;
        min-width: 24px !important;
        min-height: 24px !important;
    }
    .herc-menu-close-btn svg,
    .herc-submenu-back-btn svg {
        stroke: #253461 !important;
    }
    .herc-menu-close-btn:hover svg,
    .herc-submenu-back-btn:hover svg {
        stroke: #469ADC !important;
    }

    .herc-submenu-title {
        padding: 20px;
        font-family: 'Jost', sans-serif;
        font-size: 20px;
        font-weight: 600;
        color: #253461;
        text-transform: uppercase;
        border-bottom: 1px solid #e5e7eb;
    }

    .herc-submenu-content {
        flex: 1;
        overflow-y: auto;
        padding: 10px 0;
    }

    .herc-submenu-item {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 12px 20px;
        text-decoration: none;
        transition: background-color 0.2s;
    }
    .herc-submenu-item:hover { background-color: #f9fafb; }

    .herc-submenu-item img {
        width: 24px !important;
        height: 24px !important;
        object-fit: contain;
        flex-shrink: 0;
    }

    .herc-submenu-item span {
        font-family: 'Jost', sans-serif;
        font-size: 15px;
        font-weight: 400;
        color: #253461;
    }
    .herc-submenu-item:hover span { color: #469ADC; }
    </style>
    <?php
}

/* =========================================================================
 * 3. HTML (wp_body_open hook, priority 1)
 * ========================================================================= */

add_action('wp_body_open', 'hercules_custom_header_html', 1);
function hercules_custom_header_html() {
    $menu_data  = hercules_custom_header_get_menu_items();
    $sportarten = isset($menu_data['sportarten']) ? $menu_data['sportarten'] : array();
    $produkte   = isset($menu_data['produkte'])   ? $menu_data['produkte']   : array();
    $themen     = isset($menu_data['themen'])      ? $menu_data['themen']      : array();

    $google_badge_url = '/wp-content/uploads/2025/04/google-reviews-badge.svg';
    $logo_url         = '/wp-content/uploads/2025/04/hercules-logo-original1.png';

    $contact_popup_href = '#elementor-action%3Aaction%3Dpopup%3Aopen%26settings%3DeyJpZCI6IjU3MzUiLCJ0b2dnbGUiOmZhbHNlfQ%3D%3D';

    $mobile_menus = array(
        'sportarten' => array('title' => 'Sports', 'items' => $sportarten),
        'produkte'   => array('title' => 'Produits', 'items' => $produkte),
        'themen'     => array('title' => 'Thèmes', 'items' => $themen),
    );

    $direct_links = array(
        array('label' => 'VÊTEMENTS DE SPORT', 'href' => '/collections/equipements-personnalises/'),
        array('label' => 'ÉCHARPES', 'href' => '/collections/echarpes-personnalisees/'),
        array('label' => 'COUVRE-CHEFS', 'href' => '/collections/couvre-chefs/'),
        array('label' => 'BONNETS', 'href' => '/collections/bonnets-personnalises-football/'),
    );
    ?>
    <!-- Hercules Custom Header v1.1.0 -->

    <!-- ===== DESKTOP HEADER ===== -->
    <header class="herc-header" id="herc-header" role="banner">

        <!-- ROW 1: Top Bar -->
        <div class="herc-topbar">
            <div class="herc-topbar-inner">
                <div class="herc-topbar-usps">
                    <span class="herc-usp">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="#23C3FF"><path d="M200.77,53.89A103.27,103.27,0,0,0,128,24h-1.07A104,104,0,0,0,24,128c0,43,26.58,79.06,69.36,94.17A32,32,0,0,0,136,192a16,16,0,0,1,16-16h46.21a31.81,31.81,0,0,0,31.2-24.88,104.43,104.43,0,0,0,2.59-24A103.28,103.28,0,0,0,200.77,53.89Zm13,93.71A15.89,15.89,0,0,1,198.21,160H152a32,32,0,0,0-32,32,16,16,0,0,1-21.31,15.07C62.49,194.3,40,164,40,128a88,88,0,0,1,87.09-88h.9a88.35,88.35,0,0,1,88,87.25A88.86,88.86,0,0,1,213.81,147.6ZM140,76a12,12,0,1,1-12-12A12,12,0,0,1,140,76ZM96,100A12,12,0,1,1,84,88,12,12,0,0,1,96,100Zm0,56a12,12,0,1,1-12-12A12,12,0,0,1,96,156Zm88-56a12,12,0,1,1-12-12A12,12,0,0,1,184,100Z"></path></svg>
                        Service de conception gratuit
                    </span>
                    <span class="herc-usp">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="#23C3FF"><path d="M255.42,117l-14-35A15.93,15.93,0,0,0,226.58,72H192V64a8,8,0,0,0-8-8H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H49a32,32,0,0,0,62,0h50a32,32,0,0,0,62,0h17a16,16,0,0,0,16-16V120A7.94,7.94,0,0,0,255.42,117ZM192,88h34.58l9.6,24H192ZM32,72H176v64H32ZM80,208a16,16,0,1,1,16-16A16,16,0,0,1,80,208Zm81-24H111a32,32,0,0,0-62,0H32V152H176v12.31A32.11,32.11,0,0,0,161,184Zm31,24a16,16,0,1,1,16-16A16,16,0,0,1,192,208Zm48-24H223a32.06,32.06,0,0,0-31-24V128h48Z"></path></svg>
                        Livraison gratuite
                    </span>
                    <span class="herc-usp">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="#23C3FF"><path d="M232,64H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8V64H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4,.39,8Zm144-8.9c0,35.52-29,64.64-64,64.9a64,64,0,0,1-64-64V56H192ZM232,96a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z"></path></svg>
                        90%+ Fabriqué en Europe
                    </span>
                    <a href="/collections/durable/" class="herc-usp">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M27.9308 5.00875C27.9165 4.76411 27.8129 4.53323 27.6396 4.35994C27.4664 4.18666 27.2355 4.08304 26.9908 4.06875C17.4746 3.51 9.85208 6.375 6.60208 11.75C5.47554 13.5886 4.9204 15.7204 5.00708 17.875C5.07833 19.865 5.65833 21.875 6.73083 23.8563L4.29208 26.2938C4.10444 26.4814 3.99902 26.7359 3.99902 27.0012C3.99902 27.2666 4.10444 27.5211 4.29208 27.7087C4.47972 27.8964 4.73422 28.0018 4.99958 28.0018C5.26494 28.0018 5.51944 27.8964 5.70708 27.7087L8.14458 25.27C10.1246 26.3413 12.1358 26.9213 14.1246 26.9925C14.2637 26.9975 14.4025 27 14.5408 27C16.5555 27.0054 18.532 26.4506 20.2496 25.3975C25.6246 22.1475 28.4908 14.5263 27.9308 5.00875ZM19.2183 23.6875C16.3746 25.41 13.0083 25.4375 9.62958 23.7838L20.7083 12.7063C20.8012 12.6133 20.8749 12.503 20.9252 12.3816C20.9755 12.2603 21.0014 12.1301 21.0014 11.9987C21.0014 11.8674 20.9755 11.7372 20.9252 11.6159C20.8749 11.4945 20.8012 11.3842 20.7083 11.2913C20.6154 11.1983 20.5051 11.1246 20.3837 11.0744C20.2623 11.0241 20.1322 10.9982 20.0008 10.9982C19.8694 10.9982 19.7393 11.0241 19.6179 11.0744C19.4965 11.1246 19.3862 11.1983 19.2933 11.2913L8.21583 22.375C6.56708 19 6.59083 15.625 8.31208 12.7863C11.0733 8.2275 17.6371 5.73125 25.9758 6.02875C26.2746 14.3613 23.7771 20.9262 19.2183 23.6875Z" fill="#10A380"></path></svg>
                        Produits durables disponibles
                    </a>
                </div>
                <div class="herc-topbar-reviews">
                    <?php
                    if (function_exists('hercules_get_google_badge_html')) {
                        echo hercules_get_google_badge_html('/#review-section');
                    } else {
                    ?>
                    <a href="/#review-section" title="Google Reviews">
                        <img src="<?php echo esc_url($google_badge_url); ?>" alt="Google Reviews" height="30" />
                    </a>
                    <?php } ?>
                </div>
            </div>
        </div>

        <!-- ROW 2: Main Header -->
        <div class="herc-main">
            <div class="herc-main-inner">
                <div class="herc-logo-wrap">
                    <a href="/">
                        <img src="<?php echo esc_url($logo_url); ?>" alt="Hercules Merchandise" width="172" height="76" />
                    </a>
                </div>
                <div class="herc-search-wrap">
                    <form role="search" action="/" method="get" class="herc-search-form">
                        <input type="text" name="s" placeholder="Rechercher des produits..." class="herc-search-input" autocomplete="off" />
                        <button type="submit" class="herc-search-btn" aria-label="Search">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 22 22" fill="none">
                                <path d="M21.3248 20.1752L16.2396 15.0909C17.7135 13.3214 18.4485 11.0518 18.2916 8.75419C18.1347 6.45658 17.0981 4.3079 15.3974 2.75513C13.6967 1.20236 11.4628 0.365042 9.16039 0.417367C6.85803 0.469692 4.66448 1.40763 3.03605 3.03606C1.40761 4.6645 0.469677 6.85805 0.417352 9.16041C0.365027 11.4628 1.20234 13.6967 2.75512 15.3974C4.30789 17.0981 6.45657 18.1348 8.75417 18.2916C11.0518 18.4485 13.3214 17.7135 15.0909 16.2396L20.1751 21.3249C20.2506 21.4003 20.3403 21.4602 20.4389 21.5011C20.5375 21.5419 20.6432 21.563 20.75 21.563C20.8567 21.563 20.9625 21.5419 21.0611 21.5011C21.1597 21.4602 21.2493 21.4003 21.3248 21.3249C21.4003 21.2494 21.4602 21.1597 21.5011 21.0611C21.5419 20.9625 21.5629 20.8568 21.5629 20.75C21.5629 20.6432 21.5419 20.5375 21.5011 20.4389C21.4602 20.3403 21.4003 20.2507 21.3248 20.1752ZM2.06249 9.375C2.06249 7.92873 2.49136 6.51493 3.29487 5.3124C4.09837 4.10986 5.24043 3.1726 6.57662 2.61913C7.9128 2.06567 9.3831 1.92086 10.8016 2.20301C12.2201 2.48517 13.523 3.18161 14.5457 4.20428C15.5684 5.22696 16.2648 6.52992 16.547 7.94841C16.8291 9.36689 16.6843 10.8372 16.1309 12.1734C15.5774 13.5096 14.6401 14.6516 13.4376 15.4551C12.2351 16.2586 10.8213 16.6875 9.37499 16.6875C7.43625 16.6854 5.57754 15.9142 4.20664 14.5433C2.83575 13.1725 2.06464 11.3137 2.06249 9.375Z" fill="#253461"/>
                            </svg>
                        </button>
                    </form>
                    <div class="herc-search-results" id="herc-search-results"></div>
                </div>
                <div class="herc-icons">
                    <a href="/mon-compte/" class="herc-icon-btn herc-account-btn" aria-label="Mon compte" title="Mon compte">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 29 29" fill="none">
                            <path d="M26.1586 24.0156C24.4333 21.0329 21.7746 18.8942 18.6718 17.8803C20.2066 16.9667 21.399 15.5744 22.0659 13.9175C22.7329 12.2606 22.8375 10.4305 22.3637 8.70833C21.8899 6.98618 20.8639 5.46717 19.4432 4.38458C18.0226 3.30198 16.2858 2.71567 14.4997 2.71567C12.7135 2.71567 10.9768 3.30198 9.55609 4.38458C8.13542 5.46717 7.1094 6.98618 6.6356 8.70833C6.16179 10.4305 6.2664 12.2606 6.93335 13.9175C7.60031 15.5744 8.79273 16.9667 10.3275 17.8803C7.22473 18.893 4.56602 21.0318 2.84074 24.0156C2.77748 24.1188 2.73551 24.2336 2.71732 24.3532C2.69914 24.4729 2.7051 24.5949 2.73485 24.7122C2.76461 24.8295 2.81756 24.9397 2.89058 25.0362C2.9636 25.1327 3.05521 25.2136 3.16 25.2742C3.26479 25.3347 3.38065 25.3736 3.50073 25.3886C3.62081 25.4037 3.74269 25.3945 3.85917 25.3617C3.97565 25.3288 4.08437 25.273 4.17892 25.1975C4.27347 25.1219 4.35194 25.0282 4.40969 24.9219C6.54391 21.2334 10.3162 19.0312 14.4997 19.0312C18.6831 19.0312 22.4554 21.2334 24.5896 24.9219C24.6474 25.0282 24.7258 25.1219 24.8204 25.1975C24.9149 25.273 25.0237 25.3288 25.1401 25.3617C25.2566 25.3945 25.3785 25.4037 25.4986 25.3886C25.6187 25.3736 25.7345 25.3347 25.8393 25.2742C25.9441 25.2136 26.0357 25.1327 26.1087 25.0362C26.1817 24.9397 26.2347 24.8295 26.2644 24.7122C26.2942 24.5949 26.3002 24.4729 26.282 24.3532C26.2638 24.2336 26.2218 24.1188 26.1586 24.0156ZM8.1559 10.875C8.1559 9.62032 8.52795 8.39383 9.22502 7.3506C9.92208 6.30738 10.9128 5.49428 12.072 5.01414C13.2312 4.534 14.5067 4.40837 15.7373 4.65314C16.9678 4.89792 18.0982 5.5021 18.9854 6.38929C19.8725 7.27648 20.4767 8.40683 20.7215 9.6374C20.9663 10.868 20.8407 12.1435 20.3605 13.3026C19.8804 14.4618 19.0673 15.4526 18.024 16.1496C16.9808 16.8467 15.7543 17.2188 14.4997 17.2188C12.8177 17.217 11.2052 16.548 10.0159 15.3587C8.82664 14.1694 8.1577 12.5569 8.1559 10.875Z" fill="#253461"/>
                        </svg>
                        <span class="herc-logged-in-dot" id="herc-logged-in-dot"></span>
                    </a>
                    <a href="/liste-de-souhaits/" class="herc-icon-btn herc-wishlist-btn" aria-label="Liste de souhaits" title="Liste de souhaits">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                            <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" fill="#253461"/>
                        </svg>
                        <span class="herc-wishlist-badge" id="herc-wishlist-badge">0</span>
                    </a>
                    <div class="herc-cart-wrap">
                        <button type="button" class="herc-icon-btn herc-cart-btn" id="herc-cart-toggle" aria-label="Cart" aria-expanded="false" title="Cart">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 31 31" fill="none">
                                <path d="M12.5938 26.1562C12.5938 26.5395 12.4801 26.914 12.2672 27.2327C12.0543 27.5513 11.7517 27.7996 11.3977 27.9463C11.0437 28.0929 10.6541 28.1313 10.2783 28.0565C9.90242 27.9818 9.5572 27.7972 9.28623 27.5263C9.01527 27.2553 8.83074 26.9101 8.75598 26.5342C8.68122 26.1584 8.71959 25.7688 8.86623 25.4148C9.01288 25.0608 9.26121 24.7582 9.57983 24.5453C9.89845 24.3324 10.273 24.2188 10.6562 24.2188C11.1701 24.2188 11.6629 24.4229 12.0263 24.7862C12.3896 25.1496 12.5938 25.6424 12.5938 26.1562ZM23.25 24.2188C22.8668 24.2188 22.4922 24.3324 22.1736 24.5453C21.855 24.7582 21.6066 25.0608 21.46 25.4148C21.3133 25.7688 21.275 26.1584 21.3497 26.5342C21.4245 26.9101 21.609 27.2553 21.88 27.5263C22.1509 27.7972 22.4962 27.9818 22.872 28.0565C23.2479 28.1313 23.6374 28.0929 23.9914 27.9463C24.3455 27.7996 24.6481 27.5513 24.861 27.2327C25.0739 26.914 25.1875 26.5395 25.1875 26.1562C25.1875 25.6424 24.9834 25.1496 24.62 24.7862C24.2567 24.4229 23.7639 24.2188 23.25 24.2188ZM29.0274 8.97789L25.9225 20.1524C25.7518 20.7628 25.3867 21.3009 24.8826 21.6851C24.3784 22.0693 23.7627 22.2786 23.1289 22.2812H11.16C10.5243 22.281 9.90613 22.0728 9.39978 21.6884C8.89343 21.3041 8.52668 20.7646 8.35547 20.1524L4.1075 4.84375H1.9375C1.68057 4.84375 1.43417 4.74169 1.25249 4.56001C1.07081 4.37833 0.96875 4.13193 0.96875 3.875C0.96875 3.61807 1.07081 3.37167 1.25249 3.18999C1.43417 3.00831 1.68057 2.90625 1.9375 2.90625H4.84375C5.05554 2.90621 5.26152 2.97558 5.43014 3.10374C5.59875 3.2319 5.72073 3.41178 5.77738 3.61586L6.92535 7.75H28.0938C28.2431 7.74997 28.3904 7.78447 28.5242 7.85081C28.658 7.91714 28.7747 8.01352 28.8651 8.1324C28.9555 8.25129 29.0172 8.38946 29.0453 8.53613C29.0735 8.6828 29.0673 8.83399 29.0274 8.97789ZM26.8186 9.6875H7.46422L10.2264 19.6341C10.283 19.8382 10.405 20.0181 10.5736 20.1463C10.7422 20.2744 10.9482 20.3438 11.16 20.3438H23.1289C23.3407 20.3438 23.5467 20.2744 23.7153 20.1463C23.8839 20.0181 24.0059 19.8382 24.0625 19.6341L26.8186 9.6875Z" fill="#253461"/>
                            </svg>
                            <span class="herc-cart-badge" id="herc-cart-badge">0</span>
                        </button>
                        <div class="herc-minicart" id="herc-minicart">
                            <p class="herc-minicart-empty">Votre panier est vide.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ROW 3: Navigation -->
        <nav class="herc-nav" aria-label="Main navigation">
            <div class="herc-nav-inner">
                <div class="herc-nav-menu">
                    <?php foreach ($mobile_menus as $key => $menu) : ?>
                    <div class="herc-nav-item" data-menu="<?php echo esc_attr($key); ?>">
                        <button class="herc-nav-btn" aria-expanded="false" aria-haspopup="true">
                            <?php echo esc_html(strtoupper($menu['title'])); ?>
                            <svg class="herc-nav-arrow" viewBox="0 0 320 512"><path d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"/></svg>
                        </button>
                        <div class="herc-mega-menu">
                            <div class="herc-mega-inner">
                                <ul class="herc-mega-list">
                                    <?php foreach ($menu['items'] as $item) : ?>
                                    <li>
                                        <a href="<?php echo esc_url($item['url']); ?>">
                                            <?php if (!empty($item['icon_url'])) : ?>
                                            <img src="<?php echo esc_url($item['icon_url']); ?>" alt="" width="24" height="24" loading="lazy" />
                                            <?php endif; ?>
                                            <span><?php echo esc_html($item['title']); ?></span>
                                        </a>
                                    </li>
                                    <?php endforeach; ?>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>

                    <?php foreach ($direct_links as $link) : ?>
                    <a href="<?php echo esc_url($link['href']); ?>" class="herc-nav-direct"><?php echo esc_html($link['label']); ?></a>
                    <?php endforeach; ?>
                </div>
                <a href="<?php echo esc_attr($contact_popup_href); ?>" class="herc-nav-cta">CONTACT</a>
            </div>
        </nav>

    </header>
    <!-- /Desktop Header -->

    <!-- ===== MOBILE HEADER ===== -->
    <header class="herc-mobile-header" id="herc-mobile-header">
        <!-- Top Bar - Google Reviews Badge -->
        <div class="herc-mobile-topbar">
            <div class="herc-mobile-topbar-reviews">
                <?php
                if (function_exists('hercules_get_google_badge_html')) {
                    echo hercules_get_google_badge_html('/#review-section');
                } else {
                ?>
                <a href="/#review-section" title="Google Reviews">
                    <img src="<?php echo esc_url($google_badge_url); ?>" alt="Google Reviews" />
                </a>
                <?php } ?>
            </div>
        </div>

        <!-- Logo & Actions Row -->
        <div class="herc-mobile-inner">
            <div class="herc-mobile-logo-wrap">
                <a href="/">
                    <img src="<?php echo esc_url($logo_url); ?>" alt="Hercules Merchandise" width="140" height="63" />
                </a>
            </div>
            <div class="herc-mobile-actions">
                <!-- Search Button -->
                <button class="herc-mobile-btn herc-mobile-search-btn" aria-label="Search" id="herc-mobile-search-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M21.3248 20.1752L16.2396 15.0909C17.7135 13.3214 18.4485 11.0518 18.2916 8.75419C18.1347 6.45658 17.0981 4.3079 15.3974 2.75513C13.6967 1.20236 11.4628 0.365042 9.16039 0.417367C6.85803 0.469692 4.66448 1.40763 3.03605 3.03606C1.40761 4.6645 0.469677 6.85805 0.417352 9.16041C0.365027 11.4628 1.20234 13.6967 2.75512 15.3974C4.30789 17.0981 6.45657 18.1348 8.75417 18.2916C11.0518 18.4485 13.3214 17.7135 15.0909 16.2396L20.1751 21.3249C20.2506 21.4003 20.3403 21.4602 20.4389 21.5011C20.5375 21.5419 20.6432 21.563 20.75 21.563C20.8567 21.563 20.9625 21.5419 21.0611 21.5011C21.1597 21.4602 21.2493 21.4003 21.3248 21.3249C21.4003 21.2494 21.4602 21.1597 21.5011 21.0611C21.5419 20.9625 21.5629 20.8568 21.5629 20.75C21.5629 20.6432 21.5419 20.5375 21.5011 20.4389C21.4602 20.3403 21.4003 20.2507 21.3248 20.1752ZM2.06249 9.375C2.06249 7.92873 2.49136 6.51493 3.29487 5.3124C4.09837 4.10986 5.24043 3.1726 6.57662 2.61913C7.9128 2.06567 9.3831 1.92086 10.8016 2.20301C12.2201 2.48517 13.523 3.18161 14.5457 4.20428C15.5684 5.22696 16.2648 6.52992 16.547 7.94841C16.8291 9.36689 16.6843 10.8372 16.1309 12.1734C15.5774 13.5096 14.6401 14.6516 13.4376 15.4551C12.2351 16.2586 10.8213 16.6875 9.37499 16.6875C7.43625 16.6854 5.57754 15.9142 4.20664 14.5433C2.83575 13.1725 2.06464 11.3137 2.06249 9.375Z" fill="#253461"/>
                    </svg>
                </button>

                <!-- Contact Button -->
                <a href="/contactez-nous/" class="herc-mobile-btn herc-mobile-contact-btn" aria-label="Contact">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M19.25 3.4375H2.75C2.38533 3.4375 2.03559 3.58237 1.77773 3.84023C1.51987 4.09809 1.375 4.44783 1.375 4.8125V17.1875C1.375 17.5522 1.51987 17.9019 1.77773 18.1598C2.03559 18.4176 2.38533 18.5625 2.75 18.5625H19.25C19.6147 18.5625 19.9644 18.4176 20.2223 18.1598C20.4801 17.9019 20.625 17.5522 20.625 17.1875V4.8125C20.625 4.44783 20.4801 4.09809 20.2223 3.84023C19.9644 3.58237 19.6147 3.4375 19.25 3.4375ZM17.7031 4.8125L11 9.97656L4.29688 4.8125H17.7031ZM2.75 17.1875V5.46797L10.5531 11.4797C10.6876 11.5834 10.8514 11.6396 11.0198 11.6396C11.1882 11.6396 11.352 11.5834 11.4865 11.4797L19.25 5.46797V17.1875H2.75Z" fill="currentColor"/>
                    </svg>
                </a>

                <!-- Hamburger Menu -->
                <button class="herc-mobile-hamburger" id="herc-mobile-menu-toggle" aria-label="Menu">&#9776;</button>
            </div>
        </div>
    </header>
    <!-- /Mobile Header -->

    <!-- ===== MOBILE SEARCH OVERLAY ===== -->
    <div class="herc-mobile-search-overlay" id="herc-mobile-search-overlay">
        <div class="herc-mobile-search-container">
            <button class="herc-mobile-search-close" id="herc-mobile-search-close" aria-label="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <div class="herc-search-wrap" style="margin:0;">
                <form role="search" action="/" method="get" class="herc-search-form" id="herc-mobile-search-form">
                    <input type="text" name="s" placeholder="Rechercher des produits..." class="herc-search-input" id="herc-mobile-search-input" autocomplete="off" />
                    <button type="submit" class="herc-search-btn" aria-label="Search">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 22 22" fill="none">
                            <path d="M21.3248 20.1752L16.2396 15.0909C17.7135 13.3214 18.4485 11.0518 18.2916 8.75419C18.1347 6.45658 17.0981 4.3079 15.3974 2.75513C13.6967 1.20236 11.4628 0.365042 9.16039 0.417367C6.85803 0.469692 4.66448 1.40763 3.03605 3.03606C1.40761 4.6645 0.469677 6.85805 0.417352 9.16041C0.365027 11.4628 1.20234 13.6967 2.75512 15.3974C4.30789 17.0981 6.45657 18.1348 8.75417 18.2916C11.0518 18.4485 13.3214 17.7135 15.0909 16.2396L20.1751 21.3249C20.2506 21.4003 20.3403 21.4602 20.4389 21.5011C20.5375 21.5419 20.6432 21.563 20.75 21.563C20.8567 21.563 20.9625 21.5419 21.0611 21.5011C21.1597 21.4602 21.2493 21.4003 21.3248 21.3249C21.4003 21.2494 21.4602 21.1597 21.5011 21.0611C21.5419 20.9625 21.5629 20.8568 21.5629 20.75C21.5629 20.6432 21.5419 20.5375 21.5011 20.4389C21.4602 20.3403 21.4003 20.2507 21.3248 20.1752ZM2.06249 9.375C2.06249 7.92873 2.49136 6.51493 3.29487 5.3124C4.09837 4.10986 5.24043 3.1726 6.57662 2.61913C7.9128 2.06567 9.3831 1.92086 10.8016 2.20301C12.2201 2.48517 13.523 3.18161 14.5457 4.20428C15.5684 5.22696 16.2648 6.52992 16.547 7.94841C16.8291 9.36689 16.6843 10.8372 16.1309 12.1734C15.5774 13.5096 14.6401 14.6516 13.4376 15.4551C12.2351 16.2586 10.8213 16.6875 9.37499 16.6875C7.43625 16.6854 5.57754 15.9142 4.20664 14.5433C2.83575 13.1725 2.06464 11.3137 2.06249 9.375Z" fill="#253461"/>
                        </svg>
                    </button>
                </form>
                <div class="herc-search-results" id="herc-mobile-search-results"></div>
            </div>
        </div>
    </div>
    <!-- /Mobile Search Overlay -->

    <!-- ===== MOBILE SLIDE-OUT MENU ===== -->
    <div id="herc-mobile-menu" class="herc-mobile-menu">
        <div class="herc-mobile-menu-overlay" id="herc-mobile-menu-overlay"></div>

        <div class="herc-mobile-menu-panel">
            <!-- Main Menu Panel -->
            <div class="herc-menu-panel herc-main-panel" id="herc-main-panel">
                <div class="herc-mobile-menu-header">
                    <img src="<?php echo esc_url($logo_url); ?>" alt="Hercules Merchandise" width="176" height="78" />
                    <button id="herc-mobile-menu-close" class="herc-menu-close-btn" aria-label="Close menu">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="herc-menu-content">
                    <?php foreach ($mobile_menus as $key => $menu) : ?>
                    <button class="herc-menu-item herc-has-submenu" data-submenu="<?php echo esc_attr($key); ?>">
                        <span class="herc-menu-item-label"><?php echo esc_html($menu['title']); ?></span>
                        <svg class="herc-menu-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                    </button>
                    <?php endforeach; ?>

                    <?php foreach ($direct_links as $link) : ?>
                    <a href="<?php echo esc_url($link['href']); ?>" class="herc-menu-item">
                        <span class="herc-menu-item-label"><?php echo esc_html($link['label']); ?></span>
                    </a>
                    <?php endforeach; ?>


                    <a href="/panier/" class="herc-menu-item">
                        <span class="herc-menu-item-label">Panier</span>
                    </a>

                    <a href="/generateur-de-devis/" class="herc-menu-item">
                        <span class="herc-menu-item-label">Générateur de devis</span>
                    </a>
                    <a href="/liste-de-souhaits/" class="herc-menu-item herc-menu-wishlist">
                        <span class="herc-menu-item-label">
                            <svg class="herc-menu-wishlist-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            Liste de souhaits
                        </span>
                    </a>

                    <div class="herc-menu-cta">
                        <a href="/contactez-nous/" class="herc-menu-cta-btn">Contactez-nous</a>
                    </div>

                    <div class="herc-mobile-usp-bar">
                        <div class="herc-mobile-usp-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path d="M200.77,53.89A103.27,103.27,0,0,0,128,24h-1.07A104,104,0,0,0,24,128c0,43,26.58,79.06,69.36,94.17A32,32,0,0,0,136,192a16,16,0,0,1,16-16h46.21a31.81,31.81,0,0,0,31.2-24.88,104.43,104.43,0,0,0,2.59-24A103.28,103.28,0,0,0,200.77,53.89Zm13,93.71A15.89,15.89,0,0,1,198.21,160H152a32,32,0,0,0-32,32,16,16,0,0,1-21.31,15.07C62.49,194.3,40,164,40,128a88,88,0,0,1,87.09-88h.9a88.35,88.35,0,0,1,88,87.25A88.86,88.86,0,0,1,213.81,147.6ZM140,76a12,12,0,1,1-12-12A12,12,0,0,1,140,76ZM96,100A12,12,0,1,1,84,88,12,12,0,0,1,96,100Zm0,56a12,12,0,1,1-12-12A12,12,0,0,1,96,156Zm88-56a12,12,0,1,1-12-12A12,12,0,0,1,184,100Z"></path></svg>
                            <span>Service de conception gratuit</span>
                        </div>
                        <div class="herc-mobile-usp-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path d="M255.42,117l-14-35A15.93,15.93,0,0,0,226.58,72H192V64a8,8,0,0,0-8-8H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H49a32,32,0,0,0,62,0h50a32,32,0,0,0,62,0h17a16,16,0,0,0,16-16V120A7.94,7.94,0,0,0,255.42,117ZM192,88h34.58l9.6,24H192ZM32,72H176v64H32ZM80,208a16,16,0,1,1,16-16A16,16,0,0,1,80,208Zm81-24H111a32,32,0,0,0-62,0H32V152H176v12.31A32.11,32.11,0,0,0,161,184Zm31,24a16,16,0,1,1,16-16A16,16,0,0,1,192,208Zm48-24H223a32.06,32.06,0,0,0-31-24V128h48Z"></path></svg>
                            <span>Livraison gratuite</span>
                        </div>
                        <div class="herc-mobile-usp-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256"><path d="M232,64H208V48a8,8,0,0,0-8-8H56a8,8,0,0,0-8,8V64H24A16,16,0,0,0,8,80V96a40,40,0,0,0,40,40h3.65A80.13,80.13,0,0,0,120,191.61V216H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16H136V191.58c31.94-3.23,58.44-25.64,68.08-55.58H208a40,40,0,0,0,40-40V80A16,16,0,0,0,232,64ZM48,120A24,24,0,0,1,24,96V80H48v32q0,4,.39,8Zm144-8.9c0,35.52-29,64.64-64,64.9a64,64,0,0,1-64-64V56H192ZM232,96a24,24,0,0,1-24,24h-.5a81.81,81.81,0,0,0,.5-8.9V80h24Z"></path></svg>
                            <span>90%+ Fabriqué en Europe</span>
                        </div>
                        <a href="/collections/durable/" class="herc-mobile-usp-item herc-mobile-usp-sustainable">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M27.9308 5.00875C27.9165 4.76411 27.8129 4.53323 27.6396 4.35994C27.4664 4.18666 27.2355 4.08304 26.9908 4.06875C17.4746 3.51 9.85208 6.375 6.60208 11.75C5.47554 13.5886 4.9204 15.7204 5.00708 17.875C5.07833 19.865 5.65833 21.875 6.73083 23.8563L4.29208 26.2938C4.10444 26.4814 3.99902 26.7359 3.99902 27.0012C3.99902 27.2666 4.10444 27.5211 4.29208 27.7087C4.47972 27.8964 4.73422 28.0018 4.99958 28.0018C5.26494 28.0018 5.51944 27.8964 5.70708 27.7087L8.14458 25.27C10.1246 26.3413 12.1358 26.9213 14.1246 26.9925C14.2637 26.9975 14.4025 27 14.5408 27C16.5555 27.0054 18.532 26.4506 20.2496 25.3975C25.6246 22.1475 28.4908 14.5263 27.9308 5.00875ZM19.2183 23.6875C16.3746 25.41 13.0083 25.4375 9.62958 23.7838L20.7083 12.7063C20.8012 12.6133 20.8749 12.503 20.9252 12.3816C20.9755 12.2603 21.0014 12.1301 21.0014 11.9987C21.0014 11.8674 20.9755 11.7372 20.9252 11.6159C20.8749 11.4945 20.8012 11.3842 20.7083 11.2913C20.6154 11.1983 20.5051 11.1246 20.3837 11.0744C20.2623 11.0241 20.1322 10.9982 20.0008 10.9982C19.8694 10.9982 19.7393 11.0241 19.6179 11.0744C19.4965 11.1246 19.3862 11.1983 19.2933 11.2913L8.21583 22.375C6.56708 19 6.59083 15.625 8.31208 12.7863C11.0733 8.2275 17.6371 5.73125 25.9758 6.02875C26.2746 14.3613 23.7771 20.9262 19.2183 23.6875Z" fill="#10A380"></path></svg>
                            <span>Produits durables disponibles</span>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Submenu Panels -->
            <?php foreach ($mobile_menus as $key => $menu) : ?>
            <div class="herc-menu-panel herc-sub-panel" id="herc-submenu-<?php echo esc_attr($key); ?>" data-panel="<?php echo esc_attr($key); ?>">
                <div class="herc-submenu-header">
                    <button class="herc-submenu-back-btn" data-back="<?php echo esc_attr($key); ?>">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                        </svg>
                        <span>Retour</span>
                    </button>
                    <button class="herc-menu-close-btn herc-submenu-close-btn" aria-label="Close menu">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="herc-submenu-title"><?php echo esc_html($menu['title']); ?></div>
                <div class="herc-submenu-content">
                    <?php foreach ($menu['items'] as $item) : ?>
                    <a href="<?php echo esc_url($item['url']); ?>" class="herc-submenu-item">
                        <?php if (!empty($item['icon_url'])) : ?>
                        <img src="<?php echo esc_url($item['icon_url']); ?>" alt="" width="24" height="24" loading="lazy" />
                        <?php endif; ?>
                        <span><?php echo esc_html($item['title']); ?></span>
                    </a>
                    <?php endforeach; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    </div>
    <!-- /Mobile Menu -->

    <?php
}

/* =========================================================================
 * 4. JAVASCRIPT (wp_footer hook)
 * ========================================================================= */

add_action('wp_footer', 'hercules_custom_header_js', 20);
function hercules_custom_header_js() {
    ?>
    <script id="hercules-custom-header-js">
    (function() {
        'use strict';

        document.addEventListener('DOMContentLoaded', function() {
            var header = document.getElementById('herc-header');

            /* ================================================
             * DESKTOP: Mega Menu hover show/hide
             * ================================================ */
            if (header) {
                var navItems = header.querySelectorAll('.herc-nav-item');

                navItems.forEach(function(navItem) {
                    var btn  = navItem.querySelector('.herc-nav-btn');
                    var menu = navItem.querySelector('.herc-mega-menu');
                    if (!btn || !menu) return;

                    navItem.addEventListener('mouseenter', function() {
                        btn.setAttribute('aria-expanded', 'true');
                    });
                    navItem.addEventListener('mouseleave', function() {
                        btn.setAttribute('aria-expanded', 'false');
                    });

                    btn.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            var isOpen = btn.getAttribute('aria-expanded') === 'true';
                            btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
                            if (isOpen) {
                                menu.style.opacity = '0';
                                menu.style.visibility = 'hidden';
                                menu.style.transform = 'translateY(-10px)';
                            } else {
                                menu.style.opacity = '1';
                                menu.style.visibility = 'visible';
                                menu.style.transform = 'translateY(0)';
                            }
                        }
                    });
                });
            }

            /* ================================================
             * Session API: cart count, login indicator
             * ================================================ */
            var hercCartData = null;

            function updateSessionUI() {
                fetch('/wp-json/hercules/v1/session', { credentials: 'include' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.cart) hercCartData = data.cart;

                    var cartBadge = document.getElementById('herc-cart-badge');
                    if (cartBadge) {
                        var c = (data.cart && data.cart.count) ? data.cart.count : 0;
                        if (c > 0) { cartBadge.textContent = c > 99 ? '99+' : c; cartBadge.style.display = 'flex'; }
                        else { cartBadge.style.display = 'none'; }
                    }

                    var loginDot = document.getElementById('herc-logged-in-dot');
                    if (loginDot) { loginDot.style.display = data.logged_in === true ? 'block' : 'none'; }

                    var mc = document.getElementById('herc-minicart');
                    if (mc && mc.classList.contains('active')) renderMiniCart();
                })
                .catch(function() {});
            }

            updateSessionUI();
            document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') updateSessionUI(); });
            window.addEventListener('hercules:cart-updated', updateSessionUI);

            /* ================================================
             * Mini Cart Dropdown
             * ================================================ */
            function renderMiniCart() {
                var mc = document.getElementById('herc-minicart');
                if (!mc) return;
                if (!hercCartData || !hercCartData.items || hercCartData.items.length === 0) {
                    mc.innerHTML = '<p class="herc-minicart-empty">Votre panier est vide.</p>';
                    return;
                }
                var items = hercCartData.items;
                var html = '<ul class="herc-minicart-list">';
                items.forEach(function(item) {
                    var name = (item.name || '').split(' - ')[0];
                    var thumb = item.thumbnail || '';
                    var link = item.permalink || '/products/';
                    var price = item.price || '';
                    var qty = item.quantity || 1;
                    html += '<li class="herc-minicart-item"><a href="' + link + '">';
                    if (thumb) html += '<img src="' + thumb + '" alt="' + name.replace(/"/g, '&quot;') + '" class="herc-minicart-thumb" />';
                    html += '<div class="herc-minicart-info"><p class="herc-minicart-name">' + name + '</p><p class="herc-minicart-price">' + qty + ' x ' + price + '</p></div></a>';
                    html += '<button type="button" class="herc-minicart-remove" data-key="' + (item.key || '') + '" aria-label="Remove" title="Remove">&times;</button></li>';
                });
                html += '</ul><div class="herc-minicart-subtotal"><span>Sous-total :</span><strong>' + (hercCartData.subtotal || '') + '</strong></div>';
                html += '<div class="herc-minicart-buttons"><a href="/generateur-de-devis/" class="herc-minicart-btn herc-minicart-btn--quote">GÉNÉRATEUR DE DEVIS</a>';
                html += '<a href="/panier/" class="herc-minicart-btn herc-minicart-btn--cart">VOIR LE PANIER</a></div>';
                mc.innerHTML = html;
                mc.querySelectorAll('.herc-minicart-remove').forEach(function(btn) {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault(); e.stopPropagation();
                        var key = btn.getAttribute('data-key');
                        if (key) removeCartItem(key, btn);
                    });
                });
            }

            function removeCartItem(key, btn) {
                if (btn) { btn.disabled = true; btn.textContent = '...'; }
                fetch('/wp-json/hercules/v1/cart/remove', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: key }) })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.success && data.cart) {
                        hercCartData = data.cart;
                        var badge = document.getElementById('herc-cart-badge');
                        if (badge) {
                            var c = data.cart.count || 0;
                            if (c > 0) { badge.textContent = c > 99 ? '99+' : c; badge.style.display = 'flex'; }
                            else { badge.style.display = 'none'; }
                        }
                        renderMiniCart();
                        window.dispatchEvent(new CustomEvent('hercules:cart-updated'));
                    }
                })
                .catch(function() { if (btn) { btn.disabled = false; btn.innerHTML = '&times;'; } });
            }

            var cartToggle = document.getElementById('herc-cart-toggle');
            var minicartDrop = document.getElementById('herc-minicart');
            if (cartToggle && minicartDrop) {
                cartToggle.addEventListener('click', function(e) {
                    e.preventDefault(); e.stopPropagation();
                    var isOpen = minicartDrop.classList.contains('active');
                    if (isOpen) { minicartDrop.classList.remove('active'); cartToggle.setAttribute('aria-expanded', 'false'); }
                    else { renderMiniCart(); minicartDrop.classList.add('active'); cartToggle.setAttribute('aria-expanded', 'true'); }
                });
                document.addEventListener('mousedown', function(e) {
                    var wrap = document.querySelector('.herc-cart-wrap');
                    if (wrap && !wrap.contains(e.target)) { minicartDrop.classList.remove('active'); cartToggle.setAttribute('aria-expanded', 'false'); }
                });
            }

            /* ================================================
             * Wishlist badge (localStorage)
             * ================================================ */
            function updateWishlistBadge() {
                var badge = document.getElementById('herc-wishlist-badge');
                if (!badge) return;
                try {
                    var stored = localStorage.getItem('hercules_wishlist');
                    if (stored) {
                        var items = JSON.parse(stored);
                        var c = Array.isArray(items) ? items.length : 0;
                        if (c > 0) { badge.textContent = c > 99 ? '99+' : c; badge.style.display = 'flex'; }
                        else { badge.style.display = 'none'; }
                    } else { badge.style.display = 'none'; }
                } catch (e) { badge.style.display = 'none'; }
            }
            updateWishlistBadge();
            window.addEventListener('hercules:wishlist-updated', function(e) {
                var badge = document.getElementById('herc-wishlist-badge');
                if (!badge) return;
                var c = 0;
                if (e.detail) c = e.detail.count !== undefined ? e.detail.count : (e.detail.items ? e.detail.items.length : 0);
                if (c > 0) { badge.textContent = c > 99 ? '99+' : c; badge.style.display = 'flex'; }
                else { badge.style.display = 'none'; }
            });
            document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') updateWishlistBadge(); });

            /* ================================================
             * Dropdown Search (Cloudflare Worker API)
             * ================================================ */
            var SEARCH_API = 'https://hercules-product-sync-fr.gilles-86d.workers.dev';
            var SEARCH_DEBOUNCE = 300;
            var SEARCH_MIN_CHARS = 2;

            function initSearchDropdown(searchInput, searchBtn, resultsContainer, form) {
                if (!searchInput || !resultsContainer) return;
                var debounceTimer = null;

                if (form) form.addEventListener('submit', function(e) { e.preventDefault(); });

                function setLoading(loading) {
                    if (!searchBtn) return;
                    if (loading) {
                        searchBtn.classList.add('loading');
                        if (!searchBtn.querySelector('.herc-search-spinner')) {
                            var s = document.createElement('span'); s.className = 'herc-search-spinner'; searchBtn.appendChild(s);
                        }
                    } else {
                        searchBtn.classList.remove('loading');
                        var s = searchBtn.querySelector('.herc-search-spinner'); if (s) s.remove();
                    }
                }

                function renderResults(data) {
                    if (!data.success || !data.data || data.data.length === 0) {
                        resultsContainer.innerHTML = '<p class="herc-search-no-results">Aucun produit trouvé.</p>';
                        resultsContainer.classList.add('active');
                        return;
                    }
                    var html = '<ul class="herc-search-results-list">';
                    data.data.forEach(function(p) {
                        var t = (p.thumbnail || '').replace('hercules-product-sync-fr.workers.dev', 'hercules-product-sync-fr.gilles-86d.workers.dev');
                        html += '<li><a href="' + p.url + '">';
                        if (t) html += '<img src="' + t + '" alt="' + (p.title || '').replace(/"/g, '&quot;') + '" class="herc-search-thumb" loading="lazy" />';
                        html += '<div class="herc-search-product-info"><div class="herc-search-product-title">' + (p.title || '') + '</div>';
                        html += '</div></a></li>';
                    });
                    html += '</ul>';
                    resultsContainer.innerHTML = html;
                    resultsContainer.classList.add('active');
                }

                function doSearch(query) {
                    if (query.length < SEARCH_MIN_CHARS) { resultsContainer.innerHTML = ''; resultsContainer.classList.remove('active'); return; }
                    setLoading(true);
                    fetch(SEARCH_API + '/search?q=' + encodeURIComponent(query) + '&limit=10')
                    .then(function(r) { return r.json(); })
                    .then(renderResults)
                    .catch(function() { resultsContainer.innerHTML = '<p class="herc-search-no-results">Aucun produit trouvé.</p>'; resultsContainer.classList.add('active'); })
                    .finally(function() { setLoading(false); });
                }

                searchInput.addEventListener('keyup', function() {
                    var val = searchInput.value.trim();
                    if (debounceTimer) clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(function() { doSearch(val); }, SEARCH_DEBOUNCE);
                });

                searchInput.addEventListener('focus', function() {
                    if (searchInput.value.trim().length >= SEARCH_MIN_CHARS && resultsContainer.innerHTML.trim() !== '') resultsContainer.classList.add('active');
                });

                document.addEventListener('mousedown', function(e) {
                    var wrap = searchInput.closest('.herc-search-wrap');
                    if (wrap && !wrap.contains(e.target)) resultsContainer.classList.remove('active');
                });
            }

            // Init desktop search
            if (header) {
                initSearchDropdown(
                    header.querySelector('.herc-search-input'),
                    header.querySelector('.herc-search-btn'),
                    document.getElementById('herc-search-results'),
                    header.querySelector('.herc-search-form')
                );
            }

            // Init sticky header search (if present)
            var stickyH = document.getElementById('hercules-sticky-header');
            if (stickyH) {
                initSearchDropdown(stickyH.querySelector('.herc-search-input'), stickyH.querySelector('.herc-search-btn'), stickyH.querySelector('.herc-search-results'), stickyH.querySelector('.herc-search-form'));
            }

            // Init mobile search overlay
            initSearchDropdown(
                document.getElementById('herc-mobile-search-input'),
                document.querySelector('#herc-mobile-search-overlay .herc-search-btn'),
                document.getElementById('herc-mobile-search-results'),
                document.getElementById('herc-mobile-search-form')
            );

            /* ================================================
             * MOBILE: Search Overlay Toggle
             * ================================================ */
            var mSearchBtn = document.getElementById('herc-mobile-search-btn');
            var mSearchOverlay = document.getElementById('herc-mobile-search-overlay');
            var mSearchClose = document.getElementById('herc-mobile-search-close');

            if (mSearchBtn && mSearchOverlay) {
                mSearchBtn.addEventListener('click', function() {
                    mSearchOverlay.classList.add('active');
                    setTimeout(function() {
                        var inp = document.getElementById('herc-mobile-search-input');
                        if (inp) inp.focus();
                    }, 100);
                });
            }
            if (mSearchClose && mSearchOverlay) {
                mSearchClose.addEventListener('click', function() { mSearchOverlay.classList.remove('active'); });
            }

            /* ================================================
             * MOBILE: Slide-Out Menu
             * ================================================ */
            var mMenuToggle = document.getElementById('herc-mobile-menu-toggle');
            var mMenuClose = document.getElementById('herc-mobile-menu-close');
            var mMenuOverlay = document.getElementById('herc-mobile-menu-overlay');
            var mMainPanel = document.getElementById('herc-main-panel');

            function closeMobileMenu() {
                document.body.classList.remove('herc-mobile-menu-open');
                setTimeout(function() {
                    if (mMainPanel) mMainPanel.classList.remove('slide-out');
                    document.querySelectorAll('.herc-sub-panel').forEach(function(p) { p.classList.remove('active'); });
                }, 300);
            }

            if (mMenuToggle) mMenuToggle.addEventListener('click', function() { document.body.classList.add('herc-mobile-menu-open'); });
            if (mMenuClose) mMenuClose.addEventListener('click', closeMobileMenu);
            if (mMenuOverlay) mMenuOverlay.addEventListener('click', closeMobileMenu);

            // All close buttons in submenus
            document.querySelectorAll('.herc-submenu-close-btn').forEach(function(btn) { btn.addEventListener('click', closeMobileMenu); });

            // Open submenu
            document.querySelectorAll('.herc-has-submenu').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var id = btn.getAttribute('data-submenu');
                    var sub = document.getElementById('herc-submenu-' + id);
                    if (mMainPanel) mMainPanel.classList.add('slide-out');
                    if (sub) sub.classList.add('active');
                });
            });

            // Back button
            document.querySelectorAll('.herc-submenu-back-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    var id = btn.getAttribute('data-back');
                    var sub = document.getElementById('herc-submenu-' + id);
                    if (mMainPanel) mMainPanel.classList.remove('slide-out');
                    if (sub) sub.classList.remove('active');
                });
            });

            // Close on Escape
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeMobileMenu();
                    if (mSearchOverlay) mSearchOverlay.classList.remove('active');
                }
            });

            console.log('Hercules Custom Header v1.1.0 initialized (desktop + mobile)');
        });
    })();
    </script>
    <?php
}
