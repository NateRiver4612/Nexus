import { Circle, CircleCheck, CircleDot } from 'lucide-react';

const MilestoneStatusIcon = ({ done, isActive }: { done: boolean; isActive: boolean }) => {
  if (done) return <CircleCheck className="size-5 shrink-0 fill-green-600 text-white" />;
  if (isActive) return <CircleDot className="size-5 shrink-0 text-primary" />;
  return <Circle className="size-5 shrink-0 text-gray-300" />;
};

export default MilestoneStatusIcon;
