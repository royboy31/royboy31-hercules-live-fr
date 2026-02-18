/**
 * Hreflang URL Mappings for Hercules Merchandise International Sites
 *
 * Generated from sitemaps on 2026-01-07:
 * - DE: hercules-merchandise.de (97 products, 39 categories)
 * - EN: hercules-merchandise.co.uk (97 products, 39 categories)
 * - FR: hercules-merchandising.fr (96 products, 39 categories)
 */

export const DOMAINS = {
  de: 'https://hercules-merchandise.de',
  en: 'https://hercules-merchandise.co.uk',
  fr: 'https://hercules-merchandising.fr'
} as const;

export type Locale = keyof typeof DOMAINS;

/**
 * Static page mappings
 */
export const PAGE_MAPPINGS: Record<string, Record<Locale, string>> = {
  '/': { de: '/', en: '/', fr: '/' },
  '/kontaktieren-sie-uns/': { de: '/kontaktieren-sie-uns/', en: '/contact-us/', fr: '/contactez-nous/' },
  '/uber-uns/': { de: '/uber-uns/', en: '/about/', fr: '/a-propos/' },
  '/blogs/': { de: '/blogs/', en: '/blogs/uk/', fr: '/blogs/' },
  '/datenschutzerklarung/': { de: '/datenschutzerklarung/', en: '/privacy-policy/', fr: '/politique-de-confidentialite/' },
  '/nutzungsbedingungen/': { de: '/nutzungsbedingungen/', en: '/terms-of-service/', fr: '/conditions-generales-dutilisation/' },
  '/rechtlicher-hinweis/': { de: '/rechtlicher-hinweis/', en: '/legal-notice/', fr: '/mentions-legales/' },
  '/zahlungsmethoden/': { de: '/zahlungsmethoden/', en: '/payment-methods/', fr: '/moyens-de-paiement/' },
  '/lieferungen-und-rucksendungen/': { de: '/lieferungen-und-rucksendungen/', en: '/deliveries-and-returns/', fr: '/livraisons-et-retours/' },
  '/shop/': { de: '/shop/', en: '/shop/', fr: '/boutique/' }
};

/**
 * Category slug mappings (39 categories)
 * Generated from product_cat sitemaps - positionally aligned across all locales
 */
