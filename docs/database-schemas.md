# Database Schemas

## 1. Schema Structure

```tsx
src/db/schema/
│
├── users.ts
├── workspaces.ts
├── projects.ts
├── planner.ts
├── knowledge.ts
├── artifacts.ts
├── conversations.ts
├── calendar.ts
├── notifications.ts
├── activities.ts
└── ai.ts
```

The important rule is:

> **One schema file per domain, not one giant `schema.ts`.**

---

# 2. Identity

## `users`

```tsx
users
├── id
├── email
├── name
├── avatarUrl
├── createdAt
└── updatedAt
```

```tsx
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),

  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

Authentication credentials don't need to live here if you're using an external auth provider.

---

# 3. Workspace

## `workspaces`

```tsx
workspaces
├── id
├── name
├── slug
├── createdAt
└── updatedAt
```

```tsx
export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),

  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## `workspace_members`

```tsx
workspace_members
├── id
├── workspaceId
├── userId
├── role
└── createdAt
```

```tsx
export const workspaceMemberRole = pgEnum('workspace_member_role', ['owner', 'member']);
export const workspaceMembers = pgTable(
  'workspace_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, {
        onDelete: 'cascade',
      }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    role: workspaceMemberRole('role').notNull().default('member'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.workspaceId, table.userId)],
);
```

---

# 4. Projects

## `projects`

This is one of the most important tables in Nexus.

```tsx
projects
├── id
├── workspaceId
├── name
├── slug
├── description
├── readme
├── status
├── startDate
├── targetDate
├── createdBy
├── createdAt
└── updatedAt
```

```tsx
export const projectStatus = pgEnum('project_status', [
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
]);
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, {
        onDelete: 'cascade',
      }),

    name: text('name').notNull(),
    slug: text('slug').notNull(),

    description: text('description'),
    readme: text('readme'),

    status: projectStatus('status').notNull().default('active'),

    startDate: timestamp('start_date'),
    targetDate: timestamp('target_date'),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('projects_workspace_idx').on(table.workspaceId),
    index('projects_status_idx').on(table.status),
    unique().on(table.workspaceId, table.slug),
  ],
);
```

---

# 5. Project Members

```tsx
project_members
├── id
├── projectId
├── userId
├── role
└── createdAt
```

```tsx
export const projectMemberRole = pgEnum('project_member_role', ['owner', 'member']);
export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
      }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    role: projectMemberRole('role').notNull().default('member'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.projectId, table.userId)],
);
```

---

# 6. Planner

Planner is deliberately simple.

```tsx
Project
   │
   ├── Milestones
   │      │
   │      └── Tasks
   │
   └── Current Task
```

## `milestones`

```tsx
export const milestoneStatus = pgEnum('milestone_status', ['pending', 'in_progress', 'completed']);
export const milestones = pgTable(
  'milestones',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
      }),

    title: text('title').notNull(),
    description: text('description'),

    position: integer('position').notNull(),

    status: milestoneStatus('status').notNull().default('pending'),

    dueDate: timestamp('due_date'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('milestones_project_idx').on(table.projectId)],
);
```

---

## `tasks`

```tsx
export const taskStatus = pgEnum('task_status', ['todo', 'in_progress', 'completed', 'cancelled']);
export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
      }),

    milestoneId: uuid('milestone_id').references(() => milestones.id, {
      onDelete: 'set null',
    }),

    title: text('title').notNull(),
    description: text('description'),

    status: taskStatus('status').notNull().default('todo'),

    priority: taskPriority('priority').notNull().default('medium'),

    position: integer('position').notNull(),

    dueDate: timestamp('due_date'),
    completedAt: timestamp('completed_at'),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('tasks_project_idx').on(table.projectId),
    index('tasks_milestone_idx').on(table.milestoneId),
    index('tasks_status_idx').on(table.status),
    index('tasks_due_date_idx').on(table.dueDate),
  ],
);
```

---

# 7. Resume Working

I would **not create a complicated save-point system**.

We can store the user's current position.

```tsx
export const projectProgress = pgTable(
  'project_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
      }),

    currentTaskId: uuid('current_task_id').references(() => tasks.id, {
      onDelete: 'set null',
    }),

    lastOpenedAt: timestamp('last_opened_at'),

    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.projectId)],
);
```

Then:

```tsx
Continue Working
       ↓
project_progress.currentTaskId
       ↓
Task Session
```

This supports the "save point" feeling we discussed without introducing unnecessary complexity.

