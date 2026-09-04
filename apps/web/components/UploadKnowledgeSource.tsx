'use client';

import { useCallback, useRef, useState } from 'react';
import { Link2, Type, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  createKnowledgeSourceFileSchema,
  createKnowledgeSourceTextSchema,
  createKnowledgeSourceUrlSchema,
} from '@nexus/zod-schemas';

type Mode = 'idle' | 'link' | 'text';

interface UploadKnowledgeSourceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesAdded: (files: File[]) => void;
  onLinkAdded: (url: string) => void;
  onTextAdded: (title: string, content: string) => void;
}

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.xlsx,.csv,.txt,.md,.jpg,.jpeg,.png,.webp';

export function UploadKnowledgeSource({
  open,
  onOpenChange,
  onFilesAdded,
  onLinkAdded,
  onTextAdded,
}: UploadKnowledgeSourceProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetAndClose = useCallback(() => {
    setMode('idle');
    setLinkValue('');
    setTextTitle('');
    setTextContent('');
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const validated: File[] = [];

      for (const file of files) {
        const result = createKnowledgeSourceFileSchema.safeParse(file);
        if (!result.success) {
          setError(`${file.name}: ${result.error.issues[0]?.message}`);
          return;
        }
        validated.push(file);
      }

      setError(null);
      onFilesAdded(validated);
      resetAndClose();
    },
    [onFilesAdded, resetAndClose],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleLinkSubmit = useCallback(() => {
    const result = createKnowledgeSourceUrlSchema.safeParse({ url: linkValue });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Enter a valid URL.');
      return;
    }
    onLinkAdded(result.data.url);
    resetAndClose();
  }, [linkValue, onLinkAdded, resetAndClose]);

  const handleTextSubmit = useCallback(() => {
    const result = createKnowledgeSourceTextSchema.safeParse({
      title: textTitle,
      content: textContent,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Check the fields below.');
      return;
    }
    onTextAdded(result.data.title, result.data.content);
    resetAndClose();
  }, [textTitle, textContent, onTextAdded, resetAndClose]);

  return (
    <div>
      {mode === 'idle' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-border',
            )}
          >
            <p className="text-sm text-muted-foreground">
              Drop files here, or choose a source below
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, DOCX, XLSX, CSV, TXT, MD, or an image
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              <span className="text-xs">Upload files</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => {
                setError(null);
                setMode('link');
              }}
            >
              <Link2 className="size-4" />
              <span className="text-xs">Add link</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 py-4"
              onClick={() => {
                setError(null);
                setMode('text');
              }}
            >
              <Type className="size-4" />
              <span className="text-xs">Paste text</span>
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS}
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      )}

      {mode === 'link' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="knowledge-link">Website or YouTube URL</Label>
            <Input
              id="knowledge-link"
              placeholder="https://…"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setMode('idle')}>
              Back
            </Button>
            <Button onClick={handleLinkSubmit} disabled={!linkValue}>
              Add link
            </Button>
          </div>
        </div>
      )}

      {mode === 'text' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="knowledge-text-title">Title</Label>
            <Input
              id="knowledge-text-title"
              placeholder="Meeting notes, snippet, etc."
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="knowledge-text-content">Content</Label>
            <Textarea
              id="knowledge-text-content"
              rows={8}
              placeholder="Paste text here…"
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setMode('idle')}>
              Back
            </Button>
            <Button onClick={handleTextSubmit} disabled={!textTitle || !textContent}>
              Add text
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <X className="size-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}
