import type { Concept, JobStatus, Report } from '../lab/schema';
import { encodeForm, submitToNetlify } from './forms';

/* ---------- helpers ---------- */

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const SUN_STOPS =
  '<stop offset="0" stop-color="#ff8a1e"/><stop offset=".38" stop-color="#ff4a3a"/><stop offset=".7" stop-color="#f02c6e"/><stop offset="1" stop-color="#c8238f"/>';
let gid = 0;
function mark(fill?: string): string {
  const id = `rp-g${++gid}`;
  const f = fill ?? `url(#${id})`;
  return `<svg viewBox="-19 -2 138 104" aria-hidden="true">${fill ? '' : `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="100" y2="0">${SUN_STOPS}</linearGradient></defs>`}<g transform="rotate(31.7175 50 50)" fill="${f}"><polygon points="0,20 20,20 20,80 60,80 60,100 0,100"/><polygon points="100,80 80,80 80,20 40,20 40,0 100,0"/></g></svg>`;
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

const list = (items: string[], cls = '') => `<ul class="rp-list ${cls}">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

/** Contrast-safe ink for text on a swatch. */
function inkFor(hex: string): string {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return '#0d0b14';
  const [r, g, b] = m.slice(1).map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.32 ? '#0d0b14' : '#ffffff';
}

const fontStack = (family: string, fallback: string) => `'${family.replace(/'/g, '')}', ${fallback}`;

