'use client';

import { useState } from 'react';
import type { ChatArtifactType } from '@nexus/types';
import { ArrowLeft, Check, Copy, Download, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetArtifactContent } from '@/hooks/useArtifacts';
import { artifactFilename, downloadTextFile } from '@/lib/utils';
import {
  ArtifactCard,
  ArtifactTypeIcon,
  ARTIFACT_TYPE_LABELS,
  displayArtifactType,
} from './ArtifactCard';
import { Markdown } from './Markdown';
import { MermaidDiagram } from './MermaidDiagram';

type ArtifactListPanelProps = {
  artifacts: ChatArtifactType[];
  onOpen: (artifact: ChatArtifactType) => void;
  onClose: () => void;
};

/** The panel's default view: every artifact this conversation has produced. */
export const ArtifactListPanel = ({ artifacts, onOpen, onClose }: ArtifactListPanelProps) => (
  <div className="flex h-full min-h-0 flex-col">
    <header className="flex items-center gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">Artifacts</p>
        <p className="text-xs text-muted-foreground">
          {artifacts.length === 1 ? '1 artifact' : `${artifacts.length} artifacts`}
        </p>
      </div>
      <Button variant="ghost" aria-label="Close" onClick={onClose}>
        <X className="size-4" />
      </Button>
    </header>

    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
      {artifacts.length === 0 ? (
        <p className="pt-6 text-center text-sm text-muted-foreground">
          No artifacts in this conversation yet.
        </p>
      ) : (
        artifacts.map((artifact) => (
          <ArtifactCard
            key={`${artifact.id}-${artifact.version}`}
            artifact={artifact}
            onOpen={onOpen}
          />
        ))
      )}
    </div>
  </div>
);

type ArtifactPanelProps = {
  artifact: ChatArtifactType;
  onClose: () => void;
  /** Returns to the artifact list; omitted when the panel is opened straight to one artifact. */
  onBack?: () => void;
};

/** Mount with `key={artifact.id}` so the version picker resets for each artifact. */
export const ArtifactPanel = ({ artifact, onClose, onBack }: ArtifactPanelProps) => {
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

  const download = () => {
    if (!data) return;
    downloadTextFile({
      filename: artifactFilename(artifact.name, data.mimeType),
      content: data.content,
      mimeType: data.mimeType,
    });
  };

  // A `.md`/`.mmd` filename decides the rendering, even if the model saved it as `code`.
  const displayType = displayArtifactType(artifact);
  const renderKind =
    displayType === 'diagram' || data?.mimeType === 'text/vnd.mermaid'
      ? 'mermaid'
      : displayType === 'document' || data?.mimeType === 'text/markdown'
        ? 'markdown'
        : 'code';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        {onBack && (
          <Button variant="ghost" aria-label="Back to artifacts" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
        )}
        <ArtifactTypeIcon type={displayType} className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{artifact.name}</p>
          <p className="text-xs text-muted-foreground">{ARTIFACT_TYPE_LABELS[displayType]}</p>
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

        <Button variant="ghost" aria-label="Download" disabled={!data} onClick={download}>
          <Download className="size-4" />
        </Button>
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
          (renderKind === 'mermaid' ? (
            <MermaidDiagram source={data.content} />
          ) : renderKind === 'markdown' ? (
            <Markdown>{data.content}</Markdown>
          ) : (
            <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
              {data.content}
            </pre>
          ))}
      </div>
    </div>
  );
};
