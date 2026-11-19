import { and, desc, eq, getTableColumns, isNull, max, sql } from 'drizzle-orm';

import {
  artifacts,
  artifactVersions,
  type Db,
  type NewArtifact,
  type NewArtifactVersion,
} from '@nexus/db';

export const ArtifactRepository = (db: Db) => ({
  listByProject({ projectId, conversationId }: { projectId: string; conversationId?: string }) {
    const latestVersions = db
      .select({
        artifactId: artifactVersions.artifactId,
        latestVersion: max(artifactVersions.version).as('latest_version'),
      })
      .from(artifactVersions)
      .groupBy(artifactVersions.artifactId)
      .as('latest_versions');

    return db
      .select({
        ...getTableColumns(artifacts),
        latestVersion: latestVersions.latestVersion,
      })
      .from(artifacts)
      .leftJoin(latestVersions, eq(latestVersions.artifactId, artifacts.id))
      .where(
        and(
          eq(artifacts.projectId, projectId),
          conversationId ? eq(artifacts.conversationId, conversationId) : undefined,
        ),
      )
      .orderBy(desc(artifacts.updatedAt));
  },

  async getById(id: string) {
    const rows = await db.select().from(artifacts).where(eq(artifacts.id, id)).limit(1);
    return rows[0];
  },

  /** Newest match; older duplicates within a conversation can exist until cleaned up. */
  async findByConversationAndName({
    conversationId,
    name,
  }: {
    conversationId: string;
    name: string;
  }) {
    const rows = await db
      .select()
      .from(artifacts)
      .where(
        and(
          eq(artifacts.conversationId, conversationId),
          sql`lower(${artifacts.name}) = lower(${name})`,
        ),
      )
      .orderBy(desc(artifacts.createdAt))
      .limit(1);
    return rows[0];
  },

  /**
   * Row-locks the artifact until the surrounding transaction ends. Version numbers are
   * max + 1 and the table has no unique constraint, so concurrent writers must queue here.
   * Important: MUST be called inside a transaction
   */
  async lockById(id: string) {
    const rows = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.id, id))
      .limit(1)
      .for('update');
    return rows[0];
  },

  insert(values: NewArtifact) {
    return db.insert(artifacts).values(values).returning();
  },

  async update(id: string, patch: Partial<NewArtifact>) {
    return (await db.update(artifacts).set(patch).where(eq(artifacts.id, id)).returning())[0];
  },

  async delete(id: string) {
    return (await db.delete(artifacts).where(eq(artifacts.id, id)).returning())[0];
  },

  async latestVersionNumber(artifactId: string) {
    const rows = await db
      .select({ latest: max(artifactVersions.version) })
      .from(artifactVersions)
      .where(eq(artifactVersions.artifactId, artifactId));
    return rows[0]?.latest ?? 0;
  },

  insertVersion(values: NewArtifactVersion) {
    return db.insert(artifactVersions).values(values).returning();
  },

  async updateVersion(id: string, patch: Partial<NewArtifactVersion>) {
    return (
      await db.update(artifactVersions).set(patch).where(eq(artifactVersions.id, id)).returning()
    )[0];
  },

  /** A specific version, or the newest one when `version` is omitted. */
  async getVersion({ artifactId, version }: { artifactId: string; version?: number }) {
    const rows = await db
      .select()
      .from(artifactVersions)
      .where(
        version === undefined
          ? eq(artifactVersions.artifactId, artifactId)
          : and(eq(artifactVersions.artifactId, artifactId), eq(artifactVersions.version, version)),
      )
      .orderBy(desc(artifactVersions.version))
      .limit(1);
    return rows[0];
  },

  listVersions(artifactId: string) {
    return db
      .select()
      .from(artifactVersions)
      .where(eq(artifactVersions.artifactId, artifactId))
      .orderBy(desc(artifactVersions.version));
  },

  /** Version objects the artifact owns. Attachment-backed versions are deleted elsewhere. */
  async listOwnedVersionStorageKeys(artifactId: string) {
    const rows = await db
      .select({ storageKey: artifactVersions.storageKey })
      .from(artifactVersions)
      .where(
        and(
          eq(artifactVersions.artifactId, artifactId),
          isNull(artifactVersions.sourceAttachmentId),
        ),
      );
    return rows.map((row) => row.storageKey);
  },

  async listVersionStorageKeysByConversation(conversationId: string) {
    const rows = await db
      .select({ storageKey: artifactVersions.storageKey })
      .from(artifactVersions)
      .innerJoin(artifacts, eq(artifactVersions.artifactId, artifacts.id))
      .where(eq(artifacts.conversationId, conversationId));
    return rows.map((row) => row.storageKey);
  },
});
