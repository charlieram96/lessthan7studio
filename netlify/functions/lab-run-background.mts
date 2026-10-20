import Anthropic from '@anthropic-ai/sdk';
import type { JobStatus, Mockup, Report } from '../../src/lab/schema';
import { MODEL, ModelDeclined, emptyUsage, mockup, research, strategy } from '../lib/claude';
import { runPsi } from '../lib/psi';
import { collectFacts, UserFacingError } from '../lib/site';
import { getJob, putJob, verifyJob } from '../lib/store';

function friendly(e: unknown): string {
  if (e instanceof UserFacingError || e instanceof ModelDeclined) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'The Anthropic API key isn’t allowed to use this model.';
  if (e instanceof Anthropic.RateLimitError) return 'The AI service is busy or the spending limit was reached. Try again later.';
  if (e instanceof Anthropic.APIError) return `The AI service returned an error (${e.status ?? 'network'}). Try again.`;
  if (e instanceof Error && e.name === 'TimeoutError') return 'The website took too long to respond.';
  return e instanceof Error ? e.message : 'Something went wrong.';
}

export default async (req: Request) => {
  const { id, token } = ((await req.json().catch(() => ({}))) ?? {}) as { id?: string; token?: string };
  if (!verifyJob(id, token)) return;
  const job = await getJob(id!);
  if (!job || job.status !== 'queued') return;

  const update = async (patch: Partial<JobStatus>) => {
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    await putJob(job);
  };
  const usage = emptyUsage();

  try {
    await update({ status: 'running', step: 'fetch', message: 'Reading the homepage', progress: 5 });
    const facts = await collectFacts(job.input.url);

    await update({ step: 'audit', message: 'Checking speed, SEO basics and accessibility', progress: 12 });
    const psiPromise = runPsi(facts.finalUrl, process.env.PAGESPEED_API_KEY);

    await update({ step: 'research', message: 'Researching the business, its customers and competitors', progress: 18 });
    const brief = await research(job.input, facts, usage);
    const psi = await psiPromise;

    await update({ step: 'strategy', message: 'Writing the analysis and three design directions', progress: 42 });
    const plan = await strategy(job.input, facts, psi, brief, usage);

    await update({ step: 'concepts', message: 'Designing concepts A, B and C', progress: 60 });
    let finished = 0;
    const settled = await Promise.allSettled(
      plan.concepts.map(async (c) => {
        let result: Mockup;
        try {
          result = await mockup(plan, c, facts, usage);
        } catch {
          result = await mockup(plan, c, facts, usage); // one retry
        }
        finished += 1;
        await update({ progress: 60 + finished * 12, message: `Concept ${c.id} designed (${finished} of 3)` });
        return result;
      }),
    );
    const mockups = settled.flatMap((s) => (s.status === 'fulfilled' ? [s.value] : []));
    if (!mockups.length) throw new Error('None of the three concepts could be designed. Try again.');

    const report: Report = {
      id: job.id,
      createdAt: job.startedAt,
      input: job.input,
      facts,
      psi,
      brief,
      strategy: plan,
      mockups,
      usage,
      model: MODEL,
    };
    await update({ status: 'done', step: 'done', message: 'Report ready', progress: 100, report });
  } catch (e) {
    console.error('lab job failed', job.id, e);
    await update({ status: 'error', step: 'error', message: 'Stopped', error: friendly(e) });
  }
};
