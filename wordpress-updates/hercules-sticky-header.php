<?php
/**
 * Plugin Name: Hercules Sticky Header
 * Description: Adds a sticky header matching Astro design for WordPress pages
 * Version: 2.0.7
 */

if (!defined("ABSPATH")) exit;

// Add sticky header HTML to footer (so it's after main content)
add_action("wp_footer", "hercules_sticky_header_html", 5);
function hercules_sticky_header_html() {
    // Get menu data
    $menu_data = hercules_sticky_get_menu_items();
    $sportarten = isset($menu_data["sportarten"]) ? $menu_data["sportarten"] : array();
    $produkte = isset($menu_data["produkte"]) ? $menu_data["produkte"] : array();
    $themen = isset($menu_data["themen"]) ? $menu_data["themen"] : array();

    // Use correct logo path (2025/04, not 2025/06)
    $logo_url = content_url('/uploads/2025/04/hercules-logo-original1.png');
    ?>
    <header class="hercules-sticky-header" id="hercules-sticky-header">
        <div class="sticky-header-container">
            <!-- Menu Section - 25% -->
            <div class="sticky-section sticky-menu-section">
                <div class="sticky-menu-wrapper">
                    <button class="sticky-menu-toggle" id="sticky-menu-toggle" aria-label="Menu">
                        <svg class="menu-icon-open" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                            <path d="M104 333H896C929 333 958 304 958 271S929 208 896 208H104C71 208 42 237 42 271S71 333 104 333ZM104 583H896C929 583 958 554 958 521S929 458 896 458H104C71 458 42 487 42 521S71 583 104 583ZM104 833H896C929 833 958 804 958 771S929 708 896 708H104C71 708 42 737 42 771S71 833 104 833Z" fill="currentColor"/>
                        </svg>
                        <svg class="menu-icon-close" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                            <path d="M742 167L500 408 258 167C246 154 233 150 217 150 196 150 179 158 167 167 154 179 150 196 150 212 150 229 154 242 171 254L408 500 167 742C138 771 138 800 167 829 196 858 225 858 254 829L496 587 738 829C750 842 767 846 783 846 800 846 817 842 829 829 842 817 846 804 846 783 846 767 842 750 829 737L588 500 833 258C863 229 863 200 833 171 804 137 775 137 742 167Z" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="all-categories-text" id="all-categories-toggle">
                        TOUTES LES CATÉGORIES
                        <svg class="category-triangle" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>

                    <!-- Dropdown Navigation -->
                    <nav class="sticky-dropdown-nav" id="sticky-dropdown-nav">
                        <div class="dropdown-logo-header">
                            <img src="<?php echo esc_url($logo_url); ?>" alt="Hercules Merchandise" class="dropdown-logo" width="176" height="78" />
                        </div>
                        <div class="dropdown-content">
                            <div class="dropdown-left-column">
                                <ul class="sticky-nav-list">
                                    <li class="sticky-nav-item has-submenu active" data-submenu="sportarten">
                                        <button class="sticky-nav-link">Sports<svg class="submenu-arrow" viewBox="0 0 256 512"><path d="M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z" fill="currentColor"/></svg></button>
                                    </li>
                                    <li class="sticky-nav-item has-submenu" data-submenu="produkte">
                                        <button class="sticky-nav-link">Produits<svg class="submenu-arrow" viewBox="0 0 256 512"><path d="M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z" fill="currentColor"/></svg></button>
                                    </li>
                                    <li class="sticky-nav-item has-submenu" data-submenu="themen">
                                        <button class="sticky-nav-link">Thèmes<svg class="submenu-arrow" viewBox="0 0 256 512"><path d="M224.3 273l-136 136c-9.4 9.4-24.6 9.4-33.9 0l-22.6-22.6c-9.4-9.4-9.4-24.6 0-33.9l96.4-96.4-96.4-96.4c-9.4-9.4-9.4-24.6 0-33.9L54.3 103c9.4-9.4 24.6-9.4 33.9 0l136 136c9.5 9.4 9.5 24.6.1 34z" fill="currentColor"/></svg></button>
                                    </li>
                                </ul>
                            </div>
                            <div class="dropdown-right-column">
                                <div class="submenu-title-wrapper">
                                    <span class="submenu-title">SPORTS</span>
                                </div>
                                <div class="dropdown-submenu-container">
                                    <ul class="sticky-submenu active" id="sticky-submenu-sportarten">
                                        <?php foreach ($sportarten as $item): ?>
                                        <li><a href="<?php echo esc_url($item["url"]); ?>">
                                            <?php if (!empty($item["icon_url"])): ?>
                                            <img src="<?php echo esc_url($item["icon_url"]); ?>" alt="" width="28" height="28" />
                                            <?php endif; ?>
                                            <span><?php echo esc_html($item["title"]); ?></span>
                                        </a></li>
                                        <?php endforeach; ?>
                                    </ul>
                                    <ul class="sticky-submenu" id="sticky-submenu-produkte">
                                        <?php foreach ($produkte as $item): ?>
                                        <li><a href="<?php echo esc_url($item["url"]); ?>">
                                            <?php if (!empty($item["icon_url"])): ?>
                                            <img src="<?php echo esc_url($item["icon_url"]); ?>" alt="" width="28" height="28" />
                                            <?php endif; ?>
                                            <span><?php echo esc_html($item["title"]); ?></span>
                                        </a></li>
                                        <?php endforeach; ?>
                                    </ul>
                                    <ul class="sticky-submenu" id="sticky-submenu-themen">
                                        <?php foreach ($themen as $item): ?>
                                        <li><a href="<?php echo esc_url($item["url"]); ?>">
                                            <?php if (!empty($item["icon_url"])): ?>
                                            <img src="<?php echo esc_url($item["icon_url"]); ?>" alt="" width="28" height="28" />
                                            <?php endif; ?>
                                            <span><?php echo esc_html($item["title"]); ?></span>
                                        </a></li>
                                        <?php endforeach; ?>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </nav>
                </div>
            </div>

            <!-- Search Section - 50% -->
            <div class="sticky-section sticky-search-section">
                <div class="herc-search-wrap" style="width:100%;position:relative;">
                    <form role="search" action="/" method="get" class="herc-search-form">
                        <input type="text" name="s" placeholder="Rechercher des produits..." class="herc-search-input" autocomplete="off" />
                        <button type="submit" class="herc-search-btn" aria-label="Search">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 22 22" fill="none">
                                <path d="M21.3248 20.1752L16.2396 15.0909C17.7135 13.3214 18.4485 11.0518 18.2916 8.75419C18.1347 6.45658 17.0981 4.3079 15.3974 2.75513C13.6967 1.20236 11.4628 0.365042 9.16039 0.417367C6.85803 0.469692 4.66448 1.40763 3.03605 3.03606C1.40761 4.6645 0.469677 6.85805 0.417352 9.16041C0.365027 11.4628 1.20234 13.6967 2.75512 15.3974C4.30789 17.0981 6.45657 18.1348 8.75417 18.2916C11.0518 18.4485 13.3214 17.7135 15.0909 16.2396L20.1751 21.3249C20.2506 21.4003 20.3403 21.4602 20.4389 21.5011C20.5375 21.5419 20.6432 21.563 20.75 21.563C20.8567 21.563 20.9625 21.5419 21.0611 21.5011C21.1597 21.4602 21.2493 21.4003 21.3248 21.3249C21.4003 21.2494 21.4602 21.1597 21.5011 21.0611C21.5419 20.9625 21.5629 20.8568 21.5629 20.75C21.5629 20.6432 21.5419 20.5375 21.5011 20.4389C21.4602 20.3403 21.4003 20.2507 21.3248 20.1752ZM2.06249 9.375C2.06249 7.92873 2.49136 6.51493 3.29487 5.3124C4.09837 4.10986 5.24043 3.1726 6.57662 2.61913C7.9128 2.06567 9.3831 1.92086 10.8016 2.20301C12.2201 2.48517 13.523 3.18161 14.5457 4.20428C15.5684 5.22696 16.2648 6.52992 16.547 7.94841C16.8291 9.36689 16.6843 10.8372 16.1309 12.1734C15.5774 13.5096 14.6401 14.6516 13.4376 15.4551C12.2351 16.2586 10.8213 16.6875 9.37499 16.6875C7.43625 16.6854 5.57754 15.9142 4.20664 14.5433C2.83575 13.1725 2.06464 11.3137 2.06249 9.375Z" fill="#253461"/>
                            </svg>
                        </button>
                    </form>
                    <div class="herc-search-results"></div>
                </div>
            </div>

            <!-- Icons Section - 25% -->
            <div class="sticky-section sticky-icons-section">
                <!-- Contact Icon - Green button matching Astro -->
                <a href="<?php echo esc_url(home_url('/contactez-nous/')); ?>" class="sticky-icon-btn sticky-contact-btn" title="Contact">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
                        <path d="M19.25 3.4375H2.75C2.38533 3.4375 2.03559 3.58237 1.77773 3.84023C1.51987 4.09809 1.375 4.44783 1.375 4.8125V17.1875C1.375 17.5522 1.51987 17.9019 1.77773 18.1598C2.03559 18.4176 2.38533 18.5625 2.75 18.5625H19.25C19.6147 18.5625 19.9644 18.4176 20.2223 18.1598C20.4801 17.9019 20.625 17.5522 20.625 17.1875V4.8125C20.625 4.44783 20.4801 4.09809 20.2223 3.84023C19.9644 3.58237 19.6147 3.4375 19.25 3.4375ZM17.7031 4.8125L11 9.97656L4.29688 4.8125H17.7031ZM2.75 17.1875V5.46797L10.5531 11.4797C10.6876 11.5834 10.8514 11.6396 11.0198 11.6396C11.1882 11.6396 11.352 11.5834 11.4865 11.4797L19.25 5.46797V17.1875H2.75Z" fill="currentColor"/>
                    </svg>
                </a>

                <!-- Account Icon - EXACT same SVG as Astro UserSession.tsx -->
                <a href="<?php echo esc_url(home_url('/mon-compte/')); ?>" class="sticky-icon-btn sticky-account-btn" title="Mon compte">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 29 29" fill="none">
                        <path d="M26.1586 24.0156C24.4333 21.0329 21.7746 18.8942 18.6718 17.8803C20.2066 16.9667 21.399 15.5744 22.0659 13.9175C22.7329 12.2606 22.8375 10.4305 22.3637 8.70833C21.8899 6.98618 20.8639 5.46717 19.4432 4.38458C18.0226 3.30198 16.2858 2.71567 14.4997 2.71567C12.7135 2.71567 10.9768 3.30198 9.55609 4.38458C8.13542 5.46717 7.1094 6.98618 6.6356 8.70833C6.16179 10.4305 6.2664 12.2606 6.93335 13.9175C7.60031 15.5744 8.79273 16.9667 10.3275 17.8803C7.22473 18.893 4.56602 21.0318 2.84074 24.0156C2.77748 24.1188 2.73551 24.2336 2.71732 24.3532C2.69914 24.4729 2.7051 24.5949 2.73485 24.7122C2.76461 24.8295 2.81756 24.9397 2.89058 25.0362C2.9636 25.1327 3.05521 25.2136 3.16 25.2742C3.26479 25.3347 3.38065 25.3736 3.50073 25.3886C3.62081 25.4037 3.74269 25.3945 3.85917 25.3617C3.97565 25.3288 4.08437 25.273 4.17892 25.1975C4.27347 25.1219 4.35194 25.0282 4.40969 24.9219C6.54391 21.2334 10.3162 19.0312 14.4997 19.0312C18.6831 19.0312 22.4554 21.2334 24.5896 24.9219C24.6474 25.0282 24.7258 25.1219 24.8204 25.1975C24.9149 25.273 25.0237 25.3288 25.1401 25.3617C25.2566 25.3945 25.3785 25.4037 25.4986 25.3886C25.6187 25.3736 25.7345 25.3347 25.8393 25.2742C25.9441 25.2136 26.0357 25.1327 26.1087 25.0362C26.1817 24.9397 26.2347 24.8295 26.2644 24.7122C26.2942 24.5949 26.3002 24.4729 26.282 24.3532C26.2638 24.2336 26.2218 24.1188 26.1586 24.0156ZM8.1559 10.875C8.1559 9.62032 8.52795 8.39383 9.22502 7.3506C9.92208 6.30738 10.9128 5.49428 12.072 5.01414C13.2312 4.534 14.5067 4.40837 15.7373 4.65314C16.9678 4.89792 18.0982 5.5021 18.9854 6.38929C19.8725 7.27648 20.4767 8.40683 20.7215 9.6374C20.9663 10.868 20.8407 12.1435 20.3605 13.3026C19.8804 14.4618 19.0673 15.4526 18.024 16.1496C16.9808 16.8467 15.7543 17.2188 14.4997 17.2188C12.8177 17.217 11.2052 16.548 10.0159 15.3587C8.82664 14.1694 8.1577 12.5569 8.1559 10.875Z" fill="#253461"/>
                    </svg>
                    <?php if (is_user_logged_in()): ?>
                    <span class="logged-in-indicator"></span>
                    <?php endif; ?>
                </a>

                <!-- Wishlist Icon - EXACT same SVG as Astro WishlistCount.tsx -->
                <a href="<?php echo esc_url(home_url('/liste-de-souhaits/')); ?>" class="sticky-icon-btn sticky-wishlist-btn" title="Liste de souhaits">
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z" fill="#253461"/>
                    </svg>
                </a>

                <!-- Cart Icon with Mini Cart Dropdown -->
                <div class="herc-cart-wrap">
                    <button type="button" class="sticky-icon-btn sticky-cart-btn" id="sticky-cart-toggle" aria-label="Cart" aria-expanded="false" title="Cart">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 31 31" fill="none">
                            <path d="M12.5938 26.1562C12.5938 26.5395 12.4801 26.914 12.2672 27.2327C12.0543 27.5513 11.7517 27.7996 11.3977 27.9463C11.0437 28.0929 10.6541 28.1313 10.2783 28.0565C9.90242 27.9818 9.5572 27.7972 9.28623 27.5263C9.01527 27.2553 8.83074 26.9101 8.75598 26.5342C8.68122 26.1584 8.71959 25.7688 8.86623 25.4148C9.01288 25.0608 9.26121 24.7582 9.57983 24.5453C9.89845 24.3324 10.273 24.2188 10.6562 24.2188C11.1701 24.2188 11.6629 24.4229 12.0263 24.7862C12.3896 25.1496 12.5938 25.6424 12.5938 26.1562ZM23.25 24.2188C22.8668 24.2188 22.4922 24.3324 22.1736 24.5453C21.855 24.7582 21.6066 25.0608 21.46 25.4148C21.3133 25.7688 21.275 26.1584 21.3497 26.5342C21.4245 26.9101 21.609 27.2553 21.88 27.5263C22.1509 27.7972 22.4962 27.9818 22.872 28.0565C23.2479 28.1313 23.6374 28.0929 23.9914 27.9463C24.3455 27.7996 24.6481 27.5513 24.861 27.2327C25.0739 26.914 25.1875 26.5395 25.1875 26.1562C25.1875 25.6424 24.9834 25.1496 24.62 24.7862C24.2567 24.4229 23.7639 24.2188 23.25 24.2188ZM29.0274 8.97789L25.9225 20.1524C25.7518 20.7628 25.3867 21.3009 24.8826 21.6851C24.3784 22.0693 23.7627 22.2786 23.1289 22.2812H11.16C10.5243 22.281 9.90613 22.0728 9.39978 21.6884C8.89343 21.3041 8.52668 20.7646 8.35547 20.1524L4.1075 4.84375H1.9375C1.68057 4.84375 1.43417 4.74169 1.25249 4.56001C1.07081 4.37833 0.96875 4.13193 0.96875 3.875C0.96875 3.61807 1.07081 3.37167 1.25249 3.18999C1.43417 3.00831 1.68057 2.90625 1.9375 2.90625H4.84375C5.05554 2.90621 5.26152 2.97558 5.43014 3.10374C5.59875 3.2319 5.72073 3.41178 5.77738 3.61586L6.92535 7.75H28.0938C28.2431 7.74997 28.3904 7.78447 28.5242 7.85081C28.658 7.91714 28.7747 8.01352 28.8651 8.1324C28.9555 8.25129 29.0172 8.38946 29.0453 8.53613C29.0735 8.6828 29.0673 8.83399 29.0274 8.97789ZM26.8186 9.6875H7.46422L10.2264 19.6341C10.283 19.8382 10.405 20.0181 10.5736 20.1463C10.7422 20.2744 10.9482 20.3438 11.16 20.3438H23.1289C23.3407 20.3438 23.5467 20.2744 23.7153 20.1463C23.8839 20.0181 24.0059 19.8382 24.0625 19.6341L26.8186 9.6875Z" fill="#253461"/>
                        </svg>
                        <?php
                        $cart_count = WC()->cart ? WC()->cart->get_cart_contents_count() : 0;
                        if ($cart_count > 0): ?>
                        <span class="cart-count-badge"><?php echo esc_html($cart_count); ?></span>
                        <?php endif; ?>
                    </button>
                    <div class="herc-minicart" id="sticky-minicart">
                        <p class="herc-minicart-empty">Votre panier est vide.</p>
                    </div>
                </div>
            </div>
        </div>
    </header>
    <?php
}

