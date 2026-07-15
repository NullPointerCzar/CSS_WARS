import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Swords,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import { clearIdentity } from '../../lib/identity.js';
import { cn } from '@/lib/utils.js';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/challenges', icon: Swords, label: 'Challenges' },
  { to: '/admin/participants', icon: Users, label: 'Participants' },
  { to: '/admin/submissions', icon: FileText, label: 'Submissions' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
];

const secondaryItems = [
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export function AppAdminSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const isActive = (to: string) =>
    to === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(to);

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-linear',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
    >
      {/* Header / brand */}
      <div
        className={cn(
          'flex items-center gap-2 border-b border-border p-3',
          collapsed && 'justify-center',
        )}
      >
        <button
          onClick={onToggle}
          className="flex aspect-square size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 p-1 ring-1 ring-border transition hover:brightness-110"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <img src="/ncei-club.png" alt="NCEI Club" className="h-full w-full object-contain" />
        </button>
        {!collapsed && (
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-semibold text-foreground">
              CSS WARS
            </span>
            <span className="truncate text-[10px] text-sidebar-foreground/60">
              Admin Control Panel
            </span>
          </div>
        )}
      </div>

      {/* Main navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && !collapsed && (
                <ChevronRight className="ml-auto size-3 opacity-60" />
              )}
            </Link>
          );
        })}

        <div className="my-2 border-t border-border" />

        {secondaryItems.map((item) => (
          <div
            key={item.to}
            title={`${item.label} (Coming soon)`}
            className={cn(
              'flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/40 opacity-60',
              collapsed && 'justify-center px-0',
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && (
              <span className="ml-auto rounded-md bg-sidebar-accent/50 px-1.5 py-0.5 text-[10px]">
                Soon
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => {
            clearIdentity();
            window.location.href = '/';
          }}
          title="Back to main site"
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            collapsed && 'justify-center px-0',
          )}
        >
          <LogOut className="size-4 shrink-0 rotate-180" />
          {!collapsed && <span>Back to site</span>}
        </button>
      </div>
    </aside>
  );
}
