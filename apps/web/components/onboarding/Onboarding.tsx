'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddSources } from '@/components/knowledge/AddSources';
import { SourceList } from '@/components/knowledge/SourceList';
import { useCreateProject, useGetProjectOnboarding } from '@/hooks/useProjects';
import { FormInput } from '@/components/FormInput';
import { FormProvider, useForm } from 'react-hook-form';
import { onboardingDataSchema } from '@nexus/zod-schemas';
import { CardRadioGroup } from '../CardRadioGroup';
import { DEFAULT_ONBOARDING_CATEGORIES } from '@nexus/zod-schemas/constants';
import { FormTextArea } from '../FormTextArea';

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'project'
  );
}

const steps = [
  {
    title: "Let's start your project",
    description: 'A name and category is all we need to get going.',
  },
  {
    title: 'What are you trying to accomplish?',
    description: 'Describe your goal in your own words.',
  },
  {
    title: 'Add your knowledge sources',
    description: 'Drop in docs, links, and notes — NotebookLM-style.',
  },
  { title: 'Plan your work', description: 'Add the tasks and deliverables to get there.' },
  { title: 'Review and create', description: "Everything looks good. Let's build your project." },
];

export function Onboarding() {
  const router = useRouter();

  const { data: onboardingData } = useGetProjectOnboarding();
  const { mutateAsync: createProject } = useCreateProject();

  const [step, setStep] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLast = step === steps.length - 1;
  const current = steps[step]!;

  const form = useForm({
    defaultValues: {
      step1: { name: '', category: '', description: null },
      step2: { context: '', goals: [] },
      step3: { files: [] },
      step4: { deliverables: [] },
      step5: { taskIds: [], newTasks: [] },
    },
    resolver: zodResolver(onboardingDataSchema),
  });

  const { watch } = form;

  type StepFieldPaths = Extract<
    NonNullable<Parameters<typeof form.trigger>[0]>,
    readonly unknown[]
  >;

  const stepFieldPaths: Record<number, StepFieldPaths> = {
    0: ['step1.name', 'step1.description', 'step1.category'],
    1: ['step2.context', 'step2.goals'],
    2: [], // sources aren't a form field — see below
    3: ['step4.deliverables'],
    4: ['step5.taskIds'],
  };

  async function handleNext() {
    const isValid = await form.trigger(stepFieldPaths[step]);
    if (!isValid) return;

    setError(null);
    if (step === 0) {
      if (!name.trim() || !category.trim()) {
        setError('Enter a project name and category.');
        return;
      }
      setCreating(true);
      try {
        const project = await createProject({
          name: name.trim(),
          slug: slugify(name),
          description: category.trim(),
        });
        setProjectId(project.id);
        setStep((s) => s + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create the project.');
      } finally {
        setCreating(false);
      }
      return;
    }
    if (isLast) {
      router.push(projectId ? `/projects/${projectId}` : '/projects');
      return;
    }
    setStep((s) => s + 1);
  }

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6 text-left">
            <FormInput
              label="Project name"
              placeholder="Market Research Report"
              disabled={creating}
              name={'name'}
            />
            <FormTextArea
              label="Project description"
              placeholder="Describe your project in a few sentences..."
              disabled={creating}
              name={'description'}
            />
            <CardRadioGroup
              name="category"
              label="Category"
              options={DEFAULT_ONBOARDING_CATEGORIES}
              otherValue="other"
              onCreateOption={(newOption) => {
                console.log('New category created:', newOption);
              }}
            />
          </div>
        );
      case 1:
        return (
          <textarea
            aria-label="Project goal"
            rows={6}
            placeholder="Describe your goal in your own words — Nexus will pick up the details."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        );
      case 2:
        if (!projectId) return <p className="text-sm text-muted-foreground">Loading project…</p>;
        return (
          <div className="space-y-5 text-left">
            <AddSources projectId={projectId} />
            <div>
              <h3 className="mb-2 text-sm font-medium text-foreground">Sources</h3>
              <SourceList projectId={projectId} />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="text-left text-sm text-muted-foreground">
            Tasks and deliverables for <span className="font-medium text-foreground">{name}</span>{' '}
            will be set up here. Coming soon.
          </div>
        );
      default:
        return (
          <div className="text-left text-sm text-muted-foreground">
            Project <span className="font-medium text-foreground">{name}</span> is ready. Review and
            lets go.
          </div>
        );
    }
  };

  const { step1 } = watch();

  const name = step1.name || 'Unknown Project';
  const category = step1.category || 'Unknown Category';

  return (
    <FormProvider {...form}>
      <form className="mx-auto w-full max-w-3xl rounded-xl border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">
          Step {step + 1} of {steps.length}
        </p>

        <div className="mt-3 flex gap-1.5">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                index <= step ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>

        <h2 className="mt-6 text-2xl font-semibold">{current.title}</h2>
        <p className="mt-1 text-muted-foreground">{current.description}</p>

        <div className="mt-8 min-h-40 rounded-lg border-border border-dashed p-6 text-center text-sm text-muted-foreground">
          {renderStepContent()}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <Button
              variant="outline"
              className="rounded-full px-5"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
          ) : (
            <span />
          )}

          <Button onClick={handleNext} disabled={creating}>
            {creating ? 'Creating…' : isLast ? 'Finish' : 'Continue'}
            {!creating && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
