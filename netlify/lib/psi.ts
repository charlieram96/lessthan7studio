import type { PsiResult } from '../../src/lab/schema';

/** Google PageSpeed Insights (Lighthouse, mobile). Optional: needs PAGESPEED_API_KEY. */
export async function runPsi(url: string, key: string | undefined): Promise<PsiResult | null> {
  if (!key) return null;
  const api = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  api.searchParams.set('url', url);
  api.searchParams.set('strategy', 'mobile');
  for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) api.searchParams.append('category', c);
  api.searchParams.set('key', key);
  try {
    const res = await fetch(api, { signal: AbortSignal.timeout(100_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      lighthouseResult?: {
        categories: Record<string, { score: number | null }>;
        audits: Record<string, { displayValue?: string; details?: { data?: string } }>;
      };
    };
    const lr = data.lighthouseResult;
    if (!lr) return null;
    const score = (k: string) => Math.round((lr.categories[k]?.score ?? 0) * 100);
    const dv = (k: string) => lr.audits[k]?.displayValue ?? '—';
    return {
      strategy: 'mobile',
      scores: {
        performance: score('performance'),
        accessibility: score('accessibility'),
        bestPractices: score('best-practices'),
        seo: score('seo'),
      },
      metrics: {
        lcp: dv('largest-contentful-paint'),
        cls: dv('cumulative-layout-shift'),
        tbt: dv('total-blocking-time'),
        fcp: dv('first-contentful-paint'),
        speedIndex: dv('speed-index'),
      },
      screenshot: lr.audits['final-screenshot']?.details?.data,
    };
  } catch {
    return null;
  }
}
