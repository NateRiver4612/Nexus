'use client';

import DifficultyIndicator from '@/components/DifficultyIndicator';
import Status from '@/components/Status';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetTask } from '@/hooks/useTasks';
import { ChevronRight, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { use } from 'react';

const tabs = [
  { href: 'overview', label: 'Overview' },
  { href: 'note', label: 'Note' },
];

const layout = ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ taskId: string }>;
}) => {
  const { taskId } = use(params);

  const { data: task } = useGetTask({
    variables: taskId,
  });

  const project = task?.project;
  const milestone = task?.milestone;

  const router = useRouter();
  const pathname = usePathname();

  const segments = pathname.split('/');
  const activeTab = tabs.find((t) => segments.includes(t.href))?.href ?? 'overview';

  if (!task || !project) {
    return <></>;
  }

  return (
    <div className="space-y-6">
      <div className="flex text-sm flex-wrap items-center text-gray-400 gap-1">
        <Link
          href={`/projects/${project.id}`}
          className="cursor-pointer whitespace-nowrap text-gray-400 font-normal hover:underline"
        >
          {project?.name}
        </Link>
        <ChevronRight size={18}></ChevronRight>
        <p className="cursor-pointer whitespace-nowrap text-gray-400 font-normal hover:underline">
          {milestone?.title}
        </p>
        <ChevronRight size={18}></ChevronRight>
        <p className="text-foreground break-all">{task?.title}</p>
      </div>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold">{task?.title}</h1>
          <div>
            <DifficultyIndicator difficulty={task.difficulty} />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Progress value={task.progress}></Progress>
          <p className="text-sm whitespace-nowrap">{task.progress} %</p>
        </div>

        <div className="flex items-center gap-6">
          <Status size="sm" status={task.status}></Status>

          <div className="flex text-sm text-gray-400 items-center gap-2">
            <Clock size={16}></Clock>
            <p>{task.estimatedTimeMinutes ?? '--'} mins</p>
          </div>
          <div className="flex text-sm text-gray-400 items-center gap-2">
            <User size={16}></User>
            <p>{task.createdBy.name ?? '--'}</p>
          </div>
        </div>
      </header>
      <Tabs value={activeTab}>
        <TabsList>
          {tabs.map((item) => (
            <Link key={item.href} href={`/tasks/${taskId}/${item.href}`}>
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
};

export default layout;
