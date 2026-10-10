import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

const DIFFICULTY_BADGE_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700 hover:bg-red-100',
  medium: 'bg-amber-50 text-amber-700 hover:bg-amber-50',
};

const DifficultyIndicator = ({ difficulty }: { difficulty?: string | null }) => {
  if (!difficulty) return null;

  const badgeStyle = DIFFICULTY_BADGE_STYLES[difficulty];
  const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  if (badgeStyle) {
    return (
      <Badge variant="secondary" className={cn('shrink-0 text-xs font-medium', badgeStyle)}>
        {label}
      </Badge>
    );
  }

  return <span className="shrink-0 text-xs text-gray-400">{label}</span>;
};

export default DifficultyIndicator;
