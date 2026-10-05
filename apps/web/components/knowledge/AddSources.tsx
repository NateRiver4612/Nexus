'use client';

import { useRef, useState } from 'react';
import { Link2, Type, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateKnowledgeSources, useCreateKnowledgeUploadUrl } from '@/hooks/useKnowledge';
import { isYouTubeUrl } from '@/lib/youtube';

type SourceStatus = 'idle' | 'submitting' | 'error';

export function AddSources({ projectId }: { projectId: string }) {
  const createSources = useCreateKnowledgeSources(projectId);
  const uploadUrl = useCreateKnowledgeUploadUrl(projectId);

  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<SourceStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const [link, setLink] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  async function start(work: () => Promise<void>) {
    setStatus('submitting');
    setMessage(null);
    try {
      await work();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setStatus('idle');
    }
  }

  async function handleFile(file: File) {
    await start(async () => {
      const { key, url } = await uploadUrl.mutateAsync({
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });
      const res = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      await createSources.mutateAsync([
        {
          sourceType: 'file',
          name: file.name,
          mimeType: file.type,
          storageKey: key,
          size: file.size,
        },
      ]);
    });
  }

  async function handleLink() {
    if (!link) return;
    await start(async () => {
      await createSources.mutateAsync([
        { sourceType: isYouTubeUrl(link) ? 'youtube' : 'url', url: link },
      ]);
      setLink('');
    });
  }

  async function handleText() {
    if (!textTitle || !textContent) {
      setStatus('error');
      setMessage('Add a title and at least a few sentences.');
      return;
    }
    await start(async () => {
      await createSources.mutateAsync([{ sourceType: 'copied_text', textTitle, textContent }]);
      setTextTitle('');
      setTextContent('');
    });
  }

  const submitting = status === 'submitting';

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">
            <Upload className="mr-2 size-4" /> Upload files
          </TabsTrigger>
          <TabsTrigger value="link">
            <Link2 className="mr-2 size-4" /> Websites / YouTube
          </TabsTrigger>
          <TabsTrigger value="text">
            <Type className="mr-2 size-4" /> Copied text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.docx,.xlsx,.csv,text/markdown,text/plain,image/*"
            multiple={false}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            <Upload className="size-6" />
            <span>Drop a file or click to browse</span>
            <span className="text-xs">PDF, DOCX, XLSX, CSV, markdown, text, images</span>
          </button>
        </TabsContent>

        <TabsContent value="link" className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com or a YouTube link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              disabled={submitting}
            />
            <Button onClick={handleLink} disabled={submitting || !link}>
              Add
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-2">
          <Input
            placeholder="Title"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            disabled={submitting}
          />
          <textarea
            placeholder="Paste the text you want to add as knowledge…"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            disabled={submitting}
            rows={5}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <Button onClick={handleText} disabled={submitting || !textTitle}>
            Add text
          </Button>
        </TabsContent>
      </Tabs>

      {message && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}
