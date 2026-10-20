import { gsap, lockScroll, reducedMotion } from './core';

export function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 24);
    const goingDown = y > lastY + 4;
    const goingUp = y < lastY - 4;
    if (goingDown && y > 240 && !document.documentElement.classList.contains('menu-open')) {
      header.classList.add('is-hidden');
    } else if (goingUp || y < 240) {
      header.classList.remove('is-hidden');
    }
    lastY = y;
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true },
  );

  // Keyboard users should always see the header they are tabbing through.
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  update();
}

export function initMenu(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (!toggle || !menu) return;

  const label = toggle.querySelector('.menu-btn__label');
  const links = Array.from(menu.querySelectorAll<HTMLElement>('.menu__link'));
  const meta = menu.querySelector<HTMLElement>('.menu__meta');
  let open = false;
  let tl: gsap.core.Timeline | null = null;

  const focusables = () =>
    [toggle, ...Array.from(menu.querySelectorAll<HTMLElement>('a[href], button'))].filter(
      (el) => !el.hasAttribute('disabled'),
    );

  const setOpen = (next: boolean) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Close' : 'Menu';
    document.documentElement.classList.toggle('menu-open', open);
    lockScroll(open);
    tl?.kill();

    if (open) {
      menu.hidden = false;
      if (reducedMotion()) {
        links[0]?.focus();
        return;
      }
      tl = gsap
        .timeline()
        .fromTo(
          menu,
          { clipPath: 'polygon(100% 0, 100% 0, 100% 0, 100% 0)' },
          { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', duration: 0.8, ease: 'expo.inOut' },
        )
        .fromTo(
          links,
          { yPercent: 110, rotate: 4 },
          { yPercent: 0, rotate: 0, duration: 0.9, stagger: 0.06, ease: 'expo.out' },
          '-=0.35',
        )
        .fromTo(meta, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.6')
        .add(() => links[0]?.focus());
    } else {
      if (reducedMotion()) {
        menu.hidden = true;
        toggle.focus();
        return;
      }
      tl = gsap
        .timeline({
          onComplete: () => {
            menu.hidden = true;
          },
        })
        .to(menu, { clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)', duration: 0.6, ease: 'expo.inOut' });
      toggle.focus();
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));

  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'Tab') {
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });

  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}
