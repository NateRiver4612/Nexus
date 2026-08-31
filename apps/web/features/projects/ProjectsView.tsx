'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import type { Project } from '@nexus/types';
import { Button, Input, Tabs, TabsList, TabsTrigger } from '@nexus/ui';

import { useProjects } from '@/hooks';

import { ProjectCard } from './ProjectCard';

const sampleProjects: Project[] = Array.from({ length: 4 }, () => ({
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  name: 'Market Research',
  slug: 'market-research',
  description: 'Review Executive Summary',
  status: 'active',
  createdAt: '2026-08-12T00:00:00.000Z',
  updatedAt: '2026-08-12T00:00:00.000Z',
}));

const tabs = [
  { value: 'active', label: 'Active' },
  { value: 'shared', label: 'Shared' },
  { value: 'archived', label: 'Archived' },
];

export function ProjectsView() {
  const { data } = useProjects();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('active');

  const projects = Array.isArray(data) && data.length > 0 ? data : sampleProjects;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesTab =
        tab === 'active'
          ? project.status === 'active'
          : tab === 'archived'
            ? project.status === 'archived'
            : true;
      const matchesQuery =
        !q ||
        project.name.toLowerCase().includes(q) ||
        project.slug.toLowerCase().includes(q) ||
        (project.description ?? '').toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [projects, query, tab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button>Create New</Button>
      </div>

      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search..."
          className="pl-9"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {tabs.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">No projects found.</p>
      )}
    </div>
  );
}
