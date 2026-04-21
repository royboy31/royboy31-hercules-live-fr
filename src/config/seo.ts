// SEO Configuration for Hercules Merchandising FR
// Based on Rank Math settings export

export const siteConfig = {
  // Site Info
  siteName: 'Hercules Merchandising FR',
  siteUrl: 'https://hercules-merchandising.fr',
  titleSeparator: '-',
  defaultDescription: 'Personalised sportswear, fan scarves and merchandise for clubs and teams. Made in Europe.',
  locale: 'fr_FR',
  language: 'fr',

  // Organization/Business Info
  organization: {
    name: 'Hercules Merchandising FR',
    legalName: 'Be Ventures SPRL',
    type: 'Organization',
    email: 'info@hercules-merchandising.fr',
    phone: '+33 9 73 03 02 95',
    // Legal entity: Be Ventures SPRL (Belgian company operating FR site)
    address: {
      streetAddress: 'Avenue Paul de Merten 32',
      postalCode: '1090',
      addressLocality: 'Jette',
      addressCountry: 'BE'
    },
    openingHours: [
      { day: 'Monday', time: '09:00-17:00' },
      { day: 'Tuesday', time: '09:00-17:00' },
      { day: 'Wednesday', time: '09:00-17:00' },
      { day: 'Thursday', time: '09:00-17:00' },
      { day: 'Friday', time: '09:00-17:00' },
      { day: 'Saturday', time: '09:00-17:00' },
      { day: 'Sunday', time: '09:00-17:00' }
    ],
    sameAs: [
      // Add social media URLs here
    ]
  },

  // Default Images
  defaultImage: '/images/og-default.jpg',
  logo: '/images/logo.png',

  // Twitter/Social
  twitter: {
    cardType: 'summary_large_image',
    site: '@HerculesMerch', // Update with actual Twitter handle
  },

  // Robots defaults
  robots: {
    index: true,
    follow: true,
    maxSnippet: -1,
    maxVideoPreview: -1,
    maxImagePreview: 'large' as const,
  },

  // Breadcrumb settings
  breadcrumbs: {
    separator: '»',
    homeLabel: 'Home',
  }
};

// Title templates for different page types
export const titleTemplates = {
  homepage: `${siteConfig.siteName} ${siteConfig.titleSeparator} ${siteConfig.defaultDescription.substring(0, 60)}`,
  product: (title: string) => `${title} ${siteConfig.titleSeparator} ${siteConfig.siteName}`,
  category: (term: string) => `${term} ${siteConfig.titleSeparator} ${siteConfig.siteName}`,
  blogPost: (title: string) => `${title} ${siteConfig.titleSeparator} ${siteConfig.siteName}`,
  blogArchive: (page?: number) => page && page > 1
    ? `Blog Page ${page} ${siteConfig.titleSeparator} ${siteConfig.siteName}`
    : `Blog ${siteConfig.titleSeparator} ${siteConfig.siteName}`,
  page: (title: string) => `${title} ${siteConfig.titleSeparator} ${siteConfig.siteName}`,
  search: (query: string) => `Search: ${query} ${siteConfig.titleSeparator} ${siteConfig.siteName}`,
  notFound: `Page not found ${siteConfig.titleSeparator} ${siteConfig.siteName}`,
};

// Meta description templates
export const descriptionTemplates = {
  product: (excerpt: string) => excerpt || siteConfig.defaultDescription,
  category: (description: string) => description || siteConfig.defaultDescription,
  blogPost: (excerpt: string) => excerpt || siteConfig.defaultDescription,
};

// Robots meta for different page types
export const robotsConfig = {
  default: 'index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large',
  noindex: 'noindex, follow',
  nofollow: 'index, nofollow',
  none: 'noindex, nofollow',
};

// Pages that should be noindex
export const noindexPages = [
  '/search',
  '/cart',
  '/checkout',
  '/mon-compte',
];

// Generate Organization JSON-LD
export function getOrganizationSchema() {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.organization.name,
    legalName: siteConfig.organization.legalName,
    url: siteConfig.siteUrl,
    logo: `${siteConfig.siteUrl}${siteConfig.logo}`,
    email: siteConfig.organization.email,
    telephone: siteConfig.organization.phone,
    sameAs: siteConfig.organization.sameAs,
  };

  // Only include address if configured
  if (siteConfig.organization.address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: siteConfig.organization.address.streetAddress,
      postalCode: siteConfig.organization.address.postalCode,
      addressLocality: siteConfig.organization.address.addressLocality,
      addressCountry: siteConfig.organization.address.addressCountry,
    };
  }

  return schema;
}

// Generate WebSite JSON-LD
export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.siteName,
    url: siteConfig.siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.siteUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// Generate Product JSON-LD
export function getProductSchema(product: {
  name: string;
  description: string;
  image: string;
  url: string;
  sku?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}) {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    url: product.url,
    brand: {
      '@type': 'Brand',
      name: product.brand || siteConfig.siteName,
    },
  };

  if (product.sku) {
    schema.sku = product.sku;
  }

  if (product.priceMin !== undefined) {
    schema.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: product.currency || 'EUR',
      lowPrice: product.priceMin,
      highPrice: product.priceMax || product.priceMin,
      availability: `https://schema.org/${product.availability || 'InStock'}`,
      itemCondition: `https://schema.org/${product.condition || 'NewCondition'}`,
    };
  }

  if (product.aggregateRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.aggregateRating.ratingValue,
      reviewCount: product.aggregateRating.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

// Generate Article/BlogPosting JSON-LD
export function getArticleSchema(article: {
  title: string;
  description: string;
  image: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  type?: 'Article' | 'BlogPosting';
}) {
  return {
    '@context': 'https://schema.org',
    '@type': article.type || 'BlogPosting',
    headline: article.title,
    description: article.description,
    image: article.image,
    url: article.url,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': 'Organization',
      name: article.author || siteConfig.siteName,
      url: siteConfig.siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.siteUrl}${siteConfig.logo}`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
  };
}

// Generate BreadcrumbList JSON-LD
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// Generate CollectionPage JSON-LD (for category pages)
export function getCollectionPageSchema(collection: {
  name: string;
  description: string;
  url: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.name,
    description: collection.description,
    url: collection.url,
    ...(collection.image && { image: collection.image }),
    isPartOf: {
      '@type': 'WebSite',
      name: siteConfig.siteName,
      url: siteConfig.siteUrl,
    },
  };
}

// Generate FAQPage JSON-LD (for pages with FAQ sections)
export function getFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  if (!faqs || faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: stripHtml(faq.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripHtml(faq.answer),
      },
    })),
  };
}

// Helper to strip HTML tags for meta descriptions
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Helper to truncate text for meta descriptions (max 160 chars)
export function truncateDescription(text: string, maxLength = 160): string {
  const stripped = stripHtml(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength - 3).trim() + '...';
}
