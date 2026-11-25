import { UnrecoverableError } from 'bullmq';
import type { TranscriptResponse } from 'youtube-transcript';

import { youtubeVideoId } from '@nexus/shared-helpers';

import { withUnrecoverable } from '../../queue-errors';

export type ExtractResult = { title: string; content: string };

/** Only English transcripts are accepted for now; other languages fail rather than fall back. */
const TRANSCRIPT_LANG = 'en';

/** oEmbed is public, unauthenticated, and gives exactly the title — no API key needed. */
export async function fetchYoutubeTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
    );
    if (!res.ok) return 'Untitled';
    const data = (await res.json()) as { title?: string };
    return data.title?.trim() || 'Untitled';
  } catch {
    return 'Untitled'; // title is a nice-to-have — don't let a failed metadata fetch kill ingestion
  }
}

/** Fetch the caption transcript and the page title together — single metadata round-trip. */
export async function extractFromYoutube(url?: string | null): Promise<ExtractResult> {
  const videoId = youtubeVideoId({ url });
  if (!videoId) throw new UnrecoverableError('unable to parse a YouTube video id from the url');

  const {
    YoutubeTranscript,
    YoutubeTranscriptError,
    YoutubeTranscriptNotAvailableLanguageError,
    YoutubeTranscriptTooManyRequestError,
  } = await import('youtube-transcript');
  // A disabled/missing/private transcript won't change on retry; rate limits will.
  const transcriptPromise = withUnrecoverable({
    promise: YoutubeTranscript.fetchTranscript(videoId, { lang: TRANSCRIPT_LANG }),
    isUnrecoverable: (error) =>
      error instanceof YoutubeTranscriptError &&
      !(error instanceof YoutubeTranscriptTooManyRequestError),
    message: (error) =>
      error instanceof YoutubeTranscriptNotAvailableLanguageError
        ? 'No English transcript is available for this video.'
        : error instanceof Error
          ? error.message
          : String(error),
  });
  const [transcript, title] = await Promise.all([transcriptPromise, fetchYoutubeTitle(videoId)]);

  return {
    title,
    content: transcript.map((line: TranscriptResponse) => line.text).join(' '),
  };
}
