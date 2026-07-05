import { Link, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

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
  return (
    <div className="min-h-full">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          CSS Battle
        </Link>
        <HealthBadge />
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        <Routes>
          <Route
            path="/"
            element={
              <section>
                <h1 className="text-2xl font-semibold mb-2">Welcome</h1>
                <p className="text-slate-300">
                  Platform scaffold ready. Routes for challenges, leaderboard, and the admin
                  panel will be added in subsequent tasks.
                </p>
              </section>
            }
          />
          <Route
            path="*"
            element={<p className="text-slate-400">Not implemented yet.</p>}
          />
        </Routes>
      </main>
    </div>
  );
}
