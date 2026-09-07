import * as React from 'react';

import { cn } from '@/lib/utils';

export function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        `flex h-10 w-full rounded-md border text-base text-black border-input bg-transparent px-3 py-2
        shadow-sm transition-colors hover:border-gray-300 focus:border-blue-600
        aria-invalid:border-destructive aria-invalid:hover:border-destructive aria-invalid:focus:border-destructive
        file:border-0 file:bg-transparent file:text-sm file:font-medium 
        placeholder:text-muted-foreground 
        focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring/50 
        disabled:cursor-not-allowed disabled:opacity-50`,
        className,
      )}
      {...props}
    />
  );
}
