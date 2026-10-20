#!/usr/bin/env node
// Screenshots + audit facts for the portfolio projects listed in scripts/sites.json.
//
// Dependencies (install in a scratch directory, not in this repo's package.json):
//   npm i playwright-core@1.56 sharp lighthouse chrome-launcher
//
// Usage:
//   NODE_PATH=/path/to/scratch/node_modules node scripts/capture-sites.mjs [slug ...] [--skip-lighthouse | --lighthouse-only]
//     [--full-mode=normal|reduced|forced]   pin the full-page capture mode instead of choosing it automatically
//
// Env:
//   CHROME_PATH      Chromium binary (default /opt/pw-browsers/chromium)
//   CAPTURE_RAW_DIR  raw PNGs, page text, rendered DOM and Lighthouse JSON (default $TMPDIR/site-captures)
//   HTTPS_PROXY      passed to Chromium and Playwright's request API when set
// If ffmpeg is on PATH, H.264 videos (which open-source Chromium can't decode) are transcoded to WebM on the fly
// so video heroes render the way they do in Chrome.
//
// Writes public/work/<slug>/*.webp and src/data/audit/<slug>.json. Hand-written fields already present in an
// audit file (notableFeatures, designNotes, businessSummary, keyCopy) are kept on re-runs.

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// ESM `import` ignores NODE_PATH, so resolve dependencies through CommonJS resolution, which honours it.
const require = createRequire(import.meta.url);
const importDep = (id) => import(pathToFileURL(require.resolve(id)).href);
const { chromium } = require('playwright-core');
const sharp = require('sharp');
const { default: lighthouse } = await importDep('lighthouse');
const { default: desktopConfig } = await importDep('lighthouse/core/config/desktop-config.js');
const chromeLauncher = await importDep('chrome-launcher');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME_PATH = process.env.CHROME_PATH || '/opt/pw-browsers/chromium';
const RAW_ROOT = path.resolve(process.env.CAPTURE_RAW_DIR || path.join(os.tmpdir(), 'site-captures'));
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;
const HAS_FFMPEG = spawnSync('ffmpeg', ['-version']).status === 0;

