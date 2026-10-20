import { startSmoothScroll, markIntroDone, ScrollTrigger } from './core';
import { initHeader, initMenu } from './header';
import { initCursor, initMagnetic } from './cursor';
import { initReveals } from './reveal';
import { initFooter } from './footer';

declare global {
  interface Window {
    __lt7?: boolean;
    dataLayer?: unknown[];
  }
}

window.__lt7 = true;

startSmoothScroll();
initHeader();
initMenu();
initCursor();
initMagnetic();
initReveals();
initFooter();

// Page modules load only where they are needed.
const loaders: Array<[string, () => Promise<{ default: () => void }>]> = [
  ['[data-loader]', () => import('./loader')],
  ['[data-home]', () => import('./home')],
  ['[data-work-index]', () => import('./work-index')],
  ['[data-case]', () => import('./case')],
  ['[data-forms]', () => import('./forms')],
  ['[data-lab]', () => import('./lab')],
];

const pending: Promise<unknown>[] = [];
for (const [selector, load] of loaders) {
  if (document.querySelector(selector)) {
    pending.push(load().then((m) => m.default()));
  }
}

const intro = document.querySelector('[data-loader]');
if (!intro || document.documentElement.classList.contains('no-intro')) {
  markIntroDone();
}

Promise.allSettled(pending).then(() => {
  ScrollTrigger.refresh();
});

// Fonts can shift layout slightly; re-measure pinned scenes once they are in.
document.fonts?.ready.then(() => ScrollTrigger.refresh());

// Google Ads tag from the previous site, deferred until the browser is idle.
if (!__ARTIFACT__ && /(^|\.)lessthan7\.studio$/.test(location.hostname)) {
  const loadTag = () => {
    const id = 'AW-10804969083';
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    // gtag.js reads the native `arguments` object, not an array.
    function gtag(..._args: unknown[]) {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    }
    gtag('js', new Date());
    gtag('config', id);
  };
  const idle = (cb: () => void) =>
    'requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 6000 }) : setTimeout(cb, 4000);
  window.addEventListener('load', () => idle(loadTag), { once: true });
}
