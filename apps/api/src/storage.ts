import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const globalForStorage = globalThis as unknown as { nexusS3?: S3Client };

function s3Endpoint() {
  return process.env.S3_ENDPOINT ?? 'http://localhost:9000';
}

function s3Bucket() {
  return process.env.S3_BUCKET ?? 'nexus';
}

export function getStorage() {
  // Reuse a single client across hot-reloading dev servers.
  if (!globalForStorage.nexusS3) {
    globalForStorage.nexusS3 = new S3Client({
      endpoint: s3Endpoint(),
      region: process.env.S3_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
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
  const url = await getSignedUrl(getStorage(), command, { expiresIn: 3600 });
  return { url, key, bucket: s3Bucket() };
}

/** Fetch an object's bytes (used by the ingestion worker to extract text). */
export async function getKnowledgeObject(key: string) {
  const command = new GetObjectCommand({ Bucket: s3Bucket(), Key: key });
  const response = await getStorage().send(command);
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
  await getStorage().send(command);
}
