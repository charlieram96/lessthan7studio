import type { Config } from '@netlify/functions';
import { getJob, json } from '../lib/store';

export default async (req: Request) => {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Missing or invalid report id.' }, 400);
  const job = await getJob(id);
  if (!job) return json({ error: 'We couldn’t find that report.' }, 404);
  return json(job);
};

export const config: Config = { path: '/api/lab/status' };
