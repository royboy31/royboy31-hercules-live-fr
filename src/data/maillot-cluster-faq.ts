/**
 * Maillot Cluster FAQ — plain HTML Q&A blocks for SEO internal linking.
 * Each key is a page slug; value is an array of {question, answer} pairs.
 * Answers are HTML strings — bold links to the money page must be preserved.
 */

export const maillotClusterFaq: Record<string, { question: string; answer: string }[]> = {

  /* ── 0. Claquettes (facts sourced from the product page itself) ──── */

  'claquettes-personnalisees-club': [
    {
      question: 'Quelles pointures sont disponibles pour les claquettes personnalisées ?',
      answer: '<p>Les claquettes personnalisées sont disponibles du 24 au 48, de quoi équiper les équipes de jeunes comme les adultes, les entraîneurs et les membres du staff avec un ajustement confortable pour tous.</p>',
    },
    {
      question: 'Quelles couleurs de semelle peut-on choisir ?',
      answer: '<p>Douze couleurs de semelle sont disponibles : blanc, noir, jaune, vert, bleu royal, bleu marine, rouge, gris, orange, violet, marron et rose. De quoi assortir vos claquettes personnalisées aux couleurs exactes de votre club.</p>',
    },
    {
      question: 'Logo imprimé ou logo en relief : quelles sont les options ?',
      answer: '<p>Deux modèles sont proposés : la conception imprimée en quadri, adaptée aux logos détaillés et multicolores, et le logo en relief pour un rendu plus tactile. Notre équipe vérifie votre fichier et prépare le design avant production.</p>',
    },
    {
      question: 'Quel est le minimum de commande et comment évoluent les prix ?',
      answer: '<p>Les claquettes personnalisées sont commandables dès 20 paires, avec des tarifs dégressifs qui deviennent plus avantageux à mesure que la quantité augmente. Le tableau de prix de la page indique le prix par paire selon le volume.</p>',
    },
    {
      question: 'En quelle matière sont fabriquées les claquettes ?',
      answer: '<p>Elles sont fabriquées à partir de matériaux 100 % PVC de première qualité, choisis pour leur durabilité et leur longévité.</p>',
    },
    {
      question: 'Quel est le délai de livraison des claquettes personnalisées ?',
      answer: '<p>Le délai de livraison standard est de 4 à 6 semaines après validation du design. Ce produit ne dispose pas de service express ; pour une date précise, indiquez votre échéance dès la demande de devis afin que notre équipe confirme le calendrier réalisable.</p>',
    },
  ],

  /* ── 1. Collection ──────────────────────────────────────────────── */

  'accessoires-de-football': [
    {
      question: 'Quels accessoires de football proposez-vous ?',
      answer: '<p>Nous offrons une large gamme d\'accessoires personnalis\u00e9s pour les clubs, tels que des casquettes, des cache-cous, des drapeaux, et bien plus. Chaque produit est con\u00e7u pour repr\u00e9senter fi\u00e8rement vos couleurs et votre logo. D\u00e9couvrez tous nos accessoires disponibles ci-dessus et personnalisez-les selon vos besoins.</p>',
    },
    {
      question: 'Peut-on personnaliser les accessoires de football avec le logo de notre \u00e9quipe ?',
      answer: '<p>Oui, absolument. Tous nos accessoires, y compris les casquettes, les drapeaux, et les cache-cous, peuvent \u00eatre personnalis\u00e9s avec le logo, les couleurs ou le texte de votre choix. Cela permet de cr\u00e9er des produits uniques pour vos fans ou vos \u00e9v\u00e9nements.</p>',
    },
    {
      question: 'Proposez-vous aussi des maillots de football personnalis\u00e9s ?',
      answer: '<p>Oui, en plus des accessoires, nous cr\u00e9ons \u00e9galement des <strong><a href="/products/maillot-de-football-personnalise/">maillots de football personnalis\u00e9s</a></strong> avec votre logo, vos couleurs, et le nom de votre \u00e9quipe.</p>',
    },
  ],

  /* ── 2. Cache-cou ───────────────────────────────────────────────── */

  'cache-cou-personnalise-foot': [
    {
      question: 'Quelle est la diff\u00e9rence entre un cache-cou standard et un mod\u00e8le d\'hiver ?',
      answer: '<p>Le cache-cou standard est fabriqu\u00e9 en polyester, id\u00e9al pour les activit\u00e9s estivales ou l\u00e9g\u00e8res. Le mod\u00e8le d\'hiver est doubl\u00e9 en polaire, offrant une meilleure isolation contre le froid tout en conservant vos options de personnalisation.</p>',
    },
    {
      question: 'Quelle est la quantit\u00e9 minimale de commande pour les cache-cous personnalis\u00e9s ?',
      answer: '<p>La quantit\u00e9 minimale pour commander nos cache-cous personnalis\u00e9s est de 100 pi\u00e8ces. Pour des volumes plus importants, des remises progressives sont appliqu\u00e9es, comme indiqu\u00e9 dans notre tableau de prix.</p>',
    },
    {
      question: 'Puis-je compl\u00e9ter ma commande avec d\'autres articles personnalis\u00e9s pour mon club ?',
      answer: '<p>Oui, nous proposons une large gamme d\'articles compl\u00e9mentaires, comme des \u00e9charpes, des bonnets et m\u00eame des <strong><a href="/products/maillot-de-football-personnalise/">maillots de football personnalis\u00e9s</a></strong>. N\'h\u00e9sitez pas \u00e0 consulter le restant de notre site.</p>',
    },
  ],

  /* ── 3 & 4. Fanions (same content for both) ─────────────────────── */

  'fanion-grand-format-personnalise-imprime': [
    {
      question: 'Quels sont les avantages des fanions tiss\u00e9s par rapport aux fanions imprim\u00e9s ?',
      answer: '<p>Les fanions tiss\u00e9s sont r\u00e9alis\u00e9s avec du fil acrylique pour une finition haut de gamme et une durabilit\u00e9 accrue. Ils conviennent particuli\u00e8rement aux grandes occasions ou aux clubs souhaitant un rendu premium. Les fanions imprim\u00e9s, en revanche, sont plus \u00e9conomiques et offrent une grande libert\u00e9 de design gr\u00e2ce \u00e0 l\'impression quadri.</p>',
    },
    {
      question: 'Proposez-vous des formats sp\u00e9cifiques pour les fanions ?',
      answer: '<p>Oui, nous offrons une vari\u00e9t\u00e9 de tailles et de formats adapt\u00e9s \u00e0 vos besoins : des petits mod\u00e8les pour voiture, des fanions \u00e0 \u00e9changer avant un match, ou encore des banni\u00e8res d\u00e9coratives plus grandes. Vous pouvez nous consulter pour des dimensions sp\u00e9cifiques.</p>',
    },
    {
      question: 'Puis-je compl\u00e9ter ma commande avec d\'autres articles pour mon club ?',
      answer: '<p>Absolument. En plus des fanions, nous proposons une gamme compl\u00e8te d\'articles personnalis\u00e9s, tels que des \u00e9charpes, des bonnets, ou encore des <strong><a href="/products/maillot-de-football-personnalise/">maillots de football personnalis\u00e9s</a></strong> pour renforcer votre identit\u00e9 visuelle.</p>',
    },
  ],

  'fanion-personnalise-imprime': [
    {
      question: 'Quels sont les avantages des fanions tiss\u00e9s par rapport aux fanions imprim\u00e9s ?',
      answer: '<p>Les fanions tiss\u00e9s sont r\u00e9alis\u00e9s avec du fil acrylique pour une finition haut de gamme et une durabilit\u00e9 accrue. Ils conviennent particuli\u00e8rement aux grandes occasions ou aux clubs souhaitant un rendu premium. Les fanions imprim\u00e9s, en revanche, sont plus \u00e9conomiques et offrent une grande libert\u00e9 de design gr\u00e2ce \u00e0 l\'impression quadri.</p>',
    },
    {
      question: 'Proposez-vous des formats sp\u00e9cifiques pour les fanions ?',
      answer: '<p>Oui, nous offrons une vari\u00e9t\u00e9 de tailles et de formats adapt\u00e9s \u00e0 vos besoins : des petits mod\u00e8les pour voiture, des fanions \u00e0 \u00e9changer avant un match, ou encore des banni\u00e8res d\u00e9coratives plus grandes. Vous pouvez nous consulter pour des dimensions sp\u00e9cifiques.</p>',
    },
    {
      question: 'Puis-je compl\u00e9ter ma commande avec d\'autres articles pour mon club ?',
      answer: '<p>Absolument. En plus des fanions, nous proposons une gamme compl\u00e8te d\'articles personnalis\u00e9s, tels que des \u00e9charpes, des bonnets, ou encore des <strong><a href="/products/maillot-de-football-personnalise/">maillots de football personnalis\u00e9s</a></strong> pour renforcer votre identit\u00e9 visuelle.</p>',
    },
  ],

  /* ── 5. Ballons ─────────────────────────────────────────────────── */

  'ballons-de-foot-personnalisee': [
    {
      question: 'Quelles sont les diff\u00e9rences entre les ballons promotionnels, d\'entra\u00eenement et de match ?',
      answer: '<ul><li>Ballon promotionnel : id\u00e9al pour la visibilit\u00e9 de votre marque ou comme cadeau pour les supporters, fabriqu\u00e9 en PU et PVC.</li><li>Ballon d\'entra\u00eenement : parfait pour une utilisation r\u00e9guli\u00e8re, avec des mat\u00e9riaux durables respectant les normes FIFA.</li><li>Ballon de match : notre produit haut de gamme, utilis\u00e9 dans des comp\u00e9titions professionnelles, enti\u00e8rement personnalisable pour refl\u00e9ter vos couleurs.</li></ul>',
    },
    {
      question: 'Puis-je personnaliser les ballons avec des designs plus complexes ?',
      answer: '<p>Oui, nous pouvons imprimer des designs plus complexes en quadri, y compris plusieurs logos ou des motifs r\u00e9p\u00e9t\u00e9s. Vous avez \u00e9galement la possibilit\u00e9 de choisir parmi diff\u00e9rentes tailles, styles (r\u00e9tro, beach soccer) et finitions.</p>',
    },
    {
      question: 'En plus des ballons, proposez-vous d\'autres articles pour \u00e9quiper mon \u00e9quipe ?',
      answer: '<p>Absolument. Offrez une identit\u00e9 compl\u00e8te \u00e0 votre \u00e9quipe avec nos <strong><a href="/products/maillot-de-football-personnalise/">maillots de foot personnalis\u00e9s</a></strong>, con\u00e7us pour allier confort, performance et design sur mesure. Ces maillots sont id\u00e9aux pour accompagner vos ballons lors de matchs ou d\'entra\u00eenements.</p>',
    },
  ],

  /* ── 6. Bonnets ─────────────────────────────────────────────────── */

  'bonnets-personnalises': [
    {
      question: 'Quels sont les diff\u00e9rents types de bonnets personnalisables que vous proposez ?',
      answer: '<p>Nous proposons une large gamme de bonnets adapt\u00e9s \u00e0 vos besoins :</p><ul><li>Classiques : id\u00e9als pour un look intemporel.</li><li>\u00c9pais ou en maille torsad\u00e9e : parfaits pour l\'hiver.</li><li>R\u00e9versibles ou avec \u00e9tiquettes en cuir : pour un style plus original.</li></ul>',
    },
    {
      question: 'Puis-je int\u00e9grer des designs d\u00e9taill\u00e9s sur mes bonnets ?',
      answer: '<p>Oui, nous offrons diff\u00e9rentes techniques de personnalisation :</p><ul><li>Broderie pour un rendu soign\u00e9.</li><li>Badges cousus ou \u00e9tiquettes en cuir pour un effet premium.</li></ul><p>Pour les motifs plus complexes, nous pouvons \u00e9galement utiliser la sublimation.</p>',
    },
    {
      question: 'En plus des bonnets, proposez-vous d\'autres v\u00eatements personnalis\u00e9s ?',
      answer: '<p>Oui, nous offrons des solutions compl\u00e8tes pour \u00e9quiper votre \u00e9quipe, y compris des <strong><a href="/products/maillot-de-football-personnalise/">maillots de football personnalis\u00e9s</a></strong>, parfaits pour renforcer l\'identit\u00e9 visuelle de votre club ou association. Associez vos bonnets et maillots pour une tenue harmonieuse.</p>',
    },
  ],

  /* ── 7. Veste de pluie ──────────────────────────────────────────── */

  'veste-de-pluie-football': [
    {
      question: 'Puis-je personnaliser enti\u00e8rement le design de la veste de pluie ?',
      answer: '<p>Oui, toute la surface de la veste peut \u00eatre personnalis\u00e9e avec vos couleurs, motifs et logos. Vous pouvez m\u00eame choisir un design diff\u00e9rent \u00e0 l\'avant et \u00e0 l\'arri\u00e8re pour refl\u00e9ter parfaitement l\'identit\u00e9 de votre club ou entreprise.</p>',
    },
    {
      question: 'Les vestes sont-elles adapt\u00e9es \u00e0 une utilisation intensive ?',
      answer: '<p>Absolument. Fabriqu\u00e9es en polyester 100 % imperm\u00e9able, elles sont parfaites pour les conditions m\u00e9t\u00e9orologiques difficiles tout en offrant une grande durabilit\u00e9 pour les activit\u00e9s sportives r\u00e9guli\u00e8res.</p>',
    },
    {
      question: 'Puis-je associer les vestes de pluie avec d\'autres \u00e9quipements personnalis\u00e9s ?',
      answer: '<p>Bien s\u00fbr. Compl\u00e9tez votre tenue avec nos <strong><a href="/products/maillot-de-football-personnalise/">maillots de football personnalis\u00e9s</a></strong>, id\u00e9aux pour cr\u00e9er une identit\u00e9 visuelle coh\u00e9rente lors des matchs ou des entra\u00eenements. Associez-les avec les vestes pour une \u00e9quipe pr\u00eate \u00e0 toutes les conditions.</p>',
    },
  ],

  /* ── 8. Gants ───────────────────────────────────────────────────── */

  'gants-de-football-personnalises': [
    {
      question: 'Puis-je choisir des tailles diff\u00e9rentes pour les gants ?',
      answer: '<p>Oui, vous pouvez commander des gants en tailles adultes ou enfants. Il est possible de pr\u00e9ciser la r\u00e9partition des tailles apr\u00e8s la commande, sans frais suppl\u00e9mentaires.</p>',
    },
    {
      question: 'Quelles sont les options pour personnaliser les gants avec un logo ?',
      answer: '<p>Nous proposons trois techniques de personnalisation pour les logos :</p><ul><li>Broderie : id\u00e9al pour un rendu \u00e9l\u00e9gant.</li><li>\u00c9tiquette tiss\u00e9e : pour un look raffin\u00e9 et durable.</li><li>Badge imprim\u00e9 : parfait pour les designs plus complexes.</li></ul><p>Ces logos sont appliqu\u00e9s sur les deux gants.</p>',
    },
    {
      question: 'Comment compl\u00e9ter l\'\u00e9quipement de mon \u00e9quipe avec des produits assortis ?',
      answer: '<p>Pour une coh\u00e9rence parfaite, associez vos gants personnalis\u00e9s \u00e0 nos <strong><a href="/products/maillot-de-football-personnalise/">maillots de foot sur mesure</a></strong>, adapt\u00e9s \u00e0 vos couleurs et votre logo. Cela permet \u00e0 votre \u00e9quipe d\'afficher une identit\u00e9 visuelle forte sur le terrain.</p>',
    },
  ],

  /* ── 9. Maillot entra\u00eenement ────────────────────────────────────── */

  'maillot-entrainement-personnalise': [
    {
      question: 'Puis-je personnaliser les maillots d\'entra\u00eenement avec des noms ou des num\u00e9ros ?',
      answer: '<p>Pour ces maillots, tous les mod\u00e8les doivent avoir un design identique. Vous pouvez ajouter des noms ou des num\u00e9ros apr\u00e8s la production gr\u00e2ce \u00e0 une impression flex. Pour des personnalisations uniques d\u00e8s la production, d\u00e9couvrez nos <strong><a href="/products/maillot-de-football-personnalise/">maillots de football sur mesure</a></strong>.</p>',
    },
    {
      question: 'Les maillots sont-ils adapt\u00e9s pour un usage intensif ?',
      answer: '<p>Oui, fabriqu\u00e9s en 100 % polyester, ces maillots sont l\u00e9gers, respirants et con\u00e7us pour r\u00e9sister aux entra\u00eenements r\u00e9guliers. Ils offrent un confort optimal pour les joueurs tout en maintenant une apparence professionnelle.</p>',
    },
  ],

  /* ── 10. Badges ─────────────────────────────────────────────────── */

  'badges-personnalises': [
    {
      question: 'Quels types de badges proposez-vous ?',
      answer: '<p>Nous offrons deux types de badges personnalisables :</p><ul><li>\u00c0 coudre : id\u00e9al pour une fixation permanente.</li><li>\u00c0 coller : facile \u00e0 fixer gr\u00e2ce \u00e0 une colle textile sp\u00e9ciale activ\u00e9e par repassage, parfaite pour un usage pratique.</li></ul>',
    },
    {
      question: 'Combien de couleurs puis-je int\u00e9grer dans le design de mon badge ?',
      answer: '<p>Vous pouvez utiliser jusqu\'\u00e0 6 couleurs diff\u00e9rentes pour personnaliser vos badges. Pour des designs plus complexes, contactez notre \u00e9quipe pour discuter des options disponibles.</p>',
    },
    {
      question: 'Comment int\u00e9grer les badges \u00e0 un \u00e9quipement d\'\u00e9quipe ?',
      answer: '<p>Les badges personnalis\u00e9s sont parfaits pour ajouter une touche unique \u00e0 vos \u00e9quipements, notamment aux <strong><a href="/products/maillot-de-football-personnalise/">maillots de foot personnalis\u00e9s</a></strong>. Ils permettent de renforcer l\'identit\u00e9 de votre club tout en maintenant un look professionnel.</p>',
    },
  ],

  /* ── 11. Money page — maillot de football personnalis\u00e9 ──────────── */

  'maillot-de-football-personnalise': [
    {
      question: 'Quels types de maillots de football personnalis\u00e9s proposez-vous ?',
      answer: '<p>Nous proposons trois mod\u00e8les de maillots :</p><ul><li>Col rond : le classique pour un style sobre et intemporel.</li><li>Col en V : offrant une touche sportive et moderne.</li><li>Col polo : id\u00e9al pour un look \u00e9l\u00e9gant et professionnel.</li></ul><p>Vous pouvez choisir parmi une large gamme de tailles, allant de 2 ans \u00e0 6XL, et m\u00eame des coupes sp\u00e9cifiques pour les \u00e9quipes f\u00e9minines.</p>',
    },
    {
      question: 'Quelle est la diff\u00e9rence entre les deux mati\u00e8res disponibles ?',
      answer: '<ul><li>Mati\u00e8re lisse et serr\u00e9e : id\u00e9ale pour un look classique, elle offre une excellente r\u00e9sistance et convient aux conditions de jeu normales.</li><li>Mati\u00e8re perfor\u00e9e : con\u00e7ue pour les sportifs, elle am\u00e9liore l\'\u00e9vacuation de la transpiration, garantissant un confort optimal m\u00eame pendant les matchs intenses.</li></ul><p>Les deux mati\u00e8res sont fabriqu\u00e9es \u00e0 partir de polyester de haute qualit\u00e9, con\u00e7u pour durer.</p>',
    },
    {
      question: 'Puis-je ajouter des noms ou des num\u00e9ros uniques sur chaque maillot ?',
      answer: '<p>Oui, chaque maillot peut \u00eatre personnalis\u00e9 avec un nom et un num\u00e9ro unique. Ces \u00e9l\u00e9ments peuvent \u00eatre plac\u00e9s \u00e0 l\'arri\u00e8re, sur la poitrine ou toute autre position de votre choix. Cette option est id\u00e9ale pour les \u00e9quipes souhaitant afficher une identit\u00e9 forte sur le terrain.</p>',
    },
    {
      question: 'Comment obtenir un design unique pour mon \u00e9quipe ?',
      answer: '<p>Nos graphistes travaillent avec vous pour cr\u00e9er un design sur mesure qui refl\u00e8te l\'identit\u00e9 de votre \u00e9quipe. Vous pouvez \u00e9galement fournir votre propre design en t\u00e9l\u00e9chargeant le gabarit fourni. Nous nous assurons que tout est pr\u00eat avant de lancer la production.</p>',
    },
    {
      question: 'Puis-je assortir les maillots avec d\'autres \u00e9quipements pour mon \u00e9quipe ?',
      answer: '<p>Absolument. Compl\u00e9tez vos maillots avec des shorts assortis, des chaussettes personnalis\u00e9es ou m\u00eame des vestes et accessoires tels que des gants ou des bonnets. Ces \u00e9l\u00e9ments permettent de renforcer l\'unit\u00e9 visuelle de votre \u00e9quipe et de se d\u00e9marquer lors des comp\u00e9titions.</p>',
    },
    {
      question: 'Pourquoi choisir nos maillots de football personnalis\u00e9s ?',
      answer: '<p>Nos maillots sont con\u00e7us pour r\u00e9pondre aux besoins des \u00e9quipes professionnelles et amateurs :</p><ul><li>Fabrication europ\u00e9enne garantissant une qualit\u00e9 sup\u00e9rieure.</li><li>Libert\u00e9 totale dans le choix des couleurs, motifs et logos.</li><li>Disponibilit\u00e9 pour toutes les tailles et coupes.</li><li>Service de conception gratuit avec des graphistes sp\u00e9cialis\u00e9s.</li></ul>',
    },
    {
      question: 'Quels avantages les maillots personnalis\u00e9s offrent-ils par rapport aux mod\u00e8les standards ?',
      answer: '<p>Les maillots personnalis\u00e9s permettent :</p><ul><li>De refl\u00e9ter l\'identit\u00e9 unique de votre \u00e9quipe.</li><li>De cr\u00e9er un sentiment d\'appartenance fort parmi les joueurs.</li><li>D\'assurer une visibilit\u00e9 accrue pour vos sponsors ou partenaires gr\u00e2ce \u00e0 l\'int\u00e9gration de leurs logos.</li></ul><p>Ils sont particuli\u00e8rement recommand\u00e9s pour les clubs, associations sportives ou entreprises souhaitant se d\u00e9marquer.</p>',
    },
    {
      question: 'Quels sports ou \u00e9v\u00e9nements conviennent aux maillots personnalis\u00e9s ?',
      answer: '<p>Nos maillots sont polyvalents et peuvent \u00eatre utilis\u00e9s pour :</p><ul><li>Les matchs de football amateurs ou professionnels.</li><li>Les entra\u00eenements et tournois multisports.</li><li>Les \u00e9v\u00e9nements d\'entreprise ou team building.</li><li>Les comp\u00e9titions scolaires ou universitaires.</li></ul>',
    },
    {
      question: 'Quels sont les volumes de commande minimum et maximum ?',
      answer: '<p>Le volume minimum est de 5 maillots par commande. Pour des volumes importants, au-del\u00e0 de 100 unit\u00e9s, nous proposons des tarifs d\u00e9gressifs et des options sp\u00e9cifiques. N\'h\u00e9sitez pas \u00e0 nous contacter pour discuter des commandes en gros.</p>',
    },
    {
      question: 'Comment entretenir les maillots personnalis\u00e9s pour une durabilit\u00e9 maximale ?',
      answer: '<p>Pour pr\u00e9server la qualit\u00e9 de vos maillots, nous recommandons :</p><ul><li>Lavage \u00e0 30\u00b0C maximum sur programme d\u00e9licat.</li><li>Pas de s\u00e8che-linge, s\u00e9chage \u00e0 l\'air libre \u00e0 plat.</li><li>Repassage \u00e0 basse temp\u00e9rature, \u00e0 l\'envers.</li><li>Pas de fer \u00e0 repasser directement sur les zones personnalis\u00e9es (flocage, sublimation).</li></ul>',
    },
    {
      question: 'Comment int\u00e9grer des sponsors sur les maillots ?',
      answer: '<p>Vous pouvez inclure les logos de vos sponsors \u00e0 plusieurs emplacements strat\u00e9giques : poitrine, manches ou dos. Cela permet de maximiser leur visibilit\u00e9 tout en respectant l\'identit\u00e9 visuelle de l\'\u00e9quipe. Notre graphiste int\u00e9grateur peut vous conseiller sur le placement optimal.</p>',
    },
  ],
};
