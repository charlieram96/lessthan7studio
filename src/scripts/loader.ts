import { gsap, formatSeconds, loadSeconds, lockScroll, markIntroDone, whenLoaded } from './core';
import { LEAN } from '../config';

const MAX_WAIT = 4.5; // seconds before we let people in, loaded or not

export default function initLoader(): void {
  const root = document.documentElement;
  const loader = document.querySelector<HTMLElement>('[data-loader]');
  if (!loader) return;
  if (root.classList.contains('no-intro')) {
    loader.remove();
    return;
  }

  lockScroll(true);

  const q = <T extends Element = HTMLElement>(sel: string) => loader.querySelector<T>(sel)!;
  const qa = <T extends Element = Element>(sel: string) => Array.from(loader.querySelectorAll<T>(sel));

  const num = q('[data-loader-num]');
  const caption = q('[data-loader-caption]');
  const rot = q<SVGGElement>('[data-loader-rot]');
  const art = q<SVGSVGElement>('.loader__art');
  const gridGroup = q<SVGGElement>('.loader__grid');
  const gridLines = qa<SVGPathElement>('.loader__grid path');
  const cells = qa<SVGRectElement>('.loader__cell');
  const cellsL = cells.filter((c) => c.dataset.piece === 'l');
  const cells7 = cells.filter((c) => c.dataset.piece === '7');
  const pieces = q<SVGGElement>('.loader__pieces');
  const pl = q<SVGPolygonElement>('.loader__l');
  const p7 = q<SVGPolygonElement>('.loader__7');
  const arc = q<SVGPathElement>('.loader__arc');
  const base = q<SVGPathElement>('.loader__base');
  const deg = q<SVGTextElement>('.loader__deg');
  const glow = q('.loader__glow');
  const clock = q('.loader__clock');
  const brand = q('.loader__brand');
  const skip = q<HTMLButtonElement>('[data-loader-skip]');
  const panels = qa<HTMLElement>('.loader__panel');

  /* ---------- The stopwatch ----------
   * While the page loads it runs in slow motion (a quarter of real time), so it always
   * stays below the real load time; once `load` fires it eases onto the measured value. */
  let frozen = false;
  let raf = 0;
  const shown = { v: 0 };
  const tick = () => {
    if (frozen) return;
    shown.v = (performance.now() / 1000) * 0.25;
    num.textContent = formatSeconds(shown.v);
    raf = requestAnimationFrame(tick);
  };
  tick();

  const freeze = (seconds: number, done: boolean) => {
    frozen = true;
    cancelAnimationFrame(raf);
    gsap.to(shown, {
      v: seconds,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => {
        num.textContent = formatSeconds(shown.v);
      },
    });
    caption.innerHTML = !done
      ? 'Still loading. <b>Come on in.</b>'
      : seconds < 7
        ? `Loaded in <b>${formatSeconds(seconds)} seconds.</b><br>Less than 7.`
        : `That took <b>${formatSeconds(seconds)}s</b>.<br>Your network, not our code.`;
    gsap.fromTo(caption, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
    gsap.fromTo(num, { opacity: 0.4 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
  };

  const loaded = whenLoaded()
    .then(() => new Promise<void>((r) => setTimeout(r, 0)))
    .then(() => freeze(loadSeconds() ?? performance.now() / 1000, true));

  /* ---------- Construction ---------- */
  gsap.set(cells, { opacity: 1, scale: 0, transformOrigin: '50% 50%' });
  const angle = { v: 0 };
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to(glow, { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0)
    .to(gridLines, { strokeDashoffset: 0, duration: 0.7, stagger: 0.03, ease: 'power3.inOut' }, 0)
    .to(cellsL, { scale: 1, duration: 0.42, stagger: 0.055, ease: 'back.out(2.2)' }, 0.22)
    .to(cells7, { scale: 1, duration: 0.42, stagger: 0.055, ease: 'back.out(2.2)' }, 0.22)
    .to([base, deg], { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.8)
    .to(rot, { rotation: LEAN, svgOrigin: '50 50', duration: 0.95, ease: 'power3.inOut' }, 0.86)
    .to(arc, { strokeDashoffset: 0, duration: 0.95, ease: 'power3.inOut' }, 0.86)
    .to(
      angle,
      {
        v: LEAN,
        duration: 0.95,
        ease: 'power3.inOut',
        onUpdate: () => {
          deg.textContent = `${angle.v.toFixed(1)}°`;
        },
      },
      0.86,
    )
    .to(pieces, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 1.72)
    .to(cells, { opacity: 0, duration: 0.25, ease: 'none' }, 1.85)
    .to(gridGroup, { opacity: 0, duration: 0.45, ease: 'power2.out' }, 1.8)
    .to([arc, base, deg], { opacity: 0, duration: 0.35, ease: 'power2.out' }, 1.95)
    .to(pl, { x: -5, y: 5, duration: 0.16, ease: 'power2.out' }, 1.95)
    .to(p7, { x: 5, y: -5, duration: 0.16, ease: 'power2.out' }, 1.95)
    .to([pl, p7], { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1.1, 0.42)' }, 2.11);

  const maxWait = new Promise<void>((r) =>
    setTimeout(() => {
      if (!frozen) freeze(performance.now() / 1000, false);
      r();
    }, MAX_WAIT * 1000),
  );

  let exited = false;
  const exit = () => {
    if (exited) return;
    exited = true;
    try {
      sessionStorage.setItem('lt7-intro', '1');
    } catch {
      /* private mode */
    }

    const target = document.querySelector<SVGSVGElement>('.lockup__mark');
    const out = gsap.timeline({
      defaults: { ease: 'expo.inOut' },
      onComplete: () => {
        loader.remove();
        if (target) target.style.opacity = '';
        lockScroll(false);
      },
    });

    // Fly the constructed mark into the header logo.
    if (target) {
      const svgBox = art.getBoundingClientRect();
      const k = svgBox.width / 180; // viewBox is 180 units wide
      const rx = svgBox.left + 21 * k; // mark region starts at x = -19 (viewBox starts at -40)
      const ry = svgBox.top + 28 * k; // and y = -2 (viewBox starts at -30)
      const t = target.getBoundingClientRect();
      const s = t.width / (138 * k);
      gsap.set(art, { transformOrigin: `${rx - svgBox.left}px ${ry - svgBox.top}px` });
      target.style.opacity = '0';
      out.to(art, { x: t.left - rx, y: t.top - ry, scale: s, duration: 1.15 }, 0.15);
      out.set(target, { opacity: 1 }, 1.3);
      out.to(art, { opacity: 0, duration: 0.15, ease: 'none' }, 1.3);
    } else {
      out.to(art, { opacity: 0, scale: 0.6, duration: 0.8 }, 0.1);
    }

    // Replace the CSS transform with explicit GSAP values so percentages don't stack.
    gsap.set(panels, { x: 0, y: 0, xPercent: 0, yPercent: -50, rotation: -13.2825 });
    // Each half slides away from the seam, perpendicular to it.
    out
      .to([clock, caption, brand, skip], { opacity: 0, y: 24, duration: 0.6, stagger: 0.04, ease: 'power3.in' }, 0)
      .to(glow, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.1)
      .to(panels[0], { xPercent: -72, yPercent: -50 + 8, duration: 1.2 }, 0.25)
      .to(panels[1], { xPercent: 72, yPercent: -50 - 8, duration: 1.2 }, 0.25)
      .add(() => markIntroDone(), 0.55);
  };

  const skipNow = () => {
    tl.timeScale(6);
    if (!frozen) freeze(performance.now() / 1000, document.readyState === 'complete');
    exit();
  };
  skip.addEventListener('click', skipNow);
  loader.addEventListener('pointerdown', skipNow, { once: true });
  window.addEventListener(
    'keydown',
    (e) => {
      if (!exited && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) skipNow();
    },
    { once: true },
  );

  Promise.all([tl.then(), Promise.race([loaded, maxWait])]).then(() => setTimeout(exit, 450));
}
