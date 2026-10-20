#!/usr/bin/env node
/**
 * Renders brand assets and 1200×630 Open Graph images with Chromium.
 *
 *   npm run og                 # everything
 *   npm run og -- marketink    # one project's OG image
 *
 * Chromium: set CHROME_PATH, or install with `npx playwright install chromium`.
 */
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const only = process.argv.slice(2);

const { PROJECTS } = await import(path.join(root, 'src/data/projects.ts'));

const font = async (file) => (await readFile(path.join(root, 'src/assets/fonts', file))).toString('base64');
const archivo = await font('archivo-var.woff2');
const instrument = await font('instrument-sans-var.woff2');

const MARK = (fill, extra = '') => `
  <g transform="rotate(31.7175 50 50)" fill="${fill}" ${extra}>
    <polygon points="0,20 20,20 20,80 60,80 60,100 0,100"/>
    <polygon points="100,80 80,80 80,20 40,20 40,0 100,0"/>
  </g>`;
const SUN = (id) => `
  <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="100" y2="0">
    <stop offset="0" stop-color="#ff8a1e"/><stop offset=".38" stop-color="#ff4a3a"/>
    <stop offset=".7" stop-color="#f02c6e"/><stop offset="1" stop-color="#c8238f"/>
  </linearGradient>`;

const css = `
  @font-face{font-family:Archivo;src:url(data:font/woff2;base64,${archivo}) format('woff2');font-weight:100 900;font-stretch:62% 125%}
  @font-face{font-family:Instrument;src:url(data:font/woff2;base64,${instrument}) format('woff2');font-weight:400 700}
  *{box-sizing:border-box;margin:0}
  body{width:1200px;height:630px;overflow:hidden;background:#0d0b14;color:#f3f1f7;font-family:Instrument}
  .glow{position:absolute;inset:0;background:radial-gradient(48% 60% at 80% 46%,rgba(255,90,46,.34),transparent 70%),radial-gradient(40% 50% at 95% 80%,rgba(214,38,143,.3),transparent 70%)}
  .brand{position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:12px;font:720 30px/1 Archivo;font-stretch:112%;letter-spacing:-.04em}
  .brand svg{width:44px}
  .seven{background:linear-gradient(100deg,#ff8a1e,#ff4a3a 40%,#f02c6e 70%,#c8238f);-webkit-background-clip:text;color:transparent}
  h1{position:absolute;left:64px;bottom:120px;width:720px;font:850 84px/.93 Archivo;font-stretch:125%;letter-spacing:-.045em}
  .sub{position:absolute;left:64px;bottom:60px;font-size:24px;color:#a39cb5}
  .eyebrow{position:absolute;left:64px;top:150px;font-size:18px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#a39cb5}
  .mark{position:absolute;right:-40px;top:70px;width:560px}
  .shot{position:absolute;right:-30px;top:96px;width:640px;border-radius:6px;overflow:hidden;box-shadow:0 0 0 1px rgba(243,241,247,.12),0 40px 80px -20px rgba(0,0,0,.8);transform:rotate(-4deg)}
  .shot .bar{height:28px;background:#1c1826;display:flex;gap:6px;align-items:center;padding:0 12px}
  .shot .bar i{width:8px;height:8px;border-radius:50%;background:rgba(243,241,247,.2)}
  .shot img{display:block;width:100%}
`;

const brandBlock = `<div class="brand"><svg viewBox="-19 -2 138 104"><defs>${SUN('b')}</defs>${MARK('url(#b)')}</svg><span>lessthan<span class="seven">7</span></span></div>`;

function pageOg({ eyebrow, title, sub }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
    <div class="glow"></div>
    <svg class="mark" viewBox="-19 -2 138 104"><defs>${SUN('m')}</defs>${MARK('url(#m)')}</svg>
    ${brandBlock}
    ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
    <h1>${title}</h1>
    <p class="sub">${sub}</p>
  </body></html>`;
}

async function projectOg(p) {
  const file = path.join(pub, 'work', p.slug, 'hero-960.webp');
  const img = existsSync(file) ? (await readFile(file)).toString('base64') : null;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}
    h1{width:560px;font-size:${p.name.length > 18 ? 58 : 70}px}
    .glow{background:radial-gradient(50% 70% at 85% 50%,${p.accent}55,transparent 70%)}
  </style></head><body>
    <div class="glow"></div>
    ${img ? `<div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="data:image/webp;base64,${img}"></div>` : ''}
    ${brandBlock}
    <p class="eyebrow">Case study · ${p.industry}</p>
    <h1>${p.name}</h1>
    <p class="sub">${p.displayUrl}</p>
  </body></html>`;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined),
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

