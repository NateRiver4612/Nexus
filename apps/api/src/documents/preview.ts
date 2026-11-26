import { env } from '../env';
import { deleteObject, getObject, getObjectSize, putObject } from '../storage';

const GOTENBERG_TIMEOUT_MS = 60_000;

/** Buffer backed by a regular ArrayBuffer (assignable to Hono's binary body). */
type PdfBytes = Buffer<ArrayBuffer>;

const PDF_PREVIEW_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

/** Word documents are converted via LibreOffice instead of approximated client-side. */
export function isPdfPreviewMime(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return PDF_PREVIEW_MIME_TYPES.has(mimeType.toLowerCase());
}

export function toPdfFilename(name: string): string {
  return `${name.replace(/\.docx?$/i, '')}.pdf`;
}

function previewKeyFor(storageKey: string): string {
  return `previews/${storageKey}.pdf`;
}

/** Gotenberg runs LibreOffice in its own container; we only send it the file and get PDF back. */
export async function convertOfficeToPdf({
  body,
  name,
  mimeType,
}: {
  body: Buffer;
  name: string;
  mimeType: string;
}): Promise<PdfBytes> {
  const form = new FormData();
  form.append('files', new Blob([new Uint8Array(body)], { type: mimeType }), name);

  const response = await fetch(`${env.GOTENBERG_URL}/forms/libreoffice/convert`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(GOTENBERG_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Gotenberg conversion failed (${response.status}).`);
  }

  return Buffer.from(await response.arrayBuffer());
}

// One conversion per object at a time, so two quick opens don't run LibreOffice twice.
const inFlight = new Map<string, Promise<PdfBytes>>();

/**
 * Rendering PDF for a Word document: cached in S3 under `previews/<storageKey>.pdf`, then
 * converted with LibreOffice on a cache miss. The storage key is unique per upload/version,
 * so the cache is invalidated by deleting it when the backing object is replaced or removed.
 */
export async function getPdfPreview({
  storageKey,
  mimeType,
  name,
}: {
  storageKey: string;
  mimeType: string;
  name: string;
}): Promise<PdfBytes> {
  const cacheKey = previewKeyFor(storageKey);

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const work = (async () => {
    const cachedSize = await getObjectSize(cacheKey);
    if (cachedSize !== null) return (await getObject(cacheKey)).body;

    const source = await getObject(storageKey);
    const pdf = await convertOfficeToPdf({ body: source.body, name, mimeType });

    await putObject(cacheKey, pdf, 'application/pdf').catch((error) => {
      // Best-effort cache: a failed write only costs a re-conversion next time.
      console.warn(`[documents] could not cache preview for ${storageKey}`, error);
    });
    return pdf;
  })().finally(() => inFlight.delete(cacheKey));

  inFlight.set(cacheKey, work);
  return work;
}

/** Best-effort cleanup for a stored object's cached PDF preview. */
export async function deletePdfPreview(storageKey: string): Promise<void> {
  try {
    await deleteObject(previewKeyFor(storageKey));
  } catch (error) {
    console.warn(`[documents] could not delete preview for ${storageKey}`, error);
  }
}
