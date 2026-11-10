'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from './ui/label';

type DetectedLinksProps = {
  urls: string[];
  /** Links beyond the cap that are not shown, so the user knows the list is partial. */
  hiddenCount?: number;
  onAdd: (urls: string[]) => Promise<void>;
  onSkip: () => void;
};

/**
 * Offered after copied text is saved. Everything starts checked, because the person pasted
 * the links on purpose, but importing costs time and credits, so they get the final say.
 */
export function DetectedLinks({ urls, hiddenCount = 0, onAdd, onSkip }: DetectedLinksProps) {
  const [selected, setSelected] = useState(() => new Set(urls));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = ({ url, checked }: { url: string; checked: boolean }) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(url);
      else next.delete(url);
      return next;
    });
  };

  const handleAdd = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await onAdd(urls.filter((url) => selected.has(url)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add links.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg shadow-sm p-4">
      <div className="space-y-1 text-start">
        <p className="text-sm font-medium">Links found in your text</p>
        <p className="text-xs text-muted-foreground">
          Your text was added. Checked links are also imported as sources, so their content can be
          used for your plan and in chat.
        </p>
      </div>
      <ul className="space-y-2 text-start">
        {urls.map((url) => (
          <li key={url} className="flex items-center gap-2">
            <Checkbox
              id={`detected-${url}`}
              checked={selected.has(url)}
              disabled={submitting}
              onCheckedChange={(checked) => toggle({ url, checked: checked === true })}
            />
            <Label htmlFor={`detected-${url}`} className="break-all text-xs font-normal">
              {url}
            </Label>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {hiddenCount} more {hiddenCount === 1 ? 'link was' : 'links were'} not shown. Add them
          from the link option.
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={submitting || selected.size === 0}
        >
          {submitting
            ? 'Adding…'
            : `Add ${selected.size} ${selected.size === 1 ? 'link' : 'links'}`}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onSkip} disabled={submitting}>
          Skip
        </Button>
      </div>
      {error && <p className="flex items-center gap-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
