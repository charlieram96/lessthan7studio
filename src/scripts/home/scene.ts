import { gsap, ScrollTrigger, finePointer, onIntroDone, reducedMotion } from '../core';
import { LEAN } from '../../config';
import { startSunset } from '../webgl/sunset';

const PORTAL = 1.4; // timeline units spent diving through the mark
const STEP = 1; // timeline units per milestone
const HOLD = 0.6; // pause on "7s" before the scene releases

export function initScene(): void {
  const scene = document.querySelector<HTMLElement>('[data-scene]');
  if (!scene) return;

  const heroBg = scene.querySelector<HTMLElement>('[data-hero-bg]')!;
  const canvas = scene.querySelector<HTMLCanvasElement>('[data-hero-gl]')!;
  const wrap = scene.querySelector<HTMLElement>('[data-hero-mark-wrap]')!;
  const tilt = scene.querySelector<HTMLElement>('[data-hero-tilt]')!;
  const pieceL = tilt.querySelector<SVGPolygonElement>('.mark__l')!;
  const piece7 = tilt.querySelector<SVGPolygonElement>('.mark__7')!;
  const title = scene.querySelector<HTMLElement>('[data-hero-title]')!;
  const lines = Array.from(title.querySelectorAll<HTMLElement>('.hero__line'));
  const ins = Array.from(scene.querySelectorAll<HTMLElement>('[data-hero-in]'));
  const content = scene.querySelector<HTMLElement>('.hero__content')!;
  const bar = scene.querySelector<HTMLElement>('.hero__bar')!;
  const impression = scene.querySelector<HTMLElement>('[data-impression]');

  const rm = reducedMotion();
  const sunset = startSunset(canvas, { still: rm });

  // The two pieces wait apart (and invisible, via CSS) until the intro brings them together.
  if (!rm) {
    gsap.set(pieceL, { x: -26, y: 26 });
    gsap.set(piece7, { x: 26, y: -26 });
  }

  /* ---------- Intro ---------- */
  onIntroDone(() => {
    if (rm) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo(
      lines,
      { yPercent: 38, skewY: 5, opacity: 0 },
      { yPercent: 0, skewY: 0, opacity: 1, duration: 1.3, stagger: 0.09 },
      0.05,
    )
      .fromTo(ins, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.35)
      .to([pieceL, piece7], { opacity: 1, x: 0, y: 0, duration: 1.6, ease: 'elastic.out(1, 0.55)', stagger: 0.06 }, 0.2);
    startImpressionClock();
  });

  function startImpressionClock() {
    if (!impression) return;
    const t0 = performance.now();
    let stopped = false;
    const id = window.setInterval(() => {
      if (stopped) return;
      const s = (performance.now() - t0) / 1000;
      if (s >= 7) {
        impression.innerHTML = 'Seven seconds in. <b>Still here? Good sign.</b>';
        stopped = true;
        window.clearInterval(id);
        return;
      }
      impression.innerHTML = `Your first impression of this page formed <b>${s.toFixed(2)}s</b> ago`;
    }, 47);
  }

  if (rm) {
    gsap.set([pieceL, piece7], { opacity: 1, x: 0, y: 0 });
    return;
  }

  /* ---------- Pointer tilt + idle drift ---------- */
  const rx = gsap.quickTo(tilt, 'rotationX', { duration: 1.2, ease: 'power3' });
  const ry = gsap.quickTo(tilt, 'rotationY', { duration: 1.2, ease: 'power3' });
  let tiltEnabled = true;
  if (finePointer()) {
    window.addEventListener(
      'pointermove',
      (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        sunset?.setPointer(nx, ny);
        if (!tiltEnabled) return;
        rx(-ny * 14);
        ry(nx * 18);
      },
      { passive: true },
    );
  }

  /* ---------- The pinned scene ---------- */
  const t7 = scene.querySelector<HTMLElement>('[data-scene-a]')!;
  const num = t7.querySelector<HTMLElement>('[data-t7-num]')!;
  const clockEl = t7.querySelector<HTMLElement>('.t7__clock')!;
  const items = Array.from(t7.querySelectorAll<HTMLElement>('[data-t7-item]'));
  const fill = t7.querySelector<HTMLElement>('[data-t7-fill]')!;
  const head = t7.querySelector<HTMLElement>('[data-t7-playhead]')!;
  const markers = Array.from(t7.querySelectorAll<HTMLElement>('[data-t7-marker]'));
  const times = items.map((el) => parseFloat(el.dataset.time || '0'));

  scene.classList.add('is-pinned');

  // Geometry of the mark at rest, measured without our transforms.
  const base = { cx: 0, cy: 0, unit: 1 };
  const measure = () => {
    const prev = tilt.style.transform;
    tilt.style.transform = 'none';
    const r = wrap.getBoundingClientRect();
    const sr = scene.getBoundingClientRect();
    base.cx = r.left - sr.left + r.width / 2;
    base.cy = r.top - sr.top + r.height / 2;
    base.unit = r.width / 138; // the mark's viewBox is 138 units wide
    tilt.style.transform = prev;
  };
  measure();

  // State the timeline animates; transforms and the clip are derived from it.
  const st = { hole: 0, scale: 1, spin: 0, dx: 0, dy: 0 };
  const endScale = () => {
    const w = scene.clientWidth;
    const h = scene.clientHeight;
    // The inner square (60 units) must cover the viewport, so the strokes end up off-screen.
    return (1.08 * Math.max(w, h)) / (60 * base.unit);
  };

  const apply = () => {
    gsap.set(tilt, { scale: st.scale, rotation: st.spin, x: st.dx, y: st.dy });
    const w = scene.clientWidth;
    const h = scene.clientHeight;
    if (st.hole <= 0.001) {
      heroBg.style.clipPath = '';
      return;
    }
    // Light fills the inner square (60 units) so the mark's two gaps stay dark.
    const half = 30 * st.hole * base.unit * st.scale;
    const a = ((LEAN + st.spin) * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const cx = base.cx + st.dx;
    const cy = base.cy + st.dy;
    const pts = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half],
    ].map(([x, y]) => `${(cx + x * cos - y * sin).toFixed(1)} ${(cy + x * sin + y * cos).toFixed(1)}`);
    heroBg.style.clipPath = `path(evenodd, "M0 0H${w}V${h}H0Z M${pts.join(' L')}Z")`;
  };

  const clock = { v: 0 };
  const renderClock = () => {
    num.textContent = clock.v.toFixed(2);
    markers.forEach((m, i) => m.classList.toggle('is-passed', clock.v >= times[i] - 0.001));
    clockEl.classList.toggle('is-seven', clock.v >= 6.999);
  };

  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });

  // Dive: the copy steps aside, light floods the mark's square, and we fly through it.
  tl.to([content, bar], { opacity: 0, y: -60, duration: 0.45, ease: 'power2.in' }, 0)
    .to(st, { hole: 1, duration: 0.5, ease: 'power2.in', onUpdate: apply }, 0)
    .to(
      st,
      {
        scale: () => endScale(),
        duration: PORTAL - 0.15,
        ease: 'power3.in',
        onUpdate: apply,
      },
      0.15,
    )
    .to(
      st,
      {
        spin: -LEAN,
        dx: () => scene.clientWidth / 2 - base.cx,
        dy: () => scene.clientHeight / 2 - base.cy,
        duration: PORTAL - 0.15,
        ease: 'power2.inOut',
        onUpdate: apply,
      },
      0.15,
    )
    .set([heroBg, wrap], { autoAlpha: 0 }, PORTAL);

  // The first seven seconds.
  items.forEach((item, i) => {
    const at = PORTAL + i * STEP;
    if (i > 0) tl.to(items[i - 1], { autoAlpha: 0, y: -36, duration: 0.25, ease: 'power2.in' }, at);
    tl.fromTo(item, { autoAlpha: 0, y: 46 }, { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power3.out' }, at + 0.12)
      .to(clock, { v: times[i], duration: 0.45, ease: 'power2.inOut', onUpdate: renderClock }, at)
      .to(fill, { scaleX: times[i] / 7, duration: 0.45, ease: 'power2.inOut' }, at)
      .to(head, { left: `${(times[i] / 7) * 100}%`, duration: 0.45, ease: 'power2.inOut' }, at);
  });
  tl.to({}, { duration: HOLD }, PORTAL + items.length * STEP);

  const units = tl.duration();
  ScrollTrigger.create({
    trigger: scene,
    start: 'top top',
    end: () => `+=${Math.round(units * 0.62 * window.innerHeight)}`,
    pin: true,
    // Pins refresh first so triggers further down measure the added scroll distance.
    refreshPriority: 1,
    pinSpacing: true,
    anticipatePin: 1,
    scrub: 0.4,
    animation: tl,
    invalidateOnRefresh: true,
    onRefreshInit: () => {
      st.hole = 0;
      st.scale = 1;
      st.spin = 0;
      st.dx = 0;
      st.dy = 0;
      gsap.set(tilt, { scale: 1, rotation: 0, x: 0, y: 0 });
      heroBg.style.clipPath = '';
    },
    onRefresh: () => {
      measure();
      apply();
    },
    onUpdate: (self) => {
      const p = self.progress * units;
      tiltEnabled = p < 0.05;
      if (!tiltEnabled) {
        rx(0);
        ry(0);
      }
      sunset?.setActive(p < PORTAL + 0.05);
    },
  });

  renderClock();
}
