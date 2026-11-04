'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type GenerateResearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (input: { reason?: string; sourceLimit?: number }) => void;
  isPending: boolean;
};

const MAX_SOURCE_LIMIT = 20;

export const GenerateResearchDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: GenerateResearchDialogProps) => {
  const [reason, setReason] = useState('');
  const [sourceLimit, setSourceLimit] = useState('');

  const handleConfirm = () => {
    const parsed = Number.parseInt(sourceLimit, 10);
    const limit =
      Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_SOURCE_LIMIT) : undefined;

    onConfirm({ reason: reason.trim() || undefined, sourceLimit: limit });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        if (!next) {
          setReason('');
          setSourceLimit('');
        }
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <RefreshCw className="size-5 text-primary" />
            Generate new research?
          </AlertDialogTitle>
          <AlertDialogDescription>
            New research is added as a new version — your existing sources are kept. This action
            consumes AI tokens.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="research-source-limit">How many resources do you want?</Label>
          <Input
            id="research-source-limit"
            type="number"
            min={1}
            max={MAX_SOURCE_LIMIT}
            placeholder={`${MAX_SOURCE_LIMIT} (default)`}
            value={sourceLimit}
            onChange={(event) => setSourceLimit(event.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground">
            Up to {MAX_SOURCE_LIMIT}. Leave empty to use the default ({MAX_SOURCE_LIMIT}).
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="research-reason">Why are you regenerating?</Label>
          <Textarea
            id="research-reason"
            placeholder="Optional — helps focus the new research"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={isPending}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {isPending && <RefreshCw className="size-4 animate-spin" />}
            Generate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
