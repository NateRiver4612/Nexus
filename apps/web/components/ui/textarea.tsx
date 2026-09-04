import * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-18 text-gray-900 w-full shadow-sm rounded-lg border border-input bg-transparent px-2.5 py-2',
        'text-base transition-colors outline-none placeholder:text-muted-foreground border-gray-200 bg-white',
        'focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring/50 hover:border-gray-300 focus:border-blue-600',
        'disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