function loadFonts(concepts: Concept[]): void {
  const families = new Set<string>();
  concepts.forEach((c) => {
    families.add(c.typography.display);
    families.add(c.typography.body);
  });
  families.forEach((f) => {
    const name = encodeURIComponent(f.trim()).replace(/%20/g, '+');
    for (const axis of ['', ':wght@700']) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${name}${axis}&display=swap`;
      document.head.appendChild(link);
    }
  });
}

/* ---------- sheets ---------- */

interface Ctx {
  r: Report;
  name: string;
  total: number;
  n: number;
}

function sheet(ctx: Ctx, theme: 'ink' | 'paper' | 'sun', body: string, opts: { bare?: boolean } = {}): string {
  ctx.n += 1;
  const head = opts.bare
    ? ''
    : `<div class="rp-head"><span class="rp-head__brand">${mark(theme === 'sun' ? '#0d0b14' : undefined)}lessthan7</span><span>${esc(ctx.name)} · Revamp proposal</span></div>
       <div class="rp-foot"><span>${esc(host(ctx.r.input.url))}</span><span>${String(ctx.n).padStart(2, '0')} / ${String(ctx.total).padStart(2, '0')}</span></div>`;
  return `<section class="rp-slot"><div class="rp-sheet ${theme}">${head}${body}</div></section>`;
}

function cover(ctx: Ctx): string {
  const { r } = ctx;
  const size = ctx.name.length > 26 ? 92 : ctx.name.length > 16 ? 116 : 140;
  return sheet(
    ctx,
    'ink',
    `<div class="cv-glow"></div>
     <div class="cv-mark">${mark()}</div>
     <div class="cv-brand">${mark()}<span>lessthan<b>7</b></span></div>
     <div class="cv-main">
       <p class="rp-eyebrow">Website revamp proposal${r.sample ? ' · Sample' : ''}</p>
       <h1 class="cv-name" style="font-size:${size}px">${esc(ctx.name)}</h1>
       <p class="cv-url">${esc(host(r.input.url))}</p>
     </div>
     <div class="cv-meta">
       ${r.input.preparedFor ? `<p><span>Prepared for</span>${esc(r.input.preparedFor)}</p>` : ''}
       <p><span>Date</span>${esc(fmtDate(r.createdAt))}</p>
       <p><span>Prepared by</span>lessthan7 studio, Miami</p>
     </div>
     <p class="cv-tag">Make the first seven seconds count.</p>`,
    { bare: true },
  );
}

function summary(ctx: Ctx): string {
  const s = ctx.r.strategy;
  const labels: Record<keyof typeof s.scores, string> = {
    firstImpression: 'First impression',
    design: 'Visual design',
    clarity: 'Clarity of message',
    seo: 'Search visibility',
    performance: 'Speed',
    accessibility: 'Accessibility',
    conversion: 'Conversion',
  };
  const bars = (Object.keys(labels) as (keyof typeof labels)[])
    .map((k) => {
      const v = Math.max(0, Math.min(100, Math.round(s.scores[k])));
      return `<li><span>${labels[k]}</span><i><b style="width:${v}%"></b></i><em>${v}</em></li>`;
    })
    .join('');
  return sheet(
    ctx,
    'paper',
    `<div class="rp-body-area sm">
       <div class="sm-left">
         <p class="rp-eyebrow">Executive summary</p>
         <h2 class="rp-title sm-title">${esc(s.summary.headline)}</h2>
         <div class="sm-paras">${s.summary.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
       </div>
       <div class="sm-right">
         <div class="sm-nums">${s.summary.keyNumbers
           .slice(0, 4)
           .map((k) => `<div><p class="sm-num">${esc(k.value)}</p><p class="sm-lab">${esc(k.label)}</p><p class="sm-src">${esc(k.source)}</p></div>`)
           .join('')}</div>
         <p class="sm-bars-title">Our assessment</p>
         <ul class="sm-bars">${bars}</ul>
       </div>
     </div>`,
  );
}

function firstSeconds(ctx: Ctx): string {
  const items = ctx.r.strategy.firstSeconds.slice(0, 4);
  return sheet(
    ctx,
    'ink',
    `<div class="rp-body-area fs">
       <p class="rp-eyebrow">The first seven seconds</p>
       <h2 class="rp-title">What a new visitor experiences on a phone.</h2>
       <ol class="fs-list">${items
         .map((m) => `<li><p class="fs-t">${esc(m.moment)}</p><p class="fs-o">${esc(m.observation)}</p></li>`)
         .join('')}</ol>
     </div>`,
  );
}

function snapshot(ctx: Ctx): string {
  const { facts: f, psi } = ctx.r;
  const yes = (b: boolean) => (b ? 'Yes' : 'No');
  const rows: [string, string][] = [
    ['Page title', f.title ? `“${f.title}” (${f.titleLength} characters)` : 'Missing'],
    ['Meta description', f.metaDescription ? `${f.metaDescriptionLength} characters` : 'Missing'],
    ['Main heading (H1)', f.h1.length ? `“${f.h1[0]}”${f.h1.length > 1 ? ` + ${f.h1.length - 1} more` : ''}` : 'Missing'],
    ['Server response', `${(f.responseMs / 1000).toFixed(2)}s for ${f.htmlKb} KB of HTML`],
    ['Images without alt text', `${f.imagesMissingAlt} of ${f.images}`],
    ['Structured data', f.jsonLdTypes.length ? f.jsonLdTypes.slice(0, 4).join(', ') : 'None found'],
    ['Language versions', f.hreflang.length ? f.hreflang.join(', ') : 'One language only'],
    ['Mobile viewport · HTTPS', `${yes(f.viewport)} · ${yes(f.https)}`],
    ['Sitemap', f.sitemapUrls !== null ? `${f.sitemapUrls} URLs` : 'Not found'],
    ['Built with', f.frameworkHints.length ? f.frameworkHints.join(', ') : f.generator || 'Not detected'],
  ];
  const ring = (label: string, v: number) => {
    const c = 2 * Math.PI * 30;
    const color = v >= 90 ? '#0c9f5d' : v >= 50 ? '#d97706' : '#dc2626';
    return `<div class="sn-ring"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="#e2dee9" stroke-width="6"/><circle cx="36" cy="36" r="30" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - v / 100)).toFixed(1)}" transform="rotate(-90 36 36)"/></svg><b style="color:${color}">${v}</b><span>${label}</span></div>`;
  };
  const right = psi
    ? `<div class="sn-psi">
         <p class="sn-psi-title">Google Lighthouse, mobile</p>
         <div class="sn-rings">${ring('Performance', psi.scores.performance)}${ring('Accessibility', psi.scores.accessibility)}${ring('Best practices', psi.scores.bestPractices)}${ring('SEO', psi.scores.seo)}</div>
         <dl class="sn-metrics"><div><dt>Largest Contentful Paint</dt><dd>${esc(psi.metrics.lcp)}</dd></div><div><dt>Total Blocking Time</dt><dd>${esc(psi.metrics.tbt)}</dd></div><div><dt>Layout shift (CLS)</dt><dd>${esc(psi.metrics.cls)}</dd></div><div><dt>Speed Index</dt><dd>${esc(psi.metrics.speedIndex)}</dd></div></dl>
         ${psi.screenshot ? `<img class="sn-shot" src="${esc(psi.screenshot)}" alt="Current homepage on a phone">` : ''}
       </div>`
    : `<div class="sn-psi sn-psi--empty"><p>Lighthouse scores weren’t available for this report. Add a PageSpeed Insights API key to include them.</p></div>`;
  return sheet(
    ctx,
    'paper',
    `<div class="rp-body-area sn">
       <div>
         <p class="rp-eyebrow">The current site, measured</p>
         <h2 class="rp-title">${esc(host(f.finalUrl))} today.</h2>
         <dl class="sn-table">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
       </div>
       ${right}
     </div>`,
  );
}

