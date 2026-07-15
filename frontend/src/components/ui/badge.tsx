import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Badge — neutral / brand / success / warning / danger / info
 * Sizes: sm | md
 */
const badgeVariants = cva(
  cn(
    'inline-flex items-center gap-1.5 rounded-sm font-medium',
    'whitespace-nowrap select-none',
  ),
  {
    variants: {
      variant: {
        neutral: 'bg-surface-3 text-muted-foreground border border-border',
        brand: 'bg-brand-soft text-brand border border-brand/20',
        success: 'bg-success-soft text-success border border-success/20',
        warning: 'bg-warning-soft text-warning border border-warning/20',
        danger: 'bg-destructive-soft text-destructive border border-destructive/20',
        info: 'bg-info-soft text-info border border-info/20',
        outline: 'bg-transparent text-foreground border border-border',
      },
      size: {
        sm: 'h-5 px-1.5 text-[10px]',
        md: 'h-6 px-2 text-xs',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'sm',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
