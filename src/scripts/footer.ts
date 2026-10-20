import { formatSeconds, loadSeconds, whenLoaded } from './core';
import { SITE } from '../config';

export function initFooter(): void {
  const clocks = Array.from(document.querySelectorAll<HTMLTimeElement>('[data-miami-clock]'));
  if (clocks.length) {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: SITE.timezone,
      hour: 'numeric',
      minute: '2-digit',
    });
    const tick = () => {
      const now = new Date();
      clocks.forEach((clock) => {
        clock.textContent = fmt.format(now);
        clock.dateTime = now.toISOString();
      });
    };
    tick();
    setInterval(tick, 15_000);
  }

  const load = document.querySelector<HTMLElement>('[data-load-time]');
  if (load) {
    whenLoaded().then(() => {
      // loadEventStart is filled in on the next task after `load` fires.
      setTimeout(() => {
        const s = loadSeconds();
        if (s !== null) load.textContent = `${formatSeconds(s)}s`;
      }, 0);
    });
  }
}