export const CATEGORY_MAPPINGS: Record<string, Record<Locale, string>> = {
  // Product Categories
  'personalisierte-fanschals': { de: 'personalisierte-fanschals', en: 'custom-scarves', fr: 'echarpes-personnalisees' },
  'fussballschals': { de: 'fussballschals', en: 'football-scarves', fr: 'football-scarves' },
  'personalisierte-sportbekleidung': { de: 'personalisierte-sportbekleidung', en: 'custom-printed-sportswear', fr: 'equipements-personnalises' },
  'fanartikel': { de: 'fanartikel', en: 'fan-items', fr: 'fan-items' },
  'personalisierte-wimpel': { de: 'personalisierte-wimpel', en: 'custom-pennants', fr: 'fanions-personnalises-football' },
  'personalisierte-textilien': { de: 'personalisierte-textilien', en: 'custom-textile', fr: 'textile-sport-personnalise' },
  'personalisierte-mutzen': { de: 'personalisierte-mutzen', en: 'custom-beanies', fr: 'bonnets-personnalises-football' },
  'kopfbedeckung': { de: 'kopfbedeckung', en: 'headwear', fr: 'couvre-chefs' },
  'team-bekleidung': { de: 'team-bekleidung', en: 'teamwear', fr: 'teamwear' },
  'handtucher': { de: 'handtucher', en: 'towels', fr: 'serviettes-personnalisees' },
  'flaggen': { de: 'flaggen', en: 'flags', fr: 'drapeaux-personnalises' },
  'schuhwerk': { de: 'schuhwerk', en: 'footwear', fr: 'chaussettes-et-claquettes' },
  'taschen': { de: 'taschen', en: 'bags', fr: 'sacs-de-sport-personnalises' },
  'trinkflaschen': { de: 'trinkflaschen', en: 'drinkware', fr: 'bidons-et-tasses' },
  'balle': { de: 'balle', en: 'balls', fr: 'ballons' },
  'zubehor': { de: 'zubehor', en: 'accessories', fr: 'accessoires-de-football' },

  // Sports Categories
  'fussball': { de: 'fussball', en: 'football', fr: 'football' },
  'rugby': { de: 'rugby', en: 'rugby', fr: 'rugby' },
  'basketball': { de: 'basketball', en: 'basketball', fr: 'basketball' },
  'laufen': { de: 'laufen', en: 'running', fr: 'running' },
  'feldhockey': { de: 'feldhockey', en: 'field-hockey', fr: 'hockey-sur-gazon' },
  'volleyball': { de: 'volleyball', en: 'volleyball', fr: 'volleyball' },
  'handball': { de: 'handball', en: 'handball', fr: 'handball' },
  'radfahren': { de: 'radfahren', en: 'cycling', fr: 'cyclisme' },
  'fitness': { de: 'fitness', en: 'fitness', fr: 'fitness' },
  'golf': { de: 'golf', en: 'golf', fr: 'golf' },
  'esport': { de: 'esport', en: 'esports', fr: 'esports' },

  // Theme Categories
  'sommer': { de: 'sommer', en: 'summer', fr: 'ete' },
  'winter': { de: 'winter', en: 'winter', fr: 'hiver' },
  'nachhaltigkeit': { de: 'nachhaltigkeit', en: 'sustainable', fr: 'durable' },
  'hergestellt-in-europa': { de: 'hergestellt-in-europa', en: 'made-in-europe', fr: 'fabrique-en-europe' },
  'mode': { de: 'mode', en: 'fashion', fr: 'mode' },
  'schulanfang': { de: 'schulanfang', en: 'back-to-school', fr: 'rentree-scolaire' },
  'tifo': { de: 'tifo', en: 'tifo', fr: 'tifo' },
  'weihnachten': { de: 'weihnachten', en: 'christmas', fr: 'noel' },
  'kleine-preise': { de: 'kleine-preise', en: 'small-prices', fr: 'petits-prix' },
  'business': { de: 'business', en: 'business', fr: 'business' },
  'werbegeschenke': { de: 'werbegeschenke', en: 'give-aways', fr: 'cadeaux' },
  'kinder': { de: 'kinder', en: 'kids', fr: 'enfants' }
};

/**
 * Blog post slug mappings
 * URL patterns: DE=/blogs/{slug}/, EN=/blogs/uk/{slug}/, FR=/blogs/news/{slug}/
 */
