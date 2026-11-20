/**
 * Lightweight line scan of streaming markdown: does it end inside an unclosed fenced code block?
 *
 * Input:
 *   text: string — the reply so far, in document order.
 *
 * Output:
 *   boolean — true when the last fence opened has not been closed yet.
 *
 * Examples:
 *   in:  "```stats\n- a: 1\n"                  → out: true   (still streaming)
 *   in:  "```stats\n- a: 1\n```"               → out: false  (closed)
 *   in:  "````stats\n- a: 1\n```\n"            → out: true   (closer shorter than opener)
 *   in:  "```stats\n- a: 1\n~~~\n"             → out: true   (closer uses a different character)
 *   in:  "```stats\n- a: 1\n``` extra\n"       → out: true   (closer has info text)
 *   in:  "```stats `inline`\n- a: 1"           → out: false  (info string has a backtick = inline code)
 *   in:  "    ```stats\n    - a: 1"            → out: false  (4-space indent = code block)
 */
export const endsInsideOpenFence = (text: string): boolean => {
  let open: { char: string; length: number } | null = null;

  for (const line of text.split('\n')) {
    const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!match) continue;

    const marker = match[1]!;
    const rest = match[2]!;

    if (!open) {
      // A backtick fence's info string can't contain backticks; that line is inline code.
      if (marker[0] === '`' && rest.includes('`')) continue;
      open = { char: marker[0]!, length: marker.length };
    } else if (marker[0] === open.char && marker.length >= open.length && rest.trim() === '') {
      open = null;
    }
  }

  return open !== null;
};
