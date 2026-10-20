export interface ServicePillar {
  id: 'design' | 'development' | 'search';
  name: string;
  headline: string;
  summary: string;
  capabilities: string[];
  schemaName: string;
}

export const PILLARS: ServicePillar[] = [
  {
    id: 'design',
    name: 'Design',
    headline: 'Looks right in the first fifty milliseconds.',
    summary:
      'Art direction, interface design and messaging that make a business look as good as it is. Every layout is designed for desktop and phone, and every word is written for the people you want to reach.',
    capabilities: [
      'Website and interface design',
      'Brand identity and logo refreshes',
      'Art direction and motion',
      'Copywriting and messaging',
      'Design systems',
      'Bilingual English and Spanish sites',
    ],
    schemaName: 'Web design',
  },
  {
    id: 'development',
    name: 'Development',
    headline: 'Hand-built, fast, and accessible.',
    summary:
      'We write the code ourselves, with modern frameworks, semantic HTML and no page builder bloat. Sites load in about a second, work with a keyboard and a screen reader, and are easy to update.',
    capabilities: [
      'Astro, Next.js and React',
      'Headless CMS and editable content',
      'E-commerce and payments',
      'Booking, forms and CRM integrations',
      'Animation and WebGL',
      'Accessibility to WCAG 2.2 AA',
    ],
    schemaName: 'Web development',
  },
  {
    id: 'search',
    name: 'Search',
    headline: 'SEO from the first line of code.',
    summary:
      'Search is part of the build, not a plugin added later. Clean structure, fast pages, structured data and local signals help Google understand who you are, where you are and what you offer.',
    capabilities: [
      'Technical SEO and site audits',
      'Core Web Vitals',
      'Schema markup and rich results',
      'Local SEO and Google Business Profile',
      'Keyword research and content plans',
      'Analytics and Search Console',
    ],
    schemaName: 'Search engine optimization',
  },
];

export const PROCESS = [
  {
    name: 'Listen',
    body: 'We start with your goals, your customers and your competitors. One call, a short questionnaire and a look at your current numbers.',
    output: 'Project brief and success metrics',
  },
  {
    name: 'Map',
    body: 'Sitemap, page structure and a keyword plan, so every page has a job and a search term to win.',
    output: 'Sitemap, keyword map, content plan',
  },
  {
    name: 'Design',
    body: 'Art direction first, then full pages for desktop and phone. You review real layouts with real copy, not mood boards.',
    output: 'Page designs and a design system',
  },
  {
    name: 'Build',
    body: 'Hand-built with semantic HTML, accessible components and motion where it earns its place. Content you can edit yourself.',
    output: 'Production site and CMS',
  },
  {
    name: 'Tune',
    body: 'Performance, accessibility and SEO audits on every page. We fix what the numbers find before anyone else sees it.',
    output: 'Lighthouse reports, schema, redirects',
  },
  {
    name: 'Launch',
    body: 'Domain, analytics, Search Console and a launch checklist. After that, we keep an eye on it with you.',
    output: 'Live site, training and support',
  },
];
