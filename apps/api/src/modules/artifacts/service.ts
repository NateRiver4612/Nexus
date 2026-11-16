import { randomUUID } from 'node:crypto';

import type { Artifact, ArtifactVersion, Db } from '@nexus/db';
import type {
  ArtifactListItemType,
  ArtifactSourceType,
  ArtifactType,
  ArtifactVersionType,
  CreateArtifactInputType,
  UpdateArtifactInputType,
} from '@nexus/types';

import { ensure, ensureExists, NotFoundError, ValidationError } from '../../errors';
import { deleteObject, getObject, putObject } from '../../storage';
import { ArtifactRepository } from './repository';

/** Generated text is held in memory and sent to S3 in one piece, so it needs a ceiling. */
export const MAX_ARTIFACT_CONTENT_BYTES = 1024 * 1024;

export type ArtifactWriteResult = { artifact: ArtifactType; version: number };

/** The client sends the conversation; the route supplies the project from its path. */
type ArtifactCreateInput = CreateArtifactInputType & { projectId: string };

export function ArtifactService(db: Db) {
  const repository = ArtifactRepository(db);

  async function list({
    projectId,
    conversationId,
  }: {
    projectId: string;
    conversationId?: string;
  }): Promise<ArtifactListItemType[]> {
    const rows = await repository.listByProject({ projectId, conversationId });
    return rows.map(toListView);
  }

  async function create(input: ArtifactCreateInput, userId: string): Promise<ArtifactType> {
    // `status` is left to the DB default; only the generation flow marks an artifact `ready`.
    const rows = await repository.insert({
      projectId: input.projectId,
      conversationId: input.conversationId,
      name: input.name,
      type: input.type,
      createdBy: userId,
    });
    return toView(rows[0]!);
  }

  /** Chat artifact lookup; a same-name file in another conversation is a separate artifact. */
  async function findByName({
    conversationId,
    name,
  }: {
    conversationId: string;
    name: string;
  }): Promise<ArtifactType | undefined> {
    const row = await repository.findByConversationAndName({ conversationId, name });
    return row ? toView(row) : undefined;
  }

  async function update(id: string, input: UpdateArtifactInputType): Promise<ArtifactType> {
    // Only set what was sent: drizzle throws on an empty `.set({})`.
    const patch = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.type !== undefined && { type: input.type }),
    };

    const row =
      Object.keys(patch).length === 0
        ? await repository.getById(id)
        : await repository.update(id, patch);

    return toView(ensureExists(row, NotFoundError('Artifact not found.')));
  }

  /**
   * Creates an artifact together with its first version. The bytes go to S3 before the
   * rows are written, so there is never an artifact row without content: a failed upload
   * leaves nothing behind, and a failed insert only leaves an object we clean up.
   */
  async function createWithContent({
    input,
    content,
    mimeType,
    sources,
    userId,
  }: {
    input: ArtifactCreateInput;
    content: string;
    mimeType: string;
    sources: ArtifactSourceType[];
    userId: string;
  }): Promise<ArtifactWriteResult> {
    const body = toBody(content);
    const artifactId = randomUUID();
    const versionId = randomUUID();
    const storageKey = buildStorageKey({ projectId: input.projectId, artifactId, versionId });

    await putObject(storageKey, body, mimeType);

    try {
      const artifact = await db.transaction(async (tx) => {
        const txRepository = ArtifactRepository(tx);

        const rows = await txRepository.insert({
          id: artifactId,
          projectId: input.projectId,
          conversationId: input.conversationId,
          name: input.name,
          type: input.type,
          status: 'ready',
          createdBy: userId,
        });
        await txRepository.insertVersion({
          id: versionId,
          artifactId,
          version: 1,
          storageKey,
          mimeType,
          size: body.length,
          sources,
          createdBy: userId,
        });
        return rows[0]!;
      });

      return { artifact: toView(artifact), version: 1 };
    } catch (error) {
      await discardObject(storageKey);
      throw error;
    }
  }

  /** Saves new content as the next version (v2, v3, …) of an existing artifact. */
  async function addVersion({
    artifactId,
    content,
    mimeType,
    sources,
    userId,
  }: {
    artifactId: string;
    content: string;
    mimeType: string;
    sources: ArtifactSourceType[];
    userId: string;
  }): Promise<ArtifactWriteResult> {
    const existing = ensureExists(
      await repository.getById(artifactId),
      NotFoundError('Artifact not found.'),
    );

    const body = toBody(content);
    const versionId = randomUUID();
    const storageKey = buildStorageKey({
      projectId: existing.projectId,
      artifactId,
      versionId,
    });

    await putObject(storageKey, body, mimeType);

    try {
      const { artifact, version } = await db.transaction(async (tx) => {
        const txRepository = ArtifactRepository(tx);

        // The lock makes "latest + 1" safe when two edits land at the same time.
        ensureExists(await txRepository.lockById(artifactId), NotFoundError('Artifact not found.'));
        const next = (await txRepository.latestVersionNumber(artifactId)) + 1;

        await txRepository.insertVersion({
          id: versionId,
          artifactId,
          version: next,
          storageKey,
          mimeType,
          size: body.length,
          sources,
          createdBy: userId,
        });
        // Re-saving `ready` also bumps `updatedAt`, so the list reflects the edit.
        const updated = await txRepository.update(artifactId, { status: 'ready' });

        return {
          artifact: ensureExists(updated, NotFoundError('Artifact not found.')),
          version: next,
        };
      });

      return { artifact: toView(artifact), version };
    } catch (error) {
      await discardObject(storageKey);
      throw error;
    }
  }

  /**
   * Rewrites one version in place. Only for a later `create_artifact` call in the same
   * assistant reply: the reply gets one version, and the last content wins.
   */
  async function replaceVersionContent({
    artifactId,
    version,
    content,
    mimeType,
    sources,
  }: {
    artifactId: string;
    version: number;
    content: string;
    mimeType: string;
    sources: ArtifactSourceType[];
  }): Promise<ArtifactWriteResult> {
    const existing = ensureExists(
      await repository.getById(artifactId),
      NotFoundError('Artifact not found.'),
    );
    const current = ensureExists(
      await repository.getVersion({ artifactId, version }),
      NotFoundError('Artifact version not found.'),
    );

    const body = toBody(content);
    const storageKey = buildStorageKey({
      projectId: existing.projectId,
      artifactId,
      versionId: randomUUID(),
    });

    await putObject(storageKey, body, mimeType);

    try {
      const artifact = await db.transaction(async (tx) => {
        const txRepository = ArtifactRepository(tx);

        ensureExists(await txRepository.lockById(artifactId), NotFoundError('Artifact not found.'));
        await txRepository.updateVersion(current.id, {
          storageKey,
          mimeType,
          size: body.length,
          sources,
        });

        return ensureExists(
          await txRepository.update(artifactId, { status: 'ready' }),
          NotFoundError('Artifact not found.'),
        );
      });

      await discardObject(current.storageKey);
      return { artifact: toView(artifact), version };
    } catch (error) {
      await discardObject(storageKey);
      throw error;
    }
  }

  /** Reads an artifact's text; the newest version unless `version` is given. */
  async function getContent({ artifactId, version }: { artifactId: string; version?: number }) {
    const row = ensureExists(
      await repository.getVersion({ artifactId, version }),
      NotFoundError('Artifact version not found.'),
    );

    const object = await getObject(row.storageKey);
    return {
      content: object.body.toString('utf8'),
      mimeType: row.mimeType,
      version: row.version,
      sources: row.sources,
    };
  }

  /** Newest first. `storageKey` is internal and never leaves the service. */
  async function listVersions(artifactId: string): Promise<ArtifactVersionType[]> {
    const rows = await repository.listVersions(artifactId);
    return rows.map(toVersionView);
  }

  async function remove(id: string) {
    const storageKeys = await repository.listVersionStorageKeys(id);

    // Row first: if S3 cleanup fails we only leak bytes, instead of leaving a row that
    // points at objects that are gone.
    await repository.delete(id);
    await Promise.all(storageKeys.map((key) => discardObject(key)));
  }

  /** Fetched before conversation deletion, while the artifact rows still exist. */
  async function listStorageKeysByConversation(conversationId: string) {
    return repository.listVersionStorageKeysByConversation(conversationId);
  }

  /** Best-effort; a failed S3 delete must not block the conversation deletion. */
  async function removeStorageObjects(storageKeys: string[]) {
    await Promise.all(storageKeys.map((key) => discardObject(key)));
  }

  return {
    list,
    create,
    findByName,
    update,
    createWithContent,
    addVersion,
    replaceVersionContent,
    getContent,
    listVersions,
    remove,
    listStorageKeysByConversation,
    removeStorageObjects,
  };
}

