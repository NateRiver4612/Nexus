/**
 * Tool-loop reliability spike for the DeepSeek provider.
 * This is an eval, not a pass/fail test assertion: a pass rate across many calls is
 * reported for humans and deliberately kept out of `bun test`.
 *
 * Run from apps/api (bun loads .env, so DEEPSEEK_API_KEY must be set):
 *   bun scripts/ai-provider-spike.ts --runs 30 [--model deepseek-v4-pro] [--only 2]
 */
import z from 'zod';
import { getDeepSeekClient, modelForTask } from '../src/lib/client';
import { DeepSeekProvider } from '../src/modules/ai/providers/deepseek';
import type { ChatMessage, ToolCall, ToolDef, Usage } from '../src/modules/ai/types';

const rest = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? (rest[i + 1] ?? fallback) : fallback;
};
const MODEL = flag('model', modelForTask('project-chat'));
const provider = new DeepSeekProvider(() => getDeepSeekClient());

// ── dummy tools (deterministic, shaped like the real Step 5/6 tools) ──────────

type Tool = { def: ToolDef; run: (args: unknown) => unknown };
function tool<S extends z.ZodType>(
  name: string,
  description: string,
  parameters: S,
  run: (args: z.infer<S>) => unknown,
): Tool {
  return { def: { name, description, parameters }, run: run as (args: unknown) => unknown };
}

const TASKS: Record<
  string,
  { id: string; title: string; milestone: string; status: string; steps: number }
> = {
  'T-5': { id: 'T-5', title: 'Set up OAuth provider', milestone: 'Auth', status: 'done', steps: 4 },
  'T-6': { id: 'T-6', title: 'Session cookies', milestone: 'Auth', status: 'todo', steps: 3 },
  'T-7': { id: 'T-7', title: 'Token refresh flow', milestone: 'Auth', status: 'blocked', steps: 5 },
  'T-1': { id: 'T-1', title: 'Landing page', milestone: 'Launch', status: 'done', steps: 3 },
  'T-2': { id: 'T-2', title: 'Pricing page', milestone: 'Launch', status: 'in_progress', steps: 5 },
};
const KNOWLEDGE = [
  {
    source: 'auth-notes.md',
    text: 'T-7 is blocked: the OAuth redirect URI does not match the registered callback.',
  },
  { source: 'launch-plan.md', text: 'Launch milestone targets the end of the quarter.' },
];

const TOOLS: Tool[] = [
  tool(
    'list_tasks',
    'List the tasks in a milestone (id, title, status).',
    z.object({ milestone: z.string() }),
    ({ milestone }) =>
      Object.values(TASKS)
        .filter((t) => t.milestone.toLowerCase() === milestone.toLowerCase())
        .map(({ id, title, status }) => ({ id, title, status })),
  ),
  tool(
    'get_task',
    'Get one task by id, including its step count.',
    z.object({ taskId: z.string() }),
    ({ taskId }) => TASKS[taskId] ?? { error: `no task ${taskId}` },
  ),
  tool(
    'search_knowledge',
    'Search the project knowledge base.',
    z.object({ query: z.string() }),
    () => KNOWLEDGE,
  ),
];
const TOOL_MAP = new Map(TOOLS.map((t) => [t.def.name, t]));
const SYSTEM =
  'You are the project assistant. Use the tools to look up project data instead of guessing. Answer concisely.';

// ── throwaway bounded loop (the real one is Step 5) ───────────────────────────

type LoopResult = {
  text: string;
  calls: string[];
  problems: string[];
  iterations: number;
  hitCap: boolean;
  usage: Usage;
  ms: number;
};

async function runLoop(prompt: string, maxIterations = 5): Promise<LoopResult> {
  const t0 = performance.now();
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: prompt },
  ];
  const calls: string[] = [];
  const problems: string[] = [];
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  let text = '';

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    text = '';
    const pending: ToolCall[] = [];
    for await (const ev of provider.streamChat({
      model: MODEL,
      messages,
      tools: TOOLS.map((t) => t.def),
      maxTokens: 1500,
    })) {
      if (ev.type === 'text-delta') text += ev.text;
      else if (ev.type === 'tool-call') pending.push(ev.call);
      else if (ev.type === 'usage') {
        usage.inputTokens += ev.usage.inputTokens;
        usage.outputTokens += ev.usage.outputTokens;
      }
    }

    if (pending.length === 0) {
      return {
        text,
        calls,
        problems,
        iterations: iteration,
        hitCap: false,
        usage,
        ms: performance.now() - t0,
      };
    }

    messages.push({ role: 'assistant', content: text, toolCalls: pending });
    // Every tool call id must get a tool message back, even when the call was invalid.
    for (const call of pending) {
      const t = TOOL_MAP.get(call.name);
      if (!t) {
        problems.push(`unknown tool "${call.name}"`);
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          content: JSON.stringify({ error: 'unknown tool' }),
        });
        continue;
      }
      const parsed = t.def.parameters.safeParse(call.args);
      if (!parsed.success) {
        problems.push(`bad args for ${call.name}: ${parsed.error.issues[0]?.message}`);
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          content: JSON.stringify({ error: 'invalid arguments' }),
        });
        continue;
      }
      calls.push(call.name);
      messages.push({
        role: 'tool',
        toolCallId: call.id,
        content: JSON.stringify(t.run(parsed.data)),
      });
    }
  }

  return {
    text,
    calls,
    problems,
    iterations: maxIterations,
    hitCap: true,
    usage,
    ms: performance.now() - t0,
  };
}

