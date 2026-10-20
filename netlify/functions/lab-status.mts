import type { Config } from '@netlify/functions';
import type { JobStatus } from '../../src/lab/schema';
import { refresh } from '../lib/pipeline';
import { getJob, json } from '../lib/store';

/** Report links get shared with prospects, so leave out the studio's notes, research brief and costs. */
function forClient(job: JobStatus): JobStatus {
  const { notes: _notes, ...input } = job.input;
  return {
    ...job,
    input,
    report: job.report && { ...job.report, input, brief: '', usage: undefined },
  };
}

export default async (req: Request) => {
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Missing or invalid report id.' }, 400);
  const job = await getJob(id);
  if (!job) return json({ error: 'We couldn’t find that report.' }, 404);
  return json(forClient(await refresh(job)));
};

export const config: Config = { path: '/api/lab/status' };
