import { cn } from '@/lib/utils';
import { LoaderIcon } from 'lucide-react';

export function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <div className="flex items-center gap-4">
      <LoaderIcon
        role="status"
        aria-label="Loading"
        className={cn('size-4 animate-spin', className)}
        {...props}
      />
    </div>
  );
}
