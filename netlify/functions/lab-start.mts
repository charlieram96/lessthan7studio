import type { Config } from '@netlify/functions';
import { randomUUID } from 'node:crypto';
import type { JobStatus } from '../../src/lab/schema';
import { normalizeUrl, UserFacingError } from '../lib/site';
import { accessCodeOk, json, putJob, signJob, takeDailySlot } from '../lib/store';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: 'The lab isn’t set up yet: add ANTHROPIC_API_KEY in Netlify’s environment variables.' }, 503);
  }
  if (!process.env.LAB_ACCESS_CODE) {
    return json({ error: 'The lab is locked: add LAB_ACCESS_CODE in Netlify’s environment variables.' }, 503);
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return json({ error: 'Send the form as JSON.' }, 400);
  if (!accessCodeOk(body.code)) return json({ error: 'That access code isn’t right.' }, 401);

  let url: URL;
  try {
    url = normalizeUrl(str(body.url, 400));
  } catch (e) {
    return json({ error: e instanceof UserFacingError ? e.message : 'Check the website address.' }, 400);
  }

  const limit = Number(process.env.LAB_DAILY_LIMIT || 20);
  if (!(await takeDailySlot(limit))) {
    return json({ error: `Today’s limit of ${limit} reports is used up. It resets at midnight UTC.` }, 429);
  }

  const now = new Date().toISOString();
  const job: JobStatus = {
    id: randomUUID(),
    status: 'queued',
    step: 'queued',
    message: 'Queued',
    progress: 2,
    startedAt: now,
    updatedAt: now,
    input: {
      url: url.href,
      businessName: str(body.businessName, 120) || undefined,
      notes: str(body.notes, 2000) || undefined,
      preparedFor: str(body.preparedFor, 120) || undefined,
    },
  };
  await putJob(job);

  // Background functions answer 202 immediately and keep running for up to 15 minutes.
  const origin = new URL(req.url).origin;
  const res = await fetch(`${origin}/.netlify/functions/lab-run-background`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: job.id, token: signJob(job.id) }),
  }).catch(() => null);

  if (!res || (res.status !== 202 && !res.ok)) {
    await putJob({ ...job, status: 'error', step: 'error', message: 'Could not start', error: 'The generator didn’t start. Try again in a minute.' });
    return json({ error: 'The generator didn’t start. Try again in a minute.' }, 502);
  }

  return json({ id: job.id }, 202);
};

export const config: Config = { path: '/api/lab/start' };
