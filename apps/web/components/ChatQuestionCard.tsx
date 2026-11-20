'use client';

import type { ChatQuestionType, ChatQuestionsType } from '@nexus/types';
import { Check } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatQuestionAnswers, type QuestionAnswers } from '@/lib/chatAnswer';
import { cn } from '@/lib/utils';
import { useChatSend } from './ChatSendContext';

type ChatQuestionCardProps = {
  questions: ChatQuestionsType;
  /** A later user message already exists, so the card is locked. */
  answered?: boolean;
  /** The later user message content, shown once answered. */
  answer?: string;
};

const OptionIndicator = ({ selected, multiple }: { selected: boolean; multiple: boolean }) => (
  <span
    className={cn(
      'mt-0.5 flex size-4 shrink-0 items-center justify-center border',
      multiple ? 'rounded-sm' : 'rounded-full',
      selected ? 'border-action bg-action text-action-foreground' : 'border-border',
    )}
    aria-hidden
  >
    {selected && <Check className="size-3" />}
  </span>
);

const optionClass = (selected: boolean) =>
  cn(
    'flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/70',
    'disabled:cursor-not-allowed disabled:opacity-60',
    selected ? 'border-action bg-action/10' : 'border-border bg-surface hover:border-placeholder',
  );

export const ChatQuestionCard = ({ questions, answered, answer }: ChatQuestionCardProps) => {
  const { send, disabled } = useChatSend();

  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [others, setOthers] = useState<Record<string, string>>({});
  const [otherOpen, setOtherOpen] = useState<Record<string, boolean>>({});

  if (questions.length === 0) return null;

  const locked = Boolean(answered) || disabled;

  const answers: QuestionAnswers = {};
  for (const question of questions) {
    if (question.kind === 'text') {
      answers[question.id] = texts[question.id]?.trim() ?? '';
      continue;
    }

    const picked = selected[question.id] ?? [];
    const other = otherOpen[question.id] ? (others[question.id]?.trim() ?? '') : '';
    answers[question.id] = [...picked, ...(other ? [other] : [])].join(', ');
  }

  const complete = questions.every((question) => Boolean(answers[question.id]?.trim()));
  const onlyQuestion = questions.length === 1 ? questions[0] : undefined;
  // A single single-choice question is answerable in one tap. Other/typed answers still use Send.
  const autoSend =
    onlyQuestion !== undefined && onlyQuestion.kind === 'single' && !otherOpen[onlyQuestion.id];

  const choose = (question: ChatQuestionType, label: string) => {
    if (locked) return;

    if (question.kind === 'multiple') {
      setSelected((current) => {
        const picked = current[question.id] ?? [];
        return {
          ...current,
          [question.id]: picked.includes(label)
            ? picked.filter((value) => value !== label)
            : [...picked, label],
        };
      });
      return;
    }

    setSelected((current) => ({ ...current, [question.id]: [label] }));
    setOtherOpen((current) => ({ ...current, [question.id]: false }));

    // A normal option replaces an open Other, so this is safe even if Other was showing.
    if (questions.length === 1) {
      send(label);
    }
  };

  const toggleOther = (question: ChatQuestionType) => {
    if (locked) return;

    // Single choice has one slot: opening Other replaces the picked option.
    if (question.kind === 'single') {
      setSelected((current) => ({ ...current, [question.id]: [] }));
    }
    setOtherOpen((current) => ({ ...current, [question.id]: !current[question.id] }));
  };

  const submit = () => {
    if (locked || !complete) return;
    send(formatQuestionAnswers({ questions, answers }));
  };

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">
        {questions.length > 1 ? 'A few questions' : 'One quick question'}
      </p>

      {questions.map((question) => {
        const isOtherOpen = otherOpen[question.id] ?? false;
        const multiple = question.kind === 'multiple';

        return (
          <div key={question.id} className="space-y-2">
            <p className="text-sm font-medium">{question.prompt}</p>
            {multiple && <p className="text-xs text-muted-foreground">Select all that apply.</p>}

            {question.kind === 'text' ? (
              <Textarea
                value={texts[question.id] ?? ''}
                onChange={(event) =>
                  setTexts((current) => ({ ...current, [question.id]: event.target.value }))
                }
                placeholder="Type your answer…"
                rows={2}
                disabled={locked}
                className="min-h-20"
                aria-label={question.prompt}
              />
            ) : (
              <div
                role={multiple ? 'group' : 'radiogroup'}
                aria-label={question.prompt}
                className="flex flex-col gap-1.5"
              >
                {(question.options ?? []).map((option) => {
                  const isSelected =
                    question.kind === 'single'
                      ? selected[question.id]?.[0] === option.label
                      : (selected[question.id] ?? []).includes(option.label);

                  return (
                    <button
                      key={option.label}
                      type="button"
                      role={multiple ? undefined : 'radio'}
                      aria-checked={multiple ? undefined : isSelected}
                      aria-pressed={multiple ? isSelected : undefined}
                      disabled={locked}
                      onClick={() => choose(question, option.label)}
                      className={optionClass(isSelected)}
                    >
                      <OptionIndicator selected={isSelected} multiple={multiple} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{option.label}</span>
                        {option.description && (
                          <span className="block text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}

                {question.allowOther && (
                  <button
                    type="button"
                    role={multiple ? undefined : 'radio'}
                    aria-checked={multiple ? undefined : isOtherOpen}
                    aria-pressed={multiple ? isOtherOpen : undefined}
                    disabled={locked}
                    onClick={() => toggleOther(question)}
                    className={optionClass(isOtherOpen)}
                  >
                    <OptionIndicator selected={isOtherOpen} multiple={multiple} />
                    <span className="text-sm font-medium">Other</span>
                  </button>
                )}
              </div>
            )}

            {question.allowOther && isOtherOpen && (
              <Textarea
                value={others[question.id] ?? ''}
                onChange={(event) =>
                  setOthers((current) => ({ ...current, [question.id]: event.target.value }))
                }
                placeholder="Type your own answer…"
                rows={2}
                disabled={locked}
                className="min-h-16"
                aria-label={`Other answer for ${question.prompt}`}
              />
            )}
          </div>
        );
      })}

      {answered ? (
        <p className="border-t border-border pt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Answered</span>
          {answer ? `: ${answer}` : ''}
        </p>
      ) : (
        !autoSend && (
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={submit} disabled={locked || !complete}>
              Send answer
            </Button>
          </div>
        )
      )}
    </div>
  );
};