async function render(html, { width = 1200, height = 630, transparent = false } = {}) {
  await page.setViewportSize({ width, height });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return page.screenshot({ omitBackground: transparent, type: 'png' });
}

async function save(buf, out) {
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, buf);
}

if (!only.length) {
  // Favicon (SVG) and the mark as a standalone file
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-19 -19 138 138"><defs>${SUN('f')}</defs>${MARK('url(#f)')}</svg>\n`;
  await writeFile(path.join(pub, 'favicon.svg'), svg);
  await mkdir(path.join(pub, 'brand'), { recursive: true });
  await writeFile(path.join(pub, 'brand', 'lessthan7-mark.svg'), svg);

  // App icon: the mark on ink, full bleed (platforms round the corners)
  const icon = (size, pad) => `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px;background:#0d0b14;display:grid;place-items:center}
    body::before{content:'';position:fixed;inset:0;background:radial-gradient(60% 60% at 50% 45%,rgba(255,74,58,.28),transparent 70%)}
    svg{position:relative;width:${size - pad * 2}px}</style></head><body>
    <svg viewBox="-19 -2 138 104"><defs>${SUN('a')}</defs>${MARK('url(#a)')}</svg></body></html>`;
  const i512 = await render(icon(512, 70), { width: 512, height: 512 });
  await save(i512, path.join(pub, 'icon-512.png'));
  await sharp(i512).resize(192, 192).png().toFile(path.join(pub, 'icon-192.png'));
  await sharp(i512).resize(180, 180).png().toFile(path.join(pub, 'apple-touch-icon.png'));

  // Transparent mark for schema.org logo
  const logo = await render(
    `<!doctype html><html><head><style>*{margin:0}body{width:512px;height:512px;display:grid;place-items:center;background:transparent}svg{width:470px}</style></head><body><svg viewBox="-19 -2 138 104"><defs>${SUN('l')}</defs>${MARK('url(#l)')}</svg></body></html>`,
    { width: 512, height: 512, transparent: true },
  );
  await save(logo, path.join(pub, 'brand', 'lessthan7-mark-512.png'));

  // favicon.ico: a 32×32 PNG inside an ICO container
  const png32 = await sharp(i512).resize(32, 32).png().toBuffer();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(32, 6);
  header.writeUInt8(32, 7);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png32.length, 14);
  header.writeUInt32LE(22, 18);
  await writeFile(path.join(pub, 'favicon.ico'), Buffer.concat([header, png32]));

  const pages = [
    ['default', { title: 'Make the first seven seconds count.', sub: 'Design, development and SEO from Miami' }],
    ['work', { eyebrow: 'Selected work', title: 'Recent first impressions.', sub: 'Case studies · lessthan7.studio/work' }],
    ['services', { eyebrow: 'Services', title: 'Design. Development. Search.', sub: 'lessthan7.studio/services' }],
    ['studio', { eyebrow: 'The studio', title: 'Obsessed with the details.', sub: 'lessthan7.studio/studio' }],
    ['contact', { eyebrow: 'Contact', title: 'Let’s make your first impression.', sub: 'hello@lessthan7.studio' }],
  ];
  for (const [name, opts] of pages) {
    const buf = await render(pageOg(opts));
    await save(await sharp(buf).png({ compressionLevel: 9 }).toBuffer(), path.join(pub, 'og', `${name}.png`));
  }
}

for (const p of PROJECTS) {
  if (only.length && !only.includes(p.slug)) continue;
  const buf = await render(await projectOg(p));
  await save(await sharp(buf).jpeg({ quality: 86, mozjpeg: true }).toBuffer(), path.join(pub, 'og', `work-${p.slug}.jpg`));
}

await browser.close();
console.log('OG images and brand assets written to public/');