function business(ctx: Ctx): string {
  const b = ctx.r.strategy.business;
  return sheet(
    ctx,
    'ink',
    `<div class="rp-body-area bz">
       <div class="bz-main">
         <p class="rp-eyebrow">Who you are</p>
         <h2 class="rp-title">${esc(b.oneLiner)}</h2>
         <p class="bz-meta">${esc(b.industry)} · ${esc(b.location)}</p>
         <div class="bz-person">${b.personality.map((p) => `<span>${esc(p)}</span>`).join('')}</div>
       </div>
       <div class="bz-grid">
         <div><p class="bz-h">Customers</p>${list(b.audience)}</div>
         <div><p class="bz-h">What you offer</p>${list(b.offerings)}</div>
         <div><p class="bz-h">Strengths to lead with</p>${list(b.differentiators)}</div>
         <div><p class="bz-h">Competitors</p><ul class="rp-list">${b.competitors
           .map((c) => `<li><b>${esc(c.name)}</b> <span class="bz-url">${esc(host(c.url))}</span><br><span class="bz-note">${esc(c.note)}</span></li>`)
           .join('')}</ul></div>
       </div>
     </div>`,
  );
}

function findingsSheets(ctx: Ctx): string[] {
  const all = ctx.r.strategy.findings;
  const chunks = [all.slice(0, 6), all.slice(6, 12)].filter((c) => c.length);
  return chunks.map((chunk, i) =>
    sheet(
      ctx,
      'paper',
      `<div class="rp-body-area fd">
         <div class="fd-head"><p class="rp-eyebrow">What’s holding the site back${chunks.length > 1 ? ` · ${i + 1} of ${chunks.length}` : ''}</p>
         <h2 class="rp-title">${i === 0 ? 'Findings, most important first.' : 'Findings, continued.'}</h2></div>
         <ol class="fd-list">${chunk
           .map(
             (f) => `<li>
               <div class="fd-top"><span class="rp-chip ${f.severity.toLowerCase()}">${esc(f.severity)}</span><span class="fd-area">${esc(f.area)}</span></div>
               <h3>${esc(f.title)}</h3>
               <p class="fd-ev">${esc(f.evidence)}</p>
               <p class="fd-fix"><b>Fix</b> ${esc(f.fix)}</p>
             </li>`,
           )
           .join('')}</ol>
       </div>`,
    ),
  );
}

