import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 text-[11px] font-bold leading-none transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        action: 'bg-action text-action-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        accent: 'bg-accent text-accent-foreground',
        'accent-soft': 'bg-accent-soft text-accent-foreground',
        'accent-secondary': 'bg-accent-secondary text-accent-secondary-foreground',
        'accent-secondary-soft': 'bg-accent-secondary-soft text-accent-secondary-foreground',
        'accent-tertiary': 'bg-accent-tertiary text-accent-tertiary-foreground',
        'accent-tertiary-soft': 'bg-accent-tertiary-soft text-accent-tertiary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-border bg-surface text-foreground',
        danger: 'bg-destructive/10 text-destructive',
        muted: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export const Badge = ({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) => {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
};
