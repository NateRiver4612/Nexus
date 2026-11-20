import { describe, expect, test } from 'bun:test';

import { endsInsideOpenFence } from './markdownFence';

describe('endsInsideOpenFence', () => {
  test('is false when every fence is closed', () => {
    expect(endsInsideOpenFence('```stats\n- a: 1\n```\ntail')).toBe(false);
  });

  test('is true when the last fence is still open', () => {
    expect(endsInsideOpenFence('```stats\n- a: 1\n')).toBe(true);
  });

  test('supports tilde fences', () => {
    expect(endsInsideOpenFence('~~~stats\na: 1')).toBe(true);
  });

  test('closes on a fence at least as long as the opening one', () => {
    expect(endsInsideOpenFence('````stats\nx\n`````')).toBe(false);
  });

  test('does not treat a line with backticks in the info string as a fence', () => {
    expect(endsInsideOpenFence('```stats `inline`\n- a: 1')).toBe(false);
  });

  test('detects a later open fence after a closed one', () => {
    expect(endsInsideOpenFence('```stats\nx\n```\n```yaml\na: 1')).toBe(true);
  });

  test('detects an open fence nested in a list', () => {
    expect(endsInsideOpenFence('- item\n  ```stats\n  a: 1')).toBe(true);
  });

  test('ignores a four-space indented code block', () => {
    expect(endsInsideOpenFence('    ```stats\n    a: 1')).toBe(false);
  });

  test('ignores inline triple backticks', () => {
    expect(endsInsideOpenFence('text ```stats``` more')).toBe(false);
  });
});
