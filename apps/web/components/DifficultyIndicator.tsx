import { Badge } from './ui/badge';

const DIFFICULTY_VARIANTS = {
  low: 'accent-secondary-soft',
  medium: 'accent-soft',
  high: 'accent-tertiary-soft',
} as const;

const DifficultyIndicator = ({ difficulty }: { difficulty?: string | null }) => {
  if (!difficulty) return null;

  const variant = DIFFICULTY_VARIANTS[difficulty as keyof typeof DIFFICULTY_VARIANTS] ?? 'muted';
  const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return (
    <Badge variant={variant} className="shrink-0 capitalize">
      {label}
    </Badge>
  );
};

export default DifficultyIndicator;
