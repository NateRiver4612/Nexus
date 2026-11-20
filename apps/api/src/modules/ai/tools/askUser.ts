import { z } from '@hono/zod-openapi';

import { chatQuestionsSchema } from '@nexus/zod-schemas';

import { defineTool } from '../types';

export const askUserTool = defineTool({
  name: 'ask_user',
  label: 'Preparing a question…',
  description:
    "Ask the user 1 to 3 short questions when you cannot continue without their answer and neither the project, the files nor your other tools can tell you. They appear as tappable choice cards (kind single or multiple, with 2 to 4 options) or a text box (kind text), and the user's answer arrives as their next message. Never use it to ask permission, to confirm something you could just do, or to offer a menu of next steps. Call it at most once per reply, and write nothing after it.",
  parameters: z.object({ questions: chatQuestionsSchema }),
  async run({ args }) {
    return {
      content:
        "The questions are now on the user's screen. Write nothing more this turn; their answer will arrive as their next message.",
      questions: args.questions,
      endsTurn: true,
    };
  },
});
