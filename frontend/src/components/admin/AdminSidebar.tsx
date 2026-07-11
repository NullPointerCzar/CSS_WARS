import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Swords,
  Users,
  FileText,
  BarChart3,
  Settings,
  ChevronRight,
  LogOut,
  Trophy,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { clearIdentity } from '../../lib/identity.js';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/challenges', icon: Swords, label: 'Challenges' },
  { to: '/admin/participants', icon: Users, label: 'Participants' },
  { to: '/admin/submissions', icon: FileText, label: 'Submissions' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
];

const secondaryItems = [
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics', soon: true },
  { to: '/admin/settings', icon: Settings, label: 'Settings', soon: true },
];

export function AppAdminSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      {/* Branding header with collapse toggle */}
      <SidebarHeader className="flex flex-row items-center gap-2 p-2">
        <button
          onClick={() => toggleSidebar()}
          className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white text-sm font-bold shadow-sm shrink-0 hover:brightness-110 transition-all cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          C
        </button>
        {!collapsed && (
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-semibold text-white text-sm">CSS WARS</span>
            <span className="truncate text-[10px] text-sidebar-foreground/60">
              Admin Control Panel
            </span>
          </div>
        )}
        {!collapsed && (
          <SidebarTrigger className="size-7 p-0 text-sidebar-foreground/40 hover:text-sidebar-foreground" />
        )}
      </SidebarHeader>

      {/* Main navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Other</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    disabled
                    className="opacity-50 cursor-not-allowed"
                    tooltip={`${item.label} (Coming soon)`}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {!collapsed && (
                      <span className="ml-auto text-[10px] text-sidebar-foreground/40 bg-sidebar-accent/50 px-1.5 py-0.5 rounded-md">
                        Soon
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                clearIdentity();
                window.location.href = '/';
              }}
              tooltip="Back to main site"
            >
              <LogOut className="rotate-180" />
              <span>Back to site</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function NavItem({
  item,
  collapsed,
}: {
  item: { to: string; icon: any; label: string };
  collapsed: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = item.to === '/admin'
    ? location.pathname === '/admin'
    : location.pathname.startsWith(item.to);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={collapsed ? item.label : undefined}
        onClick={() => navigate(item.to)}
      >
        <item.icon />
        <span>{item.label}</span>
        {isActive && !collapsed && (
          <ChevronRight className="ml-auto size-3 text-sidebar-accent-foreground/50" />
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