// ── spike ─────────────────────────────────────────────────────────────────────

type Scenario = {
  name: string;
  prompt: string;
  minCalls: Record<string, number>;
  maxTotalCalls?: number;
  answer: (text: string) => boolean;
};

const SCENARIOS: Scenario[] = [
  {
    name: 'sequential (list, then search)',
    prompt: 'In the Auth milestone, which task is blocked, and what do our notes say about why?',
    minCalls: { list_tasks: 1, search_knowledge: 1 },
    answer: (t) => /T-7/.test(t) && /redirect/i.test(t),
  },
  {
    name: 'parallel (two get_task)',
    prompt: 'Compare tasks T-1 and T-2: which one has more steps?',
    minCalls: { get_task: 2 },
    answer: (t) => /T-2/.test(t),
  },
  {
    name: 'no tool needed',
    prompt: 'Reply with exactly the word: ready',
    minCalls: {},
    maxTotalCalls: 0,
    answer: (t) => /ready/i.test(t),
  },
];

function judge(s: Scenario, r: LoopResult): string | null {
  if (r.hitCap) return 'hit iteration cap';
  if (r.problems.length) return r.problems[0] ?? 'tool problem';
  for (const [name, min] of Object.entries(s.minCalls)) {
    if (r.calls.filter((c) => c === name).length < min) return `expected >=${min} ${name}`;
  }
  if (s.maxTotalCalls !== undefined && r.calls.length > s.maxTotalCalls)
    return 'called a tool it did not need';
  if (!s.answer(r.text)) return 'answer not grounded in tool results';
  return null;
}

const pct = (xs: number[], p: number) =>
  [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))] ?? 0;

async function spike() {
  const runs = Number(flag('runs', '30'));
  const only = Number(flag('only', '0'));
  const scenarios = SCENARIOS.filter((_, i) => !only || i + 1 === only);
  console.log(`spike: model=${MODEL} runs=${runs}\n`);

  let passed = 0;
  let total = 0;
  for (const s of scenarios) {
    const failures = new Map<string, number>();
    const ms: number[] = [];
    const iters: number[] = [];
    let ok = 0;
    let tokens = 0;
    for (let i = 0; i < runs; i++) {
      try {
        const r = await runLoop(s.prompt);
        const why = judge(s, r);
        if (why) failures.set(why, (failures.get(why) ?? 0) + 1);
        else ok++;
        ms.push(r.ms);
        iters.push(r.iterations);
        tokens += r.usage.inputTokens + r.usage.outputTokens;
      } catch (err) {
        const why = `threw: ${err instanceof Error ? err.message.slice(0, 80) : String(err)}`;
        failures.set(why, (failures.get(why) ?? 0) + 1);
      }
    }
    passed += ok;
    total += runs;
    console.log(
      `${ok === runs ? 'PASS' : 'FAIL'}  ${s.name}: ${ok}/${runs}` +
        `  p50 ${Math.round(pct(ms, 0.5))}ms  p95 ${Math.round(pct(ms, 0.95))}ms` +
        `  avg iterations ${(iters.reduce((a, b) => a + b, 0) / Math.max(1, iters.length)).toFixed(1)}` +
        `  avg tokens ${Math.round(tokens / runs)}`,
    );
    for (const [why, n] of failures) console.log(`        x${n} ${why}`);
  }
  const rate = passed / Math.max(1, total);
  console.log(`\noverall ${passed}/${total} (${(rate * 100).toFixed(0)}%)`);
  console.log(
    rate >= 0.9
      ? 'verdict: OK to build Step 5 on this model'
      : 'verdict: below 90%, try deepseek-v4-pro (--model) before Step 5',
  );
  process.exit(rate >= 0.9 ? 0 : 1);
}

await spike();
