import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center cursor-pointer justify-center transition gap-2 rounded-lg text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'bg-foreground text-background hover:opacity-90',
        outline: 'border-border hover:bg-accent',
        ghost: 'hover:bg-accent',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-10 px-4',
        lg: 'h-12 px-6',
      },
    },
    defaultVariants: { variant: 'default', size: 'sm' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant = 'default', size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
