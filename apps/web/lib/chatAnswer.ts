import type { ChatQuestionsType } from '@nexus/types';

/** One answer per question id: the chosen label(s), or the free text. */
export type QuestionAnswers = Record<string, string>;

/**
 * Formats a question set the way it goes back as an ordinary user message:
 * "Level: Beginner · Time: 30 min/day". Unanswered questions are omitted.
 */
export const formatQuestionAnswers = ({
  questions,
  answers,
}: {
  questions: ChatQuestionsType;
  answers: QuestionAnswers;
}): string =>
  questions
    .flatMap((question) => {
      const answer = answers[question.id]?.trim();
      return answer ? [`${question.prompt}: ${answer}`] : [];
    })
    .join('\n');
