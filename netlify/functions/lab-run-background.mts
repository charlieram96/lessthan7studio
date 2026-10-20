import Anthropic from '@anthropic-ai/sdk';
import type { JobStatus } from '../../src/lab/schema';
import { ModelDeclined, emptyUsage, mockup, research, strategy, sumUsage } from '../lib/claude';
import { CONCEPTS, settleConcepts } from '../lib/pipeline';
import { runPsi } from '../lib/psi';
import { collectFacts, UserFacingError } from '../lib/site';
import { type ConceptId, getConcept, getJob, getWork, putConcept, putJob, putWork, verifyJob } from '../lib/store';

function friendly(e: unknown): string {
  if (e instanceof UserFacingError || e instanceof ModelDeclined) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'The Anthropic API key isn’t allowed to use this model.';
  if (e instanceof Anthropic.RateLimitError) return 'The AI service is busy or the spending limit was reached. Try again later.';
  if (e instanceof Anthropic.APIError) return `The AI service returned an error (${e.status ?? 'network'}). Try again.`;
  if (e instanceof Error && e.name === 'TimeoutError') return 'The website took too long to respond.';
  return e instanceof Error ? e.message : 'Something went wrong.';
}

interface Payload {
  id?: string;
  token?: string;
  stage?: 'research' | 'strategy' | 'concept';
  concept?: ConceptId;
  attempt?: number;
}

/**
 * The report pipeline. Each stage runs in its own background invocation, so each gets Netlify's
 * full 15 minutes: research → strategy → three concepts in parallel → assembly.
 */
export default async (req: Request) => {
  const body = ((await req.json().catch(() => ({}))) ?? {}) as Payload;
  if (!verifyJob(body.id, body.token)) return;
  const job = await getJob(body.id!);
  if (!job) return;

  const update = async (patch: Partial<JobStatus>) => {
    Object.assign(job, patch, { updatedAt: new Date().toISOString() });
    await putJob(job);
  };

  const origin = new URL(req.url).origin;
  const handOff = async (next: Omit<Payload, 'id' | 'token'>) => {
    const res = await fetch(`${origin}/.netlify/functions/lab-run-background`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: job.id, token: body.token, ...next }),
    }).catch(() => null);
    if (!res || (res.status !== 202 && !res.ok)) throw new Error('The generator stopped between steps. Try again.');
  };

  const stage = body.stage ?? 'research';
  if (stage === 'concept') {
    if (job.status === 'running' && job.step === 'concepts' && body.concept) await designConcept(job.id, body.concept, body.attempt ?? 1, handOff);
    return;
  }

  try {
    if (stage === 'research' && job.status === 'queued') {
      const usage = emptyUsage();
      await update({ status: 'running', step: 'fetch', message: 'Reading the homepage', progress: 5 });
      const facts = await collectFacts(job.input.url);

      await update({ step: 'audit', message: 'Checking speed, SEO basics and accessibility', progress: 12 });
      const psiPromise = runPsi(facts.finalUrl, process.env.PAGESPEED_API_KEY);

      await update({ step: 'research', message: 'Researching the business, its customers and competitors', progress: 18 });
      const brief = await research(job.input, facts, usage);
      await putWork(job.id, { facts, psi: await psiPromise, brief, usage });

      await update({ step: 'strategy', message: 'Writing the analysis and three design directions', progress: 42 });
      await handOff({ stage: 'strategy' });
    } else if (stage === 'strategy' && job.status === 'running' && job.step === 'strategy') {
      const work = await getWork(job.id);
      if (!work) throw new Error('The research notes went missing. Try again.');
      const usage = emptyUsage();
      const plan = await strategy(job.input, work.facts, work.psi, work.brief, usage);
      await putWork(job.id, { ...work, strategy: plan, usage: sumUsage([work.usage, usage]) });

      const startedAt = new Date().toISOString();
      await Promise.all(CONCEPTS.map((c) => putConcept(job.id, c, { status: 'running', attempt: 1, startedAt, usage: emptyUsage() })));
      await update({ step: 'concepts', message: 'Designing concepts A, B and C', progress: 60 });
      await Promise.all(
        CONCEPTS.map((c) =>
          handOff({ stage: 'concept', concept: c, attempt: 1 }).catch((e) =>
            putConcept(job.id, c, { status: 'failed', attempt: 1, startedAt, error: friendly(e), usage: emptyUsage() }),
          ),
        ),
      );
    }
  } catch (e) {
    console.error('lab job failed', job.id, stage, e);
    await update({ status: 'error', step: 'error', message: 'Stopped', error: friendly(e) });
  }
};

/** Designs one concept's homepage. A failed attempt gets one retry in a fresh invocation. */
async function designConcept(
  id: string,
  conceptId: ConceptId,
  attempt: number,
  handOff: (next: Omit<Payload, 'id' | 'token'>) => Promise<void>,
): Promise<void> {
  const state = await getConcept(id, conceptId);
  // Ignore duplicate or outdated invocations.
  if (!state || state.status !== 'running' || state.attempt !== attempt) return;

  const usage = state.usage;
  const startedAt = new Date().toISOString();
  await putConcept(id, conceptId, { ...state, startedAt });
  try {
    const work = await getWork(id);
    const concept = work?.strategy?.concepts.find((c) => c.id === conceptId);
    if (!work?.strategy || !concept) throw new Error('The design brief went missing.');
    const result = await mockup(work.strategy, concept, work.facts, usage);
    await putConcept(id, conceptId, { status: 'done', attempt, startedAt, mockup: result, usage });
  } catch (e) {
    console.error('lab concept failed', id, conceptId, attempt, e);
    const retry = attempt < 2 && !(e instanceof ModelDeclined) && !(e instanceof Anthropic.AuthenticationError);
    if (retry) {
      const next = attempt + 1;
      await putConcept(id, conceptId, { status: 'running', attempt: next, startedAt: new Date().toISOString(), usage });
      const started = await handOff({ stage: 'concept', concept: conceptId, attempt: next }).then(
        () => true,
        () => false,
      );
      if (started) return;
    }
    await putConcept(id, conceptId, { status: 'failed', attempt, startedAt, error: friendly(e), usage });
  }
  await settleConcepts(id);
}
