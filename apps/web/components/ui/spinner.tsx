import { LoaderCircle } from 'lucide-react';

export function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <div className="flex items-center gap-4">
      <LoaderCircle className="size-6 animate-spin text-primary" strokeWidth={1.5} />
    </div>
  );
}
