import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar.js';

export function AdminLayout() {
  return (
    <div className="flex h-[calc(100vh-65px)] -mx-6 -mb-8">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
