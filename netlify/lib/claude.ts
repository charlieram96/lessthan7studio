import Anthropic from '@anthropic-ai/sdk';
import type { Concept, Mockup, PsiResult, SiteFacts, Strategy, Usage } from '../../src/lab/schema';
import { Strategy as StrategySchema, strategyJsonSchema } from '../../src/lab/schema';
import { SYSTEM, mockupPrompt, researchPrompt, strategyPrompt } from './prompts';

export const MODEL = 'claude-opus-5-5';

// USD per million tokens (Claude Opus 5.5) and per web search.
const PRICE = { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5, search: 0.01 };

type StreamParams = Anthropic.Beta.Messages.MessageCreateParamsStreaming;
type Msg = Anthropic.Beta.Messages.BetaMessage;

export function emptyUsage(): Usage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, webSearches: 0, costUsd: 0 };
}

function addUsage(total: Usage, msg: Msg): void {
  const u = msg.usage;
  total.inputTokens += u.input_tokens ?? 0;
  total.outputTokens += u.output_tokens ?? 0;
  total.cacheReadTokens += u.cache_read_input_tokens ?? 0;
  total.cacheWriteTokens += u.cache_creation_input_tokens ?? 0;
  total.webSearches += u.server_tool_use?.web_search_requests ?? 0;
  total.costUsd =
    (total.inputTokens * PRICE.input +
      total.outputTokens * PRICE.output +
      total.cacheReadTokens * PRICE.cacheRead +
      total.cacheWriteTokens * PRICE.cacheWrite) /
      1_000_000 +
    total.webSearches * PRICE.search;
}

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic({ maxRetries: 2, timeout: 9 * 60 * 1000 }));

const text = (msg: Msg) =>
  msg.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

export class ModelDeclined extends Error {}

/**
 * One streamed request on Claude Opus 5.5 at high effort, with server-side fallbacks enabled,
 * resuming server-tool turns that pause.
 */
async function run(
  params: Omit<StreamParams, 'model' | 'stream'>,
  usage: Usage,
): Promise<Msg> {
  let messages = params.messages;
  for (let turn = 0; turn < 6; turn++) {
    const stream = anthropic().beta.messages.stream({
      ...params,
      model: MODEL,
      messages,
      thinking: { type: 'adaptive' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    const msg = await stream.finalMessage();
    addUsage(usage, msg);
    if (msg.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: msg.content }];
      continue;
    }
    if (msg.stop_reason === 'refusal') {
      throw new ModelDeclined('The model declined to analyze this site.');
    }
    return msg;
  }
  throw new Error('The research step ran too long.');
}

export async function research(
  input: { url: string; businessName?: string; notes?: string },
  facts: SiteFacts,
  usage: Usage,
): Promise<string> {
  const msg = await run(
    {
      max_tokens: 32_000,
      output_config: { effort: 'high' },
      system: SYSTEM,
      tools: [
        { type: 'web_search_20260209', name: 'web_search', max_uses: 6 },
        { type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 5, max_content_tokens: 12_000 },
      ],
      messages: [{ role: 'user', content: researchPrompt(input, facts) }],
    },
    usage,
  );
  const brief = text(msg).trim();
  if (!brief) throw new Error('The research step returned nothing.');
  return brief;
}

export async function strategy(
  input: { url: string; businessName?: string; notes?: string },
  facts: SiteFacts,
  psi: PsiResult | null,
  brief: string,
  usage: Usage,
): Promise<Strategy> {
  const msg = await run(
    {
      max_tokens: 64_000,
      output_config: { effort: 'high', format: { type: 'json_schema', schema: strategyJsonSchema() } },
      system: SYSTEM,
      messages: [{ role: 'user', content: strategyPrompt(input, facts, psi, brief) }],
    },
    usage,
  );
  if (msg.stop_reason === 'max_tokens') throw new Error('The analysis was cut off before it finished.');
  const parsed = StrategySchema.safeParse(JSON.parse(text(msg)));
  if (!parsed.success) throw new Error('The analysis came back in an unexpected shape.');
  const s = parsed.data;
  // Keep exactly three concepts, A–C, in order.
  s.concepts = (['A', 'B', 'C'] as const)
    .map((id, i) => s.concepts.find((c) => c.id === id) ?? s.concepts[i])
    .filter(Boolean)
    .map((c, i) => ({ ...c, id: (['A', 'B', 'C'] as const)[i] }));
  return s;
}

export function sanitizeMockup(html: string): string {
  let out = html.trim();
  const fence = out.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fence) out = fence[1].trim();
  const start = out.search(/<!doctype html|<html/i);
  if (start > 0) out = out.slice(start);
  return out
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/?>/gi, '')
    .replace(/<meta[^>]+http-equiv=["']?refresh[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/<(iframe|object|embed|base)\b[^>]*>(?:[\s\S]*?<\/\1>)?/gi, '')
    .slice(0, 400_000);
}

export async function mockup(s: Strategy, concept: Concept, facts: SiteFacts, usage: Usage): Promise<Mockup> {
  const msg = await run(
    {
      max_tokens: 64_000,
      output_config: { effort: 'high' },
      system: SYSTEM,
      messages: [{ role: 'user', content: mockupPrompt(s, concept, facts) }],
    },
    usage,
  );
  const html = sanitizeMockup(text(msg));
  if (!/<html|<body|<main|<section/i.test(html)) throw new Error(`Concept ${concept.id} didn’t come back as a web page.`);
  return { conceptId: concept.id, html };
}
