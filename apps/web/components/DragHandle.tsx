import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import React from 'react';

const DragHandle = ({
  handleRef,
  className,
}: {
  handleRef: React.Ref<HTMLElement>;
  className?: string;
}) => {
  return (
    <span
      ref={handleRef as React.Ref<HTMLSpanElement>}
      onClick={(e) => e.stopPropagation()} // don't toggle the accordion when grabbing the handle
      className={cn(
        'cursor-grab touch-none text-gray-300 hover:text-gray-400 active:cursor-grabbing',
        className,
      )}
    >
      <GripVertical className="size-5 shrink-0" />
    </span>
  );
};

export default DragHandle;
