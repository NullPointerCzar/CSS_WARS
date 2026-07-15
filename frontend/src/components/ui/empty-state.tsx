import { cn } from '@/lib/utils';
import { Button } from './button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** When true, renders a secondary "Clear filters" action. */
  hasFilters?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

/**
 * EmptyState — used wherever a list/table has no data.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  hasFilters,
  onClearFilters,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-surface-3 text-muted-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {action && (
          <Button
            variant="outline"
            size="sm"
            onClick={action.onClick}
          >
            {action.icon && <action.icon className="h-3.5 w-3.5" />}
            {action.label}
          </Button>
        )}
        {hasFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
