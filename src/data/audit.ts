/**
 * Measured facts per project, written by `npm run capture` (scripts/capture-sites.mjs).
 * Editorial copy lives in projects.ts; this file only reads what was measured.
 */

interface LighthouseRun {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  lcp: string;
  cls: string;
  tbt: string;
  fcp: string;
  speedIndex: string;
  totalByteWeight?: number;
  requests?: number;
}

export interface Audit {
  slug: string;
  name: string;
  auditedAt: string;
  title: string;
  metaDescription: string;
  design?: {
    loadedFonts?: string[];
    palette?: string[];
    cssColorTokens?: Record<string, string>;
    fonts?: Record<string, { family?: string; rendered?: string[] }>;
  };
  tech?: { frameworks?: string[]; hosting?: string[]; libraries?: string[]; services?: string[] };
  seo?: {
    jsonLdTypes?: string[];
    hreflang?: { lang: string; href: string }[] | string[];
    sitemap?: { urlCount?: number; locCount?: number };
  };
  perf?: { transferBytes?: number; requests?: number; ttfbMs?: number };
  lighthouse?: { version?: string; mobile?: LighthouseRun | { error: string }; desktop?: LighthouseRun | { error: string } };
  languages?: { hreflang?: string[]; toggles?: string[] };
  notableFeatures?: string[];
  designNotes?: string | null;
  screenshots?: {
    pageHeight?: { desktop?: number; mobile?: number };
    files?: Record<string, { width: number; height: number; bytes: number }>;
  };
  liveSite?: { differsFromCapture?: boolean; beforeHero?: string | null };
}

const files = import.meta.glob<Audit>('./audit/*.json', { eager: true, import: 'default' });

export function getAudit(slug: string): Audit | null {
  return files[`./audit/${slug}.json`] ?? null;
}

export function lighthouse(a: Audit | null, kind: 'mobile' | 'desktop'): LighthouseRun | null {
  const run = a?.lighthouse?.[kind];
  return run && !('error' in run) && typeof run.performance === 'number' ? run : null;
}

export function imageSize(a: Audit | null, file: string): { width: number; height: number } | null {
  const f = a?.screenshots?.files?.[file];
  return f ? { width: f.width, height: f.height } : null;
}

export const kb = (bytes?: number) => (bytes ? `${Math.round(bytes / 1024)} KB` : '—');