function search(ctx: Ctx): string {
  const s = ctx.r.strategy.seo;
  return sheet(
    ctx,
    'ink',
    `<div class="rp-body-area se">
       <div class="se-left">
         <p class="rp-eyebrow">Search plan</p>
         <h2 class="rp-title">The searches your customers are already making.</h2>
         <table class="se-table"><thead><tr><th>Search</th><th>Intent</th><th>Page</th></tr></thead><tbody>${s.keywords
           .slice(0, 9)
           .map((k) => `<tr><td>${esc(k.keyword)}</td><td>${esc(k.intent)}</td><td>${esc(k.page)}</td></tr>`)
           .join('')}</tbody></table>
       </div>
       <div class="se-right">
         <div><p class="bz-h">Quick wins, week one</p>${list(s.quickWins)}</div>
         <div><p class="bz-h">Local search</p>${list(s.local)}</div>
         <div><p class="bz-h">Content to create</p>${list(s.content)}</div>
       </div>
     </div>`,
  );
}

function sitemap(ctx: Ctx): string {
  const pages = ctx.r.strategy.sitemap.slice(0, 10);
  return sheet(
    ctx,
    'paper',
    `<div class="rp-body-area st">
       <p class="rp-eyebrow">The new site</p>
       <h2 class="rp-title">Every page with one clear job.</h2>
       <ol class="st-grid">${pages.map((p) => `<li><h3>${esc(p.page)}</h3><p>${esc(p.purpose)}</p></li>`).join('')}</ol>
     </div>`,
  );
}

function conceptOverview(ctx: Ctx, c: Concept): string {
  const [bg, ...rest] = c.palette;
  const textColor = inkFor(bg.hex);
  return sheet(
    ctx,
    'paper',
    `<div class="rp-body-area co">
       <div class="co-left">
         <p class="co-letter">${c.id}</p>
         <p class="rp-eyebrow">Concept ${c.id} · ${esc(c.effort)} · ${esc(c.timeline)}</p>
         <h2 class="rp-title co-name">${esc(c.name)}</h2>
         <p class="co-tag">${esc(c.tagline)}</p>
         <p class="co-idea">${esc(c.idea)}</p>
         <p class="co-best"><b>Best for</b> ${esc(c.bestFor)}</p>
         <div class="co-mood">${c.mood.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
         <div class="co-pt"><div><p class="bz-h">Strengths</p>${list(c.pros)}</div><div><p class="bz-h">Trade-offs</p>${list(c.tradeoffs)}</div></div>
       </div>
       <div class="co-right">
         <div class="co-spec" style="background:${esc(bg.hex)};color:${esc(textColor)}">
           <p class="co-spec-h" style="font-family:${esc(fontStack(c.typography.display, 'Georgia, serif'))}">${esc(c.heroHeadline)}</p>
           <p class="co-spec-s" style="font-family:${esc(fontStack(c.typography.body, 'system-ui, sans-serif'))}">${esc(c.heroSubhead)}</p>
           <span class="co-spec-cta" style="background:${esc(rest[0]?.hex ?? '#ff4a3a')};color:${esc(inkFor(rest[0]?.hex ?? '#ff4a3a'))};font-family:${esc(fontStack(c.typography.body, 'system-ui, sans-serif'))}">${esc(c.primaryCta)}</span>
         </div>
         <div class="co-swatches">${c.palette
           .map((p) => `<div style="background:${esc(p.hex)};color:${inkFor(p.hex)}"><b>${esc(p.name)}</b><span>${esc(p.hex.toUpperCase())}</span><em>${esc(p.role)}</em></div>`)
           .join('')}</div>
         <div class="co-type">
           <div><p class="co-type-aa" style="font-family:${esc(fontStack(c.typography.display, 'Georgia, serif'))}">Aa</p><p class="co-type-n">${esc(c.typography.display)}<span>Display</span></p></div>
           <div><p class="co-type-aa" style="font-family:${esc(fontStack(c.typography.body, 'system-ui, sans-serif'))}">Aa</p><p class="co-type-n">${esc(c.typography.body)}<span>Body</span></p></div>
           <p class="co-type-r">${esc(c.typography.rationale)}</p>
         </div>
         <p class="co-sig"><b>Signature detail</b> ${esc(c.signatureDetail)}</p>
       </div>
     </div>
     <button type="button" class="co-choose rp-screen-only" data-rp-choose-concept="${c.id}">Choose concept ${c.id}</button>`,
  );
}

