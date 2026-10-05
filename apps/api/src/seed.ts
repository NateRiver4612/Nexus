import {
  activities,
  aiSuggestions,
  artifactVersions,
  artifacts,
  calendarEvents,
  conversations,
  deliverables,
  getDb,
  knowledgeCollections,
  knowledgeSources,
  messages,
  milestones,
  notifications,
  projectMembers,
  projects,
  tasks,
  users,
  workspaceMembers,
  workspaces,
} from '@nexus/db';

import { DELIVERABLE_DEFINITIONS } from '@nexus/zod-schemas/constants';

const db = getDb();

const authorId = 'a0f5634e-3f1c-4b8e-9c2a-000000000001';

async function main() {
  console.log('Seeding database…');

  const tables = [
    messages,
    conversations,
    artifactVersions,
    artifacts,
    calendarEvents,
    knowledgeSources,
    knowledgeCollections,
    deliverables,
    tasks,
    milestones,
    projectMembers,
    projects,
    workspaceMembers,
    aiSuggestions,
    activities,
    notifications,
    workspaces,
    users,
  ];
  for (const table of tables) {
    await db.delete(table);
  }

  await db.insert(users).values({ id: authorId, email: 'seed@nexus.local', name: 'Seed User' });

  const workspace = (
    await db
      .insert(workspaces)
      .values({ name: 'Personal', slug: 'personal', createdBy: authorId })
      .returning()
  )[0]!;

  await db
    .insert(workspaceMembers)
    .values({ workspaceId: workspace.id, userId: authorId, role: 'owner' });

  const project = (
    await db
      .insert(projects)
      .values({
        workspaceId: workspace.id,
        name: 'Nexus',
        slug: 'nexus',
        description: 'Modular monolith for planning and collaboration',
        status: 'active',
        createdBy: authorId,
      })
      .returning()
  )[0]!;

  await db
    .insert(projectMembers)
    .values({ projectId: project.id, userId: authorId, role: 'owner' });

  // System-seeded deliverable presets — global catalog (no projectId, no createdBy).
  await db.insert(deliverables).values(
    DELIVERABLE_DEFINITIONS.map((definition) => ({
      name: definition.label,
      kind: definition.kind,
      isCustom: false,
      isSystem: true,
    })),
  );

  const milestone = (
    await db
      .insert(milestones)
      .values({
        projectId: project.id,
        title: 'Foundation',
        description: 'Core setup',
        position: 0,
        status: 'active',
      })
      .returning()
  )[0]!;

  const task = (
    await db
      .insert(tasks)
      .values({
        projectId: project.id,
        milestoneId: milestone.id,
        title: 'Set up Postgres',
        status: 'completed',
        createdBy: authorId,
      })
      .returning()
  )[0]!;

  await db.insert(tasks).values({
    projectId: project.id,
    milestoneId: milestone.id,
    title: 'Wire Better Auth',
    status: 'todo',
    priority: 'high',
    createdBy: authorId,
  });

  const collection = (
    await db
      .insert(knowledgeCollections)
      .values({ projectId: project.id, name: 'Research', description: 'Source material' })
      .returning()
  )[0]!;

  await db.insert(knowledgeSources).values({
    projectId: project.id,
    collectionId: collection.id,
    sourceType: 'file',
    name: 'stack-notes.pdf',
    mimeType: 'application/pdf',
    storageKey: 'knowledge/seed/stack-notes.pdf',
    sizeBytes: 1024,
    status: 'ready',
    createdBy: authorId,
  });

  const artifact = (
    await db
      .insert(artifacts)
      .values({
        projectId: project.id,
        name: 'Executive Summary',
        type: 'report',
        status: 'ready',
        createdBy: authorId,
      })
      .returning()
  )[0]!;

  await db.insert(artifactVersions).values({
    artifactId: artifact.id,
    version: 1,
    storageKey: 'artifacts/seed/exec-summary-v1.pdf',
    mimeType: 'application/pdf',
    size: 2048,
    createdBy: authorId,
  });

  await db.insert(notifications).values({
    userId: authorId,
    type: 'artifact_ready',
    title: 'Executive Summary ready',
    resourceType: artifact.id,
    resourceId: artifact.id,
  });

  await db.insert(activities).values({
    projectId: project.id,
    userId: authorId,
    type: 'project_created',
    entityType: 'project',
    entityId: project.id,
  });

  const conversation = (
    await db
      .insert(conversations)
      .values({ projectId: project.id, userId: authorId, title: 'Kickoff' })
      .returning()
  )[0]!;

  await db
    .insert(messages)
    .values({ conversationId: conversation.id, role: 'user', content: 'Welcome to Nexus' });

  await db.insert(aiSuggestions).values({
    projectId: project.id,
    type: 'generate_artifact',
    title: 'Generate presentation from the current report',
    description: 'Found enough source material to build a slide deck.',
  });

  await db.insert(calendarEvents).values({
    workspaceId: workspace.id,
    projectId: project.id,
    title: 'Milestone review',
    startAt: new Date(),
    endAt: new Date(Date.now() + 60 * 60 * 1000),
    createdBy: authorId,
  });

  // referenced for future resume-working demo
  console.log('Seeded. project:', project.id, 'task:', task.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$client.end();
  });
