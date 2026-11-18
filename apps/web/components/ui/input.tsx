import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const Input = ({ className, type, ...props }: ComponentProps<'input'>) => {
  return (
    <input
      type={type}
      className={cn(
        `flex h-10 w-full rounded-input border border-input-border bg-input-background px-3 py-2 text-sm text-foreground shadow-2xs transition-colors
        placeholder:text-placeholder hover:border-border
        focus-visible:border-focus-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/20
        aria-invalid:border-destructive aria-invalid:hover:border-destructive aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/20
        file:border-0 file:bg-transparent file:text-sm file:text-foreground
        disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60`,
        className,
      )}
      {...props}
    />
  );
};
