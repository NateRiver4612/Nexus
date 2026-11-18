import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-card p-6 text-card-foreground shadow-2xs',
        className,
      )}
      {...props}
    />
  );
};

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn('mb-4 space-y-1.5', className)} {...props} />;
};

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h3 className={cn('text-base font-bold tracking-tight sm:text-lg', className)} {...props} />
  );
};

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />
  );
};
