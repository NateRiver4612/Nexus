/**
 * Turns stored file bytes into a small WebP thumbnail for list cards.
 *
 * Input:
 *   { body: Buffer; mimeType: string; name: string }
 *   body     - the file's exact bytes (S3 object, or an in-memory upload)
 *   mimeType - stored MIME, e.g. 'image/png', 'application/pdf', 'text/markdown'
 *   name     - display filename; only the text/Markdown cards render it
 *
 * Output:
 *   Promise<Buffer | null>
 *   WebP (quality 72):
 *     images / PDF / Office -> fit inside 480x480
 *     spreadsheets          -> 480x320 grid card from the first sheet
 *     text / Markdown       -> 480x320 white card
 *   null -> MIME is not thumbnailable (e.g. text/vnd.mermaid)
 *
 * Example:
 *   in:  { body: Buffer.from('{"count":3,"ready":true}'), mimeType: 'application/json', name: 'data.json' }
 *   out: <480x320 WebP: white card, `"count"` blue, `3` orange, `true` red>
 *
 * Notes:
 *   - Dispatch: image -> sharp; PDF -> page 1; DOCX -> Gotenberg (LibreOffice) -> page 1;
 *     XLSX/CSV -> parsed grid card; Markdown -> Gotenberg (Chromium) screenshot; JSON/plain text -> SVG card.
 *   - Markdown falls back to the SVG card when Gotenberg is unreachable; a PDF the canvas
 *     renderer rejects falls back to a generic card; other failures throw so the worker retries.
 *   - Images respect EXIF rotation and are capped at 50M input pixels.
 */
import { isSpreadsheetMime, THUMBNAILABLE_OFFICE_TYPES } from '@nexus/shared-helpers';
import { pdf } from 'pdf-to-img';
import sharp from 'sharp';

import { convertOfficeToPdf } from '../documents/preview';
import { env } from '../env';

/** Rendered thumbnails are small list previews, not full-size images. */
const THUMB_SIZE = 480;
const THUMB_QUALITY = 72;
/** Bound decompression work so a hostile image can't exhaust memory. */
const MAX_INPUT_PIXELS = 50_000_000;
/** Chromium cold starts are slower than LibreOffice, but this stays inside the worker. */
const GOTENBERG_SCREENSHOT_TIMEOUT_MS = 30_000;

const TEXT_PREVIEW_MAX_CHARS = 8_000;
const TEXT_PREVIEW_LINES = 12;
const TEXT_PREVIEW_LINE_CHARS = 56;
const TEXT_THUMB_WIDTH = 480;
const TEXT_THUMB_HEIGHT = 320;

/** How much of a sheet to draw: enough to read as a spreadsheet without bloating the SVG. */
const SPREADSHEET_MAX_ROWS = 8;
const SPREADSHEET_MAX_COLS = 5;
const SPREADSHEET_CELL_CHARS = 12;
const SPREADSHEET_HEADER_BG = '#f3f4f6';

/** Matches the preview dialog: white card (`bg-card`) with a dark syntax inset (`.syntax-block`). */
const CARD_BG = '#ffffff';
const CARD_BORDER = '#e0e6e7';
const CARD_TITLE = '#101415';
const MARKDOWN_TEXT = '#374151';
const CODE_BG = '#2e2b29';
const CODE_TEXT = '#e5e7eb';
const TOKEN_KEY = '#70cff8';
const TOKEN_STRING = '#b9f18d';
const TOKEN_NUMBER = '#fbbc88';
const TOKEN_LITERAL = '#f98181';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function cleanPreviewLines(text: string): string[] {
  return (
    text
      // Control chars break SVG/XML; strip them rather than escaping.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .slice(0, TEXT_PREVIEW_MAX_CHARS)
      .split(/\r?\n/)
      .slice(0, TEXT_PREVIEW_LINES)
  );
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s?/, '')
    .replace(/^[-*+]\s+/, '• ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

/** SVG shell mirroring the preview dialog: white card + filename header + divider. */
function textCardSvg({ name, content }: { name: string; content: string }): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TEXT_THUMB_WIDTH}" height="${TEXT_THUMB_HEIGHT}" viewBox="0 0 ${TEXT_THUMB_WIDTH} ${TEXT_THUMB_HEIGHT}">
  <rect x="1" y="1" width="${TEXT_THUMB_WIDTH - 2}" height="${TEXT_THUMB_HEIGHT - 2}" rx="14" fill="${CARD_BG}" stroke="${CARD_BORDER}" stroke-width="1.5"/>
  <text x="24" y="42" font-family="'DejaVu Sans', sans-serif" font-size="17" font-weight="700" fill="${CARD_TITLE}">${escapeXml(truncate(name, 48))}</text>
  <line x1="24" y1="54" x2="${TEXT_THUMB_WIDTH - 24}" y2="54" stroke="${CARD_BORDER}" stroke-width="1"/>
  ${content}
