import { cn } from '@/lib/utils';
import { LoaderCircle } from 'lucide-react';

export function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <div className="flex items-center gap-4">
      <LoaderCircle
        className={cn('size-6 animate-spin text-primary', className)}
        strokeWidth={1.5}
        {...props}
      />
    </div>
  );
}
