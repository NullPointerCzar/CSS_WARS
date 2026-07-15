import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useIdentity, clearIdentity } from './lib/identity.js';
import { cn } from './lib/utils.js';
import { IdentitySelection } from './pages/IdentitySelection.js';
import { ChallengeList } from './pages/ChallengeList.js';
import { Battle } from './pages/Battle.js';
import { ChallengeManage } from './pages/admin/ChallengeManage.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
import { AdminSubmissionTable } from './pages/admin/AdminSubmissionTable.js';
import { SubmissionReviewPage } from './pages/admin/SubmissionReviewPage.js';
import { AdminParticipantManagement } from './pages/admin/AdminParticipantManagement.js';
import { AdminLayout } from './components/admin/AdminLayout.js';
import { Leaderboard } from './pages/Leaderboard.js';
import { Dashboard } from './pages/Dashboard.js';

type Health = { status: string; service: string; uptime: number };

async function fetchHealth(): Promise<Health> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`health check failed: ${res.status}`);
  return res.json();
}

function HealthBadge() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  if (isLoading)
    return <span className="text-xs text-muted-foreground">checking backend…</span>;
  if (error)
    return <span className="text-xs text-destructive">backend unreachable</span>;
  return (
    <span className="text-xs text-success">
      {data?.service} · up {Math.round(data?.uptime ?? 0)}s
    </span>
  );
}

/** Dedicated layout for non-admin screens */
function MainLayout({ identity }: { identity: NonNullable<ReturnType<typeof useIdentity>> }) {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'px-3.5 py-2 text-sm font-medium rounded-lg transition-colors',
      isActive
        ? 'bg-brand-soft text-brand'
        : 'text-muted-foreground hover:text-foreground hover:bg-surface-3',
    );

  return (
    <div className="min-h-full bg-surface-1 text-foreground">
      <header className="border-b border-border px-6 py-3.5 flex items-center justify-between bg-surface-1/80 backdrop-blur-md sticky top-0 z-40">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/ncei-club.png"
            alt="NCEI Club"
            className="h-8 w-8 rounded-lg bg-surface-2 p-1 ring-1 ring-border object-contain transition-transform group-hover:scale-[1.03]"
          />
          <span className="text-lg font-bold tracking-tight text-foreground">
            CSS WARS
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink to="/challenges" className={navLinkClass}>
            Challenges
          </NavLink>
          <NavLink to="/leaderboard" className={navLinkClass}>
            Leaderboard
          </NavLink>
          {identity.role === 'ADMIN' && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <HealthBadge />
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-muted-foreground hidden sm:block">
              Playing as
            </span>
            <span className="text-sm font-medium text-foreground bg-surface-3 border border-border rounded-lg px-3 py-1.5">
              {identity.name}
            </span>
            <button
              onClick={clearIdentity}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-surface-3 rounded-lg transition-colors"
            >
              Switch
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/challenges" element={<ChallengeList />} />
          <Route path="/challenges/:id" element={<Battle />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route
            path="*"
            element={<p className="text-muted-foreground">Not implemented yet.</p>}
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const identity = useIdentity();
  const location = useLocation();
  const isAdminRoute = identity?.role === 'ADMIN' && location.pathname.startsWith('/admin');

  if (!identity) {
    return <IdentitySelection />;
  }

  // Admin routes render in a completely separate <Routes> tree
  // so the sidebar can never persist onto non-admin screens
  if (isAdminRoute) {
    return (
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/challenges" element={<ChallengeManage />} />
          <Route path="/admin/participants" element={<AdminParticipantManagement />} />
          <Route path="/admin/submissions" element={<AdminSubmissionTable />} />
          <Route path="/admin/submissions/:id" element={<SubmissionReviewPage />} />
        </Route>
      </Routes>
    );
  }

  return <MainLayout identity={identity} />;
}