</svg>`;
}

async function svgToWebp(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg, 'utf8')).webp({ quality: THUMB_QUALITY }).toBuffer();
}

function markdownBody(text: string): string {
  return (
    cleanPreviewLines(text)
      // Fence markers add noise; the code lines themselves still render.
      .filter((line) => !line.trim().startsWith('```'))
      .map((line, index) => {
        const isHeading = /^#{1,3}\s+/.test(line);
        const plain = truncate(stripMarkdown(line), TEXT_PREVIEW_LINE_CHARS);
        const y = 80 + index * 19;
        return `<text x="24" y="${y}" font-family="'DejaVu Sans', sans-serif" font-size="${isHeading ? 16 : 13}" font-weight="${isHeading ? 700 : 400}" fill="${isHeading ? CARD_TITLE : MARKDOWN_TEXT}" xml:space="preserve">${escapeXml(plain || ' ')}</text>`;
      })
      .join('')
  );
}

type JsonToken = { text: string; color: string };

/**
 * Splits one JSON line into colour tokens for the code card.
 *
 * @example
 *   in:  '"count": 3, "ready": true'
 *   out: [
 *     { text: '"count"', color: TOKEN_KEY },
 *     { text: ': ', color: CODE_TEXT },
 *     { text: '3', color: TOKEN_NUMBER },
 *     { text: ', ', color: CODE_TEXT },
 *     ...
 *   ]
 *
 * Regex-based, so partial/truncated lines are fine; a string followed by `:` is a key.
 */
function tokenizeJson(line: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  const pattern =
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null)/g;
  let lastIndex = 0;

  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      tokens.push({ text: line.slice(lastIndex, index), color: CODE_TEXT });
    }

    const [full = '', stringToken, colon, numberToken, literalToken] = match;
    if (stringToken) {
      tokens.push({ text: stringToken, color: colon ? TOKEN_KEY : TOKEN_STRING });
      if (colon) tokens.push({ text: colon, color: CODE_TEXT });
    } else if (numberToken) {
      tokens.push({ text: numberToken, color: TOKEN_NUMBER });
    } else if (literalToken) {
      tokens.push({ text: literalToken, color: TOKEN_LITERAL });
    }

    lastIndex = index + full.length;
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.slice(lastIndex), color: CODE_TEXT });
  }

  return tokens;
}

function codeBody({ text, colorize }: { text: string; colorize: boolean }): string {
  return cleanPreviewLines(text)
    .map((line, index) => {
      const y = 90 + index * 17;
      const content = truncate(line, TEXT_PREVIEW_LINE_CHARS);
      const body = colorize
        ? tokenizeJson(content)
            .map((token) => `<tspan fill="${token.color}">${escapeXml(token.text)}</tspan>`)
            .join('')
        : escapeXml(content || ' ');
      return `<text x="34" y="${y}" font-family="'DejaVu Sans Mono', monospace" font-size="12.5" fill="${CODE_TEXT}" xml:space="preserve">${body || ' '}</text>`;
    })
    .join('');
}

/** Fast SVG approximation, kept as a fallback when Gotenberg/Chromium is unavailable. */
async function markdownSvgToWebp({ text, name }: { text: string; name: string }): Promise<Buffer> {
  return svgToWebp(textCardSvg({ name, content: markdownBody(text) }));
}

/**
 * Template rendered by Gotenberg. CSS mirrors the web app's markdown preview; the CSP blocks
 * every external resource so a markdown image/link can't make Chromium fetch anything.
 * Gotenberg replaces the `{{ toHTML "content.md" }}` action with the uploaded markdown.
 */
