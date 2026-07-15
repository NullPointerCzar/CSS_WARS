import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type Accent = 'brand' | 'accent' | 'success' | 'warning' | 'info' | 'muted';

const accentMap: Record<Accent, { ring: string; icon: string }> = {
  brand: { ring: 'ring-1 ring-brand/15', icon: 'text-brand' },
  accent: { ring: 'ring-1 ring-accent/15', icon: 'text-accent' },
  success: { ring: 'ring-1 ring-success/15', icon: 'text-success' },
  warning: { ring: 'ring-1 ring-warning/15', icon: 'text-warning' },
  info: { ring: 'ring-1 ring-info/15', icon: 'text-info' },
  muted: { ring: 'ring-1 ring-border', icon: 'text-muted-foreground' },
};

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: Accent;
  className?: string;
}

/**
 * StatTile — minimal stat card with icon, value, label, optional sub-line.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'brand',
  className,
}: StatTileProps) {
  const cfg = accentMap[accent];
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-soft-sm',
        cfg.ring,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={cn('h-4 w-4', cfg.icon)} />
      </div>
      <div className="mt-2 num text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {sub && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}
