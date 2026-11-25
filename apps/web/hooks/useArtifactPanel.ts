'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ArtifactRefType } from '@nexus/types';
import { useGroupRef, usePanelRef, type Layout, type PanelSize } from 'react-resizable-panels';

const ARTIFACT_DEFAULT_SIZE = '30';

type UseArtifactPanelOptions = {
  /** localStorage key for the resizable group layout. Omit to disable persistence. */
  layoutKey?: string;
  /** Split mode: slide the panel via its resize handle. `false` flips open state instantly. */
  animated?: boolean;
};

/**
 * Artifact selection plus, when `animated`, the slide/resize behavior for a collapsible
 * artifact panel. Callers own the surrounding `<ResizableGroup>`; this only manages the
 * artifact panel's refs, size memory, and persisted group layout.
 */
export function useArtifactPanel({ layoutKey, animated = false }: UseArtifactPanelOptions = {}) {
  const [artifact, setArtifact] = useState<ArtifactRefType | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const groupRef = useGroupRef();
  const artifactRef = usePanelRef();
  const artifactElRef = useRef<HTMLDivElement>(null);
  // Last expanded width (percentage) so reopening restores the user's size.
  const lastArtifactSize = useRef(ARTIFACT_DEFAULT_SIZE);
  const transitionTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  // Ignore the resize events our own slide produces; otherwise closing would unmount the
  // content the instant the panel hits 0 instead of when the animation ends.
  const animating = useRef(false);
  // Read by the stable `resetArtifact` callback so it can collapse an open panel without
  // re-identifying itself (which would re-run consumers' effects on mode changes).
  const animatedRef = useRef(animated);
  animatedRef.current = animated;
  const panelOpenRef = useRef(panelOpen);
  panelOpenRef.current = panelOpen;

  // Restore the saved split after the group mounts. The artifact always starts collapsed —
  // its open state is in-memory, so a persisted non-zero size would restore an empty panel.
  useEffect(() => {
    if (!animated || !layoutKey) return;
    const stored = window.localStorage.getItem(layoutKey);
    if (!stored) return;
    try {
      groupRef.current?.setLayout({ ...(JSON.parse(stored) as Layout), artifact: 0 });
    } catch {
      // Corrupt or incompatible layout — keep the defaults.
    }
  }, [animated, layoutKey, groupRef]);

  // The transition must live on the panel's outer element — the `className`/`style` props
  // go to an inner wrapper.
  const animateArtifact = useCallback((size: string) => {
    const el = artifactElRef.current;
    animating.current = true;
    if (el) el.style.transition = 'flex-grow 300ms ease-out';
    artifactRef.current?.resize(size);

    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => {
      if (el) el.style.transition = '';
      animating.current = false;
    }, 320);
  }, []);

  // Stable callbacks so consumers can memoize children (e.g. ChatPanel) against them.
  // No selection opens the panel to the conversation's artifact list.
  const openPanel = useCallback(() => {
    // Reopening during the close animation must cancel the pending unmount.
    window.clearTimeout(closeTimer.current);
    setArtifact(null);
    setPanelOpen(true);
    if (animatedRef.current) animateArtifact(lastArtifactSize.current);
  }, [animateArtifact]);

  const openArtifact = useCallback(
    (next: ArtifactRefType) => {
      window.clearTimeout(closeTimer.current);
      setArtifact(next);
      setPanelOpen(true);
      if (animatedRef.current) animateArtifact(lastArtifactSize.current);
    },
    [animateArtifact],
  );

  const closePanel = useCallback(() => {
    if (!animatedRef.current) {
      setPanelOpen(false);
      setArtifact(null);
      return;
    }

    // Capture the size now: the slide makes the panel's ResizeObserver report tiny
    // intermediate sizes, so reading it after the animation would reopen to a sliver.
    const size = artifactRef.current?.getSize().asPercentage;
    if (size && size >= 1) lastArtifactSize.current = String(size);

    animateArtifact('0');
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setPanelOpen(false);
      setArtifact(null);
    }, 320);
  }, [animateArtifact]);

  const togglePanel = useCallback(() => {
    if (panelOpenRef.current) closePanel();
    else openPanel();
  }, [closePanel, openPanel]);

  /** Clear the selected artifact but leave the panel open (e.g. conversation changed). */
  const clearSelection = useCallback(() => setArtifact(null), []);

  /** Drop the selection and collapse the panel (e.g. the conversation changed). */
  const resetArtifact = useCallback(() => {
    // Collapse the resizable panel too, otherwise split mode leaves an empty column behind.
    if (animatedRef.current && panelOpenRef.current) animateArtifact('0');
    setArtifact(null);
    setPanelOpen(false);
  }, [animateArtifact]);

  const onArtifactResize = useCallback((size: PanelSize) => {
    if (animating.current) return;
    const open = size.asPercentage >= 1;
    // Remember a width picked by dragging, not just one captured on close.
    if (open) lastArtifactSize.current = String(size.asPercentage);
    setPanelOpen(open);
    // Dragging the panel shut returns the next open to the list.
    if (!open) setArtifact(null);
  }, []);

  const onGroupLayoutChanged = useCallback(
    (layout: Layout) => {
      if (!layoutKey) return;
      try {
        window.localStorage.setItem(layoutKey, JSON.stringify(layout));
      } catch {
        // Storage unavailable — resizing still works for this session.
      }
    },
    [layoutKey],
  );

  return {
    artifact,
    panelOpen,
    groupRef,
    artifactRef,
    artifactElRef,
    /** Last expanded width, for seeding a freshly mounted panel's `defaultSize`. */
    lastArtifactSize,
    openPanel,
    openArtifact,
    closePanel,
    togglePanel,
    clearSelection,
    resetArtifact,
    onArtifactResize,
    onGroupLayoutChanged,
  };
}
