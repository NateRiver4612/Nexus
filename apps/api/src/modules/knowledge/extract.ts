import { UnrecoverableError } from 'bullmq';

import { getKnowledgeObject } from '../../storage';
import { env } from '../../env';
import { TRANSIENT_URL_FAILURE, withUnrecoverable } from '../../queue-errors';
import { getOpenAIProvider, getTavilyProvider } from '../ai/providers';
import { isRetryableTavilyError } from '../ai/providers/tavily/errors';
import { extractFromYoutube } from './youtube';

export type ExtractableSource = {
  id: string;
  projectId: string;
  sourceType: 'file' | 'url' | 'youtube' | 'copied_text' | 'audio' | 'video';
  name: string;
  mimeType?: string | null;
  sourceRef?: string | null;
  storageKey?: string | null;
  content?: string | null;
};

/** Loads an uploaded object from storage, failing fast when it no longer exists. */
export async function fetchStoredObject(storageKey: string) {
  // A missing object won't appear on retry; other S3 errors (network, 5xx) are worth retrying.
  return withUnrecoverable({
    promise: getKnowledgeObject(storageKey),
    isUnrecoverable: (error) => {
      const { name, $metadata } = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      return name === 'NoSuchKey' || name === 'NotFound' || $metadata?.httpStatusCode === 404;
    },
    message: 'The uploaded file could not be found.',
  });
}

/** Extract clean text from a source, dispatching on `sourceType`. */
export async function extractSourceText(source: ExtractableSource): Promise<string> {
  switch (source.sourceType) {
    case 'copied_text':
      return source.content ?? '';
    case 'url':
      return extractFromUrl(source.sourceRef);
    case 'youtube':
      return (await extractFromYoutube(source.sourceRef)).content;
    case 'audio':
      return extractFromAudio(source);
    case 'video':
      // Audio/video extraction is coming soon — intentionally kept a plain Error until then.
      throw new Error('audio/video ingestion is deferred to a later pass');
    case 'file':
    default:
      return extractFromFile(source);
  }
}

async function extractFromFile(source: ExtractableSource): Promise<string> {
  if (!source.storageKey) throw new UnrecoverableError('file source has no storageKey');

  const object = await fetchStoredObject(source.storageKey);

  const { body, contentType } = object;
  const mime = source.mimeType ?? contentType;

  if (mime === 'application/pdf') return extractPdf(body);
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    return extractDocx(body);
  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'text/csv' ||
    mime === 'application/csv'
  )
    return extractSpreadsheet(body);

  if (mime.startsWith('image/')) return extractImage(body);

  // Markdown, plain text, and anything else as UTF-8 text.
  return body.toString('utf-8');
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse ships without type declarations.
  // @ts-ignore
  const pdfParse = (await import('pdf-parse')).default as unknown as (
    buffer: Buffer,
  ) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractFromAudio(source: ExtractableSource): Promise<string> {
  if (!source.storageKey) throw new UnrecoverableError('audio source has no storageKey');

  if (!env.OPENAI_API_KEY) {
    throw new UnrecoverableError('Audio transcription is not configured.');
  }

  const { body, contentType } = await fetchStoredObject(source.storageKey);

  return getOpenAIProvider().transcribe({
    body,
    name: source.name,
    mimeType: source.mimeType ?? contentType,
  });
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = (await import('mammoth')).default;
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

async function extractSpreadsheet(buffer: Buffer): Promise<string> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const parts: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    parts.push(`# ${sheetName}`);
    parts.push(XLSX.utils.sheet_to_csv(sheet));
  }
  return parts.join('\n\n');
}

async function extractImage(buffer: Buffer): Promise<string> {
  const Tesseract = await import('tesseract.js');
  const { data } = await Tesseract.recognize(buffer, 'eng');
  return data.text;
}

/**
 * Reads a web page through Tavily, so our servers never connect to a user-supplied address and
 * JavaScript-rendered pages work. Only https links are accepted; a thrown Tavily error is not
 * retried here — the queue owns retries for transient failures.
 */
async function extractFromUrl(url?: string | null): Promise<string> {
  if (!url) throw new UnrecoverableError('url source has no sourceRef');

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UnrecoverableError('Only HTTPS links are supported.');
  }

  if (parsed.protocol !== 'https:') {
    throw new UnrecoverableError('Only HTTPS links are supported.');
  }

  if (!env.TAVILY_API_KEY) {
    throw new UnrecoverableError('Web extraction is not configured.');
  }

  // Quota / bad key / bad request can't be fixed by retrying, and each retry costs credits.
  // unavailable / rate_limited rethrow so BullMQ retries them.
  const { pages, failed } = await withUnrecoverable({
    promise: getTavilyProvider().extract({ urls: [url] }),
    isUnrecoverable: (error) => !isRetryableTavilyError({ error }),
  });

  const page = pages[0];

  if (!page) {
    const reason = failed[0]?.reason ?? 'no content was returned';
    const message = `failed to read url: ${reason}`;
    // Tavily already escalated basic→advanced; a per-URL miss is usually permanent, so only
    // clearly transient reasons are worth another attempt.
    throw TRANSIENT_URL_FAILURE.test(reason) ? new Error(message) : new UnrecoverableError(message);
  }

  return page.content;
}
