import { gsap, ScrollTrigger, reducedMotion } from './core';

/**
 * [data-reveal]            fades/lifts in when it enters the viewport
 * [data-reveal-group]      children with [data-reveal] stagger together
 * [data-split-line]        a line inside .line-mask slides up from below
 */
export function initReveals(): void {
  const rm = reducedMotion();

  const lines = gsap.utils.toArray<HTMLElement>('[data-split-line]');
  if (lines.length && !rm) {
    // GSAP reads the CSS starting transform into `y`; zero it so only yPercent moves the line.
    gsap.set(lines, { y: 0, yPercent: 105 });
    ScrollTrigger.batch(lines, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { y: 0, yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
    });
  }

  const items = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  if (!items.length) return;
  if (rm) {
    gsap.set(items, { opacity: 1, y: 0 });
    return;
  }

  ScrollTrigger.batch(items, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'expo.out',
        stagger: 0.07,
        overwrite: true,
      }),
  });
}
