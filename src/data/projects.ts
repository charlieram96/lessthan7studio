export type Service = 'Web design' | 'Development' | 'SEO' | 'Brand identity' | 'E-commerce' | 'Content' | 'Web app';

export interface CaseDetail {
  title: string;
  body: string;
}

export interface Project {
  slug: string;
  name: string;
  industry: string;
  /** Filter group on the work index */
  group: 'Legal & finance' | 'Health' | 'Hospitality & real estate' | 'Media & marketing' | 'Education' | 'Beauty & photography';
  location: string;
  /** Public link shown on the site */
  liveUrl: string;
  displayUrl: string;
  services: Service[];
  /** One sentence for cards and meta descriptions */
  summary: string;
  /** Accent pulled from the client's own palette */
  accent: string;
  /** Text color that reads on the accent */
  accentInk: string;
  /** Case study body */
  brief: string;
  approach: string;
  details: CaseDetail[];
  outcomes: string[];
  stack: string[];
  keyQuote?: string;
  /** Optional copy for the phone section */
  mobileNote?: string;
  /** Optional sentence under the palette and type */
  designNote?: string;
  languages?: string;
  /** Measured with Lighthouse; filled from src/data/audit/<slug>.json when available */
  featured?: boolean;
}

export const PROJECTS: Project[] = [];

export const projectBySlug = (slug: string) => PROJECTS.find((p) => p.slug === slug);

export function nextProject(slug: string): Project {
  const i = PROJECTS.findIndex((p) => p.slug === slug);
  return PROJECTS[(i + 1) % PROJECTS.length];
}

export const img = (slug: string, file: string) => `/work/${slug}/${file}`;
