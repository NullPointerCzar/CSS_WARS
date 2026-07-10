import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Swords,
  Users,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/challenges', icon: Swords, label: 'Challenges' },
  { to: '/admin/participants', icon: Users, label: 'Participants' },
  { to: '/admin/submissions', icon: FileText, label: 'Submissions' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics', disabled: true },
  { to: '/admin/settings', icon: Settings, label: 'Settings', disabled: true },
];

export function AdminSidebar() {
  return (
    <aside className="w-64 shrink-0 bg-slate-900/80 border-r border-slate-800 flex flex-col h-full">
      {/* Logo area */}
      <div className="px-5 py-6 border-b border-slate-800/50">
        <NavLink to="/admin" className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm shadow-lg shadow-amber-500/20">
            CSS
          </span>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">Admin</span>
            <p className="text-[10px] text-slate-500 leading-tight">Control Panel</p>
          </div>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.disabled) {
            return (
              <div
                key={item.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 cursor-not-allowed select-none"
                title="Coming soon"
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
                <span className="ml-auto text-[9px] text-slate-700 bg-slate-800/50 px-1.5 py-0.5 rounded-md">
                  Soon
                </span>
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-4 py-4 border-t border-slate-800/50">
        <NavLink
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          Back to main site
        </NavLink>
      </div>
    </aside>
  );
}
