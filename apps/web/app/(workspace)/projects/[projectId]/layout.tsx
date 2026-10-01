'use client';
import Status from '@/components/Status';
import { Progress } from '@/components/ui/progress';
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

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  const { data: project } = useGetProjectById({
    variables: projectId,
  });

  const router = useRouter();
  const pathname = usePathname();

  const segments = pathname.split('/');
  const activeTab = tabs.find((t) => segments.includes(t.href))?.href ?? 'overview';

  const progress = project?.progressPercentage;
  const status = project?.status;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <p
            onClick={() => router.push('/projects')}
            className="cursor-pointer text-gray-400 font-normal hover:underline"
          >
            Projects
          </p>
          <p>/</p>
          <p>{project?.name}</p>
        </div>
      </div>
      <header>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-3xl">{project?.name}</h1>
            <Status status={status ?? 'draft'} size="sm"></Status>
          </div>
          <div className="flex items-center gap-6">
            <Progress value={progress}></Progress>
            <p className="text-sm whitespace-nowrap">{progress} %</p>
          </div>
        </div>
      </header>
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
      {children}
    </div>
  );
}
