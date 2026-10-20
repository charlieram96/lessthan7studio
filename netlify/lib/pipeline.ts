import type { JobStatus, Report } from '../../src/lab/schema';
import { MODEL, emptyUsage, sumUsage } from './claude';
import { type ConceptId, type ConceptState, getConcept, getJob, getWork, putJob } from './store';

export const CONCEPTS: ConceptId[] = ['A', 'B', 'C'];

// Netlify stops a background invocation after 15 minutes. A stage that hasn't reported back
// by this point is gone, so the job moves on (or fails) instead of waiting forever.
const STAGE_LIMIT_MS = 16 * 60 * 1000;
const START_LIMIT_MS = 3 * 60 * 1000;

const age = (iso: string) => Date.now() - Date.parse(iso);

async function fail(job: JobStatus, error: string): Promise<JobStatus> {
  const next: JobStatus = { ...job, status: 'error', step: 'error', message: 'Stopped', error, updatedAt: new Date().toISOString() };
  await putJob(next);
  return next;
}

const settled = (state: ConceptState | null, job: JobStatus) =>
  state ? state.status !== 'running' || age(state.startedAt) > STAGE_LIMIT_MS : age(job.updatedAt) > STAGE_LIMIT_MS;

/**
 * Called after each concept finishes and on every status poll. Reports concept progress and,
 * once all three have settled, assembles the report from whichever mockups succeeded.
 */
export async function settleConcepts(id: string): Promise<JobStatus | null> {
  const job = await getJob(id);
  if (!job || job.status !== 'running' || job.step !== 'concepts') return job;

  const states = await Promise.all(CONCEPTS.map((c) => getConcept(id, c)));
  const done = states.filter((s): s is ConceptState & { mockup: NonNullable<ConceptState['mockup']> } => !!s?.mockup);
  if (!states.every((s) => settled(s, job))) {
    return done.length ? { ...job, progress: 60 + done.length * 12, message: `${done.length} of 3 concepts designed` } : job;
  }

  const work = await getWork(id);
  if (!work?.strategy || !done.length) return fail(job, 'None of the three concepts could be designed. Try again.');
  const report: Report = {
    id,
    createdAt: job.startedAt,
    input: job.input,
    facts: work.facts,
    psi: work.psi,
    brief: work.brief,
    strategy: work.strategy,
    mockups: done.map((s) => s.mockup),
    usage: sumUsage([work.usage, ...states.map((s) => s?.usage ?? emptyUsage())]),
    model: MODEL,
  };
  const next: JobStatus = {
    ...job,
    status: 'done',
    step: 'done',
    message: 'Report ready',
    progress: 100,
    updatedAt: new Date().toISOString(),
    report,
  };
  await putJob(next);
  return next;
}

/** Brings a job up to date for the status endpoint. */
export async function refresh(job: JobStatus): Promise<JobStatus> {
  if (job.status === 'queued') {
    return age(job.startedAt) > START_LIMIT_MS ? fail(job, 'The generator didn’t start. Try again in a minute.') : job;
  }
  if (job.status !== 'running') return job;
  if (job.step === 'concepts') return (await settleConcepts(job.id)) ?? job;
  return age(job.updatedAt) > STAGE_LIMIT_MS ? fail(job, 'The analysis ran out of time. Try again.') : job;
}
