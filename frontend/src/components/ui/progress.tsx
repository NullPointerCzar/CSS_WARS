import { Progress } from '@base-ui/react/progress';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0..100
  className?: string;
  trackClassName?: string;
  indicatorClassName?: string;
  label?: string;
}

/**
 * ProgressBar — thin, accessible linear progress.
 * Uses base-ui Progress for proper ARIA + indeterminate support.
 */
export function ProgressBar({
  value,
  className,
  trackClassName,
  indicatorClassName,
  label,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <Progress.Root
      value={clamped}
      aria-label={label}
      className={cn(
        'relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3',
        trackClassName,
        className,
      )}
    >
      <Progress.Indicator
        className={cn(
          'h-full bg-brand transition-transform duration-300 ease-out',
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - clamped}%)` }}
      />
    </Progress.Root>
  );
}
