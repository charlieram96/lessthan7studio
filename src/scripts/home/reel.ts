import { gsap, ScrollTrigger, reducedMotion } from '../core';

export function initReel(): void {
  const reel = document.querySelector<HTMLElement>('[data-reel]');
  if (!reel || reducedMotion()) return;

  const track = reel.querySelector<HTMLElement>('[data-reel-track]')!;
  const cards = Array.from(reel.querySelectorAll<HTMLElement>('.card'));
  if (!cards.length) return;
  const imgs = Array.from(reel.querySelectorAll<HTMLElement>('[data-reel-img]'));
  const progress = reel.querySelector<HTMLElement>('[data-reel-progress]')!;

  reel.classList.add('is-pinned');

  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    onUpdate: () => drift(),
  });

  // Each screenshot drifts against the track for depth: +4% as its card enters on the right,
  // -4% as it leaves on the left. Offsets are measured on refresh, so frames only do arithmetic.
  const shots = imgs.map((im) => ({
    set: gsap.quickSetter(im, 'xPercent') as (value: number) => void,
    item: im.closest<HTMLElement>('.reel__item')!,
    left: 0,
    width: 0,
  }));
  let origin = 0;
  const measureShots = () => {
    const trackLeft = track.getBoundingClientRect().left;
    origin = trackLeft - (gsap.getProperty(track, 'x') as number);
    shots.forEach((s) => {
      const r = s.item.getBoundingClientRect();
      s.left = r.left - trackLeft;
      s.width = r.width;
    });
  };
  const drift = () => {
    const x = gsap.getProperty(track, 'x') as number;
    const vw = window.innerWidth;
    for (const s of shots) s.set(4 - 8 * gsap.utils.clamp(0, 1, (vw - (origin + x + s.left)) / (vw + s.width)));
  };

  const skewTo = gsap.quickTo(cards, 'skewX', { duration: 0.5, ease: 'power3' });

  ScrollTrigger.create({
    trigger: reel,
    start: 'top top',
    end: () => `+=${distance()}`,
    pin: true,
    // Pins refresh first so triggers further down measure the added scroll distance.
    refreshPriority: 1,
    anticipatePin: 1,
    scrub: 0.6,
    animation: tween,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      progress.style.transform = `scaleX(${self.progress})`;
      const v = gsap.utils.clamp(-7, 7, self.getVelocity() / -320);
      skewTo(v);
    },
    onScrubComplete: () => skewTo(0),
    onRefresh: () => {
      measureShots();
      drift();
    },
  });

  measureShots();
  drift();
}