/** A browser frame showing a vertical slice of a mockup. */
function frame(conceptId: string, url: string, width: number, height: number, offset: number): string {
  const scale = width / 1440;
  return `<div class="rp-frame" style="width:${width}px"><div class="rp-frame__chrome"><i></i><i></i><i></i><span>${esc(url)}</span></div>
    <div class="rp-frame__view" style="height:${height}px" data-mockup="${conceptId}" data-scale="${scale}" data-offset="${offset}"></div></div>`;
}

function conceptMockups(ctx: Ctx, c: Concept): string[] {
  const url = host(ctx.r.input.url);
  const topH = 660;
  const topW = 1376;
  const shown = topH / (topW / 1440);
  const colW = 676;
  const colH = 680;
  const colShown = colH / (colW / 1440);
  return [
    sheet(
      ctx,
      'ink',
      `<div class="mk"><p class="mk-cap"><b>Concept ${c.id}</b> ${esc(c.name)} · Homepage, desktop</p>${frame(c.id, url, topW, topH, 0)}</div>`,
    ),
    sheet(
      ctx,
      'ink',
      `<div class="mk"><p class="mk-cap"><b>Concept ${c.id}</b> ${esc(c.name)} · Homepage, continued</p>
       <div class="mk-cols">${frame(c.id, url, colW, colH, Math.round(shown))}${frame(c.id, url, colW, colH, Math.round(shown + colShown))}</div></div>`,
    ),
  ];
}

function compare(ctx: Ctx): string {
  const cs = ctx.r.strategy.concepts;
  return sheet(
    ctx,
    'paper',
    `<div class="rp-body-area cp">
       <p class="rp-eyebrow">Side by side</p>
       <h2 class="rp-title">Three directions. One decision.</h2>
       <div class="cp-grid">${cs
         .map(
           (c) => `<div class="cp-col">${frame(c.id, host(ctx.r.input.url), 456, 270, 0)}
             <p class="cp-name"><b>${c.id}</b> ${esc(c.name)}</p>
             <p class="cp-best">${esc(c.bestFor)}</p>
             <p class="cp-meta">${esc(c.effort)} · ${esc(c.timeline)}</p></div>`,
         )
         .join('')}</div>
     </div>`,
  );
}

function roadmap(ctx: Ctx): string {
  const phases = ctx.r.strategy.roadmap.slice(0, 5);
  return sheet(
    ctx,
    'ink',
    `<div class="rp-body-area rm">
       <p class="rp-eyebrow">Roadmap</p>
       <h2 class="rp-title">From kickoff to launch.</h2>
       <ol class="rm-list" style="--n:${phases.length}">${phases
         .map((p) => `<li><p class="rm-weeks">${esc(p.weeks)}</p><h3>${esc(p.phase)}</h3>${list(p.work)}</li>`)
         .join('')}</ol>
     </div>`,
  );
}

function nextSteps(ctx: Ctx, email: string, phone: string): string {
  return sheet(
    ctx,
    'sun',
    `<div class="rp-body-area nx">
       <div>
         <p class="nx-eyebrow">Next steps</p>
         <h2 class="nx-title">Let’s make your first impression.</h2>
         <ol class="nx-list">${ctx.r.strategy.nextSteps.slice(0, 3).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
       </div>
       <div class="nx-contact">
         <div class="nx-mark">${mark('#0d0b14')}</div>
         <p class="nx-studio">lessthan7 studio</p>
         <p>${esc(email)}</p>
         <p>${esc(phone)}</p>
         <p>lessthan7.studio</p>
       </div>
     </div>`,
  );
}

/* ---------- page assembly ---------- */