function toBody(content: string) {
  const body = Buffer.from(content, 'utf8');

  ensure(body.length > 0, ValidationError('Artifact content cannot be empty.'));
  ensure(
    body.length <= MAX_ARTIFACT_CONTENT_BYTES,
    ValidationError(
      `Artifact content is too large (max ${MAX_ARTIFACT_CONTENT_BYTES / 1024 / 1024} MB).`,
    ),
  );
  return body;
}

// One key per version, never overwritten, so history stays intact.
function buildStorageKey({
  projectId,
  artifactId,
  versionId,
}: {
  projectId: string;
  artifactId: string;
  versionId: string;
}) {
  return `artifacts/${projectId}/${artifactId}/${versionId}`;
}

async function discardObject(key: string) {
  try {
    await deleteObject(key);
  } catch (error) {
    // Best-effort: a leftover object costs storage only, and must not mask the real outcome.
    console.warn(`[artifacts] could not delete S3 object ${key}`, error);
  }
}

function toView(row: Artifact): ArtifactType {
  return {
    id: row.id,
    projectId: row.projectId,
    conversationId: row.conversationId,
    name: row.name,
    type: row.type,
    status: row.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toListView(row: Artifact & { latestVersion: number | null }): ArtifactListItemType {
  return { ...toView(row), latestVersion: row.latestVersion };
}

function toVersionView(row: ArtifactVersion): ArtifactVersionType {
  return {
    id: row.id,
    artifactId: row.artifactId,
    version: row.version,
    mimeType: row.mimeType,
    size: row.size,
    sources: row.sources,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export type ArtifactServiceType = ReturnType<typeof ArtifactService>;