const argv = process.argv.slice(2);
const opts = {
  skipLighthouse: argv.includes('--skip-lighthouse'),
  lighthouseOnly: argv.includes('--lighthouse-only'),
  fullMode: argv.find((a) => a.startsWith('--full-mode='))?.split('=')[1],
};
const onlySlugs = argv.filter((a) => !a.startsWith('--'));

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };
// Full-page shots are clipped to what the WebP height caps can use (7200px at 1200 wide, 6000px at 600 wide).
const SHOTS = {
  full: { viewport: DESKTOP, dsf: 1, fullPage: true, maxHeight: 8640 },
  hero: { viewport: DESKTOP, dsf: 2 },
  mobile: { viewport: MOBILE, dsf: 3, mobile: true },
  mobileFull: { viewport: MOBILE, dsf: 2, mobile: true, fullPage: true, maxHeight: 3900 },
};
const OUTPUTS = [
  { file: 'hero.webp', shot: 'hero', width: 1920, height: 1200, quality: 80, maxKB: 300 },
  { file: 'hero-960.webp', shot: 'hero', width: 960, height: 600, quality: 78, maxKB: 120 },
  { file: 'full.webp', shot: 'full', width: 1200, maxHeight: 7200, quality: 72, maxKB: 900 },
  { file: 'mobile.webp', shot: 'mobile', width: 780, height: 1688, quality: 78, maxKB: 300 },
  { file: 'mobile-full.webp', shot: 'mobileFull', width: 600, maxHeight: 6000, quality: 70, maxKB: 700 },
];
const EDITORIAL = ['notableFeatures', 'designNotes', 'businessSummary', 'keyCopy'];
const LH_CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const VIDEO_URL = /\.(mp4|m4v|mov)(\?|#|$)/i;

// Last-resort styles: force scroll-reveal content visible and collapse the scroll distance of pinned sections.
const REVEAL_CSS = `
[data-capture-reveal], [data-aos], .aos-init, .wow, .reveal, .elementor-invisible, [data-sal], .sal-animate,
[class*="fade-in"], [class*="fadeIn"], [class*="animate-on-scroll"] {
  opacity: 1 !important; visibility: visible !important; transform: none !important; clip-path: none !important;
  filter: none !important; transition: none !important; animation: none !important;
}
[data-capture-unpin] { height: auto !important; min-height: 0 !important; padding-bottom: 0 !important; }
* { content-visibility: visible !important; }`;

const HEADER_KEYS = ['server', 'x-powered-by', 'via', 'x-cache', 'cf-ray', 'cf-cache-status', 'x-nf-request-id', 'x-vercel-id',
  'x-vercel-cache', 'x-github-request-id', 'x-amz-cf-id', 'x-served-by', 'x-wix-request-id', 'x-shopid', 'x-kinsta-cache',
  'x-hcdn-request-id', 'platform', 'x-litespeed-cache', 'strict-transport-security', 'x-frame-options', 'cache-control',
  'content-encoding'];

const SERVICES = [
  [/googletagmanager\.com/, 'Google Tag Manager / gtag'], [/google-analytics\.com|analytics\.google\.com/, 'Google Analytics'],
  [/connect\.facebook\.net/, 'Meta Pixel'], [/hotjar\.com/, 'Hotjar'], [/clarity\.ms/, 'Microsoft Clarity'],
  [/analytics\.tiktok\.com/, 'TikTok Pixel'], [/snap\.licdn\.com/, 'LinkedIn Insight'], [/stripe\.com/, 'Stripe'],
  [/paypal(objects)?\.com/, 'PayPal'], [/calendly\.com/, 'Calendly'], [/acuityscheduling\.com|squarespacescheduling\.com/, 'Acuity Scheduling'],
  [/squareup\.com|squarecdn\.com|square\.site/, 'Square'], [/vagaro\.com/, 'Vagaro'], [/booksy\.com/, 'Booksy'],
  [/glossgenius\.com/, 'GlossGenius'], [/fresha\.com/, 'Fresha'], [/youtube(-nocookie)?\.com|ytimg\.com/, 'YouTube'],
  [/vimeo(cdn)?\.com/, 'Vimeo'], [/maps\.googleapis\.com|maps\.gstatic\.com|google\.[a-z.]+\/maps/, 'Google Maps'],
  [/mapbox/, 'Mapbox'], [/fonts\.(googleapis|gstatic)\.com/, 'Google Fonts'], [/typekit\.net/, 'Adobe Fonts'],
  [/recaptcha/, 'reCAPTCHA'], [/challenges\.cloudflare\.com/, 'Cloudflare Turnstile'], [/hs-scripts\.com|hsforms|hubspot/, 'HubSpot'],
  [/intercom/, 'Intercom'], [/tawk\.to/, 'Tawk.to'], [/crisp\.chat/, 'Crisp'], [/tidio/, 'Tidio'], [/zdassets|zendesk/, 'Zendesk'],
  [/klaviyo/, 'Klaviyo'], [/list-manage\.com|mailchimp|chimpstatic/, 'Mailchimp'], [/elfsight/, 'Elfsight widgets'],
  [/cloudinary\.com/, 'Cloudinary'], [/imgix\.net/, 'imgix'], [/sanity\.io/, 'Sanity'], [/contentful/, 'Contentful'],
  [/supabase\.co/, 'Supabase'], [/firebase/, 'Firebase'], [/sentry/, 'Sentry'], [/plausible\.io/, 'Plausible'],
  [/posthog/, 'PostHog'], [/segment\.(com|io)/, 'Segment'], [/vercel-insights|vitals\.vercel|\/_vercel\/(insights|speed)/, 'Vercel Analytics'],
  [/formspree\.io/, 'Formspree'], [/web3forms/, 'Web3Forms'], [/jotform/, 'Jotform'], [/typeform/, 'Typeform'],
  [/idxbroker|ihomefinder|showcaseidx|realscout|idx\./, 'IDX listings'], [/matterport/, 'Matterport'],
  [/cdninstagram|instagram\.com/, 'Instagram'], [/spotify\.com/, 'Spotify'], [/soundcloud/, 'SoundCloud'], [/wistia/, 'Wistia'],
  [/mux\.com/, 'Mux'], [/cal\.com/, 'Cal.com'], [/userway/, 'UserWay'], [/accessibe|acsbapp/, 'accessiBe'], [/termly/, 'Termly'],
  [/cookiebot/, 'Cookiebot'], [/onetrust|cookielaw/, 'OneTrust'], [/trustpilot/, 'Trustpilot'], [/leadconnectorhq|msgsndr|gohighlevel/, 'GoHighLevel'],
  [/clickfunnels/, 'ClickFunnels'], [/kajabi/, 'Kajabi'], [/teachable/, 'Teachable'], [/thinkific/, 'Thinkific'],
  [/memberstack/, 'Memberstack'], [/whop\.com/, 'Whop'], [/tradingview/, 'TradingView'], [/discord/, 'Discord'],
  [/hostaway|guesty|lodgify|ownerrez|hostfully/, 'Vacation-rental booking engine'], [/jsdelivr\.net/, 'jsDelivr'],
  [/cdnjs\.cloudflare\.com/, 'cdnjs'], [/unpkg\.com/, 'unpkg'],
];

const sites = JSON.parse(await fs.readFile(path.join(ROOT, 'scripts/sites.json'), 'utf8'))
  .filter((s) => !onlySlugs.length || onlySlugs.includes(s.slug));
if (!sites.length) {
  console.error(`No sites match: ${onlySlugs.join(', ')}`);
  process.exit(1);
}
if (!HAS_FFMPEG) console.warn('ffmpeg not found: H.264 videos will not play in captures.');

const browser = opts.lighthouseOnly ? null
  : await chromium.launch({ executablePath: CHROME_PATH, ...(PROXY && { proxy: { server: PROXY } }) });
const chromeMajor = browser?.version().split('.')[0] ?? '141';
const UA = {
  desktop: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`,
  mobile: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Mobile Safari/537.36`,
};
const videoCache = new Map();

for (const site of sites) {
  const started = Date.now();
  try {
    await processSite(site);
  } catch (err) {
    console.error(`[${site.slug}] FAILED`, err);
  }
  console.log(`[${site.slug}] finished in ${Math.round((Date.now() - started) / 1000)}s`);
}
await browser?.close();

// ---------------------------------------------------------------------------------------------------------------

async function processSite(site) {
  const log = (...msg) => console.log(`[${site.slug}]`, ...msg);
  const rawDir = path.join(RAW_ROOT, site.slug);
  const outDir = path.join(ROOT, 'public/work', site.slug);
  const auditFile = path.join(ROOT, 'src/data/audit', `${site.slug}.json`);
  await Promise.all([rawDir, outDir, path.dirname(auditFile)].map((dir) => fs.mkdir(dir, { recursive: true })));
  const previous = await readJson(auditFile);
  let audit = previous ?? {};

  if (!opts.lighthouseOnly) {
    // fullPageUrl (optional) points the full-page shots at a static version of a scroll-driven page.
    const shots = {};
    for (const name of Object.keys(SHOTS)) {
      const url = SHOTS[name].fullPage && site.fullPageUrl ? site.fullPageUrl : site.captureUrl;
      shots[name] = await captureBest(url, name, rawDir, log, name === 'full' && url === site.captureUrl);
      log(`${name}: ${shots[name].mode} mode, ${shots[name].hidden.length} hidden blocks${shots[name].dismissed.length ? `, dismissed ${shots[name].dismissed.join('; ')}` : ''}`);
    }
    const home = shots.full.facts ? shots.full
      : await capture(site.captureUrl, SHOTS.full, path.join(rawDir, 'home-full.png'), 'normal', true, rawDir);
    const files = {};
    for (const out of OUTPUTS) {
      files[out.file] = await toWebp(path.join(rawDir, `${out.shot}.png`), path.join(outDir, out.file), out);
    }
    const palette = await dominantColors(path.join(rawDir, 'hero.png'));
    let liveSite;
    if (new URL(site.liveUrl).origin !== new URL(site.captureUrl).origin) {
      liveSite = await captureLiveVersion(site, rawDir, outDir);
      log(`live URL ${liveSite.differsFromCapture ? 'shows a different design' : 'matches the capture'} (hero difference ${liveSite.heroDifference})`);
    }
    audit = buildAudit(site, home, shots, files, palette, liveSite);
  }

  if (!opts.skipLighthouse) {
    const mobile = await runLighthouse(site.captureUrl, 'mobile', rawDir);
    const desktop = await runLighthouse(site.captureUrl, 'desktop', rawDir);
    audit.lighthouse = { version: mobile.version ?? desktop.version ?? null, mobile: stripVersion(mobile), desktop: stripVersion(desktop) };
    log(`lighthouse mobile ${scoreLine(mobile)} | desktop ${scoreLine(desktop)}`);
  } else if (previous?.lighthouse) {
    audit.lighthouse = previous.lighthouse;
  }

  for (const key of EDITORIAL) if (hasValue(previous?.[key])) audit[key] = previous[key];
  await fs.writeFile(auditFile, `${JSON.stringify(orderAudit(audit), null, 2)}\n`);
  log(`wrote ${path.relative(ROOT, auditFile)}`);
}

// Capture once normally; if content is still hidden (reveals that never ran) or a pinned section leaves an empty band
// in the full-page shot, retry with reduced motion, then with forced-visible CSS, and keep the most complete result.
async function captureBest(url, name, rawDir, log, collect) {
  const target = path.join(rawDir, `${name}.png`);
  const badness = (r) => r.hidden.length + r.pinnedGap / 300 + r.blank * 10;
  let best;
  let facts;
  const modes = opts.fullMode && SHOTS[name].fullPage ? [opts.fullMode] : ['normal', 'reduced', 'forced'];
  for (const mode of modes) {
    const file = mode === 'normal' ? target : path.join(rawDir, `${name}.${mode}.png`);
    const result = await capture(url, SHOTS[name], file, mode, collect && !facts && mode !== 'reduced', rawDir);
    facts ??= result.facts;
    if (!best || badness(result) < badness(best)) best = { ...result, mode, file };
    if (result.hidden.length < 3 && result.pinnedGap < 300 && result.blank < 0.3) break;
    log(`${name}: ${result.hidden.length} hidden blocks, ${result.pinnedGap}px pinned gap, ${Math.round(result.blank * 100)}% blank in ${mode} mode`,
      result.hidden.slice(0, 4).map((h) => `${h.tag}.${h.cls}@${h.y}`).join(', '));
  }
  if (best.blank >= 0.3) log(`WARNING ${name}: ${Math.round(best.blank * 100)}% of the capture is blank; consider a fullPageUrl for this site`);
  if (best.file !== target) await fs.copyFile(best.file, target);
  return { ...best, facts };
}

async function capture(url, spec, file, mode, collect, rawDir) {
  const context = await browser.newContext({
    viewport: spec.viewport,
    deviceScaleFactor: spec.dsf,
    isMobile: !!spec.mobile,
    hasTouch: !!spec.mobile,
    userAgent: spec.mobile ? UA.mobile : UA.desktop,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
  });
  try {
    if (HAS_FFMPEG) await context.route(VIDEO_URL, playableVideo);
    const page = await context.newPage();
    const network = collect ? await watchNetwork(page) : null;
    const consoleErrors = [];
    page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 300)));
    page.on('pageerror', (e) => consoleErrors.push(`Uncaught: ${String(e?.message ?? e).slice(0, 300)}`));

    let response;
    for (let attempt = 1; !response; attempt++) {
      response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch((err) => {
        if (attempt >= 2) throw err;
        return null;
      });
    }
    await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {}); // some pages never go idle
    await page.waitForTimeout(2500); // intro animations
    const dismissed = await page.evaluate(dismissOverlays).catch(() => []);
    if (dismissed.length) await page.waitForTimeout(800);
    await page.evaluate(scrollThrough);
    const lateDismissed = await page.evaluate(dismissOverlays).catch(() => []);
    await page.evaluate(backToTop);
    await page.waitForTimeout(1500);
    await waitForVideos(page);

    const headers = response ? await response.allHeaders() : {};
    const facts = collect ? await collectAll(page, response, headers, network, consoleErrors, rawDir) : undefined;
    const maxY = spec.fullPage ? spec.maxHeight : spec.viewport.height;
    if (mode === 'forced') {
      await page.evaluate(findHidden, { maxY, mark: true });
      if (spec.fullPage) await page.evaluate(pinnedGap, { maxY, mark: true });
      await page.addStyleTag({ content: REVEAL_CSS });
      await page.waitForTimeout(800);
    }
    if (!spec.fullPage) await page.evaluate(settleHeadline).catch(() => {});
    const result = {
      facts,
      status: response?.status() ?? 0,
      finalUrl: page.url(),
      title: await page.title(),
      headers: pick(headers, HEADER_KEYS),
      dismissed: [...dismissed, ...lateDismissed],
      hidden: await page.evaluate(findHidden, { maxY, mark: false }),
      pinnedGap: spec.fullPage ? await page.evaluate(pinnedGap, { maxY, mark: false }) : 0,
      ...(await page.evaluate(() => ({
        pageHeight: document.scrollingElement.scrollHeight,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        generator: document.querySelector('meta[name="generator" i]')?.content ?? null,
      }))),
    };
    await page.screenshot({
      path: file,
      timeout: 120_000,
      ...(spec.fullPage && { fullPage: true, animations: 'disabled', clip: { x: 0, y: 0, width: spec.viewport.width, height: spec.maxHeight } }),
    });
    result.blank = spec.fullPage ? await blankShare(file, spec.viewport.width) : 0;
    return result;
  } finally {
    await context.close();
  }
}

async function captureLiveVersion(site, rawDir, outDir) {
  const file = path.join(rawDir, 'before-hero.png');
  const live = await capture(site.liveUrl, SHOTS.hero, file, 'normal', false, rawDir);
  const heroDifference = await imageDifference(path.join(rawDir, 'hero.png'), file);
  const differsFromCapture = heroDifference >= 0.03;
  const dest = path.join(outDir, 'before-hero.webp');
  if (differsFromCapture) await toWebp(file, dest, { ...OUTPUTS[0], file: 'before-hero.webp' });
  else await fs.rm(dest, { force: true });
  return {
    url: site.liveUrl,
    finalUrl: live.finalUrl,
    status: live.status,
    title: live.title,
    generator: live.generator,
    server: live.headers.server ?? null,
    hosting: hostingFrom(live.headers),
    differsFromCapture,
    heroDifference: round(heroDifference, 3),
    beforeHero: differsFromCapture ? 'before-hero.webp' : null,
  };
}

