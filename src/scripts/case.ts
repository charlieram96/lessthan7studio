import { gsap, ScrollTrigger, reducedMotion } from './core';

export default function initCase(): void {
  const root = document.querySelector<HTMLElement>('[data-case]');
  if (!root) return;
  const rm = reducedMotion();

  // Before / after: a range input drives the split, so it works with keyboard and touch.
  root.querySelectorAll<HTMLElement>('[data-ba]').forEach((ba) => {
    const range = ba.querySelector<HTMLInputElement>('[data-ba-range]')!;
    const set = () => ba.style.setProperty('--pos', `${range.value}%`);
    range.addEventListener('input', set);
    set();
    if (!rm) {
      // A first nudge shows that it moves.
      ScrollTrigger.create({
        trigger: ba,
        start: 'top 70%',
        once: true,
        onEnter: () => {
          const o = { v: 50 };
          gsap
            .timeline()
            .to(o, { v: 28, duration: 0.9, ease: 'power3.inOut', onUpdate: () => ((range.value = String(o.v)), set()) })
            .to(o, { v: 62, duration: 1.1, ease: 'power3.inOut', onUpdate: () => ((range.value = String(o.v)), set()) })
            .to(o, { v: 50, duration: 0.8, ease: 'power3.inOut', onUpdate: () => ((range.value = String(o.v)), set()) });
        },
      });
    }
  });

  if (rm) return;

  // Hero screenshot settles in as you start scrolling.
  const shot = root.querySelector<HTMLElement>('[data-cs-hero-shot]');
  if (shot) {
    gsap.fromTo(
      shot,
      { scale: 0.94, y: 40 },
      { scale: 1, y: 0, ease: 'none', scrollTrigger: { trigger: shot, start: 'top bottom', end: 'top 30%', scrub: 0.6 } },
    );
  }

  // Scroll-through: the full-page screenshot scrolls inside the browser frame.
  const scroll = root.querySelector<HTMLElement>('[data-cs-scroll]');
  const full = root.querySelector<HTMLImageElement>('[data-cs-full]');
  if (scroll && full) {
    const view = full.parentElement as HTMLElement;
    const travel = () => Math.max(0, full.getBoundingClientRect().height - view.clientHeight);
    gsap.to(full, {
      y: () => -travel(),
      ease: 'none',
      scrollTrigger: { trigger: scroll, start: 'top top', end: 'bottom bottom', scrub: 0.4, invalidateOnRefresh: true },
    });
    if (!full.complete) full.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }

  // The second phone scrolls its page while the section passes.
  root.querySelectorAll<HTMLElement>('[data-phone-scroll]').forEach((phone) => {
    const track = phone.querySelector<HTMLElement>('.phone__track')!;
    const img = track.querySelector<HTMLImageElement>('img')!;
    const travel = () => Math.max(0, img.getBoundingClientRect().height - track.clientHeight);
    gsap.to(img, {
      y: () => -travel(),
      ease: 'none',
      scrollTrigger: { trigger: phone, start: 'top 85%', end: 'bottom 15%', scrub: 0.5, invalidateOnRefresh: true },
    });
    if (!img.complete) img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  });

  // Lighthouse rings fill from zero.
  root.querySelectorAll<HTMLElement>('[data-lh-ring]').forEach((ring) => {
    const bar = ring.querySelector<SVGCircleElement>('.lh__bar')!;
    const num = ring.querySelector<HTMLElement>('b')!;
    const target = Number(ring.dataset.value);
    const c = Number(bar.getAttribute('stroke-dasharray'));
    bar.style.strokeDashoffset = String(c);
    num.textContent = '0';
    ScrollTrigger.create({
      trigger: ring,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, {
          v: target,
          duration: 1.6,
          ease: 'power3.out',
          onUpdate: () => {
            num.textContent = String(Math.round(o.v));
            bar.style.strokeDashoffset = String(c * (1 - o.v / 100));
          },
        });
      },
    });
  });
}
