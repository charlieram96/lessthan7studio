import { gsap, ScrollTrigger, finePointer, reducedMotion } from './core';

export default function initWorkIndex(): void {
  const root = document.querySelector<HTMLElement>('[data-work-index]');
  if (!root) return;

  // Filters
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-filter]'));
  const items = Array.from(root.querySelectorAll<HTMLElement>('.wi__item'));
  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter!;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      items.forEach((it) => {
        it.hidden = f !== 'all' && it.dataset.group !== f;
      });
      ScrollTrigger.refresh();
    }),
  );

  // Cursor-following preview of each project's homepage
  const preview = root.querySelector<HTMLElement>('[data-wi-preview]');
  const previewImg = root.querySelector<HTMLImageElement>('[data-wi-preview-img]');
  if (!preview || !previewImg || !finePointer()) return;

  const xTo = gsap.quickTo(preview, 'x', { duration: reducedMotion() ? 0.01 : 0.55, ease: 'power3' });
  const yTo = gsap.quickTo(preview, 'y', { duration: reducedMotion() ? 0.01 : 0.55, ease: 'power3' });
  let current = '';

  root.addEventListener('pointermove', (e) => {
    const w = preview.offsetWidth;
    const h = preview.offsetHeight;
    xTo(Math.min(window.innerWidth - w - 16, e.clientX + 24));
    yTo(Math.min(window.innerHeight - h - 16, Math.max(16, e.clientY - h / 2)));
  });

  root.querySelectorAll<HTMLAnchorElement>('[data-preview]').forEach((row) => {
    row.addEventListener('pointerenter', () => {
      const src = row.dataset.preview!;
      if (src !== current) {
        previewImg.src = src;
        current = src;
      }
      gsap.to(preview, { opacity: 1, scale: 1, rotate: -2, duration: 0.45, ease: 'expo.out', overwrite: 'auto' });
    });
    row.addEventListener('pointerleave', () => {
      gsap.to(preview, { opacity: 0, scale: 0.85, rotate: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
    });
  });
}
