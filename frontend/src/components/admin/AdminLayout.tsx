import { useEffect, useState } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { AppAdminSidebar } from './AdminSidebar.js';

/** Routes where the sidebar starts collapsed to maximize content width. */
const FULLSCREEN_ROUTES = ['/admin/submissions'];

export function AdminLayout() {
  const location = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.some((r) =>
    location.pathname.startsWith(r),
  );
  const [collapsed, setCollapsed] = useState(isFullscreen);

  // Sync sidebar state when navigating between fullscreen and normal routes
  useEffect(() => {
    setCollapsed(isFullscreen);
  }, [isFullscreen]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-1 text-foreground">
      <AppAdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="px-8 py-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