function render(report: Report): void {
  const body = document.body;
  const pagesEl = document.querySelector<HTMLElement>('[data-rp-pages]')!;
  const name = report.strategy.business.name || report.input.businessName || host(report.input.url);
  const concepts = report.strategy.concepts;
  const findingsCount = report.strategy.findings.length > 6 ? 2 : 1;
  const total = 7 + findingsCount + concepts.length * 3 + 3;
  const ctx: Ctx = { r: report, name, total, n: 0 };

  loadFonts(concepts);

  const parts = [
    cover(ctx),
    summary(ctx),
    firstSeconds(ctx),
    snapshot(ctx),
    business(ctx),
    ...findingsSheets(ctx),
    search(ctx),
    sitemap(ctx),
    ...concepts.flatMap((c) => [conceptOverview(ctx, c), ...conceptMockups(ctx, c)]),
    compare(ctx),
    roadmap(ctx),
    nextSteps(ctx, body.dataset.email ?? '', body.dataset.phone ?? ''),
  ];
  pagesEl.innerHTML = parts.join('');

  // Mount each mockup slice as a sandboxed iframe (no scripts, no same-origin access).
  const html = new Map(report.mockups.map((m) => [m.conceptId, m.html]));
  pagesEl.querySelectorAll<HTMLElement>('[data-mockup]').forEach((view) => {
    const doc = html.get(view.dataset.mockup as Concept['id']);
    if (!doc) {
      view.innerHTML = '<p class="mk-missing">This concept’s mockup didn’t generate.</p>';
      return;
    }
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', '');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('tabindex', '-1');
    iframe.title = `Concept ${view.dataset.mockup} homepage mockup`;
    const scale = Number(view.dataset.scale);
    const offset = Number(view.dataset.offset);
    iframe.style.transform = `scale(${scale}) translateY(${-offset}px)`;
    iframe.srcdoc = doc;
    view.appendChild(iframe);
  });

  document.title = `${name} · Revamp proposal · lessthan7`;
  document.querySelector('[data-rp-title]')!.textContent = `${name} · ${host(report.input.url)}`;
  fit();
}

function fit(): void {
  const pagesEl = document.querySelector<HTMLElement>('[data-rp-pages]')!;
  const w = Math.min(pagesEl.clientWidth, 1600);
  document.body.style.setProperty('--s', String(w / 1600));
}

/* ---------- choosing a direction ---------- */

function initChoice(report: Report): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-rp-dialog]')!;
  const form = document.querySelector<HTMLFormElement>('[data-rp-choice-form]')!;
  const box = form.querySelector<HTMLElement>('[data-rp-concepts]')!;
  const status = form.querySelector<HTMLElement>('[data-rp-choice-status]')!;
  const send = form.querySelector<HTMLButtonElement>('[data-rp-send]')!;
  const openBtn = document.querySelector<HTMLButtonElement>('[data-rp-choose]')!;

  box.insertAdjacentHTML(
    'beforeend',
    report.strategy.concepts
      .map(
        (c, i) =>
          `<label><input type="radio" name="concept" value="${c.id}" ${i === 0 ? 'checked' : ''}><span><b>Concept ${c.id}: ${esc(c.name)}</b><br><small>${esc(c.tagline)}</small></span></label>`,
      )
      .join(''),
  );

  const open = (id?: string) => {
    if (id) form.querySelector<HTMLInputElement>(`input[name="concept"][value="${id}"]`)!.checked = true;
    status.textContent = '';
    dialog.showModal();
  };
  openBtn.disabled = false;
  openBtn.addEventListener('click', () => open());
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-rp-choose-concept]');
    if (btn) open(btn.dataset.rpChooseConcept);
  });
  form.querySelector('[data-rp-cancel]')!.addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const nameV = String(data.get('name') ?? '').trim();
    const emailV = String(data.get('email') ?? '').trim();
    if (!nameV || !/^\S+@\S+\.\S+$/.test(emailV)) {
      status.textContent = 'Add your name and a valid email so we can reply.';
      return;
    }
    const conceptId = String(data.get('concept'));
    const concept = report.strategy.concepts.find((c) => c.id === conceptId);
    const payload = document.createElement('form');
    const fields: Record<string, string> = {
      'form-name': 'revamp-choice',
      'report-id': report.id,
      'report-url': location.href,
      business: report.strategy.business.name,
      website: report.input.url,
      concept: conceptId,
      'concept-name': concept?.name ?? '',
      name: nameV,
      email: emailV,
      phone: String(data.get('phone') ?? ''),
      notes: String(data.get('notes') ?? ''),
    };
    Object.entries(fields).forEach(([k, v]) => {
      const input = document.createElement('input');
      input.name = k;
      input.value = v;
      payload.appendChild(input);
    });

    if (__ARTIFACT__ || report.sample) {
      status.textContent = 'Preview only: on the live site this choice is sent to the studio with a link to this report.';
      return;
    }
    send.disabled = true;
    status.textContent = 'Sending…';
    try {
      await submitToNetlify(encodeForm(payload));
      status.textContent = `Sent. Concept ${conceptId} it is. We’ll be in touch shortly.`;
      setTimeout(() => dialog.close(), 2200);
    } catch {
      status.textContent = 'That didn’t send. Please try again, or email the studio directly.';
    } finally {
      send.disabled = false;
    }
  });
}

