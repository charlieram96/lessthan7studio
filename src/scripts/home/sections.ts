import { gsap, ScrollTrigger, reducedMotion } from '../core';

export function initSections(): void {
  const rm = reducedMotion();
  initTypeViz(rm);
  initRings(rm);
  initSerp(rm);
  initProcess(rm);
  initMarquee(rm);
}

/** Archivo's width axis follows the scroll: condensed to expanded and back. */
function initTypeViz(rm: boolean) {
  const viz = document.querySelector<HTMLElement>('[data-viz-type]');
  if (!viz) return;
  const label = viz.querySelector<HTMLElement>('[data-viz-width]');
  const set = (w: number) => {
    viz.style.setProperty('--viz-stretch', `${w.toFixed(0)}%`);
    if (label) label.textContent = w.toFixed(0);
  };
  if (rm) {
    set(100);
    return;
  }
  const state = { w: 62 };
  gsap.to(state, {
    w: 125,
    ease: 'sine.inOut',
    onUpdate: () => set(state.w),
    scrollTrigger: { trigger: viz, start: 'top 85%', end: 'bottom 15%', scrub: 0.6 },
  });
}

function initRings(rm: boolean) {
  const box = document.querySelector<HTMLElement>('[data-viz-rings]');
  if (!box) return;
  const rings = Array.from(box.querySelectorAll<HTMLElement>('.ring'));
  const run = () => {
    rings.forEach((ring, i) => {
      const value = Number(ring.dataset.value || 0);
      const bar = ring.querySelector<SVGCircleElement>('.ring__bar')!;
      const num = ring.querySelector<HTMLElement>('.ring__num')!;
      const c = Number(bar.dataset.circ);
      const o = { v: 0 };
      gsap.to(o, {
        v: value,
        duration: rm ? 0 : 1.6,
        delay: rm ? 0 : i * 0.12,
        ease: 'power3.out',
        onUpdate: () => {
          num.textContent = String(Math.round(o.v));
          bar.style.strokeDashoffset = String(c * (1 - o.v / 100));
        },
      });
    });
  };
  ScrollTrigger.create({ trigger: box, start: 'top 80%', once: true, onEnter: run });
}

function initSerp(rm: boolean) {
  const box = document.querySelector<HTMLElement>('[data-viz-serp]');
  if (!box) return;
  const q = box.querySelector<HTMLElement>('[data-serp-query]')!;
  const result = box.querySelector<HTMLElement>('[data-serp-result]')!;
  const text = q.dataset.text || '';
  if (rm) {
    q.textContent = text;
    return;
  }
  gsap.set(result, { opacity: 0, y: 14 });
  const run = () => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      q.textContent = text.slice(0, i);
      if (i >= text.length) {
        window.clearInterval(id);
        gsap.to(result, { opacity: 1, y: 0, duration: 0.9, delay: 0.25, ease: 'expo.out' });
      }
    }, 55);
  };
  ScrollTrigger.create({ trigger: box, start: 'top 75%', once: true, onEnter: run });
}

function initProcess(rm: boolean) {
  const section = document.querySelector<HTMLElement>('[data-process]');
  if (!section) return;
  const rail = section.querySelector<HTMLElement>('[data-process-rail]');
  const steps = Array.from(section.querySelectorAll<HTMLElement>('[data-step]'));
  const list = section.querySelector<HTMLElement>('.process__steps');
  if (rail && list) {
    if (rm) rail.style.transform = 'scaleY(1)';
    else
      gsap.to(rail, {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: { trigger: list, start: 'top 60%', end: 'bottom 60%', scrub: 0.5 },
      });
  }
  steps.forEach((step) => {
    ScrollTrigger.create({
      trigger: step,
      start: 'top 62%',
      end: 'bottom 62%',
      toggleClass: { targets: step, className: 'is-active' },
    });
  });
}

/** Industries drift past; scrolling speeds them up and sets their direction. */
function initMarquee(rm: boolean) {
  const row = document.querySelector<HTMLElement>('[data-marquee-row]');
  if (!row || rm) return;
  const set = row.firstElementChild as HTMLElement;
  let x = 0;
  let dir = -1;
  let boost = 0;
  let visible = false;

  ScrollTrigger.create({
    trigger: row,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => (visible = self.isActive),
    onUpdate: (self) => {
      dir = self.direction === 1 ? -1 : 1;
      boost = Math.min(10, Math.abs(self.getVelocity()) / 220);
    },
  });

  gsap.ticker.add((_t, delta) => {
    if (!visible) return;
    const w = set.offsetWidth;
    boost *= 0.94;
    x += dir * (0.045 + boost * 0.12) * delta;
    if (x <= -w) x += w;
    if (x > 0) x -= w;
    row.style.transform = `translate3d(${x}px,0,0)`;
  });
}