// --- page helpers (run in the browser) --------------------------------------------------------------------------

function dismissOverlays() {
  const clicked = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
  };
  const label = (el) => (el.innerText || el.getAttribute('aria-label') || el.title || '').trim();
  const known = ['#onetrust-accept-btn-handler', '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', '#CybotCookiebotDialogBodyButtonAccept',
    '.cky-btn-accept', '.cmplz-accept', '#cookie_action_close_header', '.cc-allow', '.cc-dismiss', '#hs-eu-confirmation-button',
    '.osano-cm-accept-all', '#truste-consent-button', '.iubenda-cs-accept-btn', '#cn-accept-cookie', '.sqs-cookie-banner-v2-accept',
    '[data-hook="consent-banner-apply-button"]', '.pum-close', '.popmake-close', '.elementor-popup-modal .dialog-close-button',
    '.klaviyo-close-form', '.mc-closeModal', '.sqs-popup-overlay-close', '.privy-dismiss-content', '.om-close', '.leadinModal-close',
    '.hustle-button-close', '.modal.show [data-bs-dismiss="modal"]', '.modal.show [data-dismiss="modal"]'];
  for (const sel of known) {
    for (const el of document.querySelectorAll(sel)) if (visible(el)) { el.click(); clicked.push(sel); }
  }
  const accept = /^(accept|accept all|accept cookies|allow|allow all|allow cookies|agree|i agree|i accept|got it|ok|okay|understood|dismiss|close|no,? thanks|no thank you|not now|maybe later|×|✕|✖|x)$/i;
  const hint = /cookie|consent|gdpr|privacy|newsletter|subscribe|popup|pop-up|modal|lightbox|promo|offer|discount|sign ?up/i;
  const viewportArea = innerWidth * innerHeight;
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const dialog = el.matches('[role=dialog], [role=alertdialog], [aria-modal=true], dialog[open]');
    if (!(cs.position === 'fixed' || dialog) || !visible(el) || el.closest('header, nav')) continue;
    const r = el.getBoundingClientRect();
    const named = hint.test(`${el.id} ${el.className?.baseVal ?? el.className} ${el.getAttribute('aria-label') ?? ''}`);
    const isOverlay = r.width * r.height > 0.9 * viewportArea ? named || dialog : named || hint.test((el.innerText || '').slice(0, 600));
    if (!isOverlay) continue;
    const button = [...el.querySelectorAll('button, a, [role=button], [class*=close], [aria-label]')].find((b) => visible(b) && accept.test(label(b)));
    if (button) { button.click(); clicked.push(`"${label(button)}" in ${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`); }
  }
  return clicked;
}

async function scrollThrough() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const doc = document.scrollingElement || document.documentElement;
  let y = 0;
  for (let i = 0; i < 250 && y + innerHeight < doc.scrollHeight; i++) {
    y += 400;
    window.scrollTo({ top: y, behavior: 'instant' });
    await sleep(150);
  }
  await sleep(500);
}

// Jump back up, then nudge, so scroll-linked scripts (header themes, progress) recompute for the top of the page.
async function backToTop() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const top of [0, 2, 0]) {
    window.scrollTo({ top, behavior: 'instant' });
    await sleep(150);
  }
}

// Rotating or typed headlines: sample how much of the first visible h1 is legible and wait for its fullest state.
async function settleHeadline() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const h1 = [...document.querySelectorAll('h1')].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
  });
  if (!h1) return;
  const legibleArea = () => {
    let area = 0;
    const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!node.textContent.trim() || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        let { left, top, right, bottom } = rect;
        for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (cs.overflowX === 'visible' && cs.overflowY === 'visible' && cs.clipPath === 'none') continue;
          const box = p.getBoundingClientRect();
          left = Math.max(left, box.left); top = Math.max(top, box.top);
          right = Math.min(right, box.right); bottom = Math.min(bottom, box.bottom);
        }
        if (right > left && bottom > top) area += (right - left) * (bottom - top);
      }
    }
    return area;
  };
  let most = 0;
  for (let i = 0; i < 10; i++) {
    most = Math.max(most, legibleArea());
    await sleep(250);
  }
  for (let waited = 0; waited < 8000 && legibleArea() < most * 0.97; waited += 100) await sleep(100);
}

// Empty space a full-page shot shows below full-screen sticky/pinned sections (the scroll distance they occupy).
// With `mark`, those containers are flagged so REVEAL_CSS can collapse them.
function pinnedGap({ maxY, mark }) {
  const pinned = [...document.body.querySelectorAll('*')].filter((el) => getComputedStyle(el).position === 'sticky');
  document.querySelectorAll('.pin-spacer').forEach((spacer) => spacer.firstElementChild && pinned.push(spacer.firstElementChild));
  let total = 0;
  for (const el of pinned) {
    const r = el.getBoundingClientRect();
    const container = el.parentElement;
    if (!container || r.width < innerWidth * 0.8 || r.height < innerHeight * 0.5) continue;
    const contentBottom = Math.max(...[...container.children].map((c) => c.getBoundingClientRect().bottom));
    const top = contentBottom + scrollY;
    const bottom = Math.min(container.getBoundingClientRect().bottom + scrollY, maxY);
    if (bottom - top <= 200) continue;
    total += bottom - top;
    if (mark) container.setAttribute('data-capture-unpin', '');
  }
  return Math.round(total);
}

// In-flow blocks with content that are invisible (opacity 0 / visibility hidden), i.e. scroll reveals that never ran
// or reversed. Fixed/absolute layers, sliders, dialogs and navigation are hidden on purpose and ignored.
function findHidden({ maxY, mark }) {
  const ignore = 'header, nav, dialog, [role=dialog], [aria-modal=true], [role=tabpanel], [aria-roledescription=slide], .swiper-slide, .slick-slide, .splide__slide, .carousel-item, .glide__slide, .owl-item';
  const hiddenStyle = (cs) => parseFloat(cs.opacity) < 0.05 || cs.visibility === 'hidden';
  // Stacked alternatives (fading testimonials, tabs) sit under a visible sibling.
  const behindVisibleSibling = (el, r) => [...el.parentElement.children].some((sib) => {
    if (sib === el) return false;
    const s = getComputedStyle(sib);
    if (s.display === 'none' || hiddenStyle(s)) return false;
    const q = sib.getBoundingClientRect();
    const overlap = Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)) * Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top));
    return overlap > 0.5 * r.width * r.height;
  });
  const found = [];
  for (const el of document.body.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || !hiddenStyle(cs) || cs.position === 'absolute' || cs.position === 'fixed') continue;
    if (el.parentElement && hiddenStyle(getComputedStyle(el.parentElement))) continue;
    if (['VIDEO', 'CANVAS', 'IFRAME', 'SCRIPT', 'STYLE'].includes(el.tagName) || el.ownerSVGElement || el.closest(ignore)) continue;
    const r = el.getBoundingClientRect();
    const top = r.top + scrollY;
    if (r.width < 40 || r.height < 20 || top > maxY || r.bottom + scrollY < 0) continue;
    if (!el.textContent.trim() && !el.matches('img, svg, picture') && !el.querySelector('img, svg, picture')) continue;
    if (el.parentElement && behindVisibleSibling(el, r)) continue;
    let layered = false;
    for (let p = el.parentElement; p && !layered; p = p.parentElement) layered = getComputedStyle(p).position === 'fixed';
    if (layered) continue;
    if (mark) el.setAttribute('data-capture-reveal', '');
    found.push({ tag: el.tagName.toLowerCase(), cls: String(el.className?.baseVal ?? el.className).trim().split(/\s+/).slice(0, 3).join('.'), y: Math.round(top), h: Math.round(r.height), text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) });
  }
  return found;
}

async function waitForVideos(page) {
  await page.waitForFunction(
    () => [...document.querySelectorAll('video')]
      .filter((v) => v.autoplay && v.getBoundingClientRect().height > 0)
      .every((v) => v.readyState >= 2 || v.error),
    null,
    { timeout: 20_000 },
  ).catch(() => {});
}

