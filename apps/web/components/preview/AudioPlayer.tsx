'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type WaveSurfer from 'wavesurfer.js';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AudioPlayerProps = {
  src: string;
  className?: string;
};

/** Waveform player. Falls back to the native `<audio>` element if decoding fails. */
export const AudioPlayer = ({ src, className }: AudioPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let player: WaveSurfer | null = null;

    setIsPlaying(false);
    setIsReady(false);
    setHasError(false);

    const setup = async () => {
      const container = containerRef.current;
      if (!container) return;

      const { default: WaveSurferCtor } = await import('wavesurfer.js');
      if (cancelled) return;

      // Canvas can't resolve CSS variables, so read the theme values once at mount.
      const styles = getComputedStyle(container);
      const primary = styles.getPropertyValue('--primary').trim() || '#6477d8';
      const muted = styles.getPropertyValue('--muted-foreground').trim() || '#6b7280';

      player = WaveSurferCtor.create({
        container,
        height: 40,
        waveColor: muted,
        progressColor: primary,
        cursorWidth: 0,
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        normalize: true,
        url: src,
      });
      playerRef.current = player;

      player.on('ready', () => setIsReady(true));
      player.on('play', () => setIsPlaying(true));
      player.on('pause', () => setIsPlaying(false));
      player.on('finish', () => setIsPlaying(false));
      player.on('error', () => setHasError(true));
    };

    void setup();

    return () => {
      cancelled = true;
      player?.destroy();
      playerRef.current = null;
    };
  }, [src]);

  if (hasError) {
    return <audio controls src={src} className={cn('w-full', className)} />;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        disabled={!isReady}
        onClick={() => playerRef.current?.playPause()}
        className="size-8 shrink-0 rounded-full p-0"
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <div ref={containerRef} className="min-w-0 flex-1" />
    </div>
  );
};
