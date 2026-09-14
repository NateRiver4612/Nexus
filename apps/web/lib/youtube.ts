/** True for common YouTube URL shapes (youtu.be, watch?v, etc.). */
export function isYouTubeUrl(url: string): boolean {
  return /youtu\.be\/|v=|watch\?v=/.test(url);
}
