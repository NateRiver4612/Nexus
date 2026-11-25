import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from './env';

const globalForStorage = globalThis as unknown as { nexusS3?: S3Client };

function s3Endpoint() {
  return env.S3_ENDPOINT;
}

function s3Bucket() {
  return env.S3_BUCKET;
}

export function getS3Client() {
  // Reuse a single client across hot-reloading dev servers.
  if (!globalForStorage.nexusS3) {
    // Static credentials are optional — when S3_ACCESS_KEY / S3_SECRET_KEY
    // aren't set (e.g. on EC2 with an instance role), the SDK falls back to its
    // default credential chain (env → SSO → shared profile → process → web
    // identity → EC2/ECS role). Locally `[default]` resolves via `login_session`
    // (an `aws login` console session, not SSO); either session type expires
    // (up to 12h), then re-run `aws login`.
    const hasCredentials = Boolean(env.S3_ACCESS_KEY && env.S3_SECRET_KEY);

    globalForStorage.nexusS3 = new S3Client({
      // undefined → the SDK derives the regional AWS endpoint from `region`.
      // Only set this for S3-compatible endpoints (e.g. MinIO).
      endpoint: s3Endpoint(),
      region: env.S3_REGION,
      // Path-style is only needed for S3-compatible endpoints — AWS S3 is
      // virtual-hosted, so it stays off unless a custom endpoint is set.
      forcePathStyle: Boolean(env.S3_ENDPOINT) && env.S3_FORCE_PATH_STYLE,
      ...(hasCredentials
        ? {
            credentials: {
              accessKeyId: env.S3_ACCESS_KEY!,
              secretAccessKey: env.S3_SECRET_KEY!,
            },
          }
        : {}),
    });
  }
  return globalForStorage.nexusS3;
}

/** Presigned PUT URL the browser can upload directly to. */
export async function presignPutUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: s3Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
  return { url, key, bucket: s3Bucket() };
}

/** Presigned GET URL that downloads the object with its original name. */
export async function presignGetUrl({ key, filename }: { key: string; filename: string }) {
  const command = new GetObjectCommand({
    Bucket: s3Bucket(),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename.replace(/["\\]/g, '')}"`,
  });

  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
  return { url };
}

/**
 * Presigned GET URL for an inline asset (e.g. a thumbnail): no download disposition, so the
 * browser can render it with `<img src>`.
 *
 * Thumbnails are served as presigned URLs (Option 2) instead of streaming bytes through the API
 * (Option 1). Option 1 would keep every thumbnail byte on our API and lose native lazy-loading
 * and browser caching; Option 2 lets the browser load and cache straight from S3 and only signs
 * URLs for thumbnails we actually render. The tradeoff is a short-lived bearer URL, so keep the
 * expiry modest for private files.
 */
export async function presignInlineUrl({
  key,
  expiresIn = 6 * 60 * 60,
}: {
  key: string;
  expiresIn?: number;
}) {
  const command = new GetObjectCommand({
    Bucket: s3Bucket(),
    Key: key,
    ResponseContentDisposition: 'inline',
  });

  const url = await getSignedUrl(getS3Client(), command, { expiresIn });
  return { url };
}

/** Fetch an object's bytes. */
export async function getObject(key: string) {
  const command = new GetObjectCommand({ Bucket: s3Bucket(), Key: key });
  const response = await getS3Client().send(command);
  const bytes = await response.Body!.transformToByteArray();
  return {
    body: Buffer.from(bytes),
    contentType: response.ContentType ?? 'application/octet-stream',
  };
}

/** Upload raw bytes (e.g. after processing). */
export async function putObject(
  key: string,
  body: Buffer,
  contentType = 'application/octet-stream',
) {
  const command = new PutObjectCommand({
    Bucket: s3Bucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await getS3Client().send(command);
}

/** Delete an S3 object. */
export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({ Bucket: s3Bucket(), Key: key });
  await getS3Client().send(command);
}

/** Size of a stored object in bytes, or null when it doesn't exist. */
export async function getObjectSize(key: string): Promise<number | null> {
  const command = new HeadObjectCommand({ Bucket: s3Bucket(), Key: key });
  try {
    const response = await getS3Client().send(command);
    return response.ContentLength ?? null;
  } catch (error) {
    const { name, $metadata } = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    // A missing object is a normal "upload never happened" outcome, not a failure to throw.
    if (name === 'NoSuchKey' || name === 'NotFound' || $metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}
