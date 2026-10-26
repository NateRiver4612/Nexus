import type { ProjectDetailType } from '@nexus/types';
import { BookOpenText, Flag, Newspaper, Package, SquareCheckBig } from 'lucide-react';
import Overview from '../Overview';
import { Skeleton } from '../ui/skeleton';

type ProjectSummaryProps = {
  data?: ProjectDetailType;
  isLoading?: boolean;
  className?: string;
};

function formatDate(date: string | null) {
  if (!date) return 'Not opened yet';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

const STAT_ITEMS = [
  { label: 'Tasks', icon: SquareCheckBig },
  { label: 'Milestones', icon: Flag },
  { label: 'Artifacts', icon: Newspaper },
  { label: 'Knowledge', icon: BookOpenText },
  { label: 'Deliverables', icon: Package },
] as const;

const ProjectGeneralSkeleton = ({ className = '' }: { className?: string }) => {
  return (
    <section
      aria-label="Project summary"
      className={`rounded-xl border border-border bg-card p-5 ${className}`}
    >
      <div>
        <h2 className="text-base font-semibold tracking-tight text-foreground">Overview</h2>
        <div className="mt-1 space-y-1">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex font-bold text-foreground capitalize items-center gap-1.5">
          Category: <Skeleton className="inline-block h-4 w-20 align-middle" />
        </span>

        <span className="inline-flex items-center gap-1">
          Last opened: <Skeleton className="inline-block h-4 w-24 align-middle" />
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_ITEMS.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-lg flex justify-between border border-border bg-muted/30 px-3 py-3"
            >
              <div className="flex flex-col">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <Skeleton className="mt-1 h-7 w-10" />
              </div>
              <div className="text-muted-foreground">
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export function ProjectGeneral({ data, isLoading, className = '' }: ProjectSummaryProps) {
  if (isLoading || !data) {
    return <ProjectGeneralSkeleton className={className} />;
  }

  const {
    category,
    lastOpenedAt,
    numOfTasks,
    summary,
    numOfCompletedTasks,
    numOfMilestones,
    numOfArtifacts,
    numOfDeliverables,
    numOfKnowledgeSources,
  } = data;

  const values: Record<string, string | number> = {
    Tasks: `${numOfCompletedTasks} / ${numOfTasks}`,
    Milestones: numOfMilestones,
    Artifacts: numOfArtifacts,
    Knowledge: numOfKnowledgeSources,
    Deliverables: numOfDeliverables,
  };

  const stats = STAT_ITEMS.map((item) => ({ ...item, value: values[item.label] }));

  return (
    <section
      aria-label="Project summary"
      className={`rounded-xl border border-border bg-card p-5 ${className}`}
    >
      <Overview data={summary?.overview}></Overview>
      {/* Project metadata */}
      <div className="mt-4 flex flex-wrap justify-between items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex font-bold text-foreground capitalize items-center gap-1.5">
          Category: {category}
        </span>

        <span>Last opened: {lastOpenedAt ? formatDate(lastOpenedAt) : '--'}</span>
      </div>

      {/* Statistics */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-lg flex justify-between border border-border bg-muted/30 px-3 py-3"
            >
              <div className="flex flex-col">
                <p className="text-xs text-muted-foreground">{stat.label}</p>

                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className="text-muted-foreground">
                <Icon size={18} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default ProjectGeneral;
