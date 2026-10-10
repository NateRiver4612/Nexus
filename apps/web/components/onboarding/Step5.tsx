'use client';

import type { OnboardingStateType } from '@nexus/types';
import { SourceList } from '../knowledge/SourceList';

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className=" text-foreground">{value || '—'}</dd>
    </div>
  );
}

export function Step5({ state, projectId }: { state?: OnboardingStateType; projectId: string }) {
  const stepData = state?.stepData;

  return (
    <dl className="space-y-6 text-left">
      <Row label="Project name" value={stepData?.step1?.name} />
      <Row label="Category" value={stepData?.step1?.category} />
      <Row label="Goal" value={stepData?.step2?.context} />
      <Row label="Level" value={stepData?.step2?.level} />
      <div className="flex flex-col gap-1">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Deliverables</dt>
        <dd className=" text-foreground">
          {stepData?.step4?.deliverables?.map((item) => item.name).join(', ') || '—'}
        </dd>
      </div>
      <div className="flex flex-col gap-2">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Knowlegde Sources</dt>
        <SourceList projectId={projectId} showEmptyText={false} onlyView></SourceList>
      </div>
    </dl>
  );
}
