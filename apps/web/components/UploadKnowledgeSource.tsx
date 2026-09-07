'use client';

import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, ClipboardType, Link2, Play, Upload, X } from 'lucide-react';
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
  onFilesAdded: (files: File[]) => void;
  onLinkAdded: (url: string) => void;
  onTextAdded: (title: string, content: string) => void;
}

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.xlsx,.csv,.txt,.md,.jpg,.jpeg,.png,.webp';

export function UploadKnowledgeSource({
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
    },
    [onFilesAdded],
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
  }, [linkValue, onLinkAdded]);

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
  }, [textTitle, textContent, onTextAdded]);

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
              'flex flex-col items-center justify-center bg-background/50 rounded-xl border border-dashed px-6 py-10 text-center transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-border',
            )}
          >
            <p className="font-semibold text-base text-gray-700">
              Drag and drop files here, or choose a source below
            </p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              PDF, DOCX, XLSX, CSV, TXT, MD, or an image
            </p>
            <div className="grid grid-cols-3 gap-2 pt-6">
              <Button
                variant="outline"
                className="flex border border-gray-300 rounded-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-4" color="black" />
                <span className="text-sm text-black">Upload files</span>
              </Button>
              <Button
                variant="outline"
                className="flex border border-gray-300 rounded-full gap-2"
                onClick={() => {
                  setError(null);
                  setMode('link');
                }}
              >
                <Link2 className="size-4" color="black" />
                <div className="p-1 px-2 bg-red-500 rounded-sm">
                  <Play color="white" strokeWidth={8} enableBackground={'white'} size={6} />
                </div>
                <span className="text-sm text-black">Add link</span>
              </Button>
              <Button
                variant="outline"
                className="flex border border-gray-300 rounded-full gap-2"
                onClick={() => {
                  setError(null);
                  setMode('text');
                }}
              >
                <ClipboardType className="size-4" color="black" />
                <span className="text-sm text-black">Copied text</span>
              </Button>
            </div>
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
        <div className="space-y-4 rounded-lg shadow-sm p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                className="flex justify-between"
                onClick={() => setMode('idle')}
              >
                <ArrowLeft size={18} />
                <Label htmlFor="knowledge-link">Website or YouTube URL</Label>
              </Button>
              <Link2 size={20} />
            </div>
            <Input
              id="knowledge-link"
              placeholder="https://…"
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              autoFocus
            />
            <ul className=" text-xs text-muted-foreground list-disc text-start w-full list-inside space-y-1">
              <li>To add multiple URLs, separate with a space or new line. </li>
              <li>Only the visible text on the website will be imported at this time.</li>
              <li>Paid articles are not supported. Only the</li>
              <li>text transcript in YouTube will be imported at this time.</li>
              <li>Only public YouTube videos are supported.</li>
              <li>Recently uploaded videos may not be available to import.</li>
            </ul>
          </div>
        </div>
      )}

      {mode === 'text' && (
        <div className="space-y-4 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              className="flex justify-between"
              onClick={() => setMode('idle')}
            >
              <ArrowLeft size={18} />
              <p>Copied Text</p>
            </Button>
            <ClipboardType size={20} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="knowledge-text-title">Title</Label>
            </div>
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
