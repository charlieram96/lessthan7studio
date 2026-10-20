import { lookup } from 'node:dns/promises';
import net from 'node:net';
import { parse, type HTMLElement } from 'node-html-parser';
import type { SiteFacts } from '../../src/lab/schema';

const UA = 'Mozilla/5.0 (compatible; lessthan7-lab/1.0; +https://lessthan7.studio)';

/* ---------- URL safety: only public http(s) hosts ---------- */

const V4_BLOCKS: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

const v4ToInt = (ip: string) => ip.split('.').reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;

function isPrivateV4(ip: string): boolean {
  const n = v4ToInt(ip);
  return V4_BLOCKS.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (v4ToInt(base) & mask);
  });
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateV4(ip);
  const x = ip.toLowerCase();
  if (x.startsWith('::ffff:')) return isPrivateIp(x.slice(7));
  return x === '::' || x === '::1' || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb');
}

export class UserFacingError extends Error {}

export function normalizeUrl(input: string): URL {
  let raw = String(input || '').trim();
  if (!raw) throw new UserFacingError('Enter a website address.');
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UserFacingError('That doesn’t look like a website address.');
  }
  const host = url.hostname.toLowerCase();
  if (!['http:', 'https:'].includes(url.protocol)) throw new UserFacingError('Only http and https addresses work.');
  if (url.username || url.password) throw new UserFacingError('Remove the username or password from the address.');
  if (url.port && !['80', '443'].includes(url.port)) throw new UserFacingError('Only standard web ports are allowed.');
  if (!host.includes('.') || /(^|\.)(localhost|local|internal|localdomain|home|lan|example)$/.test(host)) {
    throw new UserFacingError('That address isn’t a public website.');
  }
  if ((net.isIP(host) || host.startsWith('[')) && isPrivateIp(host.replace(/^\[|\]$/g, ''))) {
    throw new UserFacingError('That address isn’t a public website.');
  }
  url.hash = '';
  return url;
}

async function assertPublic(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new UserFacingError('That address isn’t a public website.');
    return;
  }
  const addrs = await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new UserFacingError(`We couldn’t find ${hostname}. Check the spelling.`);
  if (addrs.some((a) => isPrivateIp(a.address))) throw new UserFacingError('That address isn’t a public website.');
}

export interface FetchResult {
  url: URL;
  status: number;
  body: string;
  ms: number;
  bytes: number;
  headers: Headers;
}

export async function safeFetch(
  start: URL,
  { timeoutMs = 15_000, maxBytes = 3_000_000, accept = 'text/html,application/xhtml+xml' } = {},
): Promise<FetchResult> {
  let url = start;
  const t0 = Date.now();
  for (let hop = 0; hop < 6; hop++) {
    await assertPublic(url.hostname);
    const res = await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': UA, accept, 'accept-language': 'en-US,en;q=0.8,es;q=0.6' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      url = normalizeUrl(new URL(location, url).href);
      continue;
    }
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        chunks.push(value);
        if (bytes > maxBytes) {
          await reader.cancel();
          break;
        }
      }
    }
    const buf = new Uint8Array(Math.min(bytes, maxBytes));
    let offset = 0;
    for (const c of chunks) {
      const take = Math.min(c.byteLength, buf.byteLength - offset);
      buf.set(c.subarray(0, take), offset);
      offset += take;
      if (offset >= buf.byteLength) break;
    }
    return { url, status: res.status, body: new TextDecoder().decode(buf), ms: Date.now() - t0, bytes, headers: res.headers };
  }
  throw new UserFacingError('That site redirects too many times.');
}

/* ---------- Facts ---------- */

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

function abs(href: string | undefined, base: URL): string {
  if (!href) return '';
  try {
    const u = new URL(href, base);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}

function collectTypes(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((n) => collectTypes(n, out));
    return;
  }
  const obj = node as Record<string, unknown>;
  const t = obj['@type'];
  if (typeof t === 'string') out.add(t);
  if (Array.isArray(t)) t.forEach((x) => typeof x === 'string' && out.add(x));
  Object.values(obj).forEach((v) => collectTypes(v, out));
}

