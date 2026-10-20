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
  });

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
  });

  // Each screenshot drifts against the track for depth.
  imgs.forEach((im) => {
    gsap.fromTo(
      im,
      { xPercent: 4 },
      {
        xPercent: -4,
        ease: 'none',
        scrollTrigger: {
          trigger: im.closest('.reel__item') as Element,
          containerAnimation: tween,
          start: 'left right',
          end: 'right left',
          scrub: true,
        },
      },
    );
  });
}
