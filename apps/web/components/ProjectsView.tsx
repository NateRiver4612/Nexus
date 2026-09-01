'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

import type { Project } from '@nexus/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useGetProjects } from '@/hooks/useProjects';

import { ProjectCard } from './ProjectCard';
import { useRouter } from 'next/navigation';

const sampleProjects: Project[] = Array.from({ length: 4 }, (i) => ({
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' + i,
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
  useGetProjects();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('active');

  const projects = sampleProjects;

  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button onClick={() => router.push('/new-project')}>Create New</Button>
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
        <TabsContent value="active">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project, index) => (
              <ProjectCard key={project.id + index} project={project} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="shared">
          <p className="mt-8 text-center text-sm text-muted-foreground">No projects found.</p>
        </TabsContent>
        <TabsContent value="archived">
          <p className="mt-8 text-center text-sm text-muted-foreground">No projects found.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
