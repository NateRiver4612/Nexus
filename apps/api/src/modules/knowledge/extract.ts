import { getKnowledgeObject } from '../../storage';

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

/** Extract clean text from a source, dispatching on `sourceType`. */
export async function extractSourceText(source: ExtractableSource): Promise<string> {
  switch (source.sourceType) {
    case 'copied_text':
      return source.content ?? '';
    case 'url':
      return extractFromUrl(source.sourceRef);
    case 'youtube':
      return extractFromYoutube(source.sourceRef);
    case 'audio':
    case 'video':
      throw new Error('audio/video ingestion is deferred to a later pass');
    case 'file':
    default:
      return extractFromFile(source);
  }
}

async function extractFromFile(source: ExtractableSource): Promise<string> {
  if (!source.storageKey) throw new Error('file source has no storageKey');
  const { body, contentType } = await getKnowledgeObject(source.storageKey);
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

async function extractFromUrl(url?: string | null): Promise<string> {
  if (!url) throw new Error('url source has no sourceRef');
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Nexus/1.0)' },
    redirect: 'follow',
  });
  if (!response.ok)
    throw new Error(`failed to fetch url: ${response.status} ${response.statusText}`);
  const html = await response.text();

  const { JSDOM } = await import('jsdom');
  const { Readability } = await import('@mozilla/readability');

  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  return article?.textContent ?? dom.window.document.body?.textContent ?? '';
}

async function extractFromYoutube(url?: string | null): Promise<string> {
  const videoId = youtubeVideoId(url);
  if (!videoId) throw new Error('unable to parse a YouTube video id from the url');
  const { YoutubeTranscript } = await import('youtube-transcript');
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  return transcript.map((line) => line.text).join(' ');
}

function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|v=|watch\?v=)([\w-]{11})/);
  return match?.[1] ?? null;
}
