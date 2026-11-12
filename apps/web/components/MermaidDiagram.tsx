'use client';

import { useEffect, useState } from 'react';

type MermaidDiagramProps = { source: string };

// Each render needs its own element id; reusing one makes overlapping renders collide.
let renderCount = 0;

export const MermaidDiagram = ({ source }: MermaidDiagramProps) => {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const elementId = `mermaid-${renderCount++}`;
    setSvg(null);
    setFailed(false);

    const render = async () => {
      try {
        // Loaded on demand: mermaid is large and most chats never open a diagram.
        const { default: mermaid } = await import('mermaid');
        // The source is model output, so `strict` stays on: it sanitizes the SVG and
        // disables click handlers and raw HTML labels.
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
        const result = await mermaid.render(elementId, source);
        if (!cancelled) setSvg(result.svg);
      } catch {
        // A failed render leaves a stray error element in the page.
        document.getElementById(`d${elementId}`)?.remove();
        if (!cancelled) setFailed(true);
      }
    };
    void render();

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (failed) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-error">
          This diagram could not be rendered. Here is its source:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{source}</pre>
      </div>
    );
  }

  if (!svg) return <p className="text-sm text-muted-foreground">Rendering diagram…</p>;

  return (
    <div className="overflow-x-auto [&_svg]:mx-auto" dangerouslySetInnerHTML={{ __html: svg }} />
  );
};
