'use client';
import Status from '@/components/Status';
import { EditableProjectTitle } from '@/components/project/EditableProjectTitle';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetProjectById } from '@/hooks/useProjects';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { use } from 'react';

const tabs = [
  { href: 'overview', label: 'Overview' },
  { href: 'planner', label: 'Planner' },
  { href: 'artifacts', label: 'Artifacts' },
  { href: 'knowledge', label: 'Knowledge' },
  { href: 'activity', label: 'Activity' },
  { href: 'settings', label: 'Settings' },
];

const ProjectNameSkeleton = () => {
  return <Skeleton className="h-5 w-40" />;
};

const ProjectHeaderSkeleton = () => {
  return (
    <header>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex items-center gap-6">
          <Skeleton className="h-1 flex-1 rounded-full" />
          <Skeleton className="h-5 w-10" />
        </div>
      </div>
    </header>
  );
};

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  const { data: project, isLoading } = useGetProjectById({
    variables: projectId,
  });

  const router = useRouter();
  const pathname = usePathname();

  const segments = pathname.split('/');
  const activeTab = tabs.find((t) => segments.includes(t.href))?.href ?? 'overview';

  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <p
            onClick={() => router.push('/projects')}
            className="cursor-pointer text-gray-400 font-normal hover:underline"
          >
            Projects
          </p>
          <p>/</p>
          {isLoading || !project ? <ProjectNameSkeleton /> : <p>{project.name}</p>}
        </div>
      </div>
      {isLoading || !project ? (
        <ProjectHeaderSkeleton />
      ) : (
        <header>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <EditableProjectTitle projectId={projectId} name={project.name} />
              <Status status={project.status} size="sm"></Status>
            </div>
            <div className="flex items-center gap-6">
              <Progress value={project.progressPercentage}></Progress>
              <p className="text-sm whitespace-nowrap">{project.progressPercentage} %</p>
            </div>
          </div>
        </header>
      )}
      <Tabs value={activeTab}>
        <TabsList>
          {tabs.map((item) => (
            <Link key={item.href} href={`/projects/${projectId}/${item.href}`}>
              <TabsTrigger key={item.href} value={item.href}>
                {item.label}
              </TabsTrigger>
            </Link>
          ))}
        </TabsList>
      </Tabs>
      <div className="overflow-y-auto no-scrollbar min-h-0 flex-1">{children}</div>
    </div>
  );
}
