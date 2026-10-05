import type { ProjectStatusType, TaskStatusEnum } from '@nexus/types';
import type { HTMLAttributes } from 'react';

export type StatusType = ProjectStatusType | TaskStatusEnum;

export type StatusSize = 'sm' | 'md' | 'lg';

interface StatusProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusType;
  size?: StatusSize;
}

const statusStyles: Record<StatusType, { label: string; className: string; dotClassName: string }> =
  {
    completed: {
      label: 'Completed',
      className: 'border-emerald-300 bg-emerald-50 text-emerald-700',
      dotClassName: 'bg-emerald-500',
    },
    active: {
      label: 'Active',
      className: 'border-blue-300 bg-blue-50 text-blue-700',
      dotClassName: 'bg-blue-500',
    },
    draft: {
      label: 'Draft',
      className: 'border-gray-300 bg-gray-50 text-gray-600',
      dotClassName: 'bg-gray-400',
    },
    paused: {
      label: 'Paused',
      className: 'border-amber-300 bg-amber-50 text-amber-700',
      dotClassName: 'bg-amber-500',
    },
    archived: {
      label: 'Archived',
      className: 'border-violet-300 bg-violet-50 text-violet-700',
      dotClassName: 'bg-violet-500',
    },
    in_progress: {
      label: 'In Progress',
      className: 'border-[#2b5d9d] text-[#2b5d9d]',
      dotClassName: 'bg-[#2b5d9d]',
    },
    todo: {
      label: 'Todo',
      className: 'border-[#5bcdf0] text-[#5bcdf0]',
      dotClassName: 'bg-[#5bcdf0]',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'border-[#c9d1d4] text-[#c9d1d4]',
      dotClassName: 'bg-[#c9d1d4]',
    },
  };

const sizeStyles: Record<StatusSize, { container: string; dot: string }> = {
  sm: {
    container: 'gap-1.5 px-2 py-0.5 text-xs',
    dot: 'size-1.5',
  },
  md: {
    container: 'gap-2 px-3 py-1 text-sm',
    dot: 'size-2',
  },
  lg: {
    container: 'gap-2.5 px-4 py-1.5 text-base',
    dot: 'size-2.5',
  },
};

export function Status({ status, size = 'md', className = '', ...props }: StatusProps) {
  const { label, className: variantClass, dotClassName } = statusStyles[status];

  const { container, dot } = sizeStyles[size];

  return (
    <span
      role="status"
      className={`inline-flex w-fit items-center rounded-full border font-medium ${container} ${variantClass} ${className}`}
      {...props}
    >
      <span aria-hidden="true" className={`rounded-full ${dot} ${dotClassName}`} />
      {label}
    </span>
  );
}

export default Status;
