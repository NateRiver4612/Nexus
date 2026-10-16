import { createTavilyProvider } from './src/modules/ai/providers/tavily/index.ts';

const main = async () => {
  const provider = createTavilyProvider();

  const { requestId } = await provider.startResearch({
    prompt: 'Best practices for BullMQ job retries and backoff',
    model: 'mini',
    outputSchema: {
      properties: { summary: { type: 'string', description: 'A short summary of the findings' } },
      required: ['summary'],
    },
  });

  while (true) {
    const result = await provider.getResearch({ requestId });

    if (result.status !== 'in_progress') {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
