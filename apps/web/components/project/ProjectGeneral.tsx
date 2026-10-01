import type { ProjectDetailType } from '@nexus/types';
import { BookOpenText, Flag, Newspaper, Package, SquareCheckBig } from 'lucide-react';
import Overview from '../Overview';

interface ProjectSummaryProps {
  data: ProjectDetailType;
  className?: string;
}

function formatDate(date: string | null) {
  if (!date) return 'Not opened yet';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function ProjectGeneral({ data, className = '' }: ProjectSummaryProps) {
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

  const stats = [
    {
      label: 'Tasks',
      value: `${numOfCompletedTasks} / ${numOfTasks}`,
      icon: SquareCheckBig,
    },
    {
      label: 'Milestones',
      value: numOfMilestones,
      icon: Flag,
    },
    {
      label: 'Artifacts',
      value: numOfArtifacts,
      icon: Newspaper,
    },
    {
      label: 'Knowledge',
      value: numOfKnowledgeSources,
      icon: BookOpenText,
    },
    {
      label: 'Deliverables',
      value: numOfDeliverables,
      icon: Package,
    },
  ];

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
