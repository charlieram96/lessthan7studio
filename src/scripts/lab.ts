import type { JobStatus } from '../lab/schema';

const RECENT_KEY = 'lt7-lab-recent';
const ORDER = ['queued', 'fetch', 'audit', 'research', 'strategy', 'concepts', 'done'];

interface Recent {
  id: string;
  name: string;
  url: string;
  at: string;
}

function readRecent(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as Recent[];
  } catch {
    return [];
  }
}

function saveRecent(item: Recent): void {
  try {
    const next = [item, ...readRecent().filter((r) => r.id !== item.id)].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

const reportHref = (id: string) => `/lab/report/?id=${encodeURIComponent(id)}`;

export default function initLab(): void {
  const form = document.querySelector<HTMLFormElement>('[data-lab-form]');
  if (!form) return;
  const error = form.querySelector<HTMLElement>('[data-lab-error]')!;
  const go = form.querySelector<HTMLButtonElement>('[data-lab-go]')!;
  const goLabel = form.querySelector<HTMLElement>('[data-lab-go-label]')!;
  const progress = document.querySelector<HTMLElement>('[data-lab-progress]')!;
  const bar = document.querySelector<HTMLElement>('[data-lab-bar]')!;
  const msg = document.querySelector<HTMLElement>('[data-lab-msg]')!;
  const elapsed = document.querySelector<HTMLElement>('[data-lab-elapsed]')!;
  const link = document.querySelector<HTMLAnchorElement>('[data-lab-link]')!;
  const recentList = document.querySelector<HTMLElement>('[data-lab-recent]')!;

  const renderRecent = () => {
    const items = readRecent();
    recentList.querySelectorAll('[data-recent]').forEach((n) => n.remove());
    items.forEach((r) => {
      const li = document.createElement('li');
      li.dataset.recent = '';
      const a = document.createElement('a');
      a.className = 'lab__item';
      a.href = reportHref(r.id);
      const b = document.createElement('b');
      b.textContent = r.name;
      const span = document.createElement('span');
      span.textContent = `${r.url.replace(/^https?:\/\//, '')} · ${new Date(r.at).toLocaleDateString()}`;
      a.append(b, span);
      li.appendChild(a);
      recentList.prepend(li);
    });
  };
  renderRecent();

  if (__ARTIFACT__) {
    error.textContent = 'Preview: report generation runs on the live site. Open the sample report to see the output.';
  }

  let timer = 0;
  const startClock = (from: number) => {
    window.clearInterval(timer);
    timer = window.setInterval(() => {
      const s = Math.floor((Date.now() - from) / 1000);
      elapsed.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }, 1000);
  };

  const showStatus = (job: JobStatus) => {
    progress.hidden = false;
    bar.style.width = `${job.progress}%`;
    msg.textContent = job.status === 'error' ? job.error ?? 'Something went wrong.' : job.message;
    msg.style.color = job.status === 'error' ? '#ff8f8f' : '';
    const current = ORDER.indexOf(job.step);
    progress.querySelectorAll<HTMLElement>('[data-step]').forEach((li) => {
      const i = ORDER.indexOf(li.dataset.step!);
      li.classList.toggle('is-done', job.status === 'done' || i < current);
      li.classList.toggle('is-active', job.status === 'running' && i === current);
    });
  };

  const poll = async (id: string) => {
    for (;;) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(`/api/lab/status?id=${encodeURIComponent(id)}`).catch(() => null);
      if (!res || !res.ok) continue;
      const job = (await res.json()) as JobStatus;
      showStatus(job);
      if (job.status === 'done') {
        window.clearInterval(timer);
        location.href = reportHref(id);
        return;
      }
      if (job.status === 'error') {
        window.clearInterval(timer);
        go.disabled = false;
        goLabel.textContent = 'Generate report';
        return;
      }
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.textContent = '';
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    if (!data.url?.trim()) {
      error.textContent = 'Enter the prospect’s website address.';
      form.querySelector<HTMLInputElement>('#lab-url')!.focus();
      return;
    }
    if (!data.code?.trim()) {
      error.textContent = 'Enter the access code.';
      form.querySelector<HTMLInputElement>('#lab-code')!.focus();
      return;
    }
    if (__ARTIFACT__) {
      error.textContent = 'Preview: generation runs on the live site. Open the sample report to see what it produces.';
      return;
    }

    go.disabled = true;
    goLabel.textContent = 'Starting…';
    const res = await fetch('/api/lab/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => null);
    const body = res ? ((await res.json().catch(() => ({}))) as { id?: string; error?: string }) : {};
    if (!res || !res.ok || !body.id) {
      error.textContent = body.error ?? 'Couldn’t reach the generator. Check your connection and try again.';
      go.disabled = false;
      goLabel.textContent = 'Generate report';
      return;
    }

    goLabel.textContent = 'Generating…';
    saveRecent({ id: body.id, name: data.businessName || data.url, url: data.url, at: new Date().toISOString() });
    renderRecent();
    link.href = reportHref(body.id);
    startClock(Date.now());
    showStatus({
      id: body.id,
      status: 'queued',
      step: 'queued',
      message: 'Queued',
      progress: 2,
      startedAt: '',
      updatedAt: '',
      input: { url: data.url },
    });
    poll(body.id);
  });
}