---

# 8. Knowledge

## `knowledge_collections`

```tsx
export const knowledgeCollections = pgTable(
  'knowledge_collections',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
      }),

    name: text('name').notNull(),
    description: text('description'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('knowledge_collections_project_idx').on(table.projectId)],
);
```

---

# 9. Documents

```tsx
export constdocumentStatus=pgEnum("document_status",
  ["pending","processing","ready","failed",
  ]
);export const documents=pgTable("documents",
  {
    id:uuid("id").defaultRandom().primaryKey(),

    projectId:uuid("project_id").notNull().references(() =>projects.id, {
        onDelete:"cascade",
      }),

    collectionId:uuid("collection_id").references(() =>knowledgeCollections.id, {
        onDelete:"set null",
      }),

    name:text("name").notNull(),
    mimeType:text("mime_type").notNull(),

    storageKey:text("storage_key").notNull(),

    size:bigint("size", {
      mode:"number",
    }),

    status:documentStatus("status").notNull().default("pending"),

    createdBy:uuid("created_by").notNull().references(() =>users.id),

    createdAt:timestamp("created_at").defaultNow().notNull(),
    updatedAt:timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("documents_project_idx").on(table.projectId),index("documents_collection_idx").on(table.collectionId),index("documents_status_idx").on(table.status),
  ]
);

```

---

# 10. Document Chunks + pgvector

```tsx
export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, {
        onDelete: 'cascade',
      }),

    content: text('content').notNull(),

    chunkIndex: integer('chunk_index').notNull(),

    metadata: jsonb('metadata'),

    embedding: vector('embedding', {
      dimensions: 1536,
    }),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('document_chunks_document_idx').on(table.documentId)],
);
```

The `1536` here is an **example**. We should set it to the dimension of whichever embedding model we actually choose.

---

# 11. Artifacts

```tsx
export const artifactType = pgEnum('artifact_type', [
  'report',
  'presentation',
  'spreadsheet',
  'proposal',
  'pdf',
  'document',
  'diagram',
  'study_guide',
]);

export const artifactStatus = pgEnum('artifact_status', ['draft', 'generating', 'ready', 'failed']);

export const artifacts = pgTable(
  'artifacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
      }),

    name: text('name').notNull(),

    type: artifactType('type').notNull(),

    status: artifactStatus('status').notNull().default('draft'),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('artifacts_project_idx').on(table.projectId),
    index('artifacts_type_idx').on(table.type),
  ],
);
```

---

# 12. Artifact Versions

```tsx
export const artifactVersions = pgTable(
  'artifact_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    artifactId: uuid('artifact_id')
      .notNull()
      .references(() => artifacts.id, {
        onDelete: 'cascade',
      }),

    version: integer('version').notNull(),

    storageKey: text('storage_key').notNull(),

    mimeType: text('mime_type').notNull(),

    size: bigint('size', {
      mode: 'number',
    }),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.artifactId, table.version)],
);
```

So:

```tsx
Artifact
 │
 ├── v1
 ├── v2
 └── v3
```

The actual files remain in S3.

---

# 13. Conversations

## `conversations`

```tsx
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
      }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),

    title: text('title'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('conversations_project_idx').on(table.projectId)],
);
```

## `messages`

```tsx
export const messageRole = pgEnum('message_role', ['user', 'assistant', 'system']);
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, {
        onDelete: 'cascade',
      }),

    role: messageRole('role').notNull(),

    content: text('content').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('messages_conversation_idx').on(table.conversationId)],
);
```

---

# 14. Calendar

This is important because we decided the calendar exists **outside projects**.

```tsx
export const calendarEventStatus = pgEnum('calendar_event_status', [
  'scheduled',
  'cancelled',
  'completed',
]);
export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, {
        onDelete: 'cascade',
      }),

    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),

    title: text('title').notNull(),
    description: text('description'),

    startAt: timestamp('start_at').notNull(),
    endAt: timestamp('end_at').notNull(),

    location: text('location'),

    status: calendarEventStatus('status').notNull().default('scheduled'),

    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('calendar_events_workspace_idx').on(table.workspaceId),
    index('calendar_events_project_idx').on(table.projectId),
    index('calendar_events_start_idx').on(table.startAt),
  ],
);
```

The key design:

```tsx
projectId = NULL
      ↓
Global Calendar Event

projectId = "..."
      ↓
Project Calendar Event
```

---

# 15. Notifications