const FRAMEWORKS: Array<[RegExp, string]> = [
  [/__NEXT_DATA__|\/_next\//, 'Next.js'],
  [/\/_astro\//, 'Astro'],
  [/__NUXT__|\/_nuxt\//, 'Nuxt'],
  [/wp-content|wp-includes/, 'WordPress'],
  [/cdn\.shopify\.com|Shopify\.theme/, 'Shopify'],
  [/static\.wixstatic\.com|wix\.com/, 'Wix'],
  [/squarespace(-cdn)?\.com/, 'Squarespace'],
  [/webflow\.(com|io)|data-wf-page/, 'Webflow'],
  [/framerusercontent\.com|framer\.com/, 'Framer'],
  [/gatsby/, 'Gatsby'],
  [/img1\.wsimg\.com|godaddy/i, 'GoDaddy builder'],
  [/weebly/, 'Weebly'],
  [/elementor/, 'Elementor'],
  [/divi/i, 'Divi'],
];

/** Readable page text, from a separate parse so the main tree stays intact. */
function visibleText(html: string): string {
  const root = parse(html, { comment: false });
  const body: HTMLElement = root.querySelector('body') ?? root;
  body.querySelectorAll('script, style, noscript, svg, template, iframe').forEach((n) => n.remove());
  // structuredText breaks lines between block elements, so words don't run together.
  return clean(body.structuredText);
}

type PageMeta = { requested: URL; status: number; ms: number; bytes: number };

/** Pure HTML analysis, separate from fetching so it can be tested offline. */
export function extractFacts(html: string, base: URL, page: PageMeta): Omit<SiteFacts, 'robotsTxt' | 'sitemapUrls'> {
  const requested = page.requested;
  const root = parse(html, { comment: false });

  const meta = (sel: string) => clean(root.querySelector(sel)?.getAttribute('content') ?? '');
  const title = clean(root.querySelector('title')?.textContent ?? '');
  const metaDescription = meta('meta[name="description"]');
  const imgs = root.querySelectorAll('img');

  const types = new Set<string>();
  root.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      collectTypes(JSON.parse(s.textContent), types);
    } catch {
      /* malformed JSON-LD is itself a finding, but not one we need here */
    }
  });

  const links = root.querySelectorAll('a[href]').map((a) => abs(a.getAttribute('href'), base)).filter(Boolean);
  const internal = links.filter((l) => new URL(l).hostname === base.hostname);

  const text = visibleText(html);
  const textForContacts = text.slice(0, 60_000);
  const phones = uniq(textForContacts.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g) ?? []).slice(0, 4);
  const emails = uniq([
    ...root
      .querySelectorAll('a[href^="mailto:"]')
      .map((a) => (a.getAttribute('href') ?? '').replace(/^mailto:/i, '').split('?')[0]),
    ...(textForContacts.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? []),
  ])
    .filter((e) => !/\.(png|jpe?g|webp|svg|gif)$/i.test(e))
    .slice(0, 4);
  const socials = uniq(links.filter((l) => /(facebook|instagram|linkedin|tiktok|youtube|twitter|x)\.com\//.test(l))).slice(0, 8);

  const logoish = imgs
    .filter((i) => /logo/i.test(`${i.getAttribute('src')} ${i.getAttribute('alt')} ${i.getAttribute('class')}`))
    .map((i) => abs(i.getAttribute('src'), base));
  const firstImgs = imgs.map((i) => abs(i.getAttribute('src') ?? i.getAttribute('data-src') ?? undefined, base));
  const og = abs(meta('meta[property="og:image"]'), base);
  const imageCandidates = uniq([...logoish, og, ...firstImgs])
    .filter((u) => /^https:\/\//.test(u))
    .slice(0, 10);

  return {
    requestedUrl: requested.href,
    finalUrl: base.href,
    status: page.status,
    https: base.protocol === 'https:',
    responseMs: page.ms,
    htmlKb: Math.round(page.bytes / 102.4) / 10,
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    canonical: abs(root.querySelector('link[rel="canonical"]')?.getAttribute('href'), base),
    lang: root.querySelector('html')?.getAttribute('lang') ?? '',
    viewport: !!root.querySelector('meta[name="viewport"]'),
    h1: root.querySelectorAll('h1').map((h) => clean(h.textContent)).filter(Boolean).slice(0, 5),
    h2: root.querySelectorAll('h2').map((h) => clean(h.textContent)).filter(Boolean).slice(0, 15),
    navLinks: uniq(
      root
        .querySelectorAll('nav a, header a')
        .map((a) => clean(a.textContent))
        .filter((t) => t && t.length < 40),
    ).slice(0, 20),
    images: imgs.length,
    imagesMissingAlt: imgs.filter((i) => !clean(i.getAttribute('alt') ?? '')).length,
    scripts: root.querySelectorAll('script[src]').length,
    stylesheets: root.querySelectorAll('link[rel="stylesheet"]').length,
    jsonLdTypes: Array.from(types).slice(0, 20),
    hreflang: uniq(root.querySelectorAll('link[rel="alternate"][hreflang]').map((l) => l.getAttribute('hreflang') ?? '')).filter(Boolean),
    openGraph: !!root.querySelector('meta[property="og:title"]'),
    twitterCard: !!root.querySelector('meta[name="twitter:card"]'),
    favicon: abs(root.querySelector('link[rel~="icon"]')?.getAttribute('href'), base),
    generator: meta('meta[name="generator"]'),
    frameworkHints: uniq(FRAMEWORKS.filter(([re]) => re.test(html)).map(([, name]) => name)),
    phones,
    emails,
    socials,
    forms: root.querySelectorAll('form').length,
    internalLinks: uniq(internal).length,
    imageCandidates,
    text: text.slice(0, 12_000),
  };
}

export async function collectFacts(input: string): Promise<SiteFacts> {
  const requested = normalizeUrl(input);
  const page = await safeFetch(requested);
  if (page.status >= 400) throw new UserFacingError(`The site answered with an error (${page.status}).`);
  const base = page.url;
  const facts = extractFacts(page.body, base, { requested, status: page.status, ms: page.ms, bytes: page.bytes });

  let robotsTxt = false;
  let sitemapUrls: number | null = null;
  try {
    const robots = await safeFetch(new URL('/robots.txt', base), { timeoutMs: 8000, maxBytes: 200_000, accept: 'text/plain' });
    robotsTxt = robots.status < 400 && /user-agent|sitemap|disallow/i.test(robots.body);
    const smLine = robots.body.match(/^sitemap:\s*(\S+)/im)?.[1];
    const sm = await safeFetch(normalizeUrl(smLine ?? new URL('/sitemap.xml', base).href), {
      timeoutMs: 8000,
      maxBytes: 2_000_000,
      accept: 'application/xml,text/xml',
    });
    if (sm.status < 400 && /<(urlset|sitemapindex)/.test(sm.body)) sitemapUrls = (sm.body.match(/<loc>/g) ?? []).length;
  } catch {
    /* robots and sitemap are optional */
  }

  return { ...facts, robotsTxt, sitemapUrls };
}
