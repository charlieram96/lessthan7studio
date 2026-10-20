/**
 * Netlify Forms over fetch, with inline validation and an accessible status message.
 * Forms opt in with [data-forms]; error messages live in #<field-id>-err elements.
 */
export default function initForms(): void {
  document.querySelectorAll<HTMLFormElement>('form[data-forms]').forEach(enhance);
}

export function encodeForm(form: HTMLFormElement): string {
  const data = new FormData(form);
  const params = new URLSearchParams();
  data.forEach((value, key) => params.append(key, typeof value === 'string' ? value : value.name));
  return params.toString();
}

export async function submitToNetlify(body: string): Promise<void> {
  const res = await fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Form submission failed (${res.status})`);
}

function enhance(form: HTMLFormElement): void {
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const label = form.querySelector<HTMLElement>('[data-submit-label]');

  const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[required]'));

  const check = (el: HTMLInputElement | HTMLTextAreaElement): boolean => {
    const valid = el.checkValidity() && el.value.trim().length > 0;
    const err = form.querySelector<HTMLElement>(`#${el.id}-err`);
    el.setAttribute('aria-invalid', String(!valid));
    if (err) {
      err.hidden = valid;
      if (!valid) el.setAttribute('aria-describedby', err.id);
      else el.removeAttribute('aria-describedby');
    }
    return valid;
  };

  fields.forEach((el) => {
    el.addEventListener('blur', () => {
      if (el.value) check(el);
    });
    el.addEventListener('input', () => {
      if (el.getAttribute('aria-invalid') === 'true') check(el);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = fields.filter((el) => !check(el));
    if (invalid.length) {
      invalid[0].focus();
      if (status) {
        status.textContent = 'A few fields need a look before this can be sent.';
        status.classList.add('is-error');
      }
      return;
    }

    if (__ARTIFACT__) {
      if (status) {
        status.textContent = 'Preview only: on lessthan7.studio this message is delivered to the studio inbox.';
        status.classList.remove('is-error');
      }
      return;
    }

    button?.setAttribute('disabled', '');
    if (label) label.textContent = 'Sending…';
    try {
      await submitToNetlify(encodeForm(form));
      form.reset();
      if (status) {
        status.textContent = 'Thank you. Your message is on its way, and we’ll be in touch soon.';
        status.classList.remove('is-error');
        status.setAttribute('tabindex', '-1');
        status.focus();
      }
    } catch {
      if (status) {
        status.textContent = 'That didn’t go through. Please try again, or email hello@lessthan7.studio.';
        status.classList.add('is-error');
      }
    } finally {
      button?.removeAttribute('disabled');
      if (label) label.textContent = 'Send message';
    }
  });
}
