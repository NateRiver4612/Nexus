import type { TranscriptResponse } from 'youtube-transcript';

export type ExtractResult = { title: string; content: string };

/** Extract a stable video id from common YouTube URL shapes. */
export function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|v=|watch\?v=)([\w-]{11})/);
  return match?.[1] ?? null;
}

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
  const videoId = youtubeVideoId(url);
  if (!videoId) throw new Error('unable to parse a YouTube video id from the url');

  const { YoutubeTranscript } = await import('youtube-transcript');
  const [transcript, title] = await Promise.all([
    YoutubeTranscript.fetchTranscript(videoId),
    fetchYoutubeTitle(videoId),
  ]);

  return {
    title,
    content: transcript.map((line: TranscriptResponse) => line.text).join(' '),
  };
}
