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
<h2>Un accompagnement du design à la livraison</h2>
<p>Après réception de votre logo, Hercules prépare une proposition graphique et vérifie la faisabilité du marquage. Une fois le design validé, la production est lancée.</p>
<p>Pour une date de tournoi, un événement ou une ouverture de boutique, indiquez votre échéance dès la demande : notre équipe confirme la solution réalisable et le calendrier avant validation de la commande.</p>`,
  },

  'fanion-personnalise-imprime': {
    expectedName: 'Fanion personnalisé imprimé',
    title: 'Fanion personnalisé imprimé | Fabrication européenne',
    h1: 'Fanion personnalisé imprimé en haute définition',
    metaDescription:
      'Créez un fanion personnalisé imprimé en quadri : formes sur mesure, recto-verso différent, cordon ou franges. Dès 50 pièces, fabrication européenne.',
    introHtml: `
<p>Créez un fanion personnalisé imprimé en haute définition pour votre club, votre association ou votre événement. L'impression quadri permet de reproduire des logos complexes, des dégradés et des photos sans limiter le nombre de couleurs.</p>
<p>Choisissez la forme, la finition et un visuel identique ou différent au recto et au verso. Fabrication européenne dès 50 pièces, avec design et contrôle du fichier avant production.</p>`,
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
