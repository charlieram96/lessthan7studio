import { gsap, finePointer, reducedMotion } from './core';

export function initCursor(): void {
  const el = document.querySelector<HTMLElement>('[data-cursor-el]');
  if (!el || !finePointer()) return;

  const dot = el.querySelector<HTMLElement>('.cursor__dot')!;
  const frame = el.querySelector<HTMLElement>('.cursor__frame')!;
  const label = el.querySelector<HTMLElement>('[data-cursor-label]')!;
  const root = document.documentElement;

  const dotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3' });
  const dotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3' });
  const frameX = gsap.quickTo(frame, 'x', { duration: reducedMotion() ? 0.05 : 0.45, ease: 'power3' });
  const frameY = gsap.quickTo(frame, 'y', { duration: reducedMotion() ? 0.05 : 0.45, ease: 'power3' });

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      root.classList.add('has-cursor');
      dotX(e.clientX);
      dotY(e.clientY);
      frameX(e.clientX);
      frameY(e.clientY);
    },
    { passive: true },
  );

  document.addEventListener('pointerleave', () => root.classList.remove('has-cursor'));

  document.addEventListener('pointerover', (e) => {
    const target = e.target as HTMLElement;
    const view = target.closest<HTMLElement>('[data-cursor]');
    const interactive = target.closest('a, button, [role="button"], input, textarea, select, label');
    el.classList.toggle('is-view', !!view);
    el.classList.toggle('is-link', !view && !!interactive);
    label.textContent = view ? (view.dataset.cursor === 'mail' ? 'Write' : view.dataset.cursor || 'View') : '';
  });
}

export function initMagnetic(): void {
  if (!finePointer() || reducedMotion()) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic || '0.3');
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}
