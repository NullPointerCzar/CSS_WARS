import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}

/**
 * SectionHeader — title, optional eyebrow, description, icon and right-side actions.
 * The only "header" pattern used across all pages.
 */
export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  eyebrow,
  className,
}: SectionHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-3 text-brand">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
