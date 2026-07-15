import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card — surface container with consistent border, radius, padding, and inner padding scale.
 *
 * Variants:
 *   - default: standard surface-2 panel with subtle border
 *   - raised:  surface-3, slightly elevated feel
 *   - ghost:   no background, subtle border only
 *   - outline: transparent background, stronger border
 */
type CardVariant = 'default' | 'raised' | 'ghost' | 'outline';

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-card text-card-foreground border border-border shadow-soft-sm',
  raised: 'bg-surface-3 text-foreground border border-border shadow-soft-md',
  ghost: 'bg-transparent text-foreground border border-transparent',
  outline: 'bg-transparent text-foreground border border-border',
};

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }
>(({ className, variant = 'default', ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card"
    className={cn(
      'rounded-lg text-card-foreground',
      variantClasses[variant],
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-header"
    className={cn('flex flex-col gap-1.5 px-5 pt-5 pb-3', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    data-slot="card-title"
    className={cn(
      'text-base font-semibold tracking-tight text-foreground',
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    data-slot="card-description"
    className={cn('text-xs text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-content"
    className={cn('px-5 py-3', className)}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-footer"
    className={cn(
      'flex items-center justify-between gap-3 px-5 py-3 border-t border-border',
      className,
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
