import { describe, expect, test } from 'bun:test';

import { DeepSeekProvider } from '../../../providers/deepseek';
import { DsmlSieve, parseDsmlBlock, type DsmlToolCall } from '../../../providers/deepseek/dsml';
import { collect, fakeStreamingClient, finishChunk, textChunk } from './fixtures';

const D = '｜14731｜';

const block = (invokes: string) => `<${D}tool_calls>${invokes}</${D}tool_calls>`;
const invoke = (name: string, params: string) =>
  `<${D}invoke name="${name}">${params}</${D}invoke>`;
const param = (name: string, value: string, isString = true) =>
  `<${D}parameter name="${name}" string="${isString}">${value}</${D}parameter>`;

describe('parseDsmlBlock', () => {
  test('parses a single invoke with string params', () => {
    const raw = invoke('create_artifact', param('name', 'BRIEF.md') + param('type', 'document'));

    expect(parseDsmlBlock(raw)).toEqual([
      { name: 'create_artifact', args: { name: 'BRIEF.md', type: 'document' } },
    ]);
  });

  test('parses multiple invokes in one block', () => {
    const raw =
      invoke('list_tasks', param('status', 'pending')) + invoke('get_task', param('taskId', 'abc'));

    expect(parseDsmlBlock(raw)).toEqual([
      { name: 'list_tasks', args: { status: 'pending' } },
      { name: 'get_task', args: { taskId: 'abc' } },
    ]);
  });

  test('decodes string="false" params as JSON', () => {
    const raw = invoke(
      'search',
      param('limit', '5', false) + param('tags', '["a","b"]', false) + param('query', 'auth'),
    );

    expect(parseDsmlBlock(raw)).toEqual([
      { name: 'search', args: { limit: 5, tags: ['a', 'b'], query: 'auth' } },
    ]);
  });

  test('accepts bare-token and half-width-bar spellings', () => {
    const bare =
      '<｜DSML｜invoke name="noop"><｜DSML｜parameter name="x" string="true">1</｜DSML｜parameter></｜DSML｜invoke>';
    expect(parseDsmlBlock(bare)).toEqual([{ name: 'noop', args: { x: '1' } }]);

    const half =
      '<|DSML|invoke name="noop"><|DSML|parameter name="x" string="true">1</|DSML|parameter></|DSML|invoke>';
    expect(parseDsmlBlock(half)).toEqual([{ name: 'noop', args: { x: '1' } }]);
  });
});

describe('DsmlSieve', () => {
  test('streams plain text unchanged', () => {
    const sieve = new DsmlSieve();

    expect(sieve.push('Hello there.')).toEqual({ text: 'Hello there.', calls: [] });
    expect(sieve.flush()).toEqual({ text: '', calls: [] });
  });

  test('streams the preamble and parses the block', () => {
    const sieve = new DsmlSieve();

    const out = sieve.push(
      "I'll save that.\n\n" + block(invoke('create_artifact', param('name', 'BRIEF.md'))),
    );

    expect(out.text).toBe("I'll save that.\n\n");
    expect(out.calls).toEqual([{ name: 'create_artifact', args: { name: 'BRIEF.md' } }]);
  });

  test('never leaks markup when the block is split across chunks', () => {
    const sieve = new DsmlSieve();
    const chunks = [
      'Hel',
      'lo <',
      '147',
      '31tool_calls>',
      `<${D}invoke name="noop">`,
      `<${D}parameter name="x" string="true">1</${D}parameter>`,
      `</${D}invoke>`,
      `</${D}tool_calls>`,
    ];

    let text = '';
    const calls: DsmlToolCall[] = [];
    for (const chunk of chunks) {
      const out = sieve.push(chunk);
      text += out.text;
      calls.push(...out.calls);
    }
    const tail = sieve.flush();
    text += tail.text;
    calls.push(...tail.calls);

    expect(text).toBe('Hello ');
    expect(text).not.toContain('14731');
    expect(calls).toEqual([{ name: 'noop', args: { x: '1' } }]);
  });

  test('parses a block cut off before its close tag (best effort)', () => {
    const sieve = new DsmlSieve();

    sieve.push(block(invoke('noop', param('x', '1'))).replace(`</${D}tool_calls>`, ''));
    const tail = sieve.flush();

    expect(tail.text).toBe('');
    expect(tail.calls).toEqual([{ name: 'noop', args: { x: '1' } }]);
  });
});

describe('streamChat DSML', () => {
  test('turns DSML content into text + tool-call + finish tool_calls', async () => {
    const provider = new DeepSeekProvider(() =>
      fakeStreamingClient([
        textChunk("I'll save that.\n\n"),
        textChunk(block(invoke('create_artifact', param('name', 'BRIEF.md')))),
        finishChunk('stop'),
      ]),
    );

    const events = await collect(
      provider.streamChat({
        model: 'test-model',
        messages: [{ role: 'user', content: 'save it' }],
      }),
    );

    const text = events.flatMap((e) => (e.type === 'text-delta' ? [e.text] : [])).join('');
    expect(text).toBe("I'll save that.\n\n");
    expect(text).not.toContain('14731');

    const toolCall = events.find((e) => e.type === 'tool-call');
    expect(toolCall).toBeDefined();
    expect(toolCall).toMatchObject({
      type: 'tool-call',
      call: { name: 'create_artifact', args: { name: 'BRIEF.md' } },
    });
    expect(events.at(-1)).toEqual({ type: 'finish', reason: 'tool_calls' });
  });
});
