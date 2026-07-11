import { useEffect, useState } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppAdminSidebar } from './AdminSidebar.js';

/** Routes where the sidebar should start collapsed to maximize content width. */
const FULLSCREEN_ROUTES = ['/admin/submissions', '/admin/submissions/:id'];

export function AdminLayout() {
  const location = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.some((r) =>
    location.pathname.startsWith(r),
  );
  const [sidebarOpen, setSidebarOpen] = useState(!isFullscreen);

  // Sync sidebar state when navigating between fullscreen and normal routes
  useEffect(() => {
    setSidebarOpen(!isFullscreen);
  }, [isFullscreen]);

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AppAdminSidebar />
      <SidebarInset>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
