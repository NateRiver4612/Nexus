'use client';

import type { ComponentProps } from 'react';
import { GripVertical } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { cn } from '@/lib/utils';

export const ResizableGroup = Group;
export const ResizablePanel = Panel;

export const ResizableSeparator = ({
  className,
  children,
  ...props
}: ComponentProps<typeof Separator>) => (
  <Separator
    className={cn(
      'relative flex w-px shrink-0 items-center justify-center bg-border transition-colors hover:bg-accent',
      className,
    )}
    {...props}
  >
    {children ?? (
      <div className="z-10 flex h-6 w-3 items-center justify-center rounded-sm border border-border bg-background">
        <GripVertical className="size-3 text-muted-foreground" />
      </div>
    )}
  </Separator>
);