function collectFacts() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const abs = (u) => { try { return u ? new URL(u, location.href).href : null; } catch { return null; } };
  const meta = (sel) => document.querySelector(sel)?.getAttribute('content')?.trim() || null;
  const rendered = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== 'hidden';
  };
  const dedupe = (arr) => {
    const seen = new Set();
    return arr.filter((x) => x && !seen.has(String(x).toLowerCase()) && seen.add(String(x).toLowerCase()));
  };
  const firstRendered = (sel, test = () => true) => [...document.querySelectorAll(sel)].find((el) => rendered(el) && test(el));
  const firstTextNodeParent = (el) => {
    if (!el) return null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
    return walker.nextNode()?.parentElement ?? el;
  };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const hex = (color) => {
    if (!color) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return 'transparent';
    const h = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    return a < 255 ? h + a.toString(16).padStart(2, '0') : h;
  };
  const transparent = (c) => !c || c === 'transparent' || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(c);
  const host = location.hostname.replace(/^www\./, '');
  const isInternal = (href) => {
    try {
      const u = new URL(href, location.href);
      return /^https?:$/.test(u.protocol) && u.hostname.replace(/^www\./, '') === host;
    } catch { return false; }
  };
  // Read copy in its source case (text-transform neutralised) and without aria-hidden duplicates; restored before style reads.
  const skipped = [...document.querySelectorAll('[aria-hidden="true"]')].filter((el) => !el.querySelector('h1, main'));
  skipped.forEach((el) => el.setAttribute('data-capture-skip', ''));
  const caseReset = document.createElement('style');
  caseReset.textContent = '*, *::before, *::after { text-transform: none !important; } [data-capture-skip] { display: none !important; }';
  document.head.append(caseReset);
  const textOf = (el) => clean(el.checkVisibility?.() === false ? el.textContent : el.innerText);
  const bodyText = document.body?.innerText || '';
  const lines = bodyText.split('\n').map(clean).filter(Boolean);
  const anchors = [...document.querySelectorAll('a[href]')];
  const headings = Object.fromEntries([['h1', 50], ['h2', 12], ['h3', 12]]
    .map(([tag, n]) => [tag, [...document.querySelectorAll(tag)].map(textOf).filter(Boolean).slice(0, n)]));
  const toggleRe = /^(es|esp|español|espanol|spanish|en|eng|english|en\s*[|/·]\s*es|es\s*[|/·]\s*en)$/i;

  // Navigation: the first nav/header block with at least two visible links (the logo link excluded).
  const isLogoLink = (a) => a.matches('a') && !!a.querySelector('img, svg') && isInternal(a.href) && /^\/(index\.html?)?$/.test(new URL(a.href).pathname);
  let navLinks = [];
  for (const root of document.querySelectorAll('header nav, nav, [role=navigation], header')) {
    const links = [...root.querySelectorAll('a[href], button')].filter((a) => rendered(a) && !isLogoLink(a) && clean(a.innerText) && clean(a.innerText).length <= 40);
    if (links.length >= 2) { navLinks = links; break; }
  }
  const navHidden = !navLinks.length;
  if (navHidden) navLinks = [...(document.querySelector('nav, [role=navigation]')?.querySelectorAll('a[href]') ?? [])];
  const navLabels = dedupe(navLinks.map((a) => clean(a.innerText || a.textContent)).filter((t) => t.length <= 40)).slice(0, 20);
  const here = location.href.split('#')[0];
  const navPages = dedupe(navLinks.filter((a) => a.href && isInternal(a.href)).map((a) => a.href.split('#')[0]).filter((h) => h !== here));

  // CTAs: buttons plus links styled as buttons.
  const filled = (el) => { const cs = getComputedStyle(el); return !transparent(cs.backgroundColor) || /gradient\(/.test(cs.backgroundImage); };
  const looksLikeButton = (a) => {
    const cs = getComputedStyle(a);
    const bordered = ['Top', 'Right', 'Bottom', 'Left'].every((s) => parseFloat(cs[`border${s}Width`]) > 0);
    return (filled(a) || bordered) && parseFloat(cs.paddingLeft) >= 10 && parseFloat(cs.paddingTop) >= 5;
  };
  const ctaCandidates = new Set([
    ...document.querySelectorAll('button, [role=button], input[type=submit], input[type=button], a[class*=btn], a[class*=button], a[class*=Button], a[class*=cta], .wp-block-button__link, .elementor-button'),
    ...anchors.filter(looksLikeButton),
  ]);
  const ignoreCta = /^(menu|open menu|close( menu)?|toggle (navigation|menu)|skip to .*|prev(ious)?|next|play|pause|mute|unmute|search|×|✕|x|\d+)$/i;
  const ctaText = (el) => clean(el.innerText || el.value);
  const ctaEls = [...ctaCandidates]
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
    .filter((el) => rendered(el) && ctaText(el) && ctaText(el).length <= 50 && !ignoreCta.test(ctaText(el)) && !toggleRe.test(ctaText(el)));
  const ctas = dedupe(ctaEls.map(ctaText)).slice(0, 12);
  const primaryButton = ctaEls.find((el) => !el.closest('header, nav') && filled(el)) || ctaEls.find(filled) || ctaEls[0] || null;
  const primaryLabel = primaryButton ? ctaText(primaryButton) : null;

  // Contact details.
  const phoneSeen = new Map();
  const phoneText = bodyText.match(/(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]\d{4}\b/g) || [];
  const telLinks = anchors.filter((a) => a.getAttribute('href').startsWith('tel:')).map((a) => decodeURIComponent(a.getAttribute('href').slice(4)));
  for (const p of [...phoneText, ...telLinks]) {
    const digits = p.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    const formatted = /^\+?\d+$/.test(p.trim()) ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : clean(p);
    if (digits.length === 10 && !phoneSeen.has(digits)) phoneSeen.set(digits, formatted);
  }
  const emails = dedupe([
    ...anchors.filter((a) => a.getAttribute('href').startsWith('mailto:')).map((a) => decodeURIComponent(a.getAttribute('href').slice(7).split('?')[0]).trim()),
    ...(bodyText.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}/gi) || []),
  ]).filter((e) => !/\.(png|jpe?g|webp|svg|gif)$/i.test(e));
  const street = /\b\d{2,6}\s+(?:[NSEW]{1,2}\.?\s+)?(?:[\w.'-]+\s+){0,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Way|Court|Ct|Lane|Ln|Terrace|Ter|Place|Pl|Parkway|Pkwy|Highway|Hwy|Circle|Cir|Trail|Plaza|Causeway)\b/i;
  const zip = /\b(?:FL|Florida)\.?,?\s+\d{5}\b/;
  const addresses = [...document.querySelectorAll('address')].map((a) => clean(a.innerText));
  lines.forEach((line, i) => {
    if (line.length > 160) return;
    const match = line.match(street);
    if (match) {
      let address = line.slice(match.index).split(/(?<=\b[A-Za-z]{4,}|\d{5})\.\s|\s[·|•]\s/)[0];
      if (!zip.test(address) && zip.test(lines[i + 1] || '')) address = `${address}, ${lines[i + 1]}`;
      addresses.push(address);
    } else if (zip.test(line) && !street.test(lines[i - 1] || '')) addresses.push(line);
  });

  // Structured data.
  const ldTypes = new Set();
  let ldBlocks = 0;
  let ldErrors = 0;
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    [].concat(node['@type'] ?? []).forEach((t) => ldTypes.add(String(t)));
    if (node.streetAddress) addresses.push([node.streetAddress, node.addressLocality, node.addressRegion, node.postalCode].filter(Boolean).join(', '));
    Object.values(node).forEach(walk);
  };
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    ldBlocks++;
    try { walk(JSON.parse(s.textContent)); } catch { ldErrors++; }
  }
  const socialRe = /\/\/(?:[a-z]+\.)?(?:facebook|instagram|twitter|x|linkedin|youtube|tiktok|pinterest|yelp|threads|spotify|soundcloud|behance|dribbble|vimeo|zillow|realtor|discord|whatsapp)\.(?:com|net|gg)\b|\/\/(?:youtu\.be|wa\.me|t\.me|g\.page)\b/i;
  const social = dedupe(anchors.map((a) => a.href).filter((h) => socialRe.test(h) && !/sharer|\/share\b|share\?|intent\/tweet|shareArticle/i.test(h)));
  const mapLinks = dedupe(anchors.map((a) => a.href).filter((h) => /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|maps\.apple\.com|goo\.gl\/maps/i.test(h)));

  const addressList = dedupe(addresses)
    .filter((a, _, all) => !all.some((b) => b !== a && b.toLowerCase().includes(a.toLowerCase())))
    .sort((a, b) => zip.test(b) - zip.test(a)).slice(0, 4);
  const linkTest = (a) => !a.closest('nav, header, footer') && clean(a.textContent) && !looksLikeButton(a);
  const contentLink = firstRendered('p a[href]', linkTest) || firstRendered('main a[href], article a[href], section a[href]', linkTest);
  const contentLinkLabel = contentLink ? textOf(contentLink).slice(0, 40) : null;
  caseReset.remove();
  skipped.forEach((el) => el.removeAttribute('data-capture-skip'));

  // Type and colour.
  const bodyCopy = firstTextNodeParent(firstRendered('main p, article p, section p, p', (p) => clean(p.textContent).length > 40)) || document.body;
  const fontTargets = { body: bodyCopy, h1: firstTextNodeParent(firstRendered('h1')), h2: firstTextNodeParent(firstRendered('h2')), button: firstTextNodeParent(primaryButton) };
  const fonts = { bodyElement: getComputedStyle(document.body).fontFamily };
  for (const [key, el] of Object.entries(fontTargets)) {
    if (!el) { fonts[key] = null; continue; }
    el.setAttribute('data-capture-font', key);
    const cs = getComputedStyle(el);
    fonts[key] = { family: cs.fontFamily, weight: cs.fontWeight, size: cs.fontSize, lineHeight: cs.lineHeight, letterSpacing: cs.letterSpacing, textTransform: cs.textTransform, fontStyle: cs.fontStyle };
  }
  const loadedFonts = dedupe([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^["']|["']$/g, '')));
  const googleFonts = dedupe([...document.querySelectorAll('link[href*="fonts.googleapis.com"]')]
    .flatMap((l) => new URL(l.href).searchParams.getAll('family'))
    .flatMap((f) => f.split('|'))
    .map((f) => f.split(':')[0].trim()));
  const colorPair = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const gradient = /gradient\(/.test(cs.backgroundImage) ? cs.backgroundImage : null;
    const firstStop = gradient?.match(/#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/i)?.[0];
    return {
      background: transparent(cs.backgroundColor) && firstStop ? hex(firstStop) : hex(cs.backgroundColor),
      text: hex(cs.color),
      ...(gradient && { gradient: gradient.slice(0, 200) }),
    };
  };
  const headerEl = firstRendered('header, [role=banner], #header, .header, .site-header, .navbar');
  const colors = {
    html: colorPair(document.documentElement),
    body: colorPair(document.body),
    header: colorPair(headerEl),
    primaryButton: primaryButton ? { ...colorPair(primaryButton), label: primaryLabel } : null,
    link: contentLink ? { text: hex(getComputedStyle(contentLink).color), label: contentLinkLabel } : null,
  };
  const tokens = {};
  const rootStyle = getComputedStyle(document.documentElement);
  const colorValue = /^(#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\(|color\()/i;
  const defaultPalette = /^--(tw-|color-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(-\d+)?$|wp--preset--color--)/;
  const walkRules = (rules) => {
    for (const rule of rules) {
      if (rule.cssRules) walkRules(rule.cssRules);
      if (!rule.selectorText || !/(^|,)\s*(:root|html)\s*(,|$)/.test(rule.selectorText)) continue;
      for (const prop of rule.style) {
        if (!prop.startsWith('--') || defaultPalette.test(prop) || prop in tokens || Object.keys(tokens).length >= 30) continue;
        const value = rootStyle.getPropertyValue(prop).trim();
        if (colorValue.test(value)) tokens[prop] = hex(value);
      }
    }
  };
  for (const sheet of document.styleSheets) { try { walkRules(sheet.cssRules); } catch { /* cross-origin sheet */ } }

  // Stack signals.
  const resources = performance.getEntriesByType('resource').map((r) => r.name);
  const urls = [...resources, ...[...document.querySelectorAll('script[src], link[href], img[src], iframe[src], source[src]')].map((e) => e.src || e.href)].join('\n');
  const html = document.documentElement.outerHTML.slice(0, 400_000);
  const generator = meta('meta[name="generator" i]');
  const reactRoot = [...document.querySelectorAll('#root, #app, #__next, body > div')].some((el) => Object.keys(el).some((k) => k.startsWith('__reactContainer') || k.startsWith('_reactRootContainer') || k.startsWith('__reactFiber')));
  const twClassCount = [...document.querySelectorAll('[class]')].reduce((n, el) => n + String(el.className?.baseVal ?? el.className).split(/\s+/).filter((c) => /^(sm|md|lg|xl|2xl|hover|focus):[a-z]|^-?[mp][xytrbl]?-[\d.]+$|^(text|bg)-[a-z]+-\d{2,3}$/.test(c)).length, 0);
  const pickTrue = (obj) => Object.entries(obj).filter(([, v]) => v).map(([k]) => k);
  const frameworks = pickTrue({
    'Next.js': !!(window.__NEXT_DATA__ || window.__next_f) || /\/_next\//.test(urls),
    Astro: /\/_astro\//.test(urls) || !!document.querySelector('astro-island') || /astro/i.test(generator || ''),
    Nuxt: !!(window.__NUXT__ || window.$nuxt) || /\/_nuxt\//.test(urls),
    Gatsby: !!document.getElementById('___gatsby') || /\/page-data\//.test(urls),
    SvelteKit: /\/_app\/immutable\//.test(urls),
    Remix: !!window.__remixContext,
    Vite: !!document.querySelector('script[type="module"][crossorigin][src*="/assets/"], link[rel="modulepreload"][href*="/assets/"]') || /\/@vite\/client/.test(urls),
    React: reactRoot || !!document.querySelector('[data-reactroot]'),
    Vue: !!(window.__VUE__ || document.querySelector('[data-v-app], [data-server-rendered]')),
    Svelte: !!document.querySelector('[class*="svelte-"]'),
    Angular: !!document.querySelector('[ng-version]'),
    WordPress: /\/wp-(content|includes)\//.test(urls + html),
    Elementor: !!document.querySelector('[data-elementor-type], .elementor'),
    Divi: !!document.querySelector('[class*="et_pb_"]'),
    WooCommerce: !!document.querySelector('.woocommerce, .woocommerce-page'),
    Webflow: !!document.documentElement.dataset.wfSite || /website-files\.com|webflow\.js/.test(urls),
    Wix: /wixstatic\.com|parastorage\.com/.test(urls) || /wix/i.test(generator || ''),
    Squarespace: /squarespace(-cdn)?\.com/.test(urls) || !!window.Static?.SQUARESPACE_CONTEXT,
    Shopify: !!window.Shopify || /cdn\.shopify\.com/.test(urls),
    Framer: /framerusercontent\.com/.test(urls) || /framer/i.test(generator || ''),
    'GoDaddy Website Builder': /img1\.wsimg\.com/.test(urls) && !!document.querySelector('[data-ux]'),
    Duda: /cdn-website\.com/.test(urls),
    'Hostinger Website Builder': /zyrosite\.com|zyro\.com/.test(urls),
  });
  const libraries = pickTrue({
    jQuery: !!window.jQuery,
    GSAP: !!window.gsap || /gsap|greensock/i.test(urls),
    ScrollTrigger: !!window.ScrollTrigger,
    'three.js': !!(window.THREE || window.__THREE__),
    Lenis: !!(window.Lenis || window.lenis) || /lenis/i.test(urls) || document.documentElement.classList.contains('lenis'),
    Swiper: !!window.Swiper || !!document.querySelector('.swiper, .swiper-container'),
    Splide: !!document.querySelector('.splide'),
    Slick: !!document.querySelector('.slick-slider'),
    AOS: !!window.AOS || !!document.querySelector('[data-aos]'),
    Lottie: !!(window.lottie || window.bodymovin) || !!document.querySelector('lottie-player, dotlottie-player, dotlottie-wc'),
    'Alpine.js': !!window.Alpine,
    htmx: !!window.htmx,
    Bootstrap: /bootstrap(\.min)?\.(css|js)/i.test(urls),
    'Tailwind CSS': twClassCount >= 40,
    'Font Awesome': /font-?awesome/i.test(urls),
    'Locomotive Scroll': !!document.querySelector('[data-scroll-container]'),
    'Barba.js': !!window.barba,
  });
  const thirdPartyHosts = dedupe(resources.map((u) => { try { return new URL(u).hostname; } catch { return null; } })
    .filter((h) => h && h.replace(/^www\./, '') !== host && !h.endsWith(`.${host}`))).sort();

  // SEO.
  const imgs = [...document.images];
  const internalAnchors = anchors.filter((a) => isInternal(a.href));

  // Language.
  const ES = new Set(['que', 'los', 'las', 'del', 'para', 'con', 'una', 'por', 'más', 'pero', 'sus', 'también', 'nuestro', 'nuestra', 'nuestros', 'nuestras', 'servicios', 'usted', 'ustedes', 'aquí', 'está', 'están', 'hoy', 'cita', 'somos', 'tenemos', 'nosotros', 'como', 'sobre', 'todos', 'años', 'desde', 'esta', 'este', 'donde', 'cuando', 'muy', 'hablamos', 'español']);
  const EN = new Set(['the', 'and', 'with', 'for', 'your', 'our', 'you', 'are', 'this', 'that', 'from', 'have', 'will', 'we', 'about', 'more', 'what', 'how']);
  const countWords = (text) => {
    let es = 0; let en = 0;
    for (const w of text.toLowerCase().match(/[a-záéíóúñü]+/g) || []) { if (ES.has(w)) es++; else if (EN.has(w)) en++; }
    return { es, en };
  };
  const totals = countWords(bodyText);

  // Embeds, media, forms.
  const iframes = [...document.querySelectorAll('iframe')].map((f) => abs(f.getAttribute('src') || f.dataset.src)).filter(Boolean);
  const videos = [...document.querySelectorAll('video')].map((v) => {
    const r = v.getBoundingClientRect();
    return { src: v.currentSrc || v.getAttribute('src') || abs(v.querySelector('source')?.getAttribute('src')) || null, autoplay: v.autoplay, muted: v.muted, loop: v.loop, poster: !!v.poster, width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top + scrollY), playing: !v.paused && v.readyState > 2 };
  });
  const forms = [...document.querySelectorAll('form')].map((f) => ({
    id: f.id || f.getAttribute('name') || null,
    action: f.getAttribute('action'),
    netlify: f.hasAttribute('data-netlify') || f.hasAttribute('netlify'),
    visible: rendered(f),
    fields: [...f.querySelectorAll('input, select, textarea')].filter((i) => !['hidden', 'submit', 'button', 'image', 'reset'].includes(i.type)).map((i) => i.getAttribute('name') || i.id || i.getAttribute('placeholder') || i.type).slice(0, 15),
    submit: clean(f.querySelector('[type=submit], button')?.innerText) || null,
  }));
  const nav = performance.getEntriesByType('navigation')[0];

  return {
    title: clean(document.title),
    metaDescription: meta('meta[name="description" i]'),
    canonical: abs(document.querySelector('link[rel="canonical" i]')?.getAttribute('href')),
    htmlLang: document.documentElement.lang || null,
    ogImage: abs(meta('meta[property="og:image"]') || meta('meta[name="og:image"]')),
    favicon: abs(document.querySelector('link[rel~="icon" i]')?.getAttribute('href')),
    headings,
    navLabels,
    navHidden,
    navPages,
    ctas,
    contact: { phones: [...phoneSeen.values()], emails, address: addressList, social, mapLinks },
    design: { fonts, loadedFonts, googleFonts, adobeFonts: !!document.querySelector('link[href*="typekit.net"], script[src*="typekit.net"]'), colors, cssColorTokens: tokens },
    tech: { generator, frameworks, libraries, thirdPartyHosts },
    seo: {
      jsonLdTypes: [...ldTypes],
      jsonLdBlocks: ldBlocks,
      jsonLdParseErrors: ldErrors,
      hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => ({ lang: l.hreflang, href: abs(l.getAttribute('href')) })),
      robotsMeta: meta('meta[name="robots" i]'),
      viewport: meta('meta[name="viewport" i]'),
      ogTitle: !!meta('meta[property="og:title"]'),
      ogDescription: !!meta('meta[property="og:description"]'),
      ogImage: !!meta('meta[property="og:image"]'),
      twitterCard: meta('meta[name="twitter:card"]'),
      images: {
        count: imgs.length,
        withAlt: imgs.filter((i) => clean(i.getAttribute('alt'))).length,
        emptyAlt: imgs.filter((i) => i.hasAttribute('alt') && !clean(i.getAttribute('alt'))).length,
        missingAlt: imgs.filter((i) => !i.hasAttribute('alt')).length,
      },
      links: {
        total: anchors.length,
        internal: internalAnchors.length,
        internalUnique: new Set(internalAnchors.map((a) => a.href.split('#')[0])).size,
        external: anchors.filter((a) => /^https?:/.test(a.href) && !isInternal(a.href)).length,
      },
    },
    languages: {
      htmlLang: document.documentElement.lang || null,
      hreflang: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((l) => l.hreflang),
      toggles: dedupe([...document.querySelectorAll('a, button, option, [role=menuitem], [role=tab], label')]
        .filter((el) => toggleRe.test(clean(el.textContent)))
        .map((el) => `${clean(el.textContent)}${el.getAttribute('href') ? ` (${el.getAttribute('href')})` : ''}`)).slice(0, 8),
      translateWidgets: ['#google_translate_element', '.goog-te-combo', '.gtranslate_wrapper', '.weglot-container', '.wpml-ls', '.trp-language-switcher', '.pll-switcher-select', '[class*="lang-switch"]', '[class*="language-switch"]', '[class*="LanguageSwitch"]', '[data-lang]', 'a[hreflang]'].filter((s) => document.querySelector(s)),
      spanishLinks: dedupe(anchors.map((a) => a.href).filter((h) => isInternal(h) && /\/es(\/|$)|[?&](lang|hl)=es\b/i.test(h))).slice(0, 5),
      elementsLangEs: document.querySelectorAll('[lang^="es"]').length,
      spanishWordShare: Math.round((totals.es / Math.max(1, totals.es + totals.en)) * 1000) / 1000,
      spanishLines: lines.filter((l) => { const c = countWords(l); return c.es >= 2 && c.es > c.en; }).slice(0, 6),
    },
    signals: {
      iframes,
      videos,
      forms,
      canvases: [...document.querySelectorAll('canvas')].filter((c) => { const r = c.getBoundingClientRect(); return r.width * r.height > 60_000; }).length,
      lottie: document.querySelectorAll('lottie-player, dotlottie-player, dotlottie-wc').length,
      copyright: dedupe(lines.filter((l) => /©|copyright/i.test(l) && l.length < 200)).slice(0, 3),
    },
    issues: {
      lorem: dedupe(bodyText.match(/lorem ipsum[^.\n]{0,40}|dolor sit amet|consectetur adipiscing/gi) || []),
      fictionalPhones: [...phoneSeen.entries()].filter(([digits]) => /^\d{3}55501\d\d$/.test(digits)).map(([, shown]) => shown),
      placeholders: dedupe(bodyText.match(/\b(?:your (?:company|business|brand) name|sample text|example\.com|123 main st(?:reet)?|\(555\)\s?\d{3}-\d{4}|555-\d{4}|insert (?:text|image|link) here|text goes here|add your text|edit this text)\b/gi) || []),
      mixedContent: [...document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[rel="stylesheet"][href^="http:"], iframe[src^="http:"], video[src^="http:"], source[src^="http:"], audio[src^="http:"]')].map((e) => e.getAttribute('src') || e.getAttribute('href')).slice(0, 10),
      brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0 && /^https?:/.test(i.currentSrc || i.src) && rendered(i)
        && i.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !i.closest('[aria-hidden="true"]')).map((i) => i.currentSrc || i.src).slice(0, 10),
      emptyHashLinks: anchors.filter((a) => a.getAttribute('href') === '#' && rendered(a)).map((a) => clean(a.innerText) || a.getAttribute('aria-label') || '(no text)').slice(0, 10),
    },
    timing: nav ? {
      ttfbMs: Math.round(nav.responseStart),
      serverResponseMs: Math.round(nav.responseStart - nav.requestStart),
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
      loadMs: Math.round(nav.loadEventEnd),
      documentTransferBytes: nav.transferSize,
    } : null,
    bodyText,
  };
}

// --- node-side collection --------------------------------------------------------------------------------------

async function collectAll(page, response, headers, network, consoleErrors, rawDir) {
  const facts = await page.evaluate(collectFacts);
  const rendered = await renderedFonts(page);
  for (const [key, families] of Object.entries(rendered)) if (facts.design.fonts[key]) facts.design.fonts[key].rendered = families;
  const origin = new URL(page.url()).origin;
  const crawl = await robotsAndSitemap(page.context(), origin);
  if (!facts.favicon) {
    const ico = await fetchText(page.context(), `${origin}/favicon.ico`);
    if (ico.status === 200 && /image/.test(ico.type)) facts.favicon = `${origin}/favicon.ico`;
  }
  const redirects = [];
  for (let req = response?.request().redirectedFrom(); req; req = req.redirectedFrom()) {
    redirects.unshift({ url: req.url(), status: (await req.response())?.status() ?? null });
  }
  await fs.writeFile(path.join(rawDir, 'text.txt'), facts.bodyText);
  await fs.writeFile(path.join(rawDir, 'dom.html'), await page.content());
  delete facts.bodyText;
  return { ...facts, headers, redirects, crawl, network: { ...network.summary() }, consoleErrors: [...new Set(consoleErrors)].slice(0, 15) };
}

async function watchNetwork(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const requests = new Map();
  const stats = { requests: 0, bytes: 0, videoRequestsExcluded: 0, errors: [], failed: [], insecure: [] };
  cdp.on('Network.requestWillBeSent', (e) => {
    if (e.request.url.startsWith('data:') || e.request.url.startsWith('blob:')) return;
    requests.set(e.requestId, e.request.url);
    if (HAS_FFMPEG && VIDEO_URL.test(e.request.url)) return;
    stats.requests++;
    if (e.request.url.startsWith('http:')) stats.insecure.push(e.request.url);
  });
  cdp.on('Network.responseReceived', (e) => {
    if (e.response.status >= 400) stats.errors.push({ url: e.response.url, status: e.response.status, type: e.type });
  });
  cdp.on('Network.loadingFinished', (e) => {
    const url = requests.get(e.requestId);
    if (!url) return;
    if (HAS_FFMPEG && VIDEO_URL.test(url)) stats.videoRequestsExcluded++;
    else stats.bytes += e.encodedDataLength;
  });
  cdp.on('Network.loadingFailed', (e) => {
    const url = requests.get(e.requestId);
    if (url && !e.canceled && e.errorText !== 'net::ERR_ABORTED') stats.failed.push({ url, error: e.errorText, type: e.type });
  });
  return { summary: () => ({ ...stats, errors: stats.errors.slice(0, 20), failed: stats.failed.slice(0, 20), insecure: [...new Set(stats.insecure)].slice(0, 20) }) };
}

async function renderedFonts(page) {
  const cdp = await page.context().newCDPSession(page);
  const out = {};
  try {
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    for (const key of ['body', 'h1', 'h2', 'button']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-capture-font="${key}"]` }).catch(() => ({}));
      if (!nodeId) continue;
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      out[key] = fonts.sort((a, b) => b.glyphCount - a.glyphCount).map((f) => f.familyName);
    }
  } catch (err) {
    console.warn('font inspection failed:', err.message);
  } finally {
    await cdp.detach().catch(() => {});
  }
  return out;
}

async function fetchText(context, url) {
  try {
    const res = await context.request.get(url, { timeout: 20_000, failOnStatusCode: false });
    return { url: res.url(), status: res.status(), type: res.headers()['content-type'] || '', text: await res.text() };
  } catch (err) {
    return { url, status: 0, type: '', text: '', error: err.message.split('\n')[0] };
  }
}

async function robotsAndSitemap(context, origin) {
  const robots = await fetchText(context, `${origin}/robots.txt`);
  const robotsPresent = robots.status === 200 && !/<html|<!doctype/i.test(robots.text.slice(0, 500));
  const listed = robotsPresent ? [...robots.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) : [];
  const locs = (xml) => [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\s\]]+)/gi)].map((m) => m[1].replace(/&amp;/g, '&'));
  const sitemap = { present: false, url: null, sitemapXmlStatus: null, isIndex: false, locCount: 0, urlCount: 0 };
  let urls = [];
  for (const url of [...new Set([`${origin}/sitemap.xml`, ...listed, `${origin}/sitemap_index.xml`, `${origin}/sitemap-index.xml`])]) {
    const res = await fetchText(context, url);
    if (url === `${origin}/sitemap.xml`) sitemap.sitemapXmlStatus = res.status;
    if (res.status !== 200 || !/<(urlset|sitemapindex)\b/i.test(res.text)) continue;
    Object.assign(sitemap, { present: true, url: res.url, isIndex: /<sitemapindex\b/i.test(res.text), locCount: locs(res.text).length });
    urls = locs(res.text);
    if (sitemap.isIndex) {
      const children = urls;
      urls = [];
      for (const child of children.slice(0, 10)) urls.push(...locs((await fetchText(context, child)).text));
    }
    sitemap.urlCount = urls.length;
    break;
  }
  return {
    robotsTxt: { present: robotsPresent, status: robots.status, sitemaps: listed, disallowAll: robotsPresent && /^\s*disallow:\s*\/\s*$/im.test(robots.text) },
    sitemap,
    sitemapUrls: urls,
  };
}

// --- video -----------------------------------------------------------------------------------------------------

async function playableVideo(route) {
  const request = route.request();
  if (request.resourceType() !== 'media') return route.continue();
  const url = request.url();
  if (!videoCache.has(url)) {
    videoCache.set(url, transcodeVideo(route, url).catch((err) => {
      console.warn(`video transcode failed for ${url}: ${err.message}`);
      return null;
    }));
  }
  const webm = await videoCache.get(url);
  if (!webm) return route.continue();
  return route.fulfill({ status: 200, contentType: 'video/webm', body: webm, headers: { 'access-control-allow-origin': '*' } });
}

async function transcodeVideo(route, url) {
  const dir = path.join(RAW_ROOT, '_video');
  await fs.mkdir(dir, { recursive: true });
  const key = createHash('sha1').update(url).digest('hex').slice(0, 16);
  const output = path.join(dir, `${key}.webm`);
  const cached = await fs.readFile(output).catch(() => null);
  if (cached) return cached;
  const headers = { ...route.request().headers() };
  delete headers.range;
  const res = await route.fetch({ headers, timeout: 120_000 });
  if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
  const input = path.join(dir, `${key}.source`);
  await fs.writeFile(input, await res.body());
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', input, '-t', '20', '-an', '-vf', "scale='min(1920,iw)':-2",
    '-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-b:v', '4M', output]);
  await fs.rm(input, { force: true });
  return fs.readFile(output);
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-300)}`))));
  });
}

