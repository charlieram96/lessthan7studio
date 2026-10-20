#!/usr/bin/env node
/**
 * Turns the ARTIFACT=1 build (dist-artifact/) into a self-contained preview (artifact/):
 * absolute links become relative, the root page loses its document wrapper (the
 * artifact host adds its own), and files the preview never uses are left out.
 */
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'dist-artifact');
const out = path.join(root, 'artifact');

const SKIP = [/^og\//, /^brand\//, /^sitemap.*\.xml$/, /^robots\.txt$/, /^icon-\d+\.png$/, /^apple-touch-icon\.png$/, /^favicon\.ico$/, /^404\.html$/];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])),
  );
  return files.flat();
}

const exists = async (p) => !!(await stat(p).catch(() => null));

async function mapUrl(url, fromFile) {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const m = url.match(/^([^?#]*)(.*)$/);
  let target = m[1];
  const suffix = m[2];
  if (target.endsWith('/')) target += 'index.html';
  else if (!path.extname(target) && (await exists(path.join(out, target, 'index.html')))) target += '/index.html';
  let rel = path.relative(path.dirname(fromFile), path.join(out, target));
  if (!rel) rel = path.basename(target);
  return rel.split(path.sep).join('/') + suffix;
}

async function rewriteHtml(html, file) {
  const attr = /\s(href|src|action|poster|data-preview)="([^"]*)"/g;
  const parts = [];
  let last = 0;
  for (const m of html.matchAll(attr)) {
    parts.push(html.slice(last, m.index));
    parts.push(` ${m[1]}="${await mapUrl(m[2], file)}"`);
    last = m.index + m[0].length;
  }
  parts.push(html.slice(last));
  let next = parts.join('');

  // srcset="a 960w, b 1920w"
  const srcsets = [...next.matchAll(/\ssrcset="([^"]*)"/g)];
  for (const m of srcsets) {
    const mapped = await Promise.all(
      m[1].split(',').map(async (part) => {
        const [u, d] = part.trim().split(/\s+/);
        return `${await mapUrl(u, file)}${d ? ` ${d}` : ''}`;
      }),
    );
    next = next.replace(m[0], ` srcset="${mapped.join(', ')}"`);
  }

  // url(/...) inside inline <style> and style="" attributes
  const urls = [...next.matchAll(/url\((["']?)(\/[^)"']+)\1\)/g)];
  for (const m of urls) next = next.replace(m[0], `url(${m[1]}${await mapUrl(m[2], file)}${m[1]})`);

  next = next.replace(/<link rel="sitemap"[^>]*>/g, '');
  return next;
}

function unwrapRoot(html) {
  // The artifact host wraps the main page in its own <!doctype><html><head><body>.
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const bodyClass = html.match(/<body[^>]*class="([^"]*)"/i)?.[1];
  const keepHead = head.replace(/<meta charset[^>]*>/i, '').replace(/<meta name="viewport"[^>]*>/i, '');
  const classScript = bodyClass ? `<script>document.body.className=${JSON.stringify(bodyClass)}</script>` : '';
  return `${keepHead}\n${body}\n${classScript}`;
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(src, out, { recursive: true });

const all = await walk(out);
for (const file of all) {
  const rel = path.relative(out, file).split(path.sep).join('/');
  if (SKIP.some((re) => re.test(rel))) {
    await rm(file);
    continue;
  }
  if (file.endsWith('.html')) {
    let html = await rewriteHtml(await readFile(file, 'utf8'), file);
    if (rel === 'index.html') html = unwrapRoot(html);
    await writeFile(file, html);
  } else if (file.endsWith('.css')) {
    let css = await readFile(file, 'utf8');
    css = css.replace(/url\((["']?)\/_astro\/([^)"']+)\1\)/g, 'url($1./$2$1)');
    await writeFile(file, css);
  } else if (file.endsWith('.js')) {
    // Vite's preload helper resolves dependencies against "/"; make it page-relative.
    let js = await readFile(file, 'utf8');
    js = js.replace(/(["'`])\/_astro\//g, '$1./_astro/');
    await writeFile(file, js);
  }
}

const files = (await walk(out)).map((f) => path.relative(out, f).split(path.sep).join('/')).filter((f) => f !== 'index.html');
const sizes = await Promise.all(files.map(async (f) => (await stat(path.join(out, f))).size));
const total = sizes.reduce((a, b) => a + b, 0);
await writeFile(path.join(root, 'artifact-files.json'), JSON.stringify(Object.fromEntries(files.map((f) => [f, `artifact/${f}`])), null, 2));
console.log(`artifact/: ${files.length + 1} files, ${(total / 1024 / 1024).toFixed(1)} MB (+ index.html)`);
