'use client';

import type { OnboardingStateType } from '@nexus/types';

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value || '—'}</dd>
    </div>
  );
}

export function Step5({ state }: { state?: OnboardingStateType }) {
  const stepData = state?.stepData;

  return (
    <dl className="space-y-4 text-left">
      <Row label="Project name" value={state?.name ?? stepData?.step1?.name} />
      <Row label="Category" value={stepData?.step1?.category} />
      <Row label="Goal" value={stepData?.step2?.context} />
      <div className="flex flex-col gap-1">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Goals</dt>
        <dd className="text-sm text-foreground">{stepData?.step2?.goals?.join(', ') || '—'}</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Deliverables
        </dt>
        <dd className="text-sm text-foreground">
          {stepData?.step4?.deliverables?.join(', ') || '—'}
        </dd>
      </div>
    </dl>
  );
}
