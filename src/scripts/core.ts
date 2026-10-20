import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export const reducedMotion = (): boolean =>
  document.documentElement.classList.contains('reduced-motion');

export const finePointer = (): boolean =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let lenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenis;
}

export function startSmoothScroll(): void {
  if (reducedMotion() || lenis) return;
  lenis = new Lenis({ lerp: 0.105, smoothWheel: true, wheelMultiplier: 0.95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function lockScroll(locked: boolean): void {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  } else {
    document.documentElement.style.overflow = locked ? 'hidden' : '';
  }
}

export function scrollToTarget(target: string | HTMLElement, offset = 0): void {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4 });
  else el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/* ---------- Intro handshake ---------- */
let introDone = false;
const introCallbacks: Array<() => void> = [];

export function onIntroDone(cb: () => void): void {
  if (introDone) cb();
  else introCallbacks.push(cb);
}

export function markIntroDone(): void {
  if (introDone) return;
  introDone = true;
  document.documentElement.classList.remove('is-loading');
  introCallbacks.splice(0).forEach((cb) => cb());
  window.dispatchEvent(new CustomEvent('lt7:intro-done'));
}

/** Seconds since navigation start until the load event (or now, if still loading). */
export function loadSeconds(): number | null {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav && nav.loadEventStart > 0) return nav.loadEventStart / 1000;
  return null;
}

export function whenLoaded(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
}

export function formatSeconds(s: number): string {
  return s < 10 ? s.toFixed(2) : s.toFixed(1);
}