```tsx
export const notificationType = pgEnum('notification_type', [
  'artifact_ready',
  'knowledge_ready',
  'deadline',
  'reminder',
  'project_activity',
  'system',
]);
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    type: notificationType('type').notNull(),

    title: text('title').notNull(),
    message: text('message'),

    resourceType: text('resource_type'),
    resourceId: uuid('resource_id'),

    readAt: timestamp('read_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('notifications_user_idx').on(table.userId),
    index('notifications_unread_idx').on(table.userId, table.readAt),
  ],
);
```

---

# 16. Activity

Activity powers the **Project Activity tab**.

```tsx
export const activities = pgTable(
  'activities',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
      }),

    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    type: text('type').notNull(),

    entityType: text('entity_type'),
    entityId: uuid('entity_id'),

    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('activities_project_idx').on(table.projectId, table.createdAt)],
);
```

Example:

```tsx
type = 'artifact.created';
entityType = 'artifact';
entityId = '...';
```

---

# 17. AI Suggestions

This supports the **AI-assisted but user-controlled** philosophy.

```tsx
export const aiSuggestionStatus = pgEnum('ai_suggestion_status', [
  'pending',
  'accepted',
  'dismissed',
  'expired',
]);
export const aiSuggestions = pgTable(
  'ai_suggestions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, {
        onDelete: 'cascade',
      }),

    type: text('type').notNull(),

    title: text('title').notNull(),
    description: text('description'),

    status: aiSuggestionStatus('status').notNull().default('pending'),

    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [index('ai_suggestions_project_idx').on(table.projectId)],
);
```

Example:

```tsx
AI Suggestion

"Generate presentation from current report"

        [Generate] [Dismiss]
```

AI suggests.

The user decides.

---

# 18. AI Runs

```tsx
export const aiRunStatus = pgEnum('ai_run_status', ['queued', 'processing', 'completed', 'failed']);
export const aiRuns = pgTable(
  'ai_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    projectId: uuid('project_id').references(() => projects.id, {
      onDelete: 'set null',
    }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),

    type: text('type').notNull(),

    status: aiRunStatus('status').notNull().default('queued'),

    model: text('model'),

    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    index('ai_runs_project_idx').on(table.projectId),
    index('ai_runs_user_idx').on(table.userId),
  ],
);
```

This gives us a place to track AI usage and cost without putting that information into the core domain tables.

---

# 19. The Complete Schema Map

```tsx
users
 │
 ├──────────────┐
 ▼              ▼
workspaces   workspace_members
 │
 ├─────────────────────────────┐
 ▼                             ▼
projects                  calendar_events
 │
 ├──────────────┬──────────────┬──────────────┬──────────────┐
 ▼              ▼              ▼              ▼              ▼
milestones   knowledge      artifacts    conversations    activities
 │              │              │              │
 ▼              ▼              ▼              ▼
tasks        documents      versions       messages
                │
                ▼
             chunks
                │
                ▼
            embeddings

projects
 │
 └── project_progress
 │
 └── ai_suggestions
 │
 └── ai_runs

users
 │
 └── notifications
```

---

# 20. What I Would NOT Put in the Database

This distinction is important.

### Don't store files in PostgreSQL

```tsx
❌ PDF binary
❌ PPTX binary
❌ XLSX binary
❌ Images
```

Store them in:

```tsx
S3 / MinIO;
```

and keep:

```tsx
storageKey;
mimeType;
size;
```

in PostgreSQL.

### Don't use PostgreSQL as the job queue

BullMQ handles:

```tsx
AI generation
Document processing
Embeddings
Artifact generation
Notifications
```

### Don't store cache as permanent data

Redis is for:

```tsx
Cache
Rate limiting
BullMQ
Temporary state
```

PostgreSQL remains authoritative.

---

# 21. Final Database Stack

```tsx
                  Nexus Database
                       │
                  PostgreSQL
                       │
     ┌─────────────────┼─────────────────┐
     │                 │                 │
     ▼                 ▼                 ▼
  Drizzle           pgvector          Relational
    ORM              Search             Data
     │
     ▼
┌───────────────────────────────────────┐
│ Users                                 │
│ Workspaces                            │
│ Projects                              │
│ Planner                               │
│ Knowledge                             │
│ Artifacts                             │
│ Conversations                         │
│ Calendar                              │
│ Notifications                         │
│ Activity                              │
│ AI                                    │
└───────────────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
         Redis                 S3 / MinIO
       BullMQ/Cache          Files/Artifacts
```