export const BLOG_MAPPINGS: Record<string, Record<Locale, string>> = {
  'einen-strickschal-entwerfen-das-sollten-sie-wissen': {
    de: 'einen-strickschal-entwerfen-das-sollten-sie-wissen',
    en: 'designing-a-knitted-scarf-heres-what-you-need-to-know',
    fr: 'concevoir-une-echarpe-tricotee-ce-qu-il-faut-savoir'
  },
  'der-ultimative-leitfaden-fuer-half-and-half-schals-ein-muss-fuer-jeden-fan': {
    de: 'der-ultimative-leitfaden-fuer-half-and-half-schals-ein-muss-fuer-jeden-fan',
    en: 'the-ultimate-guide-to-half-and-half-scarves-a-must-have-for-every-fan',
    fr: '' // No FR translation
  },
  'umweltfreundliche-individuell-gestaltete-schals-fuer-veja-hergestellt-in-europa-aus-recycelter-baumwolle': {
    de: 'umweltfreundliche-individuell-gestaltete-schals-fuer-veja-hergestellt-in-europa-aus-recycelter-baumwolle',
    en: 'eco-friendly-custom-scarves-for-veja-made-in-europe-from-recycled-cotton',
    fr: 'echarpes-personnalisees-eco-responsables-pour-veja-fabriquees-en-europe-a-partir-de-coton-recycle'
  },
  'liverpool-schals-individuell-gestalten': {
    de: 'liverpool-schals-individuell-gestalten',
    en: 'customise-liverpool-scarves',
    fr: '' // No FR translation
  },
  'stilsicher-unterwegs-der-aufstieg-der-personalisierten-badeschlappen-in-der-modernen-mode': {
    de: 'stilsicher-unterwegs-der-aufstieg-der-personalisierten-badeschlappen-in-der-modernen-mode',
    en: 'sliding-into-style-the-rise-of-slides-in-modern-fashion',
    fr: '' // No FR translation
  },
  'wie-stattest-du-dein-team-mit-individuellen-merchandise-artikeln-aus': {
    de: 'wie-stattest-du-dein-team-mit-individuellen-merchandise-artikeln-aus',
    en: 'how-to-equip-your-team-with-custom-merchandise',
    fr: '' // No FR translation
  },
  'individuelle-fanschals-in-nur-2-wochen-geliefert-fuer-das-spiel-leyton-orient-f-c-gegen-manchester-city': {
    de: 'individuelle-fanschals-in-nur-2-wochen-geliefert-fuer-das-spiel-leyton-orient-f-c-gegen-manchester-city',
    en: 'custom-football-scarves-delivered-in-just-2-weeks-for-leyton-orient-f-c-vs-manchester-city-match',
    fr: '' // No FR translation
  }
};

/**
 * Product slug mappings (97 products)
 * Generated from product sitemaps
 */