// --- lighthouse ------------------------------------------------------------------------------------------------

async function runLighthouse(url, preset, rawDir) {
  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromePath: CHROME_PATH,
      chromeFlags: ['--headless=new', '--no-sandbox', ...(PROXY ? [`--proxy-server=${PROXY}`] : [])],
    });
    const { lhr } = await lighthouse(url, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: LH_CATEGORIES },
      preset === 'desktop' ? desktopConfig : undefined);
    await fs.writeFile(path.join(rawDir, `lighthouse-${preset}.json`), JSON.stringify(lhr));
    const audit = (id) => lhr.audits[id];
    const score = (id) => (lhr.categories[id]?.score == null ? null : Math.round(lhr.categories[id].score * 100));
    const failing = (cat) => (lhr.categories[cat]?.auditRefs ?? [])
      .filter((ref) => ref.weight > 0 && audit(ref.id)?.score != null && audit(ref.id).score < 1).map((ref) => ref.id);
    return {
      version: lhr.lighthouseVersion,
      performance: score('performance'),
      accessibility: score('accessibility'),
      bestPractices: score('best-practices'),
      seo: score('seo'),
      lcp: audit('largest-contentful-paint')?.displayValue ?? null,
      cls: audit('cumulative-layout-shift')?.displayValue ?? null,
      tbt: audit('total-blocking-time')?.displayValue ?? null,
      fcp: audit('first-contentful-paint')?.displayValue ?? null,
      speedIndex: audit('speed-index')?.displayValue ?? null,
      totalByteWeight: audit('total-byte-weight')?.numericValue ?? null,
      requests: audit('network-requests')?.details?.items?.length ?? null,
      serverResponseMs: audit('server-response-time')?.numericValue != null ? Math.round(audit('server-response-time').numericValue) : null,
      failingAudits: { accessibility: failing('accessibility'), bestPractices: failing('best-practices'), seo: failing('seo') },
      consoleErrors: (audit('errors-in-console')?.details?.items ?? []).slice(0, 5).map((i) => String(i.description ?? '').slice(0, 200)),
      finalUrl: lhr.finalDisplayedUrl,
      warnings: lhr.runWarnings,
      ...(lhr.runtimeError && { error: `${lhr.runtimeError.code}: ${lhr.runtimeError.message}` }),
    };
  } catch (err) {
    return { error: err.message.split('\n')[0] };
  } finally {
    await chrome?.kill();
  }
}

