import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { JobStatus } from '../../src/lab/schema';

const store = () => getStore({ name: 'lab', consistency: 'strong' });

export async function getJob(id: string): Promise<JobStatus | null> {
  return ((await store().get(`jobs/${id}`, { type: 'json' })) as JobStatus | null) ?? null;
}

export async function putJob(job: JobStatus): Promise<void> {
  await store().setJSON(`jobs/${job.id}`, job);
}

/** Counts reports per UTC day; returns false once the limit is reached. */
export async function takeDailySlot(limit: number): Promise<boolean> {
  const key = `count/${new Date().toISOString().slice(0, 10)}`;
  const used = ((await store().get(key, { type: 'json' })) as number | null) ?? 0;
  if (used >= limit) return false;
  await store().setJSON(key, used + 1);
  return true;
}

export function accessCodeOk(given: unknown): boolean {
  const expected = process.env.LAB_ACCESS_CODE;
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const secret = () => process.env.LAB_SIGNING_SECRET || process.env.ANTHROPIC_API_KEY || '';

export const signJob = (id: string) => createHmac('sha256', secret()).update(`lab:${id}`).digest('hex');

export function verifyJob(id: unknown, token: unknown): boolean {
  if (typeof id !== 'string' || typeof token !== 'string' || !secret()) return false;
  const a = Buffer.from(signJob(id));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