export const PRODUCT_MAPPINGS: Record<string, Record<Locale, string>> = {
  // Caps & Headwear
  'baseball-cap': { de: 'baseball-cap', en: 'baseball-cap', fr: 'casquette-de-baseball' },
  'personalisierte-snapback-cap': { de: 'personalisierte-snapback-cap', en: 'customised-snapback-cap', fr: 'snapback' },
  'personalisierte-trucker-cap': { de: 'personalisierte-trucker-cap', en: 'customised-trucker-cap', fr: 'casquette-trucker-personnalisee' },
  'personalisierte-cap': { de: 'personalisierte-cap', en: 'custom-made-baseball-caps', fr: 'casquette-personnalisee' },
  'personalisierte-radsportmutze': { de: 'personalisierte-radsportmutze', en: 'custom-cycling-cap', fr: 'casquette-de-cyclisme-personnalisee' },
  'personalisierter-fischerhut': { de: 'personalisierter-fischerhut', en: 'custom-made-bucket-hats', fr: 'bob-personnalise' },

  // Beanies
  'schlichte-standard-mutze': { de: 'schlichte-standard-mutze', en: 'cutom-basic-beanie-hats-with-embroidery', fr: 'bonnet-personnalise-broderie-basique' },
  'alaska-mutze': { de: 'alaska-mutze', en: 'custom-alaska-hat-with-embroidery', fr: 'bonnet-personnalise-broderie-alaska' },
  'custom-football-beanie-hats': { de: 'custom-football-beanie-hats', en: 'custom-football-beanie-hats', fr: 'bonnets-personnalises' },
  'personalisierte-wintermutze': { de: 'personalisierte-wintermutze', en: 'custom-winter-beanie-hats', fr: 'bonnet-personnalise-broderie-hiver' },
  'personalisierte-wendemutze': { de: 'personalisierte-wendemutze', en: 'custom-reversible-beanie-hats', fr: 'bonnet-personnalise-broderie-reversible' },
  'personalisierte-vintage-mutze': { de: 'personalisierte-vintage-mutze', en: 'custom-vintage-beanie-hats', fr: 'bonnet-personnalise-broderie-vintage' },
  'personalisierte-business-mutze': { de: 'personalisierte-business-mutze', en: 'custom-business-beanie-hats', fr: 'bonnet-personnalise-broderie-business' },
  'personalisierte-zopfmuster-mutze': { de: 'personalisierte-zopfmuster-mutze', en: 'custom-cable-knitted-beanie-hats', fr: 'bonnet-personnalise-broderie-torsade' },
  'bedruckte-mutze': { de: 'bedruckte-mutze', en: 'custom-printed-beanies', fr: 'bonnet-imprime-sur-mesure' },

  // Sports Jerseys
  'personalisiertes-handball-trikot': { de: 'personalisiertes-handball-trikot', en: 'custom-handball-shirt', fr: 'maillot-de-handball-personnalise' },
  'personalisiertes-fussballtrikot': { de: 'personalisiertes-fussballtrikot', en: 'custom-football-shirts', fr: 'maillot-de-football-personnalise' },
  'personalisiertes-retro-fussballtrikot': { de: 'personalisiertes-retro-fussballtrikot', en: 'custom-retro-football-shirt', fr: 'maillot-de-football-vintage-retro-personnalise' },
  'personalisiertes-feldhockey-trikot': { de: 'personalisiertes-feldhockey-trikot', en: 'custom-field-hockey-shirt', fr: 'maillot-de-hockey-sur-gazon-personnalise' },
  'personalisiertes-volleyball-trikot': { de: 'personalisiertes-volleyball-trikot', en: 'custom-volleyball-shirt', fr: 'maillot-de-volley-ball-personnalise' },
  'personalisiertes-basketball-trikot': { de: 'personalisiertes-basketball-trikot', en: 'custom-basketball-shirts', fr: 'maillot-de-basket-personnalise' },
  'personalisierte-rugby-trikots': { de: 'personalisierte-rugby-trikots', en: 'custom-printed-rugby-shirts', fr: 'maillot-de-rugby-personnalise' },
  'personalisiertes-radsport-trikot': { de: 'personalisiertes-radsport-trikot', en: 'custom-cycling-jersey', fr: 'maillot-cyclisme-personnalise' },
  'personalisiertes-shooting-shirt': { de: 'personalisiertes-shooting-shirt', en: 'custom-basketball-shooting-shirts', fr: 'surmaillot-basket-personnalise' },
  'personalisiertes-aufwarmtrikot': { de: 'personalisiertes-aufwarmtrikot', en: 'jersey-entrainement-custom', fr: 'maillot-entrainement-personnalise' },
  'personalisiertes-mini-trikot': { de: 'personalisiertes-mini-trikot', en: 'custom-printed-mini-kits', fr: 'mini-equipement-personnalise' },

  // Running & Fitness
  'personalisiertes-laufshirt-2': { de: 'personalisiertes-laufshirt-2', en: 'custom-running-shirt', fr: 'singlet-running-personnalise' },
  'personalisiertes-laufshirt': { de: 'personalisiertes-laufshirt', en: 'custom-running-singlet', fr: 'maillot-running-personnalise' },
  'personalisiertes-fitness-singlet': { de: 'personalisiertes-fitness-singlet', en: 'custom-fitness-singlet', fr: 'singlet-fitness-personnalise' },
  'personalisiertes-fitness-top': { de: 'personalisiertes-fitness-top', en: 'custom-fitness-top', fr: 'brassiere-fitness-personnalisee' },
  'personalisierte-fitness-leggings': { de: 'personalisierte-fitness-leggings', en: 'custom-fitness-leggings', fr: 'leggings-de-fitness-personnalises' },

  // Apparel - Printed
  'bedrucktes-poloshirt': { de: 'bedrucktes-poloshirt', en: 'printed-poloshirt', fr: 'polo-imprime' },
  'bedruckter-hoodie': { de: 'bedruckter-hoodie', en: 'printed-hoodies', fr: 'hoodie-personnalise' },
  'bedrucktes-sweatshirt': { de: 'bedrucktes-sweatshirt', en: 'printed-sweatshirt', fr: 'sweat-personnalise' },
  'bedrucktes-tshirt': { de: 'bedrucktes-tshirt', en: 'printed-t-shirt', fr: 't-shirt-personnalise' },

  // Apparel - Custom Made
  'massgeschneiderter-hoodie': { de: 'massgeschneiderter-hoodie', en: 'custom-made-hoodie', fr: 'hoodie-sur-mesure' },
  'massgeschneidetes-sweatshirt': { de: 'massgeschneidetes-sweatshirt', en: 'custom-made-sweatshirt', fr: 'sweat-sur-mesure' },
  'massgeschneidertes-poloshirt': { de: 'massgeschneidertes-poloshirt', en: 'custom-made-poloshirt', fr: 'polo-sur-mesure' },
  'massgeschneidertes-tshirt': { de: 'massgeschneidertes-tshirt', en: 'custom-made-t-shirt', fr: 't-shirt-sur-mesure' },
  'personalisiertes-golf-poloshirt': { de: 'personalisiertes-golf-poloshirt', en: 'custom-golf-poloshirt', fr: 'polo-de-golf-personnalise' },
  'personalisierter-weihnachtspullover': { de: 'personalisierter-weihnachtspullover', en: 'custom-christmas-jumpers', fr: 'pull-de-noel-personnalise' },

  // Outerwear
  'personalisierte-trainer-jacke': { de: 'personalisierte-trainer-jacke', en: 'custom-printed-coach-jackets', fr: 'veste-de-coach' },
  'personalisierte-regenjacke': { de: 'personalisierte-regenjacke', en: 'custom-printed-rain-jackets', fr: 'veste-de-pluie-football' },
  'personalisierter-trainingsanzug': { de: 'personalisierter-trainingsanzug', en: 'custom-printed-tracksuits', fr: 'training-personnalise' },

  // Socks
  'klassische-socken': { de: 'klassische-socken', en: 'classic-socks', fr: 'chaussettes-classiques' },
  'sportsocken': { de: 'sportsocken', en: 'sports-socks', fr: 'chaussettes-de-sport' },
  'fussball-socken': { de: 'fussball-socken', en: 'football-socks', fr: 'chaussettes-de-football' },
  'knoechelsocken': { de: 'knoechelsocken', en: 'ankle-socks', fr: 'soquettes' },

  // Scarves - Main Types
  'personalisierter-fussballschal': { de: 'personalisierter-fussballschal', en: 'custom-football-scarf', fr: 'echarpe-hd-deluxe-personnalisee' },
  'individuell-gewebter-schal': { de: 'individuell-gewebter-schal', en: 'custom-woven-scarf', fr: 'echarpe-personnalisee-tissee' },
  'personalisierter-fleece-schal': { de: 'personalisierter-fleece-schal', en: 'custom-fleece-scarf', fr: 'echarpe-personnalisee-polaire' },
  'individuell-bedruckter-fanschal': { de: 'individuell-bedruckter-fanschal', en: 'custom-printed-scarves', fr: 'echarpe-personnalisee-sublimee' },
  'personalisierter-business-schal': { de: 'personalisierter-business-schal', en: 'custom-business-scarves', fr: 'echarpe-personnalisee-business' },
  'personalisierter-jacquard-schal': { de: 'personalisierter-jacquard-schal', en: 'custom-jacquard-scarves', fr: 'echarpe-personnalisee-jacquard' },
  'personalisierter-blockstreifen-schal': { de: 'personalisierter-blockstreifen-schal', en: 'custom-rugby-scarves-with-embroidery', fr: 'echarpes-personnalisees-a-blocs-avec-broderie' },
  'personalisierter-retro-strickschal': { de: 'personalisierter-retro-strickschal', en: 'scarf-custom-retro', fr: 'echarpe-personnalisee-retro' },
  'personalisierter-rippstrick-schal': { de: 'personalisierter-rippstrick-schal', en: 'scarf-custom-ribbed', fr: 'echarpe-personnalisee-nervuree' },
  'personalisierter-premium-schal': { de: 'personalisierter-premium-schal', en: 'custom-premium-fashion-scarves', fr: 'echarpe-personnalisee-premium' },
  'personalisierter-autoschal': { de: 'personalisierter-autoschal', en: 'custom-car-scarves', fr: 'echarpes-personnalisee-voiture' },
  'personalisierter-schal-aus-recycelter-baumwolle': { de: 'personalisierter-schal-aus-recycelter-baumwolle', en: 'custom-recyled-cotton-scarves', fr: 'echarpe-personnalisee-coton-recycle' },
  'personalisierter-hd-deluxe-schal-mit-gewebten-aufnahern': { de: 'personalisierter-hd-deluxe-schal-mit-gewebten-aufnahern', en: 'custom-hd-deluxe-scarf-with-woven-badges', fr: 'echarpe-personnalisee-hd-deluxe-avec-badges' },
  'individuell-gestrickter-schlauchschal': { de: 'individuell-gestrickter-schlauchschal', en: 'custom-knitted-neckwarmers-and-snoods', fr: 'tour-de-cou-personnalise' },
  'personalisierter-3-in-1-schal': { de: 'personalisierter-3-in-1-schal', en: 'custom-printed-multiscarf', fr: 'cache-cou-personnalise-foot' },

  // Towels
  'personalisierte-handtucher': { de: 'personalisierte-handtucher', en: 'custom-sublimated-towels', fr: 'serviette-personnalisee' },
  'jacquard-webhandtuch': { de: 'jacquard-webhandtuch', en: 'custom-jacquard-woven-towels', fr: 'serviette-tissee-jacquard' },

  // Pennants & Flags
  'individuell-gedruckter-wimpel': { de: 'individuell-gedruckter-wimpel', en: 'custom-printed-pennants', fr: 'fanion-personnalise-imprime' },
  'personalisierter-grosswimpel': { de: 'personalisierter-grosswimpel', en: 'custom-large-pennant', fr: 'fanion-grand-format-personnalise-imprime' },
  'personalisierte-flagge': { de: 'personalisierte-flagge', en: 'custom-printed-flags', fr: 'drapeau-personnalise' },
  'handflaggen': { de: 'handflaggen', en: 'custom-printed-hand-flags-for-fans', fr: 'drapeaux-a-main' },
  'papier-handflaggen': { de: 'papier-handflaggen', en: 'paper-hand-flags', fr: 'drapeaux-a-main-en-papier' },

  // Bags
  'personalisierter-turnbeutel': { de: 'personalisierter-turnbeutel', en: 'custom-printed-drawstring-bags', fr: 'sac-de-sport-personnalises' },
  'sport-bag-customs': { de: 'sport-bag-customs', en: 'sport-bag-customs', fr: 'sac-de-sport-personnalisable' },
  'personalisierter-rucksack': { de: 'personalisierter-rucksack', en: 'backpack-custom', fr: 'sac-a-dos-personnalise' },

  // Drinkware
  'personalisierte-sport-trinkflasche': { de: 'personalisierte-sport-trinkflasche', en: 'custom-sports-water-bottles', fr: 'bidon-deau' },
  'personalisierte-tasse': { de: 'personalisierte-tasse', en: 'custom-printed-mugs', fr: 'tasse-personnalisee-football' },

  // Fan Items
  'schaumstofffinger': { de: 'schaumstofffinger', en: 'custom-printed-giant-hand-for-fans', fr: 'main-geante' },
  'fanklapper': { de: 'fanklapper', en: 'custom-fan-hand-clappers', fr: 'clap-clap' },
  'klatschstangen': { de: 'klatschstangen', en: 'custom-printed-thundersticks', fr: 'clapsticks-gonflables' },
  'gesichtsfarbe': { de: 'gesichtsfarbe', en: 'custom-face-paints-for-fans', fr: 'stick-maquillage' },

  // Accessories
  'personalisiertes-schlusselband': { de: 'personalisiertes-schlusselband', en: 'custom-lanyard', fr: 'tour-de-cou-personnalise-1' },
  'personalisiertes-kissen': { de: 'personalisiertes-kissen', en: 'custom-woven-or-printed-pillow', fr: 'coussin-brode-personnalise' },
  'personalisiertes-stadiumkissen': { de: 'personalisiertes-stadiumkissen', en: 'custom-printed-stadium-cushions', fr: 'coussin-de-stade-personnalise' },
  'personalisierter-sport-schlusselanhanger': { de: 'personalisierter-sport-schlusselanhanger', en: 'custom-sports-keyring', fr: 'porte-cles-sport-personnalise' },
  'personalisierte-federmappe': { de: 'personalisierte-federmappe', en: 'custom-pencil-cases', fr: 'trousse-football' },
  'personalisiertes-kuscheltier': { de: 'personalisiertes-kuscheltier', en: 'plush-toy', fr: 'peluche-personnalisee' },
  'personalisierte-anstecknadeln': { de: 'personalisierte-anstecknadeln', en: 'custom-lapel-pins', fr: 'pins' },
  'personalisierte-decke': { de: 'personalisierte-decke', en: 'custom-blanket', fr: 'couverture-personnalisee' },
  'personalisierte-auswechselbank-decke': { de: 'personalisierte-auswechselbank-decke', en: 'custom-professional-dugout-blankets', fr: 'couverture-personnalisee-joueur' },
  'personalisierte-gesichtsmasken': { de: 'personalisierte-gesichtsmasken', en: 'custom-printed-face-masks', fr: 'masque-de-protection-personnalise' },
  'personalisierte-handschuhe': { de: 'personalisierte-handschuhe', en: 'custom-knitted-gloves', fr: 'gants-de-football-personnalises' },
  'personalisierter-regenschirm': { de: 'personalisierter-regenschirm', en: 'custom-printed-umbrellas', fr: 'parapluie-personnalisable' },
  'bedruckter-fussball': { de: 'bedruckter-fussball', en: 'customised-leather-footballs', fr: 'ballons-de-foot-personnalisee' },
  'individuell-gewebter-aufnaher': { de: 'individuell-gewebter-aufnaher', en: 'custom-woven-badges-for-football-and-rugby', fr: 'badges-personnalises' },
  'personalisierte-badeschlappen': { de: 'personalisierte-badeschlappen', en: 'custom-club-slides-and-slippers', fr: 'claquettes-personnalisees-club' },
  'personalisierte-weihnachtskugeln': { de: 'personalisierte-weihnachtskugeln', en: 'custom-printed-christmas-baubles', fr: 'boules-de-noel-personnalisees' },
  'winter-geschenkbox': { de: 'winter-geschenkbox', en: 'giftbox-winter', fr: 'coffret-cadeau-personnalise' },

  // Products without direct translation (fallback to similar or shop)
  'individuell-bedrucktes-multifunktionstuch': { de: 'individuell-bedrucktes-multifunktionstuch', en: 'custom-printed-multiscarf', fr: 'cache-cou-personnalise-foot' }
};

