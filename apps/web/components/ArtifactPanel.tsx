'use client';

import { useState } from 'react';
import type { ChatArtifactType } from '@nexus/types';
import { Check, Copy, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetArtifactContent } from '@/hooks/useArtifacts';
import { ArtifactTypeIcon, ARTIFACT_TYPE_LABELS } from './ArtifactCard';
import { Markdown } from './Markdown';
import { MermaidDiagram } from './MermaidDiagram';

type ArtifactPanelProps = {
  artifact: ChatArtifactType;
  onClose: () => void;
};

/** Mount with `key={artifact.id}` so the version picker resets for each artifact. */
export const ArtifactPanel = ({ artifact, onClose }: ArtifactPanelProps) => {
  // `undefined` follows the newest version.
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>();
  const [copied, setCopied] = useState(false);
  const { data, isLoading, isError } = useGetArtifactContent({
    variables: { id: artifact.id, version: selectedVersion },
  });

  const copy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <ArtifactTypeIcon type={artifact.type} className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{artifact.name}</p>
          <p className="text-xs text-muted-foreground">{ARTIFACT_TYPE_LABELS[artifact.type]}</p>
        </div>

        {data && data.versions.length > 1 && (
          <select
            aria-label="Version"
            className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
            value={data.version}
            onChange={(event) => setSelectedVersion(Number(event.target.value))}
          >
            {data.versions.map(({ version }) => (
              <option key={version} value={version}>
                v{version}
              </option>
            ))}
          </select>
        )}

        <Button variant="ghost" aria-label="Copy" disabled={!data} onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
        <Button variant="ghost" aria-label="Close" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-error">This artifact could not be loaded. Try again.</p>
        )}
        {data &&
          (data.mimeType === 'text/vnd.mermaid' ? (
            <MermaidDiagram source={data.content} />
          ) : data.mimeType === 'text/markdown' ? (
            <Markdown>{data.content}</Markdown>
          ) : (
            <pre className="whitespace-pre-wrap text-sm">{data.content}</pre>
          ))}
      </div>
    </div>
  );
};
