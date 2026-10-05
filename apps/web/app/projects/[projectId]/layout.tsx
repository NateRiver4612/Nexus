import Link from 'next/link';
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
  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Project</h1>
        <p className="text-sm text-muted-foreground">{projectId}</p>
      </header>
      <nav className="flex gap-1 border-b-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={`/projects/${projectId}/${tab.href}`}
            className="px-3 py-2 text-sm hover:bg-accent"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
