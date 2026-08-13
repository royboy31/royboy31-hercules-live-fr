/**
 * Per-slug SEO overrides for product pages (title tag, H1, meta description,
 * intro block and end-of-page SEO block).
 *
 * Guard: each entry records the WooCommerce product name it was written against
 * (expectedName). If the product is renamed in WooCommerce, the override is
 * ignored and the page falls back to the live product name, so a rename can
 * never produce a stale or contradictory page.
 *
 * This is a bridge until seo_h1/seo_title post meta exists for products in
 * WordPress (the category equivalent already exists). Once that lands, move
 * these values into WP and delete this file.
 */

export interface ProductSeoOverride {
  expectedName: string;
  title?: string;
  h1?: string;
  metaDescription?: string;
  introHtml?: string;
  seoBlockHtml?: string;
}

const productSeoOverrides: Record<string, ProductSeoOverride> = {
  'maillot-de-football-personnalise': {
    expectedName: 'Maillot de Football Personnalisé',
    title: 'Maillot de Foot Personnalisé pour Club et Équipe',
    metaDescription:
      'Créez votre maillot de foot personnalisé pour club, équipe ou association. Sublimation durable, fabriqué en Europe, prix dégressifs et design gratuit.',
  },
  'claquettes-personnalisees-club': {
    expectedName: 'Claquettes Personnalisées Club',
    title: 'Claquettes personnalisées avec logo | Dès 20 paires',
    h1: 'Claquettes personnalisées avec logo pour clubs',
    metaDescription:
      'Créez des claquettes personnalisées aux couleurs de votre club : logo imprimé ou en relief, tailles 24 à 48, dès 20 paires. Design gratuit et devis rapide.',
    introHtml: `
<p>Créez des claquettes personnalisables aux couleurs de votre club, de votre équipe ou de votre association. Ajoutez votre logo en impression quadri ou en relief et choisissez la couleur de semelle adaptée à votre identité.</p>
<p>Disponibles du 24 au 48 et commandables dès 20 paires, nos claquettes personnalisées sont conçues pour les vestiaires, les déplacements, les événements et la boutique de votre club. Notre équipe réalise le design avec vous avant le lancement de la production.</p>`,
    seoBlockHtml: `
<h2>Claquettes personnalisées pour clubs, équipes et associations</h2>
<p>Les claquettes personnalisées permettent à un club de prolonger son identité bien au-delà du terrain. Elles peuvent être utilisées dans les vestiaires, au bord de la piscine, pendant les déplacements ou comme article de merchandising dans la boutique du club. Chaque paire est fabriquée sur mesure avec les couleurs et le logo de l'équipe.</p>
<p>La personnalisation peut être réalisée avec un logo imprimé en quadri, idéal pour les visuels détaillés et multicolores, ou avec un logo en relief pour un rendu plus tactile. Notre équipe vérifie la qualité du fichier et prépare un design avant production.</p>
<h2>Une gamme de tailles adaptée à toute l'équipe</h2>
<p>Les pointures disponibles vont du 24 au 48, ce qui permet d'équiper les équipes de jeunes, les adultes, les entraîneurs et les membres du staff. Plusieurs couleurs de semelle sont proposées afin d'approcher au mieux la charte graphique du club.</p>
<p>La quantité minimale est de 20 paires et les tarifs deviennent progressivement plus avantageux lorsque la quantité augmente. Le tableau de prix vous permet d'évaluer rapidement votre budget avant de demander un devis.</p>
<h2>Douze couleurs de semelle aux couleurs de votre club</h2>
<p>La semelle de vos claquettes personnalisées est disponible en douze couleurs : blanc, noir, jaune, vert, bleu royal, bleu marine, rouge, gris, orange, violet, marron et rose. Cette palette permet d'assortir chaque paire à la charte graphique du club, du maillot au vestiaire.</p>
<h2>Une matière PVC pensée pour durer</h2>
<p>Chaque paire est fabriquée à partir de matériaux 100 % PVC de première qualité, garantissant durabilité et longévité, à l'entraînement, au bord de la piscine ou en déplacement.</p>
<p>Pour les grandes commandes, des extras sont possibles dès 500 pièces : étiquettes volantes, étiquettes tissées ou cartes d'en-tête, utiles pour la revente en boutique de club.</p>
<h2>Un accompagnement du design à la livraison</h2>
<p>Après réception de votre logo, Hercules prépare une proposition graphique et vérifie la faisabilité du marquage. Une fois le design validé, la production est lancée. Le délai standard est de 4 à 6 semaines.</p>
<p>Pour une date de tournoi, un événement ou une ouverture de boutique, indiquez votre échéance dès la demande : notre équipe confirme la solution réalisable et le calendrier avant validation de la commande.</p>`,
  },

  'casquette-personnalisee': {
    expectedName: 'Casquette Personnalisée sur mesure',
    title: 'Casquette personnalisée avec logo | Fabrication sur mesure',
    h1: 'Casquette personnalisée avec logo pour clubs et entreprises',
    metaDescription:
      'Créez votre casquette personnalisée sur mesure : broderie 3D, sublimation intégrale, couleurs et visière au choix. Dès 200 pièces, design gratuit et devis rapide.',
    introHtml: `
<p>Créez une casquette personnalisée entièrement sur mesure pour votre club, votre entreprise ou votre événement. Chaque élément est configurable : combinaisons de couleurs, type de fermeture, style de visière et couleur des œillets.</p>
<p>Votre logo peut être reproduit en broderie 3D, en impression par sublimation intégrale ou en patch silicone. Fabrication sur mesure dès 200 pièces, avec design réalisé par notre équipe avant production.</p>`,
    seoBlockHtml: `
<h2>Une casquette personnalisée à l'image de votre organisation</h2>
<p>La casquette personnalisée est un support d'identité durable pour un club sportif, une entreprise ou un événement. Portée aux entraînements, en boutique, sur un salon ou offerte aux supporters et partenaires, elle prolonge vos couleurs bien au-delà du terrain.</p>
<p>Contrairement à une casquette standard marquée, une fabrication sur mesure permet de choisir chaque détail : panneaux, visière, fermeture, œillets et finitions reprennent exactement votre charte graphique.</p>
<h2>Broderie 3D, sublimation ou patch : à chaque logo sa technique</h2>
<p>La broderie 3D donne du relief et un rendu premium aux logos et monogrammes. L'impression par sublimation intégrale reproduit les visuels complexes, les dégradés et les motifs couvrants. Les patchs en silicone ou tissés apportent une finition moderne très résistante.</p>
<p>Notre équipe vérifie votre fichier, recommande la technique adaptée à votre design et prépare une proposition graphique avant le lancement de la production.</p>
<h2>Quantités, délais et alternatives</h2>
<p>La fabrication sur mesure est disponible dès 200 pièces, avec des tarifs dégressifs selon la quantité. Pour de plus petites séries, découvrez nos modèles personnalisables dès 10 pièces : la <a href="/products/casquette-de-baseball/">casquette de baseball personnalisée</a>, la <a href="/products/casquette-trucker-personnalisee/">casquette trucker personnalisée</a> ou la <a href="/products/casquette-de-cyclisme-personnalisee/">casquette de cyclisme personnalisée</a>.</p>`,
  },

  'bob-personnalise': {
    expectedName: 'Bob personnalisé',
    title: 'Bob personnalisé sur mesure | Impression toute surface',
    h1: 'Bob personnalisé sur mesure pour clubs, marques et événements',
    metaDescription:
      'Créez un bob personnalisé unique : impression quadri sur toute la surface, motifs complexes et dégradés sans limite, modèle simple ou recto-verso. Fabrication sur mesure.',
    introHtml: `
<p>Créez un bob personnalisé entièrement sur mesure pour votre club, votre marque ou votre événement. Contrairement aux modèles standards sur lesquels un logo est simplement ajouté, chaque bob est créé à partir de zéro, avec un design unique.</p>
<p>L'impression quadri couvre toute la surface du tissu : designs complets, motifs complexes, dégradés et visuels détaillés, sans limite de couleurs.</p>`,
    seoBlockHtml: `
<h2>Un bob créé à partir de zéro, pas un modèle standard</h2>
<p>Nos bobs personnalisés ne partent pas d'un produit existant : le tissu est imprimé avant confection, ce qui permet un design continu sur l'ensemble du bob. C'est la différence entre un accessoire promotionnel classique et une pièce à l'image exacte de votre club ou de votre marque.</p>
<h2>Modèles et qualités disponibles</h2>
<p>Deux modèles sont proposés : le bob simple et le bob recto-verso. Côté fabrication, plusieurs qualités sont disponibles : qualité plus épaisse (production en Chine ou en Europe) et qualité promotionnelle (production en Europe), selon votre usage et votre budget.</p>
<h2>Pour compléter votre gamme</h2>
<p>Le bob s'inscrit dans la famille des couvre-chefs personnalisés : découvrez aussi la <a href="/products/casquette-personnalisee/">casquette personnalisée sur mesure</a> et l'ensemble de la <a href="/collections/couvre-chefs/">collection couvre-chefs</a>.</p>`,
  },

  'cache-cou-personnalise-foot': {
    expectedName: 'Cache-Cou Personnalisé Foot',
    title: 'Cache-cou personnalisé | Fabrication européenne dès 50 pièces',
    h1: 'Cache-cou personnalisé pour clubs et supporters',
    metaDescription:
      'Cache-cou personnalisé imprimé en quadri : 100 % polyester, 50 x 25 cm, fabrication européenne en 3 semaines, dès 50 pièces. Version hiver avec polaire disponible.',
    introHtml: `
<p>Le cache-cou personnalisé est l'accessoire multifonction apprécié des coureurs, des cyclistes et des supporters, à l'entraînement comme en tribune. La version estivale, en 100 % polyester, est entièrement imprimée avec votre motif.</p>
<p>Pour l'hiver, une version avec polaire est disponible : plus chaude, en une couleur, avec votre logo brodé. Fabrication européenne, dès 50 pièces.</p>`,
    seoBlockHtml: `
<h2>Un cache-cou pour l'été, un autre pour l'hiver</h2>
<p>La version été est composée de 100 % polyester et imprimée en quadri sur toute la surface (50 x 25 cm) : couleurs, dégradés et visuels détaillés sont reproduits fidèlement. La version hiver ajoute une doublure polaire pour les entraînements par temps froid, avec un logo brodé sur une couleur unie.</p>
<h2>Fabrication européenne et délais</h2>
<p>Le cache-cou personnalisé est fabriqué en Europe, avec un délai de livraison standard de 3 semaines. Pour une échéance particulière, indiquez votre date dès la demande de devis afin que notre équipe confirme le calendrier réalisable.</p>`,
  },

  'serviette-personnalisee': {
    expectedName: 'Serviette Personnalisée',
    title: 'Serviette personnalisée : sport, club et plage | Dès 25 pièces',
    h1: 'Serviette de sport et de plage personnalisée',
    metaDescription:
      'Serviette personnalisée par sublimation : face microfibre douce, revers coton absorbant, 4 formats de 100 x 50 à 180 x 100 cm. Dès 25 pièces pour clubs et entreprises.',
    introHtml: `
<p>Offrez une touche unique à vos serviettes avec une personnalisation complète : couleurs, motifs, logos, textes et visuels, sans limite. L'impression par sublimation donne un rendu éclatant, résistant et parfaitement intégré au tissu, sans effet de relief ni altération au lavage.</p>
<p>Quatre formats sont disponibles, de la serviette de sport (100 x 50 cm) à la serviette de plage (180 x 100 cm), dès 25 pièces.</p>`,
    seoBlockHtml: `
<h2>Une face microfibre, un revers coton</h2>
<p>Chaque serviette personnalisée combine une face en microfibre ultra-douce, idéale pour une impression vive et détaillée, et un revers en coton absorbant pour un usage sportif ou balnéaire confortable.</p>
<h2>Quatre formats pour tous les usages</h2>
<p>Du format sport compact (100 x 50 cm) aux formats 140 x 70, 160 x 80 et 180 x 100 cm pour la plage, la gamme couvre les besoins des clubs, des salles de sport et des entreprises. Une option de production « verte » est également proposée parmi nos usines partenaires.</p>
<h2>Découvrez aussi</h2>
<p>Pour un rendu tissé haut de gamme, la <a href="/products/serviette-tissee-jacquard/">serviette tissée jacquard</a> complète la gamme, à retrouver dans la <a href="/collections/serviettes-personnalisees/">collection serviettes personnalisées</a>.</p>`,
  },

  'fanion-personnalise-imprime': {
    expectedName: 'Fanion personnalisé imprimé',
    // Variant-intent title: the generic "fanion personnalisé" query belongs to
    // /collections/fanions-personnalises-football/ — this page targets the
    // printed variant only, to stop the collection/product cannibalization.
    title: 'Fanion imprimé en haute définition | Dès 50 pièces',
    h1: 'Fanion imprimé en haute définition',
    metaDescription:
      'Imprimez vos fanions de club en quadri : formes sur mesure, recto et verso différents, cordon ou franges. Dès 50 pièces, fabrication européenne.',
    introHtml: `
<p>Créez un fanion imprimé en haute définition pour votre club, votre association ou votre événement. L'impression quadri permet de reproduire des logos complexes, des dégradés et des photos sans limiter le nombre de couleurs.</p>
<p>Choisissez la forme, la finition et un visuel identique ou différent au recto et au verso. Fabrication européenne dès 50 pièces, avec design et contrôle du fichier avant production. Retrouvez tous nos modèles dans la collection <a href="/collections/fanions-personnalises-football/">fanion personnalisé</a>.</p>`,
    seoBlockHtml: `
<h2>Un fanion personnalisé imprimé pour chaque occasion</h2>
<p>Le fanion personnalisé imprimé convient aux échanges d'avant-match, aux tournois, aux événements, aux cadeaux de sponsors et à la décoration des locaux du club. Grâce à l'impression quadri, les détails du logo, les textes, les dégradés et les photos peuvent être reproduits avec précision.</p>
<p>Le recto et le verso peuvent reprendre le même visuel ou deux créations différentes. Cette flexibilité permet, par exemple, d'afficher le blason du club sur une face et le nom d'un tournoi, d'un adversaire ou d'un sponsor sur l'autre.</p>
<h2>Formes, matières et finitions</h2>
<p>Les fanions sont réalisés en tissu polyester et peuvent adopter une forme triangulaire, une forme obus, un pentagone ou une découpe spécifique. La finition peut inclure un cordon ou des franges composées de plusieurs couleurs disponibles.</p>
<p>Avant production, le fichier est contrôlé et adapté au format retenu. Vous validez ensuite un BAT afin de confirmer la forme, les dimensions, les couleurs, les textes et les finitions.</p>
<h2>Fabrication européenne et tarifs dégressifs</h2>
<p>La fabrication est réalisée en Europe à partir de 50 pièces, avec des tarifs dégressifs selon la quantité commandée. Le tableau de prix indique le prix par pièce selon le volume.</p>
<p>Vous cherchez un autre type de fanion, un grand format ou une comparaison entre les modèles ? <a href="/collections/fanions-personnalises-football/">Découvrir tous nos fanions personnalisés</a>.</p>`,
  },
};

export function getProductSeoOverride(
  slug: string | undefined,
  actualName: string | undefined
): ProductSeoOverride | null {
  if (!slug || !actualName) return null;
  const override = productSeoOverrides[slug];
  if (!override) return null;
  if (override.expectedName !== actualName) {
    console.warn(
      `[seo-overrides] Skipping override for "${slug}": product name changed ` +
        `("${override.expectedName}" -> "${actualName}"). Update or remove the override.`
    );
    return null;
  }
  return override;
}
