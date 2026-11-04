export type SSEMessage = { event: string; data: string };

// Input:
//   "
//    event: text-delta
//    data: {"text":"Hello"}
//   "
//
// Output:
//   { event: 'text-delta', data: '{"text":"Hello"}' }
function parseBlock(block: string): SSEMessage | null {
  let event = 'message';
  const data: string[] = [];

  for (const line of block.split('\n')) {
    // Input: ": keep-alive"
    // Output: ignored
    if (line.startsWith(':')) continue; // comment / keep-alive

    // Input: "event: text-delta"
    // field = "event"
    // value = "text-delta"
    //
    // Input: 'data: {"text":"Hello"}'
    // field = "data"
    // value = '{"text":"Hello"}'
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');

    // Input: "event: text-delta"
    // Result: event = "text-delta"
    if (field === 'event') event = value;

    // Input: 'data: {"text":"Hello"}'
    // Result: data = ['{"text":"Hello"}']
    else if (field === 'data') data.push(value);
  }

  // Input:
  //   event: text-delta
  //   data: {"text":"Hello"}
  //
  // Output:
  //   {
  //     event: "text-delta",
  //     data: '{"text":"Hello"}'
  //   }
  return data.length > 0 ? { event, data: data.join('\n') } : null;
}

/**
 * Reads a `text/event-stream` body. `EventSource` can't POST, so chat streams through
 * `fetch` and this parser. Leaving the loop early cancels the underlying request.
 */
export async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<SSEMessage> {
  // Raw response body:
  //   Uint8Array
  //
  // After TextDecoderStream:
  //   "event: text-delta\ndata: {\"text\":\"Hello\"}\n\n"
  const reader = body
    .pipeThrough(new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>)
    .getReader();

  // Keeps incomplete SSE messages between network chunks.
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // Example chunks may arrive separately:
      //
      // chunk 1:
      //   "event: text-delta\ndata: {\"text\":\"Hel"
      //
      // chunk 2:
      //   "lo\"}\n\n"
      //
      // Combined buffer:
      //   "event: text-delta\ndata: {\"text\":\"Hello\"}\n\n"
      //
      // Also normalises:
      //   "\r\n" → "\n"
      buffer = (buffer + value).replace(/\r\n/g, '\n');

      // SSE messages are separated by:
      //   "\n\n"
      //
      // Example:
      //   event: text-delta
      //   data: {"text":"Hello"}
      //
      //   ← boundary is the blank line here
      let boundary = buffer.indexOf('\n\n');

      while (boundary !== -1) {
        // Extract one complete SSE block:
        //
        //   event: text-delta
        //   data: {"text":"Hello"}
        const message = parseBlock(buffer.slice(0, boundary));

        // Remove the processed block + "\n\n".
        // Remaining buffer contains the next SSE message.
        buffer = buffer.slice(boundary + 2);

        // Yields:
        //   { event: 'text-delta', data: '{"text":"Hello"}' }
        if (message) yield message;

        // Check whether the buffer already contains another
        // complete SSE message.
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    // Stops the underlying HTTP request if the caller
    // stops consuming the generator early.
    await reader.cancel().catch(() => undefined);
  }
}