/* ---------- loading ---------- */

async function load(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const id = params.get('id') ?? (__ARTIFACT__ ? 'sample' : '');
  const state = document.querySelector<HTMLElement>('[data-rp-state]')!;
  const msg = document.querySelector<HTMLElement>('[data-rp-msg]')!;
  const bar = document.querySelector<HTMLElement>('[data-rp-progress]')!;

  const show = (report: Report) => {
    state.classList.add('is-hidden');
    render(report);
    initChoice(report);
    const printBtn = document.querySelector<HTMLButtonElement>('[data-rp-print]')!;
    printBtn.disabled = false;
    printBtn.addEventListener('click', () => {
      if (__ARTIFACT__) {
        msg.textContent = '';
        alertInline('PDF export works on the live site: it opens your browser’s print dialog, where you choose “Save as PDF”.');
        return;
      }
      window.print();
    });
  };

  if (!id) {
    msg.textContent = 'No report selected. Open one from the lab.';
    return;
  }

  if (id === 'sample') {
    // Relative, so it resolves on the live site (/lab/report/) and inside the artifact preview.
    const res = await fetch(new URL('../sample-report.json', location.href)).catch(() => null);
    if (!res || !res.ok) {
      msg.textContent = 'The sample report isn’t available yet.';
      return;
    }
    show((await res.json()) as Report);
    return;
  }

  bar.hidden = false;
  for (;;) {
    const res = await fetch(`/api/lab/status?id=${encodeURIComponent(id)}`).catch(() => null);
    if (!res) {
      msg.textContent = 'Can’t reach the server. Retrying…';
    } else if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      msg.textContent = err.error ?? 'This report couldn’t be loaded.';
      return;
    } else {
      const job = (await res.json()) as JobStatus;
      if (job.status === 'done' && job.report) {
        show(job.report);
        return;
      }
      if (job.status === 'error') {
        msg.textContent = job.error ?? 'This report failed to generate.';
        bar.hidden = true;
        return;
      }
      msg.textContent = `${job.message}…`;
      bar.style.setProperty('--p', `${job.progress}%`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

function alertInline(text: string): void {
  let note = document.querySelector<HTMLElement>('.rp-note');
  if (!note) {
    note = document.createElement('p');
    note.className = 'rp-note';
    note.setAttribute('role', 'status');
    document.querySelector('.rp-bar')!.after(note);
  }
  note.textContent = text;
}

export default function initReport(): void {
  window.addEventListener('resize', fit);
  document.querySelector('[data-rp-copy]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(location.href);
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'Copy failed';
    }
    setTimeout(() => (btn.textContent = 'Copy link'), 1800);
  });
  load();
}

initReport();
