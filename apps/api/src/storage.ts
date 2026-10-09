import {
  DeleteObjectCommand,
  GetObjectCommand,
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
    // aren't set (e.g. the instance has an IAM role / FullAccess policy) the
    // AWS SDK falls back to its default credential provider chain (role creds).
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
export async function presignKnowledgePutUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: s3Bucket(),
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 3600 });
  return { url, key, bucket: s3Bucket() };
}

/** Fetch an object's bytes (used by the ingestion worker to extract text). */
export async function getKnowledgeObject(key: string) {
  const command = new GetObjectCommand({ Bucket: s3Bucket(), Key: key });
  const response = await getS3Client().send(command);
  const bytes = await response.Body!.transformToByteArray();
  return {
    body: Buffer.from(bytes),
    contentType: response.ContentType ?? 'application/octet-stream',
  };
}

/** Upload raw bytes (e.g. after processing). */
export async function putKnowledgeObject(
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

/** Delete an object (used by the source-removal worker). */
export async function deleteKnowledgeObject(key: string) {
  const command = new DeleteObjectCommand({ Bucket: s3Bucket(), Key: key });
  await getS3Client().send(command);
}