// Get menu items for sticky header
function hercules_sticky_get_menu_items() {
    // Static FR icon map keyed by category slug → icon filename in /images/menu/
    $icon_map = array(
        // Sports
        "football"               => "Football.svg",       "rugby"                    => "Rugby-1.svg",
        "basketball"             => "Basketball-1.svg",   "running"                  => "running-1.svg",
        "hockey-sur-gazon"       => "field-hockey-1.svg", "volleyball"               => "volleyball-1.svg",
        "handball"               => "handball-1.svg",     "cyclisme"                 => "cycling-1.svg",
        "fitness"                => "fitness-1.svg",      "golf"                     => "golf-1.svg",
        "esports"                => "esport-1.svg",
        // Products
        "equipements-personnalises"       => "teamwear-1.svg",   "echarpes-personnalisees"       => "scarves-1.svg",
        "bonnets-personnalises-football"  => "beanies-3.svg",    "couvre-chefs"                  => "cap-1.svg",
        "fanions-personnalises-football"  => "pennants-3.svg",   "serviettes-personnalisees"     => "towelst-1.svg",
        "drapeaux-personnalises"          => "flags-1.svg",      "chaussettes-et-claquettes"     => "footwear-1.svg",
        "sacs-de-sport-personnalises"     => "sportsbag-1.svg",  "textile-sport-personnalise"    => "textile-1.svg",
        "bidons-et-tasses"                => "drinkware-1.svg",  "ballons"                       => "balls-1.svg",
        "accessoires-de-football"         => "accessories-1.svg",
        // Themes
        "ete"                    => "summer-1.svg",       "hiver"                    => "winter-1.svg",
        "durable"                => "sustainable-2.svg",  "fabrique-en-europe"       => "made-in-europe-1.svg",
        "mode"                   => "fashion-1.svg",      "rentree-scolaire"         => "back-to-school-1.svg",
        "tifo"                   => "tifo-1.svg",         "noel"                     => "christmas-1.svg",
        "petits-prix"            => "smallprices.svg",    "business"                 => "business.svg",
        "cadeaux"                => "giive-aways.svg",    "enfants"                  => "kids.svg",
    );
    $icon_base = "/images/menu/";

    // Static fallback data (mirrors menu-data.ts) used when WP menu section is empty
    $static_fallback = array(
        "sportarten" => array(
            array("title" => "Football",         "url" => "/collections/football/",                "slug" => "football"),
            array("title" => "Rugby",            "url" => "/collections/rugby/",                   "slug" => "rugby"),
            array("title" => "Basket-ball",      "url" => "/collections/basketball/",              "slug" => "basketball"),
            array("title" => "Running",          "url" => "/collections/running/",                 "slug" => "running"),
            array("title" => "Hockey sur gazon", "url" => "/collections/hockey-sur-gazon/",        "slug" => "hockey-sur-gazon"),
            array("title" => "Volleyball",       "url" => "/collections/volleyball/",              "slug" => "volleyball"),
            array("title" => "Handball",         "url" => "/collections/handball/",                "slug" => "handball"),
            array("title" => "Cyclisme",         "url" => "/collections/cyclisme/",                "slug" => "cyclisme"),
            array("title" => "Fitness",          "url" => "/collections/fitness/",                 "slug" => "fitness"),
            array("title" => "Golf",             "url" => "/collections/golf/",                    "slug" => "golf"),
            array("title" => "eSports",          "url" => "/collections/esports/",                 "slug" => "esports"),
        ),
        "produkte" => array(
            array("title" => "Vêtements de sport",        "url" => "/collections/equipements-personnalises/",      "slug" => "equipements-personnalises"),
            array("title" => "Écharpes",                  "url" => "/collections/echarpes-personnalisees/",        "slug" => "echarpes-personnalisees"),
            array("title" => "Bonnets",                   "url" => "/collections/bonnets-personnalises-football/", "slug" => "bonnets-personnalises-football"),
            array("title" => "Couvre-chefs",              "url" => "/collections/couvre-chefs/",                   "slug" => "couvre-chefs"),
            array("title" => "Fanions",                   "url" => "/collections/fanions-personnalises-football/", "slug" => "fanions-personnalises-football"),
            array("title" => "Serviettes",                "url" => "/collections/serviettes-personnalisees/",      "slug" => "serviettes-personnalisees"),
            array("title" => "Drapeaux",                  "url" => "/collections/drapeaux-personnalises/",         "slug" => "drapeaux-personnalises"),
            array("title" => "Chaussettes et claquettes", "url" => "/collections/chaussettes-et-claquettes/",      "slug" => "chaussettes-et-claquettes"),
            array("title" => "Sacs",                      "url" => "/collections/sacs-de-sport-personnalises/",    "slug" => "sacs-de-sport-personnalises"),
            array("title" => "Textile",                   "url" => "/collections/textile-sport-personnalise/",     "slug" => "textile-sport-personnalise"),
            array("title" => "Bidons & tasses",           "url" => "/collections/bidons-et-tasses/",               "slug" => "bidons-et-tasses"),
            array("title" => "Ballons",                   "url" => "/collections/ballons/",                        "slug" => "ballons"),
            array("title" => "Accessoires",               "url" => "/collections/accessoires-de-football/",        "slug" => "accessoires-de-football"),
        ),
        "themen" => array(
            array("title" => "Été",               "url" => "/collections/ete/",                 "slug" => "ete"),
            array("title" => "Hiver",             "url" => "/collections/hiver/",               "slug" => "hiver"),
            array("title" => "Durable",           "url" => "/collections/durable/",             "slug" => "durable"),
            array("title" => "Fabriqué en Europe","url" => "/collections/fabrique-en-europe/",  "slug" => "fabrique-en-europe"),
            array("title" => "Mode",              "url" => "/collections/mode/",                "slug" => "mode"),
            array("title" => "Rentrée scolaire",  "url" => "/collections/rentree-scolaire/",    "slug" => "rentree-scolaire"),
            array("title" => "Tifo",              "url" => "/collections/tifo/",                "slug" => "tifo"),
            array("title" => "Noël",              "url" => "/collections/noel/",                "slug" => "noel"),
            array("title" => "Petits prix",       "url" => "/collections/petits-prix/",         "slug" => "petits-prix"),
            array("title" => "Business",          "url" => "/collections/business/",            "slug" => "business"),
            array("title" => "Cadeaux",           "url" => "/collections/cadeaux/",             "slug" => "cadeaux"),
            array("title" => "Enfants",           "url" => "/collections/enfants/",             "slug" => "enfants"),
        ),
    );

    $menu_items = wp_get_nav_menu_items("product-catergory-menu");
    $result = array("sportarten" => array(), "produkte" => array(), "themen" => array());

    if ($menu_items) {
        $parents = array();
        $children = array();

        foreach ($menu_items as $item) {
            if ($item->menu_item_parent == 0) {
                $key = strtolower($item->title);
                if ($key === "sports") $key = "sportarten";
                if ($key === "products") $key = "produkte";
                if ($key === "themes") $key = "themen";
                $parents[$item->ID] = $key;
            } else {
                // Extract slug from FR URL pattern /collections/{slug}/
                $slug = "";
                if ($item->type === "taxonomy" && $item->object === "product_cat") {
                    $term = get_term($item->object_id, "product_cat");
                    if ($term && !is_wp_error($term)) $slug = $term->slug;
                } elseif (preg_match("/\/collections\/([^\/]+)/", $item->url, $m)) {
                    $slug = $m[1];
                }

                $custom_icon = get_post_meta($item->ID, "_menu_item_icon_url", true);
                if (!empty($custom_icon)) {
                    if (strpos($custom_icon, "http") !== 0 && strpos($custom_icon, "//") !== 0) {
                        $icon_url = (strpos($custom_icon, "/") === 0) ? home_url($custom_icon) : $icon_base . $custom_icon;
                    } else {
                        $icon_url = $custom_icon;
                    }
                } else {
                    $icon_url = ($slug && isset($icon_map[$slug])) ? $icon_base . $icon_map[$slug] : "";
                }

                $children[$item->menu_item_parent][] = array(
                    "title" => $item->title,
                    "url" => $item->url,
                    "icon_url" => $icon_url,
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
    foreach (array("sportarten", "produkte", "themen") as $section) {
        if (empty($result[$section]) && isset($static_fallback[$section])) {
            foreach ($static_fallback[$section] as $item) {
                $icon_url = isset($icon_map[$item["slug"]]) ? $icon_base . $icon_map[$item["slug"]] : "";
                $result[$section][] = array(
                    "title"    => $item["title"],
                    "url"      => $item["url"],
                    "icon_url" => $icon_url,
                );
            }
        }
    }

    return $result;
}

// Add CSS - matching Astro StickyHeader exactly
add_action("wp_head", "hercules_sticky_header_css", 99);
function hercules_sticky_header_css() {
    ?>
    <style id="hercules-sticky-header-css">
    /* Sticky Header - Matching Astro StickyHeader.astro exactly - v2.0.6 */
    .hercules-sticky-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #FFFFFF;
        z-index: 99999;
        box-shadow: 0px 9px 10px 0px rgba(0, 0, 0, 0.05);
        transform: translateY(-100%);
        transition: transform 0.3s ease;
        font-family: 'Jost', sans-serif;
    }
    .hercules-sticky-header.visible { transform: translateY(0); }
    @media (max-width: 768px) { .hercules-sticky-header { display: none !important; } }
    @media (min-width: 769px) { .hercules-sticky-header { display: block; } }

    .sticky-header-container {
        max-width: 1280px;
        margin: 0 auto;
        padding: 10px 0;
        display: flex;
        align-items: center;
        position: relative;
    }
    .sticky-section { display: flex; }
    .sticky-menu-section { width: 25%; padding: 0; }
    .sticky-search-section {
        width: 50%;
        justify-content: space-evenly;
        align-items: stretch;
        background: #FFFFFF;
        padding: 0;
    }
    .sticky-icons-section {
        width: 25%;
        flex-direction: row;
        justify-content: flex-end;
        align-items: center;
        gap: 8px;
    }

    .sticky-menu-wrapper { display: flex; align-items: center; gap: 15px; position: relative; }

    /* Hamburger Button - 16px border-radius matching Astro */
    /* v2.0.7: Added hover/focus/active states to prevent red background */
    .sticky-menu-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #253461 !important;
        border: none !important;
        border-radius: 16px;
        cursor: pointer;
        color: #FFFFFF !important;
        width: 48px;
        height: 48px;
        padding: 0;
        flex-shrink: 0;
        transition: none;
    }
    .sticky-menu-toggle:hover,
    .sticky-menu-toggle:focus,
    .sticky-menu-toggle:active,
    .sticky-menu-toggle.active {
        background-color: #253461 !important;
        border: none !important;
        color: #FFFFFF !important;
        outline: none !important;
        box-shadow: none !important;
    }
    .sticky-menu-toggle svg { width: 24px; height: 24px; fill: #FFFFFF !important; }
    .sticky-menu-toggle:hover svg,
    .sticky-menu-toggle:focus svg,
    .sticky-menu-toggle:active svg,
    .sticky-menu-toggle.active svg { fill: #FFFFFF !important; }
    .sticky-menu-toggle .menu-icon-close { display: none; }
    .sticky-menu-toggle.active .menu-icon-open { display: none; }
    .sticky-menu-toggle.active .menu-icon-close { display: block; }

    /* ALL CATEGORIES button - v2.0.6: Added !important to fix white color override */
    .all-categories-text {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: none !important;
        border: none;
        padding: 0;
        font-family: 'Jost', sans-serif !important;
        font-size: 15px !important;
        font-weight: 500 !important;
        color: #253461 !important;
        text-transform: uppercase;
        white-space: nowrap;
        cursor: pointer;
        transition: color 0.3s;
    }
    .all-categories-text:hover { color: #00AEEF !important; }

    /* ALL CATEGORIES active state - match Astro light blue text */
    .sticky-menu-wrapper:has(.sticky-dropdown-nav.active) .all-categories-text {
        color: #00AEEF !important;
    }

    .category-triangle { transition: transform 0.3s ease; flex-shrink: 0; }
    .sticky-menu-wrapper:has(.sticky-dropdown-nav.active) .category-triangle { transform: rotate(180deg); }

    /* Dropdown Navigation */
    /* v2.0.7: position relative to .sticky-menu-wrapper to remove gap */
    /* v2.0.7: Removed top border-radius to eliminate visual gap */
    .sticky-dropdown-nav {
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 0 !important;
        background: #FFFFFF;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        border-radius: 0 0 8px 8px;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 100;
        display: flex;
        flex-direction: column;
        min-height: 500px;
    }
    .sticky-dropdown-nav.active { opacity: 1; visibility: visible; }

    /* Logo header - Fixed: ensure image displays properly */
    /* v2.0.7: Reduced top padding to minimize gap */
    .dropdown-logo-header {
        padding: 15px 25px 25px 25px;
        border-bottom: 1px solid #E5E7EB;
    }
    .dropdown-logo {
        height: 55px !important;
        width: auto !important;
        display: block;
        max-height: 55px !important;
    }

    /* Content area - two columns */
    .dropdown-content { display: flex; flex-direction: row; flex: 1; }

    /* Left column - Fixed: ensure all 3 menu items are visible */
    .dropdown-left-column {
        width: 240px;
        min-width: 240px;
        border-right: 1px solid #E5E7EB;
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
    }

    .dropdown-right-column {
        flex: 1;
        min-width: 500px;
        display: flex;
        flex-direction: column;
    }

    .submenu-title-wrapper { padding: 20px 25px; }
    .submenu-title {
        font-family: 'Jost', sans-serif;
        font-size: 22px;
        font-weight: 600;
        color: #253461;
        text-transform: uppercase;
    }
    .dropdown-submenu-container { flex: 1; padding: 0 25px 25px 25px; }

    /* Main menu list - vertical on left - Fixed: proper display */
    .sticky-nav-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
    }
    .sticky-nav-item { position: static; }

    /* Main menu links - matching Astro exactly */
    .sticky-nav-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 65px;
        padding: 22px 25px;
        background: transparent !important;
        border: none;
        border-bottom: 1px solid #F0F0F0;
        font-family: 'Jost', sans-serif;
        font-size: 18px;
        font-weight: 600;
        color: #253461 !important;
        cursor: pointer;
        text-align: left;
        transition: color 0.3s, background-color 0.3s;
        text-transform: uppercase;
        box-sizing: border-box;
    }
    .sticky-nav-link:hover { color: #00AEEF !important; background-color: #F5F5F5 !important; }
    .sticky-nav-item.active .sticky-nav-link { color: #00AEEF !important; background-color: #F5F5F5 !important; }
    .submenu-arrow { width: 16px; height: 16px; transition: transform 0.2s; margin-left: 8px; flex-shrink: 0; }

    /* Submenu Grid - 3 columns matching Astro */
    .sticky-submenu {
        display: none;
        list-style: none;
        margin: 0;
        padding: 0;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(5, auto);
        grid-auto-flow: column;
        row-gap: 0;
        column-gap: 0;
    }
    .sticky-submenu.active { display: grid; }

    /* Submenu links with icons - matching Astro exactly */
    .sticky-submenu li a {
        display: flex;
        align-items: center;
        gap: 15px;
        height: 55px;
        padding: 0 25px;
        color: #253461;
        text-decoration: none;
        font-family: 'Jost', sans-serif;
        font-size: 17px;
        font-weight: 500;
        transition: color 0.3s, background-color 0.3s;
        white-space: nowrap;
        box-sizing: border-box;
    }
    .sticky-submenu li a:hover { color: #469ADC; background-color: #F5F5F5; }

    /* Submenu icons - matching Astro size */
    .sticky-submenu li a img {
        width: 28px;
        height: 28px;
        object-fit: contain;
        flex-shrink: 0;
    }

    /* ========== Icon Buttons - Matching Astro exactly ========== */

    /* Base icon button style */
    .sticky-icon-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        position: relative;
        flex-shrink: 0;
        cursor: pointer;
    }

    /* Contact button - Green background (matching Astro .sticky-contact-popup) */
    .sticky-contact-btn {
        background-color: #10C99E;
        border: 1px solid #10C99E;
        border-radius: 15px;
        padding: 11px;
        color: #FFFFFF;
        transition: all 0.3s;
    }
    .sticky-contact-btn svg {
        width: 22px;
        height: 22px;
    }
    .sticky-contact-btn svg path {
        fill: #FFFFFF;
        transition: fill 0.3s;
    }
    .sticky-contact-btn:hover,
    .sticky-contact-btn:focus {
        background-color: #FFFFFF;
        color: #10C99E;
        border-color: #10C99E;
    }
    .sticky-contact-btn:hover svg path,
    .sticky-contact-btn:focus svg path {
        fill: #10C99E;
    }

    /* Regular icon buttons - Blue bordered (matching Astro .sticky-user-session .header-icon) */
    /* v2.0.6: Changed to 44x44 to match Astro UserSession exactly */
    .sticky-account-btn,
    .sticky-wishlist-btn,
    .sticky-cart-btn {
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
    }
    .sticky-account-btn svg,
    .sticky-wishlist-btn svg,
    .sticky-cart-btn svg {
        width: 22px;
        height: 22px;
    }
    .sticky-account-btn svg path,
    .sticky-wishlist-btn svg path,
    .sticky-cart-btn svg path {
        fill: #253461;
        transition: fill 0.3s;
    }
    .sticky-account-btn:hover,
    .sticky-wishlist-btn:hover,
    .sticky-cart-btn:hover {
        border-color: #469ADC;
    }
    .sticky-account-btn:hover svg path,
    .sticky-wishlist-btn:hover svg path,
    .sticky-cart-btn:hover svg path {
        fill: #469ADC;
    }

    /* Logged-in indicator dot (matching Astro .logged-in-indicator) */
    /* v2.0.7: Changed from 10x10 to 16x16 */
    .logged-in-indicator {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 16px;
        height: 16px;
        background: #10C99E;
        border-radius: 50%;
        border: 2px solid white;
    }

    /* Cart count badge (matching Astro .cart-count-badge) */
    .cart-count-badge {
        position: absolute;
        top: -6px;
        right: -6px;
        background: #10C99E;
        color: white;
        font-size: 11px;
        font-weight: 600;
        font-family: 'Jost', sans-serif;
        min-width: 18px;
        height: 18px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        line-height: 1;
    }

    /* Override Elementor/theme button styles on sticky cart button */
    button.sticky-icon-btn.sticky-cart-btn,
    button.sticky-icon-btn.sticky-cart-btn:hover,
    button.sticky-icon-btn.sticky-cart-btn:focus,
    button.sticky-icon-btn.sticky-cart-btn:active {
        background: transparent !important;
        color: #253461;
        padding: 0;
        line-height: 1;
        font-size: inherit;
        letter-spacing: normal;
        text-transform: none;
        box-shadow: none;
    }
    button.sticky-icon-btn.sticky-cart-btn:hover {
        border-color: #469ADC;
    }
    button.sticky-icon-btn.sticky-cart-btn:hover svg path {
        fill: #469ADC;
    }

    /* --- Sticky Header Mini Cart Dropdown --- */
    .hercules-sticky-header .herc-cart-wrap {
        position: relative;
        display: inline-block;
    }
    .hercules-sticky-header .herc-minicart {
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
    .hercules-sticky-header .herc-minicart.active {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
    .hercules-sticky-header .herc-minicart-empty {
        text-align: center;
        padding: 20px 10px;
        color: #666;
        margin: 0;
    }
    .hercules-sticky-header .herc-minicart-list {
        list-style: none;
        margin: 0 0 15px 0;
        padding: 0;
        max-height: 200px;
        overflow-y: auto;
    }
    .hercules-sticky-header .herc-minicart-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
    }
    .hercules-sticky-header .herc-minicart-item a {
        display: flex;
        align-items: center;
        gap: 10px;
        text-decoration: none;
        color: inherit;
        flex: 1;
        min-width: 0;
    }
    .hercules-sticky-header .herc-minicart-thumb {
        width: 50px;
        height: 50px;
        object-fit: cover;
        border-radius: 5px;
        flex-shrink: 0;
    }
    .hercules-sticky-header .herc-minicart-info {
        flex: 1;
        min-width: 0;
    }
    .hercules-sticky-header .herc-minicart-name {
        font-size: 13px;
        font-weight: 500;
        color: #253461;
        margin: 0 0 4px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .hercules-sticky-header .herc-minicart-price {
        font-size: 12px;
        color: #666;
        margin: 0;
    }
    .hercules-sticky-header button.herc-minicart-remove,
    .hercules-sticky-header button.herc-minicart-remove:hover,
    .hercules-sticky-header button.herc-minicart-remove:focus {
        background: transparent !important;
        border: none !important;
        color: #999;
        cursor: pointer;
        padding: 4px 8px !important;
        font-size: 18px !important;
        line-height: 1;
        transition: color 0.2s;
        flex-shrink: 0;
        box-shadow: none !important;
        min-width: auto !important;
    }
    .hercules-sticky-header button.herc-minicart-remove:hover {
        color: #ff4444 !important;
    }
    .hercules-sticky-header button.herc-minicart-remove:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .hercules-sticky-header .herc-minicart-subtotal {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-top: 1px solid #e0e0e0;
        margin-bottom: 15px;
        font-weight: 500;
    }
    .hercules-sticky-header .herc-minicart-buttons {
        display: flex;
        gap: 8px;
    }
    .hercules-sticky-header .herc-minicart-buttons a.herc-minicart-btn {
        flex: 1 1 0%;
        display: inline-flex !important;
        justify-content: center;
        align-items: center;
        padding: 12px 15px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        font-family: 'Jost', sans-serif !important;
        text-transform: uppercase !important;
        text-decoration: none !important;
        border-radius: 83px !important;
        cursor: pointer;
        transition: all 0.2s;
        line-height: 1 !important;
        text-align: center;
        box-shadow: none !important;
        letter-spacing: normal !important;
    }
    .hercules-sticky-header a.herc-minicart-btn.herc-minicart-btn--quote {
        color: #469adc !important;
        background: transparent !important;
        border: 1px solid #469adc !important;
    }
    .hercules-sticky-header a.herc-minicart-btn.herc-minicart-btn--quote:hover {
        background: #469adc !important;
        color: #fff !important;
    }
    .hercules-sticky-header a.herc-minicart-btn.herc-minicart-btn--cart {
        color: #fff !important;
        background: #10c99e !important;
        border: 1px solid #10c99e !important;
    }
    .hercules-sticky-header a.herc-minicart-btn.herc-minicart-btn--cart:hover {
        background: transparent !important;
        color: #10c99e !important;
    }
    .hercules-sticky-header .herc-minicart-list::-webkit-scrollbar {
        width: 4px;
    }
    .hercules-sticky-header .herc-minicart-list::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 2px;
    }
    .hercules-sticky-header .herc-minicart-list::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 2px;
    }

    /* ========== Search Section Styling ========== */
    .sticky-search-section .herc-search-wrap { margin-left: 0;
        width: 100%;
        position: relative;
    }
    .sticky-search-section .herc-search-form {
        display: flex;
        align-items: center;
        position: relative;
        width: 100%;
    }
    .sticky-search-section .herc-search-input {
        width: 100%;
        height: 46px;
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
    .sticky-search-section .herc-search-input::placeholder {
        color: #253461;
        opacity: 0.6;
    }
    .sticky-search-section .herc-search-input:focus {
        border-color: #469ADC !important;
    }
    .sticky-search-section .herc-search-btn {
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
    .sticky-search-section .herc-search-btn svg {
        width: 20px;
        height: 20px;
    }
    .sticky-search-section .herc-search-btn:hover svg path {
        fill: #469ADC;
    }

    /* Sticky header search dropdown */
    .sticky-search-section .herc-search-results {
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
    .sticky-search-section .herc-search-results.active {
        opacity: 1;
        visibility: visible;
    }
    .sticky-search-section .herc-search-results-list {
        padding: 0;
        margin: 0;
        display: flex;
        flex-flow: column;
        row-gap: 10px;
        list-style: none;
    }
    .sticky-search-section .herc-search-results-list li a {
        display: flex;
        align-items: center;
        column-gap: 20px;
        color: #253461;
        text-decoration: none;
        transition: opacity 0.2s ease;
    }
    .sticky-search-section .herc-search-results-list li a:hover {
        opacity: 0.7;
    }
    .sticky-search-section .herc-search-thumb {
        max-width: 100px;
        width: 100px;
        height: auto;
        object-fit: cover;
        background-color: #f5f5f5;
        flex-shrink: 0;
    }
    .sticky-search-section .herc-search-product-info {
        flex: 1;
        min-width: 0;
    }
    .sticky-search-section .herc-search-product-title {
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
    .sticky-search-section .herc-search-no-results {
        font-family: 'Jost', sans-serif;
        font-size: 14px;
        color: #666;
        text-align: center;
        padding: 20px;
        margin: 0;
    }
    .sticky-search-section .herc-search-spinner {
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
    .sticky-search-section .herc-search-btn.loading svg {
        display: none;
    }
    .sticky-search-section .herc-search-results::-webkit-scrollbar {
        width: 6px;
    }
    .sticky-search-section .herc-search-results::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
    }
    .sticky-search-section .herc-search-results::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
    }
    .sticky-search-section .herc-search-results::-webkit-scrollbar-thumb:hover {
        background: #a1a1a1;
    }
    </style>
    <?php
}

// Add JavaScript - with proper null checks and DOMContentLoaded
add_action("wp_footer", "hercules_sticky_header_js", 20);
function hercules_sticky_header_js() {
    ?>
    <script id="hercules-sticky-header-js">
    document.addEventListener('DOMContentLoaded', function() {
        var stickyHeader = document.getElementById('hercules-sticky-header');
        if (!stickyHeader) {
            console.warn('Hercules sticky header element not found');
            return;
        }

        var menuToggle = document.getElementById('sticky-menu-toggle');
        var allCategoriesToggle = document.getElementById('all-categories-toggle');
        var dropdownNav = document.getElementById('sticky-dropdown-nav');
        var navItems = dropdownNav ? dropdownNav.querySelectorAll('.sticky-nav-item.has-submenu') : [];
        var submenus = dropdownNav ? dropdownNav.querySelectorAll('.sticky-submenu') : [];
        var submenuTitle = dropdownNav ? dropdownNav.querySelector('.submenu-title') : null;

        var submenuTitles = { 'sportarten': 'SPORTS', 'produkte': 'PRODUITS', 'themen': 'THÈMES' };

        // Scroll behavior - show after scrolling 200px (fallback if no main header found)
        var ticking = false;
        var mainHeader = document.getElementById('main-header') || document.querySelector('.elementor-location-header');
        var mainHeaderHeight = mainHeader ? mainHeader.offsetHeight : 150;

        function updateStickyHeader() {
            var scrollY = window.scrollY || window.pageYOffset;
            if (scrollY > mainHeaderHeight + 50) {
                stickyHeader.classList.add('visible');
            } else {
                stickyHeader.classList.remove('visible');
                // Close search dropdown when sticky header hides
                var stickyResults = stickyHeader.querySelector('.herc-search-results');
                if (stickyResults) stickyResults.classList.remove('active');
                // Close mini cart dropdown when sticky header hides
                var stickyMC = document.getElementById('sticky-minicart');
                if (stickyMC) stickyMC.classList.remove('active');
            }
            ticking = false;
        }

        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(updateStickyHeader);
                ticking = true;
            }
        }, { passive: true });

        // Initial check in case page is already scrolled
        updateStickyHeader();

        // Show submenu
        function showSubmenu(submenuId) {
            for (var i = 0; i < submenus.length; i++) {
                submenus[i].classList.remove('active');
            }
            if (submenuId && dropdownNav) {
                var targetSubmenu = document.getElementById('sticky-submenu-' + submenuId);
                if (targetSubmenu) targetSubmenu.classList.add('active');
                if (submenuTitle) submenuTitle.textContent = submenuTitles[submenuId] || 'MENU';
            }
        }

        // Toggle dropdown
        function toggleDropdown() {
            if (!menuToggle || !dropdownNav) return;
            var isActive = menuToggle.classList.toggle('active');
            dropdownNav.classList.toggle('active');
            menuToggle.setAttribute('aria-expanded', isActive.toString());
            dropdownNav.setAttribute('aria-hidden', (!isActive).toString());

            if (isActive && navItems.length > 0) {
                navItems[0].classList.add('active');
                var firstLink = navItems[0].querySelector('.sticky-nav-link');
                if (firstLink) firstLink.setAttribute('aria-expanded', 'true');
                showSubmenu(navItems[0].getAttribute('data-submenu'));
            } else {
                for (var i = 0; i < navItems.length; i++) {
                    navItems[i].classList.remove('active');
                    var link = navItems[i].querySelector('.sticky-nav-link');
                    if (link) link.setAttribute('aria-expanded', 'false');
                }
                showSubmenu(null);
            }
        }

        if (menuToggle) menuToggle.addEventListener('click', toggleDropdown);
        if (allCategoriesToggle) allCategoriesToggle.addEventListener('click', toggleDropdown);

        // Hover behavior for nav items
        for (var i = 0; i < navItems.length; i++) {
            (function(item) {
                item.addEventListener('mouseenter', function() {
                    for (var j = 0; j < navItems.length; j++) {
                        navItems[j].classList.remove('active');
                        var lnk = navItems[j].querySelector('.sticky-nav-link');
                        if (lnk) lnk.setAttribute('aria-expanded', 'false');
                    }
                    item.classList.add('active');
                    var itemLink = item.querySelector('.sticky-nav-link');
                    if (itemLink) itemLink.setAttribute('aria-expanded', 'true');
                    showSubmenu(item.getAttribute('data-submenu'));
                });
            })(navItems[i]);
        }

        // Close on click outside
        document.addEventListener('click', function(e) {
            var menuWrapper = document.querySelector('.sticky-menu-wrapper');
            if (menuWrapper && !menuWrapper.contains(e.target)) {
                if (menuToggle) {
                    menuToggle.classList.remove('active');
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
                if (dropdownNav) {
                    dropdownNav.classList.remove('active');
                    dropdownNav.setAttribute('aria-hidden', 'true');
                }
                for (var i = 0; i < navItems.length; i++) {
                    navItems[i].classList.remove('active');
                    var link = navItems[i].querySelector('.sticky-nav-link');
                    if (link) link.setAttribute('aria-expanded', 'false');
                }
                showSubmenu(null);
            }
        });

        console.log('Hercules sticky header v2.0.7 initialized. Main header height:', mainHeaderHeight);

        // v2.0.7: Fetch session API to update cart count and login indicator dynamically
        // This ensures correct values even when page is cached
        var stickyCartData = null;

        function updateSessionUI() {
            fetch('/wp-json/hercules/v1/session', {
                credentials: 'include'
            })
            .then(function(response) { return response.json(); })
            .then(function(data) {
                // Store cart data for mini cart
                if (data.cart) {
                    stickyCartData = data.cart;
                }

                // Update cart count badge
                var cartBtn = document.getElementById('sticky-cart-toggle');
                if (cartBtn) {
                    var existingBadge = cartBtn.querySelector('.cart-count-badge');
                    var cartCount = data.cart && data.cart.count ? data.cart.count : 0;

                    if (cartCount > 0) {
                        if (existingBadge) {
                            existingBadge.textContent = cartCount > 99 ? '99+' : cartCount;
                        } else {
                            var badge = document.createElement('span');
                            badge.className = 'cart-count-badge';
                            badge.textContent = cartCount > 99 ? '99+' : cartCount;
                            cartBtn.appendChild(badge);
                        }
                    } else if (existingBadge) {
                        existingBadge.remove();
                    }
                }

                // Update login indicator
                var accountBtn = document.querySelector('.sticky-account-btn');
                if (accountBtn) {
                    var existingIndicator = accountBtn.querySelector('.logged-in-indicator');
                    var isLoggedIn = data.logged_in === true;

                    if (isLoggedIn) {
                        if (!existingIndicator) {
                            var indicator = document.createElement('span');
                            indicator.className = 'logged-in-indicator';
                            accountBtn.appendChild(indicator);
                        }
                    } else if (existingIndicator) {
                        existingIndicator.remove();
                    }
                }

                // Re-render sticky mini cart if open
                var stickyMinicart = document.getElementById('sticky-minicart');
                if (stickyMinicart && stickyMinicart.classList.contains('active')) {
                    renderStickyMiniCart();
                }
            })
            .catch(function(err) {
                console.error('Hercules sticky header: Failed to fetch session', err);
            });
        }

        // Fetch session data on page load
        updateSessionUI();

        // Also update on tab visibility change (user returns to tab)
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible') {
                updateSessionUI();
            }
        });

        // Listen for cart update events (from other components)
        window.addEventListener('hercules:cart-updated', function() {
            updateSessionUI();
        });

        /* ================================================
         * Sticky Header Mini Cart
         * ================================================ */
        function renderStickyMiniCart() {
            var minicart = document.getElementById('sticky-minicart');
            if (!minicart) return;

            if (!stickyCartData || !stickyCartData.items || stickyCartData.items.length === 0) {
                minicart.innerHTML = '<p class="herc-minicart-empty">Votre panier est vide.</p>';
                return;
            }

            var items = stickyCartData.items;
            var subtotal = stickyCartData.subtotal || '';

            var html = '<ul class="herc-minicart-list">';
            items.forEach(function(item) {
                var name = (item.name || '').split(' - ')[0];
                var thumb = item.thumbnail || '';
                var permalink = item.permalink || '/products/';
                var price = item.price || '';
                var qty = item.quantity || 1;

                html += '<li class="herc-minicart-item">';
                html += '<a href="' + permalink + '">';
                if (thumb) {
                    html += '<img src="' + thumb + '" alt="' + name.replace(/"/g, '&quot;') + '" class="herc-minicart-thumb" />';
                }
                html += '<div class="herc-minicart-info">';
                html += '<p class="herc-minicart-name">' + name + '</p>';
                html += '<p class="herc-minicart-price">' + qty + ' x ' + price + '</p>';
                html += '</div></a>';
                html += '<button type="button" class="herc-minicart-remove" data-key="' + (item.key || '') + '" aria-label="Remove ' + name.replace(/"/g, '&quot;') + '" title="Remove item">&times;</button>';
                html += '</li>';
            });
            html += '</ul>';

            html += '<div class="herc-minicart-subtotal"><span>Sous-total :</span><strong>' + subtotal + '</strong></div>';

            html += '<div class="herc-minicart-buttons">';
            html += '<a href="/generateur-de-devis/" class="herc-minicart-btn herc-minicart-btn--quote">GÉNÉRATEUR DE DEVIS</a>';
            html += '<a href="/panier/" class="herc-minicart-btn herc-minicart-btn--cart">VOIR LE PANIER</a>';
            html += '</div>';

            minicart.innerHTML = html;

            // Attach remove handlers
            minicart.querySelectorAll('.herc-minicart-remove').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    var key = btn.getAttribute('data-key');
                    if (key) removeStickyCartItem(key, btn);
                });
            });
        }

        function removeStickyCartItem(cartItemKey, btn) {
            if (btn) {
                btn.disabled = true;
                btn.textContent = '...';
            }

            fetch('/wp-json/hercules/v1/cart/remove', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: cartItemKey })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.success && data.cart) {
                    stickyCartData = data.cart;

                    // Update badge
                    var cartBtn = document.getElementById('sticky-cart-toggle');
                    if (cartBtn) {
                        var badge = cartBtn.querySelector('.cart-count-badge');
                        var count = data.cart.count || 0;
                        if (count > 0) {
                            if (badge) {
                                badge.textContent = count > 99 ? '99+' : count;
                            } else {
                                badge = document.createElement('span');
                                badge.className = 'cart-count-badge';
                                badge.textContent = count > 99 ? '99+' : count;
                                cartBtn.appendChild(badge);
                            }
                        } else if (badge) {
                            badge.remove();
                        }
                    }

                    renderStickyMiniCart();
                    window.dispatchEvent(new CustomEvent('hercules:cart-updated'));
                }
            })
            .catch(function(err) {
                console.error('Error removing cart item:', err);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '&times;';
                }
            });
        }

        // Toggle sticky mini cart on button click
        var stickyCartToggle = document.getElementById('sticky-cart-toggle');
        var stickyMinicartDrop = document.getElementById('sticky-minicart');

        if (stickyCartToggle && stickyMinicartDrop) {
            stickyCartToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var isOpen = stickyMinicartDrop.classList.contains('active');
                if (isOpen) {
                    stickyMinicartDrop.classList.remove('active');
                    stickyCartToggle.setAttribute('aria-expanded', 'false');
                } else {
                    renderStickyMiniCart();
                    stickyMinicartDrop.classList.add('active');
                    stickyCartToggle.setAttribute('aria-expanded', 'true');
                }
            });

            // Close on click outside
            document.addEventListener('mousedown', function(e) {
                var wrap = stickyHeader.querySelector('.herc-cart-wrap');
                if (wrap && !wrap.contains(e.target)) {
                    stickyMinicartDrop.classList.remove('active');
                    stickyCartToggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    });
    </script>
    <?php
}
