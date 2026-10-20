export const SITE = {
  name: 'lessthan7',
  legalName: 'Lessthan7 Studio',
  url: 'https://lessthan7.studio',
  tagline: 'Make the first seven seconds count.',
  description:
    'lessthan7 is a Miami web design and development studio. Fast, detail-obsessed websites with SEO built in, for businesses that need a lasting first impression.',
  email: 'hello@lessthan7.studio',
  phone: '+1 (786) 970-2109',
  phoneHref: 'tel:+17869702109',
  city: 'Miami',
  region: 'FL',
  country: 'US',
  timezone: 'America/New_York',
  geo: { lat: 25.7617, lng: -80.1918 },
  socials: [
    { label: 'Instagram', href: 'https://www.instagram.com/lessthan7_studios/' },
    { label: 'Pinterest', href: 'https://www.pinterest.com/lessthan7studio/' },
  ],
  // Google Ads tag carried over from the previous site; loaded after the page is idle.
  gtagId: 'AW-10804969083',
} as const;

export const NAV = [
  { label: 'Work', href: '/work/' },
  { label: 'Services', href: '/services/' },
  { label: 'Studio', href: '/studio/' },
  { label: 'Contact', href: '/contact/' },
] as const;

/** The mark leans at atan(1/φ) ≈ 31.7175°. */
export const LEAN = (Math.atan(2 / (1 + Math.sqrt(5))) * 180) / Math.PI;
