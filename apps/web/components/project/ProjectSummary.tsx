import type { KickoffPlanType } from '@nexus/types';

type AISummaryProps = {
  summary: Omit<KickoffPlanType['summary'], 'overview'> | null;
};

const ProjectSummary = ({ summary }: AISummaryProps) => {
  if (!summary) {
    // @todo: Return skeleton instead
    return <></>;
  }

  return (
    <div className=" rounded-lg border border-border bg-card p-4">
      {summary.keyTopics.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key topics
          </h3>
          <ul className="mt-2 space-y-2">
            {summary.keyTopics.map((topic, index) => (
              <li key={`${topic.topic}-${index}`} className="flex flex-col gap-2 text-sm">
                <span className="shrink-0 font-bold text-black">{topic.topic}:</span>
                <span className="text-muted-foreground">{topic.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.highlights.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-black">Highlights</h3>
          <ul className="mt-2 space-y-1">
            {summary.highlights.map((highlight, index) => (
              <li key={`${highlight}-${index}`} className="flex gap-2 text-sm">
                <span className="select-none text-muted-foreground">–</span>
                <span className="text-muted-foreground">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProjectSummary;
