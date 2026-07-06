import { Link, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useIdentity, clearIdentity } from './lib/identity.js';
import { IdentitySelection } from './pages/IdentitySelection.js';
import { ChallengeList } from './pages/ChallengeList.js';
import { Battle } from './pages/Battle.js';
import { ChallengeManage } from './pages/admin/ChallengeManage.js';
import { AdminDashboard } from './pages/admin/AdminDashboard.js';
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

  if (isLoading) return <span className="text-slate-400">checking backend…</span>;
  if (error) return <span className="text-red-400">backend unreachable</span>;
  return (
    <span className="text-emerald-400">
      {data?.service} · up {Math.round(data?.uptime ?? 0)}s
    </span>
  );
}

export default function App() {
  const identity = useIdentity();

  if (!identity) {
    return <IdentitySelection />;
  }

  return (
    <div className="min-h-full bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm shadow-lg shadow-blue-500/20">
            CSS
          </span>
          Battle
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to="/challenges"
            className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Challenges
          </Link>
          <Link
            to="/leaderboard"
            className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Leaderboard
          </Link>
          {identity.role === 'ADMIN' && (
            <Link
              to="/admin"
              className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-6">
          <HealthBadge />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">
              Playing as <strong className="text-white">{identity.name}</strong>
            </span>
            <button
              onClick={clearIdentity}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
            >
              Switch User
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
          {identity.role === 'ADMIN' && (
            <>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/challenges" element={<ChallengeManage />} />
            </>
          )}
          <Route
            path="*"
            element={<p className="text-slate-400">Not implemented yet.</p>}
          />
        </Routes>
      </main>
    </div>
  );
}

