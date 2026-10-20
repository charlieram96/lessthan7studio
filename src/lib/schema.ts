import { SITE } from '../config';

const ORG_ID = `${SITE.url}/#org`;
const SITE_ID = `${SITE.url}/#website`;

export function organization() {
  return {
    '@context': 'https://schema.org',
    '@type': ['Organization', 'ProfessionalService'],
    '@id': ORG_ID,
    name: SITE.name,
    alternateName: SITE.legalName,
    url: `${SITE.url}/`,
    logo: `${SITE.url}/brand/lessthan7-mark-512.png`,
    image: `${SITE.url}/og/default.png`,
    slogan: SITE.tagline,
    description: SITE.description,
    email: SITE.email,
    telephone: '+1-786-970-2109',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: SITE.geo.lat, longitude: SITE.geo.lng },
    areaServed: [
      { '@type': 'City', name: 'Miami' },
      { '@type': 'AdministrativeArea', name: 'South Florida' },
      { '@type': 'Country', name: 'United States' },
    ],
    knowsAbout: [
      'Web design',
      'Web development',
      'Search engine optimization',
      'Core Web Vitals',
      'Brand identity',
      'E-commerce',
    ],
    sameAs: SITE.socials.map((s) => s.href),
  };
}

export function website() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: `${SITE.url}/`,
    name: SITE.name,
    inLanguage: 'en-US',
    publisher: { '@id': ORG_ID },
  };
}

export function breadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE.url}${item.path}`,
    })),
  };
}

export function webPage(opts: { path: string; name: string; description: string; type?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': opts.type ?? 'WebPage',
    '@id': `${SITE.url}${opts.path}#webpage`,
    url: `${SITE.url}${opts.path}`,
    name: opts.name,
    description: opts.description,
    isPartOf: { '@id': SITE_ID },
    about: { '@id': ORG_ID },
    inLanguage: 'en-US',
  };
}

export function caseStudy(p: {
  slug: string;
  name: string;
  summary: string;
  liveUrl: string;
  industry: string;
  services: readonly string[];
  image: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': `${SITE.url}/work/${p.slug}/#work`,
    name: `${p.name} website`,
    headline: `${p.name}: case study`,
    description: p.summary,
    url: `${SITE.url}/work/${p.slug}/`,
    image: `${SITE.url}${p.image}`,
    genre: 'Website design and development',
    keywords: [p.industry, ...p.services].join(', '),
    creator: { '@id': ORG_ID },
    about: { '@type': 'Organization', name: p.name, url: p.liveUrl },
    isPartOf: { '@id': SITE_ID },
  };
}

export function services(list: { name: string; description: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: list.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Service',
        name: s.name,
        description: s.description,
        provider: { '@id': ORG_ID },
        areaServed: 'Worldwide',
      },
    })),
  };
}
