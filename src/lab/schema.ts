import { z } from 'zod';

/**
 * The strategy half of a revamp report, produced by Claude with structured outputs.
 * Array lengths are set in the prompt (structured outputs don't support min/max items).
 */
export const Strategy = z.strictObject({
  business: z.strictObject({
    name: z.string(),
    oneLiner: z.string().describe('What the business does, in one plain sentence'),
    industry: z.string(),
    location: z.string(),
    audience: z.array(z.string()).describe('3–5 customer segments'),
    offerings: z.array(z.string()).describe('4–8 products or services'),
    differentiators: z.array(z.string()).describe('2–4 genuine strengths backed by the research'),
    competitors: z
      .array(z.strictObject({ name: z.string(), url: z.string(), note: z.string() }))
      .describe('2–4 real competitors found in research; url must be a real URL you saw'),
    personality: z.array(z.string()).describe('3–5 adjectives for the brand voice'),
  }),
  summary: z.strictObject({
    headline: z.string().describe('The single most important takeaway, under 14 words'),
    paragraphs: z.array(z.string()).describe('2–3 short paragraphs for the executive summary'),
    keyNumbers: z
      .array(z.strictObject({ value: z.string(), label: z.string(), source: z.string() }))
      .describe('3–4 numbers taken only from the measured site facts or Lighthouse data'),
  }),
  scores: z
    .strictObject({
      firstImpression: z.number(),
      design: z.number(),
      clarity: z.number(),
      seo: z.number(),
      performance: z.number(),
      accessibility: z.number(),
      conversion: z.number(),
    })
    .describe('Your assessment, 0–100 each'),
  firstSeconds: z
    .array(z.strictObject({ moment: z.string(), observation: z.string() }))
    .describe('Exactly 4 entries for 0.05s, 1s, 3s and 7s: what a first-time visitor experiences'),
  findings: z
    .array(
      z.strictObject({
        area: z.enum(['Design', 'Content', 'SEO', 'Performance', 'Accessibility', 'Conversion', 'Trust']),
        severity: z.enum(['High', 'Medium', 'Low']),
        title: z.string(),
        evidence: z.string().describe('What you observed, citing measured facts where possible'),
        impact: z.string(),
        fix: z.string(),
      }),
    )
    .describe('8–12 findings, most severe first'),
  seo: z.strictObject({
    keywords: z
      .array(z.strictObject({ keyword: z.string(), intent: z.string(), page: z.string() }))
      .describe('6–10 target searches mapped to pages'),
    quickWins: z.array(z.string()).describe('4–6 fixes that can ship in the first week'),
    local: z.array(z.string()).describe('2–5 local search actions, or general ones if not local'),
    content: z.array(z.string()).describe('3–5 content ideas'),
  }),
  sitemap: z.array(z.strictObject({ page: z.string(), purpose: z.string() })).describe('6–10 pages for the new site'),
  concepts: z
    .array(
      z.strictObject({
        id: z.enum(['A', 'B', 'C']),
        name: z.string().describe('Two or three evocative words'),
        tagline: z.string(),
        idea: z.string().describe('2–3 sentences: the creative idea and why it fits this business'),
        bestFor: z.string(),
        mood: z.array(z.string()).describe('3–5 words'),
        palette: z
          .array(z.strictObject({ name: z.string(), hex: z.string(), role: z.string() }))
          .describe('Exactly 5 colors; hex like #1A2B3C'),
        typography: z.strictObject({
          display: z.string().describe('A Google Fonts family name'),
          body: z.string().describe('A Google Fonts family name'),
          rationale: z.string(),
        }),
        heroHeadline: z.string(),
        heroSubhead: z.string(),
        primaryCta: z.string(),
        sections: z
          .array(z.strictObject({ name: z.string(), purpose: z.string() }))
          .describe('5–7 homepage sections in order'),
        signatureDetail: z.string().describe('The one memorable interaction or design detail'),
        motion: z.string(),
        pros: z.array(z.string()).describe('2–3'),
        tradeoffs: z.array(z.string()).describe('1–2'),
        effort: z.enum(['Lean', 'Standard', 'Ambitious']),
        timeline: z.string().describe('e.g. "5–7 weeks"'),
      }),
    )
    .describe('Exactly 3 clearly different directions, ids A, B, C'),
  roadmap: z
    .array(z.strictObject({ phase: z.string(), weeks: z.string(), work: z.array(z.string()) }))
    .describe('4–5 phases'),
  nextSteps: z.array(z.string()).describe('3 concrete next steps'),
});

export type Strategy = z.infer<typeof Strategy>;
export type Concept = Strategy['concepts'][number];

export function strategyJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(Strategy, { target: 'draft-7' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

/** Facts measured from the prospect's homepage, before any model sees it. */
export interface SiteFacts {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  https: boolean;
  responseMs: number;
  htmlKb: number;
  title: string;
  titleLength: number;
  metaDescription: string;
  metaDescriptionLength: number;
  canonical: string;
  lang: string;
  viewport: boolean;
  h1: string[];
  h2: string[];
  navLinks: string[];
  images: number;
  imagesMissingAlt: number;
  scripts: number;
  stylesheets: number;
  jsonLdTypes: string[];
  hreflang: string[];
  openGraph: boolean;
  twitterCard: boolean;
  favicon: string;
  generator: string;
  frameworkHints: string[];
  phones: string[];
  emails: string[];
  socials: string[];
  forms: number;
  internalLinks: number;
  robotsTxt: boolean;
  sitemapUrls: number | null;
  imageCandidates: string[];
  text: string;
}

export interface PsiResult {
  strategy: 'mobile';
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number };
  metrics: { lcp: string; cls: string; tbt: string; fcp: string; speedIndex: string };
  screenshot?: string;
}

export interface Mockup {
  conceptId: 'A' | 'B' | 'C';
  html: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  webSearches: number;
  costUsd: number;
}

export interface Report {
  id: string;
  createdAt: string;
  sample?: boolean;
  input: { url: string; businessName?: string; notes?: string; preparedFor?: string };
  facts: SiteFacts;
  psi: PsiResult | null;
  brief: string;
  strategy: Strategy;
  mockups: Mockup[];
  usage?: Usage;
  model: string;
}

export type JobStep = 'queued' | 'fetch' | 'audit' | 'research' | 'strategy' | 'concepts' | 'done' | 'error';

export interface JobStatus {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  step: JobStep;
  message: string;
  progress: number;
  startedAt: string;
  updatedAt: string;
  error?: string;
  input: Report['input'];
  report?: Report;
}