/**
 * Get hreflang URLs for a given DE path
 */
export function getHreflangUrls(dePath: string, pageType: 'page' | 'collection' | 'product' | 'blog' = 'page'): Record<Locale, string> {
  const result: Record<Locale, string> = {
    de: DOMAINS.de + dePath,
    en: DOMAINS.en + dePath,
    fr: DOMAINS.fr + dePath
  };

  if (pageType === 'page') {
    const mapping = PAGE_MAPPINGS[dePath];
    if (mapping) {
      result.de = DOMAINS.de + mapping.de;
      result.en = DOMAINS.en + mapping.en;
      result.fr = DOMAINS.fr + mapping.fr;
    }
  } else if (pageType === 'collection') {
    const match = dePath.match(/^\/collections\/([^/]+)\/?$/);
    if (match) {
      const slug = match[1];
      // Try direct lookup (DE slug as key)
      const directMapping = CATEGORY_MAPPINGS[slug];
      if (directMapping) {
        result.de = `${DOMAINS.de}/collections/${directMapping.de}/`;
        result.en = `${DOMAINS.en}/collections/${directMapping.en}/`;
        result.fr = `${DOMAINS.fr}/collections/${directMapping.fr}/`;
      } else {
        // Reverse lookup: find by EN slug
        let found = false;
        for (const [, mapping] of Object.entries(CATEGORY_MAPPINGS)) {
          if (mapping.en === slug) {
            result.de = `${DOMAINS.de}/collections/${mapping.de}/`;
            result.en = `${DOMAINS.en}/collections/${mapping.en}/`;
            result.fr = `${DOMAINS.fr}/collections/${mapping.fr}/`;
            found = true;
            break;
          }
        }
        if (!found) {
          result.de = `${DOMAINS.de}/collections/${slug}/`;
          result.fr = `${DOMAINS.fr}/collections/${slug}/`;
        }
      }
    }
  } else if (pageType === 'product') {
    // Try matching DE path (/produkte/) first, then EN path (/products/)
    const deMatch = dePath.match(/^\/produkte\/([^/]+)\/?$/);
    const enMatch = dePath.match(/^\/products\/([^/]+)\/?$/);

    if (deMatch) {
      const deSlug = deMatch[1];
      const mapping = PRODUCT_MAPPINGS[deSlug];
      if (mapping) {
        result.de = `${DOMAINS.de}/products/${mapping.de}/`;
        result.en = `${DOMAINS.en}/products/${mapping.en}/`;
        result.fr = `${DOMAINS.fr}/products/${mapping.fr}/`;
      } else {
        result.en = `${DOMAINS.en}/shop/`;
        result.fr = `${DOMAINS.fr}/boutique/`;
      }
    } else if (enMatch) {
      // Reverse lookup: find DE slug by EN slug
      const enSlug = enMatch[1];
      let found = false;
      for (const [deSlug, mapping] of Object.entries(PRODUCT_MAPPINGS)) {
        if (mapping.en === enSlug) {
          result.de = `${DOMAINS.de}/products/${mapping.de}/`;
          result.en = `${DOMAINS.en}/products/${mapping.en}/`;
          result.fr = `${DOMAINS.fr}/products/${mapping.fr}/`;
          found = true;
          break;
        }
      }
      if (!found) {
        // Keep same slug for all if no mapping found
        result.de = `${DOMAINS.de}/products/${enSlug}/`;
        result.fr = `${DOMAINS.fr}/products/${enSlug}/`;
      }
    }
  } else if (pageType === 'blog') {
    // Check if it's a blog post (not the index)
    const match = dePath.match(/^\/blogs\/([^/]+)\/?$/);
    if (match && match[1] !== '') {
      const deSlug = match[1];
      const mapping = BLOG_MAPPINGS[deSlug];
      if (mapping) {
        // Use mapped URLs with locale-specific paths
        result.de = `${DOMAINS.de}/blogs/${mapping.de}/`;
        result.en = mapping.en
          ? `${DOMAINS.en}/blogs/uk/${mapping.en}/`
          : `${DOMAINS.en}/blogs/`;
        result.fr = mapping.fr
          ? `${DOMAINS.fr}/blogs/news/${mapping.fr}/`
          : `${DOMAINS.fr}/blogs/`;
      } else {
        // Unmapped blog post - fallback to blog index
        result.en = `${DOMAINS.en}/blogs/`;
        result.fr = `${DOMAINS.fr}/blogs/`;
      }
    } else {
      // Blog index page
      result.de = `${DOMAINS.de}/blogs/`;
      result.en = `${DOMAINS.en}/blogs/uk/`;
      result.fr = `${DOMAINS.fr}/blogs/`;
    }
  }

  return result;
}