function markdownPreviewHtml(name: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: ${TEXT_THUMB_WIDTH}px; height: ${TEXT_THUMB_HEIGHT}px; overflow: hidden; background: #fff; }
      body { color: ${MARKDOWN_TEXT}; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 13px; line-height: 1.5; }
      .card { display: flex; flex-direction: column; width: ${TEXT_THUMB_WIDTH}px; height: ${TEXT_THUMB_HEIGHT}px; padding: 22px 24px; border: 1px solid ${CARD_BORDER}; border-radius: 14px; }
      .filename { flex: none; margin: 0 0 10px; padding-bottom: 10px; border-bottom: 1px solid ${CARD_BORDER}; color: ${CARD_TITLE}; font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .markdown-body { flex: 1; min-height: 0; overflow: hidden; }
      .markdown-body > :first-child { margin-top: 0; }
      .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 { color: ${CARD_TITLE}; font-weight: 700; line-height: 1.25; margin: 10px 0 6px; }
      .markdown-body h1 { font-size: 18px; }
      .markdown-body h2 { font-size: 16px; }
      .markdown-body h3 { font-size: 14px; }
      .markdown-body p { margin: 6px 0; }
      .markdown-body ul, .markdown-body ol { margin: 6px 0; padding-left: 20px; }
      .markdown-body li { margin: 2px 0; }
      .markdown-body a { color: #2563eb; text-decoration: underline; }
      .markdown-body code { border-radius: 4px; background: #f3f4f6; padding: 1px 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
      .markdown-body pre { margin: 8px 0; overflow: hidden; border-radius: 8px; background: ${CODE_BG}; color: #fff; padding: 10px 12px; }
      .markdown-body pre code { background: transparent; padding: 0; color: inherit; font-size: 11px; }
      .markdown-body blockquote { margin: 6px 0; border-left: 2px solid ${CARD_BORDER}; padding-left: 10px; color: #6c7173; }
      .markdown-body table { width: 100%; border-collapse: collapse; font-size: 12px; }
      .markdown-body th, .markdown-body td { border: 1px solid ${CARD_BORDER}; padding: 4px 6px; text-align: left; }
      .markdown-body img { display: none; }
      .markdown-body hr { border: 0; border-top: 1px solid ${CARD_BORDER}; margin: 8px 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="filename">${escapeXml(name)}</div>
      <div class="markdown-body">{{ toHTML "content.md" }}</div>
    </div>
  </body>
</html>`;
}

/** Chromium-rendered markdown preview, matching the dialog rather than approximating it. */
async function screenshotMarkdown({ text, name }: { text: string; name: string }): Promise<Buffer> {
  const form = new FormData();
  form.append('files', new Blob([markdownPreviewHtml(name)], { type: 'text/html' }), 'index.html');
  form.append('files', new Blob([text], { type: 'text/markdown' }), 'content.md');
  form.append('width', String(TEXT_THUMB_WIDTH));
  form.append('height', String(TEXT_THUMB_HEIGHT));
  form.append('clip', 'true');
  form.append('format', 'webp');
  form.append('deviceScaleFactor', '2');

  const response = await fetch(`${env.GOTENBERG_URL}/forms/chromium/screenshot/markdown`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(GOTENBERG_SCREENSHOT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Gotenberg markdown screenshot failed (${response.status}).`);
  }

  // Chromium returns 960x640 at scale 2; normalize to the list thumbnail size.
  return sharp(Buffer.from(await response.arrayBuffer()))
    .resize({ width: TEXT_THUMB_WIDTH, height: TEXT_THUMB_HEIGHT, fit: 'cover' })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}

/**
 * Markdown -> 480x320 preview card.
 * Tries the Chromium screenshot first; when Gotenberg/Chromium is unreachable it returns the SVG
 * card so a missing thumbnail never fails ingestion.
 */
async function markdownToWebp({ text, name }: { text: string; name: string }): Promise<Buffer> {
  try {
    return await screenshotMarkdown({ text, name });
  } catch (error) {
    // Gotenberg may be down or Chromium may time out; keep a thumbnail instead of an icon.
    console.warn('[thumbnails] markdown screenshot failed, using SVG fallback', error);
    return markdownSvgToWebp({ text, name });
  }
}

async function codeCardToWebp({
  text,
  name,
  colorize,
}: {
  text: string;
  name: string;
  colorize: boolean;
}): Promise<Buffer> {
  const inset = `<rect x="20" y="66" width="${TEXT_THUMB_WIDTH - 40}" height="236" rx="12" fill="${CODE_BG}"/>`;
  return svgToWebp(textCardSvg({ name, content: `${inset}${codeBody({ text, colorize })}` }));
}

/** Neutral card when a file's real preview can't be rendered, so a thumbnail still exists. */
async function fallbackCardToWebp({ name }: { name: string }): Promise<Buffer> {
  const shell = `<rect x="24" y="72" width="${TEXT_THUMB_WIDTH - 48}" height="196" rx="10" fill="#f9fafb" stroke="${CARD_BORDER}"/>`;
  const lines = Array.from({ length: 4 }, (_, index) => {
    const y = 92 + index * 26;
    return `<line x1="36" y1="${y}" x2="${TEXT_THUMB_WIDTH - 36}" y2="${y}" stroke="${CARD_BORDER}" stroke-width="1"/>`;
  }).join('');

  return svgToWebp(textCardSvg({ name, content: `${shell}${lines}` }));
}

/**
 * Spreadsheet -> grid card. Parses the first sheet with the same `xlsx` library the preview
 * dialog uses, then draws a small table. Rendering the cells directly avoids Gotenberg's PDF
 * export, which some wide sheets turn into a PDF the canvas renderer rejects.
 */
async function spreadsheetToWebp({ body, name }: { body: Buffer; name: string }): Promise<Buffer> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(body, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;

    const raw = sheet
      ? (XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          blankrows: false,
          defval: '',
        }) as unknown[][])
      : [];
    const rows = raw
      .slice(0, SPREADSHEET_MAX_ROWS)
      .map((row) => row.slice(0, SPREADSHEET_MAX_COLS).map((cell) => String(cell ?? '')));

    if (rows.length === 0) return fallbackCardToWebp({ name });

    const cols = Math.max(1, ...rows.map((row) => row.length));
    const tableX = 24;
    const tableY = 72;
    const tableWidth = TEXT_THUMB_WIDTH - tableX * 2;
    const rowHeight = 26;
    const colWidth = tableWidth / cols;

    const cells = rows
      .flatMap((row, rowIndex) =>
        Array.from({ length: cols }, (_, colIndex) => {
          const x = tableX + colIndex * colWidth;
          const y = tableY + rowIndex * rowHeight;
          const isHeader = rowIndex === 0;
          const value = truncate(row[colIndex] ?? '', SPREADSHEET_CELL_CHARS);
          const rect = `<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="${isHeader ? SPREADSHEET_HEADER_BG : CARD_BG}" stroke="${CARD_BORDER}" stroke-width="1"/>`;
          if (!value) return rect;

          const text = `<text x="${x + 6}" y="${y + 17}" font-family="'DejaVu Sans', sans-serif" font-size="10.5" font-weight="${isHeader ? 700 : 400}" fill="${isHeader ? CARD_TITLE : MARKDOWN_TEXT}" xml:space="preserve">${escapeXml(value)}</text>`;
          return `${rect}${text}`;
        }),
      )
      .join('');

    return svgToWebp(textCardSvg({ name, content: cells }));
  } catch (error) {
    // A corrupt workbook shouldn't leave the source stuck on a failed row.
    console.warn('[thumbnails] spreadsheet render failed, using fallback card', error);
    return fallbackCardToWebp({ name });
  }
}

async function toWebp(input: Buffer): Promise<Buffer> {
  return sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate() // respect EXIF orientation
    .resize({
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}

/** Render the first PDF page, then shrink it; fall back to a card if the renderer rejects it. */
async function pdfToWebp({ body, name }: { body: Buffer; name: string }): Promise<Buffer> {
  try {
    const document = await pdf(body, { scale: 2 });
    try {
      const firstPage = await document.getPage(1);
      return await toWebp(firstPage);
    } finally {
      await document.destroy();
    }
  } catch (error) {
    // pdf-to-img (PDF.js on canvas) rejects some LibreOffice PDFs, e.g. a clip without a
    // Path2D. A generic card beats failing the whole thumbnail.
    console.warn('[thumbnails] PDF render failed, using fallback card', error);
    return fallbackCardToWebp({ name });
  }
}

/** Returns the thumbnail bytes, or null for a type we don't render. */
export async function generateThumbnail({
  body,
  mimeType,
  name,
}: {
  body: Buffer;
  mimeType: string;
  name: string;
}): Promise<Buffer | null> {
  const mime = mimeType.toLowerCase();

  if (mime.startsWith('image/')) return toWebp(body);
  if (mime === 'application/pdf') return pdfToWebp({ body, name });

  if (mime === 'text/markdown') return markdownToWebp({ text: body.toString('utf8'), name });
  if (mime === 'application/json') {
    return codeCardToWebp({ text: body.toString('utf8'), name, colorize: true });
  }
  if (mime === 'text/plain') {
    return codeCardToWebp({ text: body.toString('utf8'), name, colorize: false });
  }

  // Spreadsheets before the generic office branch: their PDF export breaks the canvas renderer.
  if (isSpreadsheetMime(mime)) return spreadsheetToWebp({ body, name });

  if (THUMBNAILABLE_OFFICE_TYPES.has(mime)) {
    const pdfBuffer = await convertOfficeToPdf({ body, name, mimeType });
    return pdfToWebp({ body: pdfBuffer, name });
  }

  return null;
}