// --- images ----------------------------------------------------------------------------------------------------

async function toWebp(src, dest, { width, height, maxHeight, quality, maxKB }) {
  const meta = await sharp(src).metadata();
  let pipeline = sharp(src);
  if (maxHeight) {
    const cropHeight = Math.min(meta.height, Math.floor((maxHeight * meta.width) / width));
    pipeline = pipeline.extract({ left: 0, top: 0, width: meta.width, height: cropHeight });
  }
  const { data, info } = await pipeline.resize(width, height ?? null, { fit: 'cover', position: 'top' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let q = quality;
  let buffer;
  for (;;) {
    buffer = await sharp(data, { raw: info }).webp({ quality: q, effort: 6 }).toBuffer();
    if (!maxKB || buffer.length <= maxKB * 1024 || q <= 50) break;
    q -= 4;
  }
  await fs.writeFile(dest, buffer);
  return { width: info.width, height: info.height, bytes: buffer.length, quality: q, sourceHeight: meta.height };
}

// k-means (k-means++ seeding, fixed seed) in CIELAB over a downscaled hero; near-identical clusters are merged.
async function dominantColors(src, k = 8) {
  const { data } = await sharp(src).resize(160, 100, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = data.length / 3;
  const lab = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) lab.set(rgbToLab(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]), i * 3);
  const dist = (i, c) => (lab[i * 3] - c[0]) ** 2 + (lab[i * 3 + 1] - c[1]) ** 2 + (lab[i * 3 + 2] - c[2]) ** 2;
  let seed = 7;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const centers = [Array.from(lab.subarray(0, 3))];
  const nearest = new Float64Array(n).fill(Infinity);
  while (centers.length < k) {
    let total = 0;
    for (let i = 0; i < n; i++) { nearest[i] = Math.min(nearest[i], dist(i, centers.at(-1))); total += nearest[i]; }
    if (total === 0) break;
    let target = random() * total;
    let chosen = 0;
    while (chosen < n - 1 && (target -= nearest[chosen]) > 0) chosen++;
    centers.push(Array.from(lab.subarray(chosen * 3, chosen * 3 + 3)));
  }
  const assignment = new Int32Array(n).fill(-1);
  for (let iter = 0; iter < 40; iter++) {
    let changed = 0;
    for (let i = 0; i < n; i++) {
      let best = 0;
      for (let c = 1; c < centers.length; c++) if (dist(i, centers[c]) < dist(i, centers[best])) best = c;
      if (assignment[i] !== best) { assignment[i] = best; changed++; }
    }
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const s = sums[assignment[i]];
      s[0] += lab[i * 3]; s[1] += lab[i * 3 + 1]; s[2] += lab[i * 3 + 2]; s[3]++;
    }
    sums.forEach((s, c) => { if (s[3]) centers[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    if (!changed) break;
  }
  const clusters = centers.map(() => ({ count: 0, rgb: [0, 0, 0], lab: [0, 0, 0] }));
  for (let i = 0; i < n; i++) {
    const cl = clusters[assignment[i]];
    cl.count++;
    for (let j = 0; j < 3; j++) { cl.rgb[j] += data[i * 3 + j]; cl.lab[j] += lab[i * 3 + j]; }
  }
  const merged = [];
  for (const cl of clusters.filter((c) => c.count).sort((a, b) => b.count - a.count)) {
    const meanLab = cl.lab.map((v) => v / cl.count);
    const twin = merged.find((m) => Math.hypot(...m.lab.map((v, j) => v / m.count - meanLab[j])) < 10);
    if (twin) { twin.count += cl.count; for (let j = 0; j < 3; j++) { twin.rgb[j] += cl.rgb[j]; twin.lab[j] += cl.lab[j]; } }
    else merged.push(cl);
  }
  return merged.sort((a, b) => b.count - a.count).filter((c) => c.count / n >= 0.005).slice(0, 6).map((c) => ({
    hex: `#${c.rgb.map((v) => Math.round(v / c.count).toString(16).padStart(2, '0')).join('')}`,
    share: round(c.count / n, 3),
  }));
}

function rgbToLab(r, g, b) {
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

// Share of a full-page shot taken by long featureless runs (600+ CSS px), e.g. the scroll track behind a fixed stage.
async function blankShare(file, cssWidth) {
  const { data, info } = await sharp(file).resize({ width: 48 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const minRun = Math.ceil(600 / (cssWidth / 48));
  let blankRows = 0;
  let run = 0;
  for (let y = 0; y <= info.height; y++) {
    const row = y < info.height ? data.subarray(y * info.width, (y + 1) * info.width) : null;
    if (row && Math.max(...row) - Math.min(...row) <= 6) { run++; continue; }
    if (run >= minRun) blankRows += run;
    run = 0;
  }
  return round(blankRows / info.height, 3);
}

async function imageDifference(a, b) {
  const thumb = (file) => sharp(file).resize(96, 60, { fit: 'fill' }).greyscale().raw().toBuffer();
  const [x, y] = await Promise.all([thumb(a), thumb(b)]);
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += Math.abs(x[i] - y[i]);
  return sum / x.length / 255;
}

// --- audit assembly --------------------------------------------------------------------------------------------

function buildAudit(site, home, shots, files, palette, liveSite) {
  const f = home.facts;
  const h = f.headers;
  const services = [...new Set([...f.tech.thirdPartyHosts, ...f.signals.iframes].flatMap((u) => SERVICES.filter(([re]) => re.test(u)).map(([, name]) => name)))];
  const isSameSite = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') === new URL(home.finalUrl).hostname.replace(/^www\./, ''); } catch { return false; } };
  const pages = [...new Set([...f.navPages, ...f.crawl.sitemapUrls.filter(isSameSite)].map((u) => u.replace(/#.*$/, '')))]
    .filter((u) => u.replace(/\/$/, '') !== home.finalUrl.replace(/\/$/, '')).slice(0, 15);
  return {
    slug: site.slug,
    name: site.name,
    captureUrl: site.captureUrl,
    liveUrl: site.liveUrl,
    auditedAt: new Date().toISOString(),
    finalUrl: home.finalUrl,
    status: home.status,
    redirects: f.redirects,
    title: f.title,
    metaDescription: f.metaDescription,
    canonical: f.canonical,
    htmlLang: f.htmlLang,
    ogImage: f.ogImage,
    favicon: f.favicon,
    headings: f.headings,
    navLabels: f.navLabels,
    ctas: f.ctas,
    contact: f.contact,
    design: {
      fonts: f.design.fonts,
      loadedFonts: f.design.loadedFonts,
      googleFonts: f.design.googleFonts,
      adobeFonts: f.design.adobeFonts,
      colors: f.design.colors,
      palette: palette.map((c) => c.hex),
      paletteShare: palette.map((c) => c.share),
      cssColorTokens: f.design.cssColorTokens,
    },
    tech: {
      generator: f.tech.generator,
      frameworks: f.tech.frameworks,
      libraries: f.tech.libraries,
      hosting: hostingFrom(h),
      services,
      https: home.finalUrl.startsWith('https:'),
      hsts: !!h['strict-transport-security'],
      headers: pick(h, HEADER_KEYS),
      thirdPartyHosts: f.tech.thirdPartyHosts,
    },
    seo: {
      ...f.seo,
      robotsTxt: f.crawl.robotsTxt,
      sitemap: f.crawl.sitemap,
    },
    perf: {
      transferBytes: f.network.bytes,
      requests: f.network.requests,
      ...f.timing,
      note: 'Playwright, desktop 1440x900, cold cache, after scrolling the full page (lazy content included); measured from a cloud container through an egress proxy.'
        + (f.network.videoRequestsExcluded ? ` Excludes ${f.network.videoRequestsExcluded} video request(s), transcoded locally for capture.` : ''),
    },
    lighthouse: null,
    languages: f.languages,
    notableFeatures: [],
    designNotes: null,
    businessSummary: null,
    keyCopy: [],
    pages,
    signals: { ...f.signals, featureHints: featureHints(f, services) },
    issues: {
      ...f.issues,
      httpErrors: f.network.errors,
      failedRequests: f.network.failed,
      insecureRequests: f.network.insecure,
      consoleErrors: f.consoleErrors,
      mobileOverflowPx: Math.max(shots.mobile.overflowX, shots.mobileFull.overflowX),
    },
    screenshots: {
      ...(site.fullPageUrl && { fullPageUrl: site.fullPageUrl }),
      pageHeight: { desktop: shots.full.pageHeight, mobile: shots.mobileFull.pageHeight },
      modes: Object.fromEntries(Object.entries(shots).map(([k, s]) => [k, s.mode])),
      hiddenBlocks: Object.fromEntries(Object.entries(shots).map(([k, s]) => [k, s.hidden.length])),
      blankShare: { full: shots.full.blank, mobileFull: shots.mobileFull.blank },
      dismissed: [...new Set(Object.values(shots).flatMap((s) => s.dismissed))],
      files,
    },
    ...(liveSite && { liveSite }),
  };
}

function featureHints(f, services) {
  const hints = [];
  const iframes = f.signals.iframes.join(' ');
  if (/google\.[a-z.]+\/maps/.test(iframes)) hints.push('Google Maps embed');
  if (/youtube/.test(iframes)) hints.push('YouTube embed');
  if (/vimeo/.test(iframes)) hints.push('Vimeo embed');
  if (f.signals.videos.some((v) => v.autoplay && v.muted && v.width >= DESKTOP.width * 0.5)) hints.push('autoplaying background video');
  else if (f.signals.videos.length) hints.push(`${f.signals.videos.length} video element(s)`);
  for (const form of f.signals.forms) if (form.fields.length) hints.push(`form: ${form.fields.join(', ')}${form.netlify ? ' (Netlify Forms)' : ''}`);
  if (f.signals.canvases) hints.push(`${f.signals.canvases} large canvas element(s) (WebGL/2D)`);
  if (f.signals.lottie) hints.push('Lottie animation');
  if (f.languages.toggles.length || f.languages.translateWidgets.length) hints.push('language toggle');
  for (const s of services) if (/Calendly|Acuity|Square|Vagaro|Booksy|GlossGenius|Fresha|Stripe|PayPal|IDX|Matterport|booking|Kajabi|Teachable|Thinkific|Whop|Discord|TradingView/.test(s)) hints.push(s);
  return hints;
}

function hostingFrom(h) {
  const server = (h.server || '').toLowerCase();
  const out = [];
  if (h['x-nf-request-id'] || server.includes('netlify')) out.push('Netlify');
  if (h['x-vercel-id'] || server.includes('vercel')) out.push('Vercel');
  if (h['cf-ray'] || server.includes('cloudflare')) out.push('Cloudflare');
  if (h['x-github-request-id'] || server.includes('github')) out.push('GitHub Pages');
  if (h['x-amz-cf-id']) out.push('Amazon CloudFront');
  if (server.includes('amazons3')) out.push('Amazon S3');
  if (h['x-wix-request-id'] || server.includes('pepyaka')) out.push('Wix');
  if (server.includes('squarespace')) out.push('Squarespace');
  if (h['x-shopid']) out.push('Shopify');
  if (h['x-kinsta-cache']) out.push('Kinsta');
  if (h['x-hcdn-request-id'] || server === 'hcdn' || /hostinger/i.test(h.platform || '')) out.push('Hostinger');
  if (/wp engine/i.test(h['x-powered-by'] || '')) out.push('WP Engine');
  if (/^dps\//.test(server)) out.push('GoDaddy');
  if (/cache-/.test(h['x-served-by'] || '')) out.push('Fastly');
  if (server.includes('litespeed')) out.push('LiteSpeed');
  if (server.startsWith('nginx')) out.push('nginx');
  if (server.startsWith('apache')) out.push('Apache');
  return out;
}

function orderAudit(audit) {
  const order = ['slug', 'name', 'captureUrl', 'liveUrl', 'auditedAt', 'finalUrl', 'status', 'redirects', 'title', 'metaDescription',
    'canonical', 'htmlLang', 'ogImage', 'favicon', 'headings', 'navLabels', 'ctas', 'contact', 'design', 'tech', 'seo', 'perf',
    'lighthouse', 'languages', 'notableFeatures', 'designNotes', 'businessSummary', 'keyCopy', 'pages', 'signals', 'issues',
    'screenshots', 'liveSite'];
  return Object.fromEntries([...order.filter((k) => k in audit), ...Object.keys(audit).filter((k) => !order.includes(k))].map((k) => [k, audit[k]]));
}

// --- small utils -----------------------------------------------------------------------------------------------

function pick(obj, keys) {
  return Object.fromEntries(keys.filter((k) => obj[k] != null).map((k) => [k, obj[k]]));
}

function round(value, digits) {
  return Math.round(value * 10 ** digits) / 10 ** digits;
}

function hasValue(v) {
  return Array.isArray(v) ? v.length > 0 : v != null && v !== '';
}

function stripVersion({ version, ...rest }) {
  return rest;
}

function scoreLine(r) {
  return r.error && r.performance == null ? `error (${r.error})` : `${r.performance}/${r.accessibility}/${r.bestPractices}/${r.seo}`;
}

async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
}
